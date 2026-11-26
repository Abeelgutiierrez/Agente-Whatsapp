import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { State, Booking, PublicBooking, Status, Client } from "./types";
import { statuses } from "./types";
import { availability, slotIsFree } from "./availability";
import { dateLabel, dayKey, timeLabel } from "./time";
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? `+34${digits}` : `+${digits.replace(/^00/, "")}`;
};
const phoneSchema = z
  .string()
  .trim()
  .refine(
    (v) =>
      /^\+?[\d\s()-]{9,22}$/.test(v) &&
      v.replace(/\D/g, "").length >= 9 &&
      v.replace(/\D/g, "").length <= 15,
    "Escribe un teléfono de entre 9 y 15 cifras.",
  )
  .transform(normalizePhone);
export const clientInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre, al menos dos letras.")
    .max(100),
  phone: phoneSchema,
  email: z
    .union([
      z.literal(""),
      z.email("Revisa el correo, por ejemplo nombre@dominio.es."),
    ])
    .default(""),
  privacyConsent: z.literal(true, {
    error: "Acepta la información de privacidad para reservar.",
  }),
  communicationConsent: z.boolean().default(false),
});
const bookingInput = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  operationKey: z.string().min(8).max(150),
  client: clientInput,
  customerNote: z.string().max(500).default(""),
  source: z
    .enum(["WhatsApp", "teléfono", "presencial", "web"])
    .default("WhatsApp"),
  status: z.enum(["confirmada", "pendiente"]).default("confirmada"),
});
export function event(
  state: State,
  booking: Booking,
  action: string,
  actor: string,
  before = "",
  after = "",
) {
  state.events.push({
    id: randomUUID(),
    bookingId: booking.id,
    at: state.meta.now,
    action,
    actor,
    before,
    after,
  });
}
export function createBooking(
  state: State,
  raw: unknown,
  actor = "Cliente",
): Booking {
  const input = bookingInput.parse(raw);
  if (actor === "Cliente") {
    input.status = "confirmada";
    if (!["WhatsApp", "web"].includes(input.source)) input.source = "WhatsApp";
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...input, operationKey: undefined }))
    .digest("hex");
  const prior = state.operations.find((o) => o.id === input.operationKey);
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      throw new DomainError(
        "Esta solicitud ya se utilizó. Vuelve a revisar tu cita.",
        409,
      );
    return state.bookings.find((b) => b.id === prior.bookingId)!;
  }
  const start = new Date(input.start).toISOString();
  const slot = availability(
    state,
    input.serviceId,
    dayKey(start),
    input.professionalId,
  ).slots.find((s) => s.start === start);
  if (!slot)
    throw new DomainError(
      "Ese hueco acaba de dejar de estar disponible. Tus datos siguen aquí; elige otra hora.",
      409,
    );
  const service = state.services.find((s) => s.id === input.serviceId)!;
  // El teléfono compartido no permite cambiar los datos de otro miembro de la familia.
  let client = state.clients.find(
    (c) =>
      c.phone === input.client.phone &&
      c.name.toLocaleLowerCase("es") ===
        input.client.name.toLocaleLowerCase("es"),
  );
  if (!client) {
    client = {
      id: randomUUID(),
      ...input.client,
      notes: "",
      createdAt: state.meta.now,
    };
    state.clients.push(client);
  } else {
    client.privacyConsent = true;
    if (input.client.communicationConsent) client.communicationConsent = true;
  }
  let code: string;
  do {
    code = `AR-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  } while (state.bookings.some((b) => b.code === code));
  const booking: Booking = {
    id: randomUUID(),
    code,
    clientId: client.id,
    serviceId: service.id,
    serviceName: service.name,
    professionalId: slot.professionalId,
    start: slot.start,
    end: slot.end,
    duration: service.duration,
    price: service.price,
    bufferMinutes: state.business.bufferMinutes,
    status: input.status,
    source: input.source,
    customerNote: input.customerNote,
    internalNote: "",
    createdAt: state.meta.now,
    version: 1,
  };
  state.bookings.push(booking);
  state.operations.push({
    id: input.operationKey,
    bookingId: booking.id,
    fingerprint,
  });
  event(state, booking, "Reserva creada", actor, "", booking.status);
  return booking;
}
export const changeSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  status: z.enum(statuses).optional(),
  serviceId: z.string().optional(),
  professionalId: z.string().optional(),
  start: z.iso.datetime({ offset: true }).optional(),
  internalNote: z.string().max(2000).optional(),
});
export function changeBooking(
  state: State,
  raw: unknown,
  actor = "Negocio",
): Booking {
  const input = changeSchema.parse(raw);
  const booking = state.bookings.find((b) => b.id === input.id);
  if (!booking) throw new DomainError("No encontramos esta cita.", 404);
  if (booking.version !== input.version)
    throw new DomainError(
      "La cita ha cambiado en otra pantalla. Actualiza sus datos antes de continuar.",
      409,
    );
  const isCustomer = actor === "Cliente";
  if (
    isCustomer &&
    (Date.parse(booking.start) - Date.parse(state.meta.now)) / 3600000 <
      state.business.cancellationHours
  )
    throw new DomainError(
      `Quedan menos de ${state.business.cancellationHours} horas. Habla con la clínica para gestionar este cambio.`,
    );
  if (
    isCustomer &&
    (input.internalNote !== undefined ||
      (input.status && input.status !== "cancelada") ||
      (input.serviceId && input.serviceId !== booking.serviceId))
  )
    throw new DomainError("Este cambio debe gestionarlo la clínica.", 403);
  const before = `${dateLabel(booking.start, "dd/MM/yyyy")} ${timeLabel(booking.start)} · ${state.professionals.find((p) => p.id === booking.professionalId)?.name} · ${booking.serviceName} · ${booking.status}`;
  if (input.start || input.serviceId || input.professionalId) {
    if (!["pendiente", "confirmada"].includes(booking.status))
      throw new DomainError(
        "Solo puedes reprogramar una cita pendiente o confirmada. Crea una nueva cita.",
      );
    const serviceId = input.serviceId || booking.serviceId;
    const professionalId = input.professionalId || booking.professionalId;
    const start = input.start
      ? new Date(input.start).toISOString()
      : booking.start;
    const slot = availability(
      state,
      serviceId,
      dayKey(start),
      professionalId,
      booking.id,
      booking,
    ).slots.find((s) => s.start === start);
    if (!slot)
      throw new DomainError(
        "La nueva hora no está disponible. La cita original sigue reservada.",
        409,
      );
    const service = state.services.find((s) => s.id === serviceId)!;
    if (serviceId !== booking.serviceId) {
      booking.duration = service.duration;
      booking.price = service.price;
      booking.bufferMinutes = state.business.bufferMinutes;
      booking.serviceName = service.name;
    }
    Object.assign(booking, {
      serviceId,
      professionalId,
      start: slot.start,
      end: slot.end,
    });
  }
  if (input.status && input.status !== booking.status) {
    const transitions: Record<Status, Status[]> = {
      pendiente: ["confirmada", "atendida", "cancelada", "no presentada"],
      confirmada: ["pendiente", "atendida", "cancelada", "no presentada"],
      atendida: ["confirmada", "no presentada"],
      cancelada: [],
      "no presentada": ["atendida", "confirmada"],
    };
    if (!transitions[booking.status].includes(input.status))
      throw new DomainError(
        "Esta cita ya está cancelada. Puedes crear una nueva.",
      );
    if (
      ["atendida", "no presentada"].includes(input.status) &&
      Date.parse(booking.start) > Date.parse(state.meta.now)
    )
      throw new DomainError(
        "Podrás registrar la asistencia cuando llegue la hora de la cita.",
      );
    booking.status = input.status;
  }
  if (input.internalNote !== undefined)
    booking.internalNote = input.internalNote;
  booking.version++;
  const after = `${dateLabel(booking.start, "dd/MM/yyyy")} ${timeLabel(booking.start)} · ${state.professionals.find((p) => p.id === booking.professionalId)?.name} · ${booking.serviceName} · ${booking.status}`;
  event(
    state,
    booking,
    input.internalNote !== undefined
      ? "Nota interna actualizada"
      : input.start
        ? "Cita reprogramada"
        : "Estado actualizado",
    actor,
    before,
    after,
  );
  return booking;
}
export function lookupBooking(state: State, code: string, phone: string) {
  const booking = state.bookings.find(
    (b) =>
      b.code.toUpperCase() === code.trim().toUpperCase() &&
      state.clients.some(
        (c) => c.id === b.clientId && c.phone === normalizePhone(phone),
      ),
  );
  if (!booking)
    throw new DomainError(
      "No encontramos una cita con ese localizador y teléfono. Revisa ambos datos.",
      404,
    );
  return booking;
}
export function messageText(
  state: State,
  booking: Booking,
  type: "confirmation" | "reminder",
) {
  const values: Record<string, string> = {
    nombre: state.clients
      .find((c) => c.id === booking.clientId)!
      .name.split(" ")[0],
    servicio: booking.serviceName,
    negocio: state.business.name,
    fecha: dateLabel(booking.start),
    hora: timeLabel(booking.start),
    profesional: state.professionals.find(
      (p) => p.id === booking.professionalId,
    )!.name,
    codigo: booking.code,
  };
  return (
    type === "confirmation"
      ? state.business.confirmationText
      : state.business.reminderText
  ).replace(/\{(\w+)\}/g, (match, key) => values[key] || match);
}
export function publicBooking(state: State, b: Booking): PublicBooking {
  return {
    id: b.id,
    code: b.code,
    serviceName: b.serviceName,
    professionalName: state.professionals.find(
      (p) => p.id === b.professionalId,
    )!.name,
    start: b.start,
    end: b.end,
    duration: b.duration,
    price: b.price,
    status: b.status,
    version: b.version,
    serviceId: b.serviceId,
    professionalId: b.professionalId,
    clientName: state.clients.find((c) => c.id === b.clientId)!.name,
    phone: state.clients.find((c) => c.id === b.clientId)!.phone,
    confirmation: messageText(state, b, "confirmation"),
    reminder: messageText(state, b, "reminder"),
  };
}
export function updateClient(state: State, raw: unknown): Client {
  const input = z
    .object({
      id: z.string(),
      name: z.string().trim().min(2).max(100),
      phone: phoneSchema,
      email: z.union([z.literal(""), z.email()]),
      notes: z.string().max(2000),
      communicationConsent: z.boolean(),
    })
    .parse(raw);
  const client = state.clients.find((c) => c.id === input.id);
  if (!client) throw new DomainError("Cliente no encontrado.", 404);
  Object.assign(client, input);
  return client;
}
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const configSchema = z.object({
  business: z.object({
    id: z.literal("armonia"),
    name: z.string().trim().min(2).max(100),
    tagline: z.string().max(200),
    address: z.string().max(200),
    phone: z.string().max(30),
    primaryColor: color,
    timezone: z.literal("Europe/Madrid"),
    minNoticeHours: z.number().int().min(0).max(168),
    maxAdvanceDays: z.number().int().min(1).max(180),
    bufferMinutes: z.number().int().min(0).max(60),
    slotStepMinutes: z.number().int().min(5).max(60),
    cancellationHours: z.number().int().min(0).max(168),
    confirmationText: z.string().min(10).max(2000),
    reminderText: z.string().min(10).max(2000),
    version: z.number().int(),
  }),
  services: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(2),
        description: z.string(),
        duration: z.number().int().min(10).max(240),
        price: z.number().int().min(0).max(100000),
        active: z.boolean(),
        color,
      }),
    )
    .min(1),
  professionals: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(2),
        role: z.string(),
        active: z.boolean(),
        color,
      }),
    )
    .min(1),
  assignments: z.array(
    z.object({
      id: z.string(),
      serviceId: z.string(),
      professionalId: z.string(),
    }),
  ),
  schedules: z.array(
    z.object({
      id: z.string(),
      professionalId: z.string(),
      weekday: z.number().int().min(0).max(6),
      startTime: time,
      endTime: time,
    }),
  ),
  blocks: z.array(
    z.object({
      id: z.string(),
      professionalId: z.string().nullable(),
      start: z.iso.datetime({ offset: true }),
      end: z.iso.datetime({ offset: true }),
      reason: z.string().min(2).max(150),
    }),
  ),
});
export function updateConfig(state: State, raw: unknown) {
  const config = configSchema.parse(raw);
  if (config.business.version !== state.business.version)
    throw new DomainError(
      "La configuración ha cambiado. Recarga la página antes de guardar.",
      409,
    );
  for (const key of [
    "services",
    "professionals",
    "assignments",
    "schedules",
    "blocks",
  ] as const)
    if (new Set(config[key].map((x) => x.id)).size !== config[key].length)
      throw new DomainError("Hay elementos duplicados en la configuración.");
  if (config.schedules.some((s) => s.startTime >= s.endTime))
    throw new DomainError("Cada tramo debe terminar después de su inicio.");
  if (config.blocks.some((b) => Date.parse(b.start) >= Date.parse(b.end)))
    throw new DomainError("El bloqueo debe terminar después de empezar.");
  if (
    config.assignments.some(
      (a) =>
        !config.services.some((s) => s.id === a.serviceId) ||
        !config.professionals.some((p) => p.id === a.professionalId),
    ) ||
    config.schedules.some(
      (s) => !config.professionals.some((p) => p.id === s.professionalId),
    ) ||
    config.blocks.some(
      (b) =>
        b.professionalId &&
        !config.professionals.some((p) => p.id === b.professionalId),
    )
  )
    throw new DomainError("Revisa los profesionales y servicios asignados.");
  if (
    new Set(config.assignments.map((a) => `${a.serviceId}:${a.professionalId}`))
      .size !== config.assignments.length
  )
    throw new DomainError("Una asignación está repetida.");
  for (const s of config.schedules)
    if (
      config.schedules.some(
        (other) =>
          other.id !== s.id &&
          other.professionalId === s.professionalId &&
          other.weekday === s.weekday &&
          s.startTime < other.endTime &&
          other.startTime < s.endTime,
      )
    )
      throw new DomainError("Hay tramos de horario que se solapan.");
  if (
    state.bookings.some(
      (b) =>
        !config.services.some((s) => s.id === b.serviceId) ||
        !config.professionals.some((p) => p.id === b.professionalId),
    )
  )
    throw new DomainError(
      "Conserva los servicios y profesionales con historial; puedes desactivarlos.",
    );
  const proposed = { ...state, ...config };
  const affected = state.bookings
    .filter(
      (b) =>
        ["confirmada", "pendiente"].includes(b.status) &&
        Date.parse(b.end) > Date.parse(state.meta.now),
    )
    .filter(
      (b) =>
        !config.services.some((s) => s.id === b.serviceId && s.active) ||
        !config.professionals.some(
          (p) => p.id === b.professionalId && p.active,
        ) ||
        !config.assignments.some(
          (a) =>
            a.serviceId === b.serviceId &&
            a.professionalId === b.professionalId,
        ) ||
        !slotIsFree(
          proposed,
          b.professionalId,
          b.start,
          b.end,
          b.bufferMinutes,
          b.id,
        ),
    );
  if (affected.length)
    throw new DomainError(
      `Este cambio afecta a ${affected.length} citas: ${affected
        .slice(0, 5)
        .map(
          (b) =>
            `${b.code} (${dateLabel(b.start, "dd/MM")} ${timeLabel(b.start)})`,
        )
        .join(", ")}. Reprográmalas o cancélalas antes de guardar.`,
      409,
    );
  // Los bloques pueden superponerse; el cálculo de capacidad une sus intervalos.
  Object.assign(state, config);
  state.business.version++;
  return state.business;
}
export function simulateMessage(state: State, raw: unknown) {
  const input = z
    .object({
      bookingId: z.string().nullable().default(null),
      clientId: z.string().nullable().default(null),
      kind: z.string().max(100),
      text: z.string().trim().min(1).max(2000),
    })
    .parse(raw);
  if (
    (input.bookingId &&
      !state.bookings.some((b) => b.id === input.bookingId)) ||
    (input.clientId && !state.clients.some((c) => c.id === input.clientId))
  )
    throw new DomainError("No encontramos el destinatario.");
  const message = {
    id: randomUUID(),
    ...input,
    at: state.meta.now,
    status: "Simulado · sin envío real",
  };
  state.messages.push(message);
  if (input.bookingId)
    event(
      state,
      state.bookings.find((b) => b.id === input.bookingId)!,
      "WhatsApp simulado",
      "Negocio",
      "",
      input.kind,
    );
  return message;
}
