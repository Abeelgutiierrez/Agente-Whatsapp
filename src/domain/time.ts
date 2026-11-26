import { TZDate } from "@date-fns/tz";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
export const ZONE = "Europe/Madrid";
export const zoned = (value: string | number | Date) =>
  new TZDate(
    value instanceof Date
      ? value.getTime()
      : typeof value === "string"
        ? Date.parse(value)
        : value,
    ZONE,
  );
export const dayKey = (value: string | Date) =>
  format(zoned(value), "yyyy-MM-dd");
export const timeLabel = (value: string) => format(zoned(value), "HH:mm");
export const dateLabel = (value: string, pattern = "EEEE d 'de' MMMM") =>
  format(zoned(value.length === 10 ? atTime(value, "12:00") : value), pattern, {
    locale: es,
  });
export function atTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(
    new TZDate(y, m - 1, d, h, min, 0, ZONE).getTime(),
  ).toISOString();
}
export const nextDay = (date: string, n: number) =>
  dayKey(addDays(zoned(atTime(date, "12:00")), n));
export const weekStart = (date: string) =>
  dayKey(startOfWeek(zoned(atTime(date, "12:00")), { weekStartsOn: 1 }));
export const minutes = (start: string, end: string) =>
  (Date.parse(end) - Date.parse(start)) / 60000;
export const plusMinutes = (value: string, n: number) =>
  new Date(Date.parse(value) + n * 60000).toISOString();
export const money = (cents: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const overlap = (a: string, b: string, c: string, d: string) =>
  Date.parse(a) < Date.parse(d) && Date.parse(c) < Date.parse(b);
export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let d = from; d <= to && days.length < 370; d = nextDay(d, 1))
    days.push(d);
  return days;
}
