import type { State, Booking, Client } from "./types";
import {
  business,
  services,
  professionals,
  assignments,
  schedules,
} from "./defaults";
import { atTime, dayKey, nextDay, plusMinutes, zoned } from "./time";
const names = [
  "Elena Ríos",
  "Pablo Soler",
  "Lucía Vega",
  "Daniel Robles",
  "Carmen Valle",
  "Hugo Marín",
  "Isabel Luna",
  "Javier Soto",
  "Ana Beltrán",
  "Marcos Vidal",
  "Nuria Pardo",
  "Sergio Alba",
  "Clara Montes",
  "Mario Sierra",
  "Rosa Fuentes",
  "Adrián Salas",
  "Teresa Roca",
  "Álvaro Gil",
  "Beatriz Molina",
  "Iván Torres",
  "Sara Lozano",
  "Diego Cano",
  "Eva Ferrer",
  "Raúl Lázaro",
  "Patricia Mora",
  "Andrés Campos",
  "Inés Rubio",
  "Miguel Sanz",
  "Julia Pastor",
  "Óscar Bernal",
  "Marina Calvo",
  "David Castaño",
  "Alicia Peña",
  "Rubén Casas",
  "Silvia Rey",
  "Gabriel Vela",
  "Cristina Costa",
  "Luis Méndez",
  "Olga Ramos",
  "Tomás León",
];
export function createSeed(reference = new Date()): State {
  let today = dayKey(reference);
  if (zoned(atTime(today, "12:00")).getDay() === 0) today = nextDay(today, 1);
  const state: State = {
    business: structuredClone(business),
    meta: { id: "demo", now: atTime(today, "10:00"), revision: 1 },
    services: structuredClone(services),
    professionals: structuredClone(professionals),
    assignments: structuredClone(assignments),
    schedules: structuredClone(schedules),
    blocks: [],
    clients: [],
    bookings: [],
    events: [],
    messages: [],
    operations: [],
  };
  const busyOffset = zoned(atTime(today, "12:00")).getDay() === 6 ? 2 : 1;
  state.clients = names.map((name, i): Client => ({
    id: `client-${i}`,
    name,
    phone: `+34000${String(100000 + i)}`,
    email: `${name
      .split(" ")[0]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()}${i}@example.invalid`,
    privacyConsent: true,
    communicationConsent: i % 4 !== 0,
    notes:
      i === 0
        ? "Prefiere citas a primera hora de la tarde. Cliente de la clínica desde hace dos años."
        : i % 7 === 0
          ? "Prefiere que contactemos por la mañana."
          : "",
    createdAt: atTime(nextDay(today, -125 + i), "10:00"),
  }));
  let n = 0;
  function add(
    date: string,
    time: string,
    professionalId: string,
    clientIndex: number,
    status: Booking["status"],
    serviceId?: string,
  ) {
    const options = assignments.filter(
      (a) => a.professionalId === professionalId,
    );
    const service = services.find(
      (s) => s.id === (serviceId || options[n % options.length].serviceId),
    )!;
    const start = atTime(date, time);
    const id = `seed-${++n}`;
    const booking: Booking = {
      id,
      code: `AR-${String(n).padStart(5, "0")}`,
      clientId: state.clients[clientIndex].id,
      serviceId: service.id,
      serviceName: service.name,
      professionalId,
      start,
      end: plusMinutes(start, service.duration),
      duration: service.duration,
      price: service.price,
      bufferMinutes: 10,
      status,
      source: (
        [
          "WhatsApp",
          "WhatsApp",
          "teléfono",
          "WhatsApp",
          "presencial",
          "web",
        ] as const
      )[n % 6],
      customerNote: "",
      internalNote: "",
      createdAt: atTime(nextDay(date, -4), "10:00"),
      version: 1,
    };
    state.bookings.push(booking);
    if (date >= today)
      state.events.push({
        id: `event-${id}`,
        bookingId: id,
        at: booking.createdAt,
        action: "Reserva creada",
        actor: "Datos de ejemplo",
        before: "",
        after: status,
      });
    if (status === "cancelada" && date === today)
      state.events.push({
        id: `cancel-${id}`,
        bookingId: id,
        at: plusMinutes(state.meta.now, -20),
        action: "Cita cancelada · hueco liberado",
        actor: "Cliente (demo)",
        before: "confirmada",
        after: "cancelada",
      });
    return booking;
  }
  for (let offset = -84; offset < 56; offset++) {
    const date = nextDay(today, offset);
    const weekday = zoned(atTime(date, "12:00")).getDay();
    if (!weekday) continue;
    for (let p = 0; p < professionals.length; p++) {
      const hours =
        weekday === 6 ? [9, 10, 11, 12] : [9, 10, 11, 12, 13, 16, 17, 18, 19];
      for (const hour of hours) {
        const hash = Math.abs(offset * 31 + p * 17 + hour * 7);
        let selected = hash % 10 < (weekday === 2 && hour >= 16 ? 3 : 6);
        if (offset === busyOffset) selected = hash % 13 !== 0;
        if (offset === 0)
          selected = (
            p === 0
              ? [9, 10, 12, 16, 18]
              : p === 1
                ? [9, 10, 11, 12, 17]
                : [9, 11, 16, 18]
          ).includes(hour);
        if (!selected) continue;
        const status =
          offset < 0
            ? hash % 19 === 0
              ? "no presentada"
              : hash % 11 === 0
                ? "cancelada"
                : "atendida"
            : offset === 0 && hour === 9
              ? "atendida"
              : hash % 9 === 0
                ? "pendiente"
                : "confirmada";
        add(
          date,
          `${hour}:00`,
          professionals[p].id,
          (hash + p * 5 + hour * 2) % 34,
          status,
          offset === 0 && p === 1 && hour === 11 ? "fisio" : undefined,
        );
      }
    }
  }
  add(today, "17:00", "laura", 0, "cancelada", "fisio");
  for (let i = 34; i < 40; i++) {
    let date = nextDay(today, -110 - i);
    if (zoned(atTime(date, "12:00")).getDay() === 0) date = nextDay(date, 1);
    add(date, "09:00", "laura", i, "atendida", "fisio");
  }
  // Dos clientes recién incorporados, sin visitas anteriores.
  for (const [i, name] of ["Alba del Río", "Mateo Prado"].entries())
    state.clients.push({
      id: `new-${i}`,
      name,
      phone: `+3400020000${i}`,
      email: "",
      privacyConsent: true,
      communicationConsent: false,
      notes: "",
      createdAt: state.meta.now,
    });
  const future = state.bookings.filter(
    (b) => b.start > state.meta.now && b.status === "confirmada",
  );
  future.slice(0, 2).forEach((b, i) => {
    b.clientId = `new-${i}`;
  });
  const vacationDate = nextDay(today, 21);
  state.blocks.push({
    id: "vacation-laura",
    professionalId: "laura",
    start: atTime(vacationDate, "00:00"),
    end: atTime(nextDay(vacationDate, 2), "00:00"),
    reason: "Vacaciones de Laura",
  });
  state.bookings = state.bookings.filter(
    (b) =>
      !(
        b.professionalId === "laura" &&
        b.start >= state.blocks[0].start &&
        b.start < state.blocks[0].end
      ),
  );
  state.events = state.events.filter((e) =>
    state.bookings.some((b) => b.id === e.bookingId),
  );
  const pending = state.bookings.find(
    (b) => b.status === "pendiente" && dayKey(b.start) === today,
  );
  if (pending)
    state.messages.push({
      id: "waiting-demo",
      bookingId: pending.id,
      clientId: pending.clientId,
      at: plusMinutes(state.meta.now, -180),
      kind: "Solicitud de confirmación",
      text: "Hola, ¿nos confirmas que podrás venir a tu cita?",
      status: "Simulado · sin respuesta",
    });
  return state;
}
