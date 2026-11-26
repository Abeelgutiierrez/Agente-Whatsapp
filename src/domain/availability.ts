import type { State, Slot, AvailabilityDay, Booking } from "./types";
import { atTime, dayKey, nextDay, overlap, plusMinutes, zoned } from "./time";
export function fitsSchedule(
  state: State,
  professionalId: string,
  start: string,
  endWithBuffer: string,
) {
  const date = dayKey(start);
  const weekday = zoned(start).getDay();
  return state.schedules.some(
    (s) =>
      s.professionalId === professionalId &&
      s.weekday === weekday &&
      Date.parse(start) >= Date.parse(atTime(date, s.startTime)) &&
      Date.parse(endWithBuffer) <= Date.parse(atTime(date, s.endTime)),
  );
}
export function slotIsFree(
  state: State,
  professionalId: string,
  start: string,
  end: string,
  buffer: number,
  excludeId?: string,
) {
  const finish = plusMinutes(end, buffer);
  return (
    fitsSchedule(state, professionalId, start, finish) &&
    !state.blocks.some(
      (b) =>
        (!b.professionalId || b.professionalId === professionalId) &&
        overlap(start, finish, b.start, b.end),
    ) &&
    !state.bookings.some(
      (b) =>
        b.id !== excludeId &&
        b.professionalId === professionalId &&
        b.status !== "cancelada" &&
        overlap(start, finish, b.start, plusMinutes(b.end, b.bufferMinutes)),
    )
  );
}
export function availability(
  state: State,
  serviceId: string,
  date: string,
  professionalId?: string,
  excludeId?: string,
  existing?: Booking,
): AvailabilityDay {
  const service = state.services.find((s) => s.id === serviceId && s.active);
  if (!service)
    return { date, slots: [], reason: "Este servicio no está disponible." };
  const today = dayKey(state.meta.now);
  if (date < today || date > nextDay(today, state.business.maxAdvanceDays))
    return { date, slots: [], reason: "Fuera del plazo de reserva." };
  const eligible = state.professionals.filter(
    (p) =>
      p.active &&
      (!professionalId || p.id === professionalId) &&
      state.assignments.some(
        (a) => a.professionalId === p.id && a.serviceId === serviceId,
      ),
  );
  const duration =
    existing?.serviceId === serviceId ? existing.duration : service.duration;
  const buffer =
    existing?.serviceId === serviceId
      ? existing.bufferMinutes
      : state.business.bufferMinutes;
  const earliest =
    Date.parse(state.meta.now) + state.business.minNoticeHours * 3600000;
  const weekday = zoned(atTime(date, "12:00")).getDay();
  const slots: Slot[] = [];
  for (const professional of eligible) {
    for (const schedule of state.schedules.filter(
      (s) => s.professionalId === professional.id && s.weekday === weekday,
    )) {
      const finish = atTime(date, schedule.endTime);
      for (
        let start = atTime(date, schedule.startTime);
        Date.parse(plusMinutes(start, duration + buffer)) <= Date.parse(finish);
        start = plusMinutes(start, state.business.slotStepMinutes)
      ) {
        if (Date.parse(start) < earliest) continue;
        const end = plusMinutes(start, duration);
        if (slotIsFree(state, professional.id, start, end, buffer, excludeId))
          slots.push({ start, end, professionalId: professional.id });
      }
    }
  }
  slots.sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      a.professionalId.localeCompare(b.professionalId),
  );
  const hasHours = state.schedules.some(
    (s) =>
      eligible.some((p) => p.id === s.professionalId) && s.weekday === weekday,
  );
  return {
    date,
    slots,
    reason: slots.length
      ? ""
      : hasHours
        ? "Sin huecos compatibles con la duración y la antelación mínima."
        : "El equipo no atiende este servicio este día.",
  };
}
