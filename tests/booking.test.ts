import { describe, it, expect } from "vitest";
import { Store } from "@/server/db";
import { availability } from "@/domain/availability";
import {
  createBooking,
  changeBooking,
  updateConfig,
  publicBooking,
} from "@/domain/operations";
import { atTime, dayKey, nextDay, plusMinutes } from "@/domain/time";
import type { State } from "@/domain/types";
function setup() {
  const store = new Store(":memory:");
  store.reset(new Date("2026-09-07T08:00:00Z"));
  return store;
}
function request(state: State, serviceId = "fisio", offset = 0) {
  const slot = availability(
    state,
    serviceId,
    nextDay(dayKey(state.meta.now), offset),
  ).slots[0];
  return {
    serviceId,
    ...slot,
    operationKey: `test-${Math.random()}`,
    client: {
      name: "Cliente de Prueba",
      phone: "000123456",
      privacyConsent: true,
      email: "",
    },
  };
}
describe("reglas de reserva con persistencia SQLite", () => {
  it("crea una reserva, bloquea la plaza y hace idempotente el reintento", () => {
    const store = setup();
    const input = request(store.read());
    const b = store.mutate((s) => createBooking(s, input));
    expect(b.status).toBe("confirmada");
    expect(store.mutate((s) => createBooking(s, input)).id).toBe(b.id);
    expect(() =>
      store.mutate((s) =>
        createBooking(s, { ...input, operationKey: "other-request" }),
      ),
    ).toThrow("hueco");
    expect(store.read().bookings.filter((x) => x.id === b.id)).toHaveLength(1);
    store.close();
  });
  it("cancela y vuelve a ofrecer el hueco", () => {
    const store = setup();
    const input = request(store.read());
    const b = store.mutate((s) => createBooking(s, input));
    store.mutate((s) =>
      changeBooking(s, { id: b.id, version: 1, status: "cancelada" }),
    );
    expect(
      availability(
        store.read(),
        "fisio",
        dayKey(b.start),
        b.professionalId,
      ).slots.some((x) => x.start === b.start),
    ).toBe(true);
    store.close();
  });
  it("reprograma sin perder la reserva si falla el destino", () => {
    const store = setup();
    const b = store.mutate((s) => createBooking(s, request(s)));
    const occupied = store
      .read()
      .bookings.find(
        (x) =>
          x.id !== b.id &&
          x.professionalId === b.professionalId &&
          dayKey(x.start) === dayKey(b.start) &&
          x.status !== "cancelada",
      )!;
    expect(() =>
      store.mutate((s) =>
        changeBooking(s, { id: b.id, version: 1, start: occupied.start }),
      ),
    ).toThrow();
    expect(store.read().bookings.find((x) => x.id === b.id)?.start).toBe(
      b.start,
    );
    const destination = availability(
      store.read(),
      b.serviceId,
      nextDay(dayKey(b.start), 1),
      b.professionalId,
    ).slots[0];
    const changed = store.mutate((s) =>
      changeBooking(s, { id: b.id, version: 1, start: destination.start }),
    );
    expect(changed.version).toBe(2);
    expect(changed.start).toBe(destination.start);
    store.close();
  });
  it("respeta márgenes, descansos, bloqueos y antelación", () => {
    const store = setup();
    const state = store.read();
    state.bookings = [];
    state.blocks = [
      {
        id: "test",
        professionalId: "laura",
        start: atTime(dayKey(state.meta.now), "12:00"),
        end: atTime(dayKey(state.meta.now), "13:00"),
        reason: "Descanso",
      },
    ];
    const slots = availability(state, "osteo", dayKey(state.meta.now)).slots;
    expect(
      slots.every(
        (s) =>
          Date.parse(s.start) >= Date.parse(plusMinutes(state.meta.now, 60)),
      ),
    ).toBe(true);
    expect(
      slots.some((s) => s.start === atTime(dayKey(state.meta.now), "11:10")),
    ).toBe(false);
    expect(
      slots.some((s) => s.start === atTime(dayKey(state.meta.now), "13:10")),
    ).toBe(false);
    expect(
      slots.some((s) => s.start === atTime(dayKey(state.meta.now), "14:00")),
    ).toBe(false);
    expect(
      availability(state, "osteo", nextDay(dayKey(state.meta.now), 61)).slots,
    ).toHaveLength(0);
    store.close();
  });
  it("rechaza un profesional incompatible y ediciones desactualizadas", () => {
    const store = setup();
    const input = request(store.read());
    expect(() =>
      store.mutate((s) =>
        createBooking(s, { ...input, professionalId: "carlos" }),
      ),
    ).toThrow();
    const b = store.mutate((s) => createBooking(s, input));
    store.mutate((s) =>
      changeBooking(s, { id: b.id, version: 1, status: "pendiente" }),
    );
    expect(() =>
      store.mutate((s) =>
        changeBooking(s, { id: b.id, version: 1, status: "cancelada" }),
      ),
    ).toThrow("otra pantalla");
    store.close();
  });
  it("conserva otras plazas disponibles a la misma hora", () => {
    const store = setup();
    store.mutate((s) => {
      s.bookings = [];
      s.events = [];
      s.messages = [];
    });
    const input = request(store.read());
    store.mutate((s) => createBooking(s, input));
    expect(
      availability(store.read(), "fisio", dayKey(input.start)).slots.some(
        (s) =>
          s.start === input.start && s.professionalId !== input.professionalId,
      ),
    ).toBe(true);
    store.close();
  });
  it("aplica la política al cliente, oculta notas y permite la gestión por el negocio", () => {
    const store = setup();
    const b = store.mutate((s) => createBooking(s, request(s)));
    expect(() =>
      store.mutate((s) =>
        changeBooking(
          s,
          { id: b.id, version: 1, status: "cancelada" },
          "Cliente",
        ),
      ),
    ).toThrow("24 horas");
    expect(publicBooking(store.read(), b)).not.toHaveProperty("internalNote");
    store.mutate((s) =>
      changeBooking(s, { id: b.id, version: 1, status: "cancelada" }),
    );
    store.close();
  });
  it("impide guardar una configuración que invalida citas", () => {
    const store = setup();
    const state = store.read();
    const config = {
      business: state.business,
      services: state.services,
      professionals: state.professionals,
      assignments: state.assignments,
      schedules: [],
      blocks: [],
    };
    expect(() => store.mutate((s) => updateConfig(s, config))).toThrow(
      "afecta",
    );
    expect(store.read().schedules.length).toBeGreaterThan(0);
    store.close();
  });
  it("guarda precios históricos, valida asistencia y registra eventos", () => {
    const store = setup();
    const b = store.mutate((s) => createBooking(s, request(s)));
    store.mutate((s) => {
      s.services[0].price = 9900;
    });
    expect(store.read().bookings.find((x) => x.id === b.id)?.price).toBe(4200);
    expect(() =>
      store.mutate((s) =>
        changeBooking(s, { id: b.id, version: 1, status: "atendida" }),
      ),
    ).toThrow("hora");
    expect(store.read().events.some((e) => e.bookingId === b.id)).toBe(true);
    store.close();
  });
});
