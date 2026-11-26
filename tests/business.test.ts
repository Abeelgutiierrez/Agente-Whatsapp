import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "@/server/db";
import {
  capacity,
  metrics,
  recommendations,
  clientSummary,
} from "@/domain/insights";
import { exportTable, csv, tsv } from "@/domain/export";
import { createSeed } from "@/domain/seed";
import { availability } from "@/domain/availability";
import {
  createBooking,
  changeBooking,
  updateConfig,
} from "@/domain/operations";
import { atTime, dayKey, nextDay } from "@/domain/time";
const state = () => createSeed(new Date("2026-09-07T08:00:00Z"));
describe("indicadores, exportación y configuración", () => {
  it("excluye canceladas de ingresos y ocupación, y ausencias de ingresos", () => {
    const s = state();
    const today = dayKey(s.meta.now);
    const day = s.bookings.filter((b) => dayKey(b.start) === today);
    s.bookings = day.slice(0, 4).map((b, i) => ({
      ...b,
      status: (
        ["confirmada", "atendida", "cancelada", "no presentada"] as const
      )[i],
      duration: 50,
      price: 4200,
    }));
    const data = metrics(s, today, today);
    expect(data.count).toBe(3);
    expect(data.revenue).toBe(8400);
    expect(data.occupancy).toBe(Math.round((150 / 1620) * 100));
    expect(data.cancellations).toBe(1);
    expect(data.misses).toBe(1);
    expect(data.change).toBe(null);
  });
  it("une bloqueos superpuestos sin descontar dos veces el mismo tiempo", () => {
    const s = state();
    const date = dayKey(s.meta.now);
    s.blocks = [
      {
        id: "a",
        professionalId: "laura",
        start: atTime(date, "09:00"),
        end: atTime(date, "10:00"),
        reason: "a",
      },
      {
        id: "b",
        professionalId: "laura",
        start: atTime(date, "09:30"),
        end: atTime(date, "10:30"),
        reason: "b",
      },
    ];
    expect(capacity(s, date, date)).toBe(1530);
  });
  it("deriva recomendaciones repetibles y no las inventa con datos vacíos", () => {
    const s = state();
    const from = dayKey(s.meta.now);
    expect(recommendations(s, from, nextDay(from, 6))).toEqual(
      recommendations(s, from, nextDay(from, 6)),
    );
    expect(
      recommendations(s, from, nextDay(from, 6)).length,
    ).toBeGreaterThanOrEqual(3);
    s.bookings = [];
    expect(recommendations(s, from, from)).toEqual([]);
  });
  it("filtra exportación de clientes por sus citas y protege CSV/TSV", () => {
    const s = state();
    const date = dayKey(s.meta.now);
    const f = {
      from: date,
      to: date,
      professionalId: "laura",
      status: "confirmada",
    };
    const ids = new Set(
      s.bookings
        .filter(
          (b) =>
            dayKey(b.start) === date &&
            b.professionalId === "laura" &&
            b.status === "confirmada",
        )
        .map((b) => b.clientId),
    );
    const table = exportTable(s, f, "clients");
    expect(table.rows.length).toBe(ids.size);
    expect(table.headers.join()).not.toContain("Notas");
    const unsafe = {
      headers: ["Nombre", "Nota"],
      rows: [["=SUM(A1)", 'hola; "amigo"\nsiguiente']],
    };
    expect(csv(unsafe).charCodeAt(0)).toBe(0xfeff);
    expect(csv(unsafe)).toContain("'=SUM(A1)");
    expect(csv(unsafe)).toContain('""amigo""');
    expect(tsv(unsafe)).toContain("'=SUM(A1)");
  });
  it("identifica clientes inactivos y explica sus etiquetas", () => {
    const s = state();
    const inactive = s.clients
      .map((c) => clientSummary(s, c))
      .filter((c) => c.label === "Hace tiempo que no viene");
    expect(inactive.length).toBe(3);
    expect(inactive.every((c) => !c.upcoming && c.daysSince! >= 90)).toBe(true);
  });
  it("respeta cambios de hora en Madrid y límites de sesión", () => {
    expect(atTime("2026-10-24", "09:00")).toBe("2026-10-24T07:00:00.000Z");
    expect(atTime("2026-10-26", "09:00")).toBe("2026-10-26T08:00:00.000Z");
    const s = state();
    s.bookings = [];
    s.meta.now = atTime("2026-10-23", "10:00");
    const slots = availability(s, "osteo", "2026-10-26").slots;
    expect(slots[0].start).toBe("2026-10-26T08:00:00.000Z");
    expect(slots.some((x) => x.start === atTime("2026-10-26", "13:10"))).toBe(
      false,
    );
  });
  it("permite actualizar apariencia pero impide intervalos y asignaciones inválidos", () => {
    const s = state();
    const config = {
      business: { ...s.business, name: "Centro Calma" },
      services: s.services,
      professionals: s.professionals,
      assignments: s.assignments,
      schedules: s.schedules,
      blocks: s.blocks,
    };
    updateConfig(s, config);
    expect(s.business.name).toBe("Centro Calma");
    expect(s.business.version).toBe(2);
    expect(() =>
      updateConfig(s, {
        ...config,
        business: s.business,
        schedules: [...s.schedules, { ...s.schedules[0], id: "duplicate" }],
      }),
    ).toThrow("solapan");
  });
  it("restablece y conserva la reserva tras cerrar y abrir el archivo", () => {
    const directory = mkdtempSync(join(tmpdir(), "armonia-test-"));
    const file = join(directory, "demo.db");
    const store = new Store(file);
    store.reset(new Date("2026-09-07T08:00:00Z"));
    const before = store.read();
    const slot = availability(before, "fisio", dayKey(before.meta.now))
      .slots[0];
    const b = store.mutate((s) =>
      createBooking(s, {
        ...slot,
        serviceId: "fisio",
        operationKey: "persistence-test",
        client: {
          name: "Prueba persistencia",
          phone: "000987123",
          privacyConsent: true,
        },
      }),
    );
    store.close();
    const second = new Store(file);
    expect(second.read().bookings.some((x) => x.id === b.id)).toBe(true);
    second.reset(new Date("2026-09-07T08:00:00Z"));
    expect(second.read().bookings.some((x) => x.id === b.id)).toBe(false);
    expect(second.read().bookings.length).toBe(before.bookings.length);
    second.close();
    rmSync(directory, { recursive: true });
  });
  it("permite al cliente reprogramar y cancelar con antelación suficiente", () => {
    const store = new Store(":memory:");
    store.reset(new Date("2026-09-07T08:00:00Z"));
    const initial = store.read();
    const date = nextDay(dayKey(initial.meta.now), 3);
    const slot = availability(initial, "podo", date).slots[0];
    const b = store.mutate((s) =>
      createBooking(s, {
        ...slot,
        serviceId: "podo",
        operationKey: "manage-test",
        client: {
          name: "Prueba gestión",
          phone: "000123987",
          privacyConsent: true,
        },
      }),
    );
    const target = availability(store.read(), "podo", nextDay(date, 1))
      .slots[0];
    const rescheduled = store.mutate((s) =>
      changeBooking(
        s,
        { id: b.id, version: 1, start: target.start },
        "Cliente",
      ),
    );
    expect(rescheduled.start).toBe(target.start);
    store.mutate((s) =>
      changeBooking(
        s,
        { id: b.id, version: 2, status: "cancelada" },
        "Cliente",
      ),
    );
    expect(
      availability(store.read(), "podo", nextDay(date, 1)).slots.some(
        (x) => x.start === target.start,
      ),
    ).toBe(true);
    store.close();
  });
});
