import type { State, Filters } from "./types";
import { filteredBookings, clientSummary } from "./insights";
import { dateLabel, timeLabel } from "./time";
export function exportTable(
  state: State,
  filters: Filters,
  kind: "bookings" | "clients",
) {
  const bookings = filteredBookings(state, filters);
  if (kind === "clients") {
    const ids = new Set(bookings.map((b) => b.clientId));
    return {
      headers: [
        "Nombre",
        "Teléfono",
        "Correo",
        "Visitas atendidas",
        "Última visita",
        "Comunicaciones",
      ],
      rows: state.clients
        .filter((c) => ids.has(c.id))
        .map((c) => {
          const summary = clientSummary(state, c);
          return [
            c.name,
            c.phone,
            c.email,
            String(summary.visits),
            summary.last ? dateLabel(summary.last.start, "dd/MM/yyyy") : "",
            c.communicationConsent ? "Sí" : "No",
          ];
        }),
    };
  }
  return {
    headers: [
      "Localizador",
      "Fecha",
      "Hora",
      "Cliente",
      "Teléfono",
      "Servicio",
      "Profesional",
      "Duración (min)",
      "Precio (EUR)",
      "Estado",
      "Procedencia",
    ],
    rows: bookings.map((b) => [
      b.code,
      dateLabel(b.start, "dd/MM/yyyy"),
      timeLabel(b.start),
      state.clients.find((c) => c.id === b.clientId)!.name,
      state.clients.find((c) => c.id === b.clientId)!.phone,
      b.serviceName,
      state.professionals.find((p) => p.id === b.professionalId)!.name,
      String(b.duration),
      (b.price / 100).toFixed(2).replace(".", ","),
      b.status,
      b.source,
    ]),
  };
}
export function safeCell(value: string) {
  return /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
}
export function csv(table: ReturnType<typeof exportTable>) {
  return (
    "\uFEFF" +
    [table.headers, ...table.rows]
      .map((row) =>
        row
          .map((value) => `"${safeCell(value).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\r\n") +
    "\r\n"
  );
}
export function tsv(table: ReturnType<typeof exportTable>) {
  return [table.headers, ...table.rows]
    .map((row) =>
      row.map((value) => safeCell(value).replace(/[\t\r\n]/g, " ")).join("\t"),
    )
    .join("\r\n");
}
