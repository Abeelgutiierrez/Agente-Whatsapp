import type { State, Filters, Booking, Client } from "./types";
import {
  atTime,
  dayKey,
  daysBetween,
  minutes,
  nextDay,
  zoned,
  dateLabel,
  timeLabel,
} from "./time";
import { availability } from "./availability";
export function filteredBookings(state: State, filters: Filters): Booking[] {
  return state.bookings
    .filter(
      (b) =>
        dayKey(b.start) >= filters.from &&
        dayKey(b.start) <= filters.to &&
        (!filters.professionalId ||
          b.professionalId === filters.professionalId) &&
        (!filters.serviceId || b.serviceId === filters.serviceId) &&
        (!filters.status || b.status === filters.status),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
}
function unionLength(intervals: [number, number][]) {
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0;
  for (const [a, b] of intervals) {
    if (a > end) {
      total += end - start;
      start = a;
      end = b;
    } else end = Math.max(end, b);
  }
  return total + end - start;
}
export function capacity(
  state: State,
  from: string,
  to: string,
  professionalId?: string,
  period?: "morning" | "afternoon",
) {
  let total = 0;
  for (const date of daysBetween(from, to)) {
    const weekday = zoned(atTime(date, "12:00")).getDay();
    for (const schedule of state.schedules.filter(
      (s) =>
        s.weekday === weekday &&
        (!professionalId || s.professionalId === professionalId) &&
        state.professionals.some((p) => p.id === s.professionalId && p.active),
    )) {
      const start = Math.max(
        Date.parse(atTime(date, schedule.startTime)),
        period === "afternoon" ? Date.parse(atTime(date, "14:00")) : 0,
      );
      const end = Math.min(
        Date.parse(atTime(date, schedule.endTime)),
        period === "morning" ? Date.parse(atTime(date, "14:00")) : Infinity,
      );
      if (end <= start) continue;
      const blocked = state.blocks
        .filter(
          (b) =>
            !b.professionalId || b.professionalId === schedule.professionalId,
        )
        .map(
          (b) =>
            [
              Math.max(start, Date.parse(b.start)),
              Math.min(end, Date.parse(b.end)),
            ] as [number, number],
        )
        .filter(([a, b]) => b > a);
      total += (end - start - unionLength(blocked)) / 60000;
    }
  }
  return total;
}
export function clientSummary(state: State, client: Client) {
  const bookings = state.bookings
    .filter((b) => b.clientId === client.id)
    .sort((a, b) => a.start.localeCompare(b.start));
  const visits = bookings.filter((b) => b.status === "atendida");
  const upcoming = bookings.find(
    (b) =>
      ["confirmada", "pendiente"].includes(b.status) &&
      b.start >= state.meta.now,
  );
  const last = visits.at(-1);
  const daysSince = last
    ? Math.floor(
        (Date.parse(state.meta.now) - Date.parse(last.start)) / 86400000,
      )
    : null;
  const recentMisses = bookings.filter(
    (b) =>
      b.status === "no presentada" &&
      b.start >= atTime(nextDay(dayKey(state.meta.now), -90), "00:00"),
  ).length;
  const label =
    recentMisses >= 2
      ? "Varias ausencias"
      : daysSince !== null && daysSince >= 90 && !upcoming
        ? "Hace tiempo que no viene"
        : visits.length >= 3
          ? "Habitual"
          : visits.length === 0
            ? "Nuevo"
            : "Ya nos conoce";
  const explanation =
    label === "Varias ausencias"
      ? `${recentMisses} citas no presentadas en los últimos 90 días.`
      : label === "Hace tiempo que no viene"
        ? "Al menos 90 días desde la última visita y sin próxima cita."
        : label === "Habitual"
          ? "Ha asistido a tres o más citas."
          : label === "Nuevo"
            ? "Todavía no tiene visitas atendidas."
            : "Tiene una o dos visitas atendidas.";
  const counts = new Map<string, number>();
  visits.forEach((b) =>
    counts.set(b.serviceName, (counts.get(b.serviceName) || 0) + 1),
  );
  return {
    bookings,
    visits: visits.length,
    cancellations: bookings.filter((b) => b.status === "cancelada").length,
    misses: bookings.filter((b) => b.status === "no presentada").length,
    upcoming,
    last,
    daysSince,
    label,
    explanation,
    usual: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
  };
}
export function metrics(state: State, from: string, to: string) {
  const all = filteredBookings(state, { from, to });
  const active = all.filter((b) => b.status !== "cancelada");
  const totalCapacity = capacity(state, from, to);
  const periodDays = daysBetween(from, to).length;
  const prior = filteredBookings(state, {
    from: nextDay(from, -periodDays),
    to: nextDay(from, -1),
  }).filter((b) => b.status !== "cancelada");
  const clients = [...new Set(active.map((b) => b.clientId))];
  let fresh = 0;
  for (const id of clients) {
    const first = active.find((b) => b.clientId === id)!;
    if (
      !state.bookings.some(
        (b) =>
          b.clientId === id && b.status === "atendida" && b.start < first.start,
      )
    )
      fresh++;
  }
  const serviceCounts = state.services
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      count: active.filter((b) => b.serviceId === s.id).length,
    }))
    .sort((a, b) => b.count - a.count);
  const sources = ["WhatsApp", "teléfono", "presencial", "web"].map((name) => ({
    name,
    count: active.filter((b) => b.source === name).length,
  }));
  const weeks = daysBetween(from, to).map((date) => ({
    date,
    count: active.filter((b) => dayKey(b.start) === date).length,
  }));
  return {
    all,
    active,
    count: active.length,
    priorCount: prior.length,
    change: prior.length
      ? Math.round(((active.length - prior.length) / prior.length) * 100)
      : null,
    revenue: active
      .filter((b) => ["confirmada", "atendida"].includes(b.status))
      .reduce((sum, b) => sum + b.price, 0),
    capacity: totalCapacity,
    occupancy: totalCapacity
      ? Math.round(
          (active.reduce((sum, b) => sum + b.duration, 0) / totalCapacity) *
            100,
        )
      : 0,
    fresh,
    recurring: clients.length - fresh,
    cancellations: all.filter((b) => b.status === "cancelada").length,
    misses: all.filter((b) => b.status === "no presentada").length,
    serviceCounts,
    sources,
    weeks,
  };
}
export interface Recommendation {
  title: string;
  text: string;
  action: string;
  target: "agenda" | "clients";
  date?: string;
  serviceId?: string;
  inactive?: boolean;
}
export function recommendations(
  state: State,
  from: string,
  to: string,
): Recommendation[] {
  const data = metrics(state, from, to);
  const result: Recommendation[] = [];
  if (!data.all.length) return result;
  const bands: {
    weekday: number;
    period: "morning" | "afternoon";
    date: string;
    capacity: number;
    used: number;
  }[] = [];
  for (const date of daysBetween(from, to))
    for (const period of ["morning", "afternoon"] as const) {
      const total = capacity(state, date, date, undefined, period);
      if (!total) continue;
      const used = data.active
        .filter(
          (b) =>
            dayKey(b.start) === date &&
            Number(timeLabel(b.start).slice(0, 2)) < 14 ===
              (period === "morning"),
        )
        .reduce((sum, b) => sum + b.duration, 0);
      const weekday = zoned(atTime(date, "12:00")).getDay();
      const band = bands.find(
        (b) => b.weekday === weekday && b.period === period,
      );
      if (band) {
        band.capacity += total;
        band.used += used;
      } else bands.push({ weekday, period, date, capacity: total, used });
    }
  const quiet = bands.sort(
    (a, b) => a.used / a.capacity - b.used / b.capacity,
  )[0];
  if (quiet)
    result.push({
      title: `Más espacio los ${dateLabel(quiet.date, "EEEE")} por la ${quiet.period === "morning" ? "mañana" : "tarde"}`,
      text: `En este periodo queda libre el ${Math.round(100 - (quiet.used / quiet.capacity) * 100)} % del tiempo de agenda de esa franja. Revisa qué sesiones caben.`,
      action: "Ver agenda de esa franja",
      target: "agenda",
      date: quiet.date,
    });
  const service = data.serviceCounts[0];
  if (service?.count)
    result.push({
      title: `${service.name} es el servicio más reservado`,
      text: `Representa ${service.count} de las ${data.count} citas no canceladas del periodo. Puede ayudarte a organizar el tiempo del equipo.`,
      action: "Ver estas citas",
      target: "agenda",
      serviceId: service.id,
    });
  const inactive = state.clients.filter(
    (c) => clientSummary(state, c).label === "Hace tiempo que no viene",
  );
  if (inactive.length)
    result.push({
      title: `${inactive.length} clientes llevan tiempo sin venir`,
      text: "No tienen próxima cita y hace al menos 90 días que no vienen. Puedes revisar su ficha y sus preferencias de contacto.",
      action: "Revisar clientes",
      target: "clients",
      inactive: true,
    });
  const nearest = upcomingGaps(state, 2)[0];
  if (nearest)
    result.push({
      title: `Un hueco próximo: ${dateLabel(nearest.start, "EEE d")} a las ${timeLabel(nearest.start)}`,
      text: `Hay espacio para ${nearest.serviceName.toLowerCase()} con ${nearest.professionalName} en las próximas 48 horas. No es una predicción de demanda.`,
      action: "Ver ese hueco",
      target: "agenda",
      date: dayKey(nearest.start),
      serviceId: nearest.serviceId,
    });
  if (data.cancellations || data.misses)
    result.push({
      title: "Los cambios también cuentan",
      text: `${data.cancellations} cancelaciones y ${data.misses} ausencias en el periodo. Revisa sus circunstancias antes de sacar conclusiones.`,
      action: "Revisar agenda",
      target: "agenda",
      date: from,
    });
  return result.slice(0, 5);
}
export function upcomingGaps(state: State, days = 1) {
  const gaps: {
    start: string;
    end: string;
    professionalId: string;
    professionalName: string;
    serviceId: string;
    serviceName: string;
  }[] = [];
  for (let i = 0; i <= days; i++)
    for (const service of state.services.filter((s) => s.active))
      for (const slot of availability(
        state,
        service.id,
        nextDay(dayKey(state.meta.now), i),
      ).slots) {
        if (
          Date.parse(slot.start) - Date.parse(state.meta.now) >=
          days * 86400000
        )
          continue;
        gaps.push({
          ...slot,
          professionalName: state.professionals.find(
            (p) => p.id === slot.professionalId,
          )!.name,
          serviceId: service.id,
          serviceName: service.name,
        });
      }
  return gaps
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter(
      (gap, i, all) =>
        !all
          .slice(0, i)
          .some(
            (other) =>
              other.professionalId === gap.professionalId &&
              Math.abs(minutes(other.start, gap.start)) < 60,
          ),
    );
}
