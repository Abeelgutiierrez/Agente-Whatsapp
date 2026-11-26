"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  History,
  Leaf,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type {
  State,
  PublicConfig,
  Booking,
  Client,
  Filters,
  Status,
} from "@/domain/types";
import { statuses } from "@/domain/types";
import {
  dateLabel,
  dayKey,
  money,
  nextDay,
  timeLabel,
  weekStart,
  daysBetween,
} from "@/domain/time";
import {
  clientSummary,
  filteredBookings,
  metrics,
  upcomingGaps,
  recommendations,
  type Recommendation,
} from "@/domain/insights";
import { exportTable, csv, tsv } from "@/domain/export";
import { api, copy, download } from "@/lib/http";
import {
  Badge,
  Empty,
  ErrorBox,
  Metric,
  Modal,
  PageTitle,
  TextLink,
} from "./ui";
import { BookingFlow, type Editing } from "./booking-flow";
import { Settings } from "./settings";
import type { Section } from "./workspace";
type Props = {
  state: State;
  config: PublicConfig;
  section: Section;
  onSection: (s: Section) => void;
  refresh: (force?: boolean) => Promise<void>;
  notify: (text: string) => void;
  newBooking: () => void;
  focusBooking?: string | null;
  onFocusHandled?: () => void;
  recentWhatsApp?: string[];
};
export function Business({
  state,
  config,
  section,
  onSection,
  refresh,
  notify,
  newBooking,
  focusBooking,
  onFocusHandled,
  recentWhatsApp = [],
}: Props) {
  const today = dayKey(state.meta.now);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<Editing | null>(null);
  const [exportKind, setExportKind] = useState<"bookings" | "clients" | null>(
    null,
  );
  const [filters, setFilters] = useState<Filters>({ from: today, to: today });
  const [inactive, setInactive] = useState(false);
  const [message, setMessage] = useState<{
    bookingId: string | null;
    clientId: string | null;
    text: string;
    name: string;
  } | null>(null);
  const selected = state.bookings.find((b) => b.id === bookingId);
  const client = state.clients.find((c) => c.id === clientId);
  // Llegada desde el WhatsApp de la vista cliente: abre la cita recién creada.
  useEffect(() => {
    if (focusBooking && state.bookings.some((b) => b.id === focusBooking)) {
      setBookingId(focusBooking);
      onFocusHandled?.();
    }
  }, [focusBooking, state.bookings, onFocusHandled]);
  function goAgenda(date = today, serviceId = "", status = "") {
    setFilters({ from: date, to: date, serviceId, status });
    onSection("agenda");
  }
  function openMessage(b?: Booking, c?: Client) {
    const person = c || state.clients.find((c) => c.id === b?.clientId);
    if (!person) return;
    setMessage({
      bookingId: b?.id || null,
      clientId: person.id,
      name: person.name,
      text: b
        ? `Hola ${person.name.split(" ")[0]} 👋 Te escribimos de ${state.business.name} sobre tu cita de ${b.serviceName} del ${dateLabel(b.start)} a las ${timeLabel(b.start)}. Tu localizador es ${b.code}.`
        : `Hola ${person.name.split(" ")[0]}, somos el equipo de ${state.business.name}. ¿En qué podemos ayudarte?`,
    });
  }
  function recommendation(r: Recommendation) {
    if (r.target === "clients") {
      setInactive(Boolean(r.inactive));
      onSection("clients");
    } else goAgenda(r.date || today, r.serviceId);
  }
  async function act(b: Booking, status: Status) {
    try {
      await api("admin", {
        action: "change",
        data: { id: b.id, version: b.version, status },
      });
      await refresh(true);
      notify(
        status === "cancelada"
          ? "Cita cancelada. El hueco vuelve a estar disponible."
          : "Estado de la cita actualizado.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      {section === "today" && (
        <Today
          state={state}
          openBooking={setBookingId}
          goAgenda={goAgenda}
          newBooking={newBooking}
          onMessage={openMessage}
          act={act}
          recentWhatsApp={recentWhatsApp}
        />
      )}
      {section === "agenda" && (
        <Agenda
          state={state}
          filters={filters}
          setFilters={setFilters}
          openBooking={setBookingId}
          newBooking={newBooking}
          onExport={() => setExportKind("bookings")}
        />
      )}
      {section === "clients" && (
        <Clients
          state={state}
          inactive={inactive}
          setInactive={setInactive}
          openClient={setClientId}
          onExport={() => {
            setFilters({ from: nextDay(today, -84), to: nextDay(today, 60) });
            setExportKind("clients");
          }}
          notify={notify}
        />
      )}
      {section === "insights" && (
        <Insights state={state} onRecommendation={recommendation} />
      )}
      {section === "settings" && (
        <Settings state={state} refresh={refresh} notify={notify} />
      )}
      <Modal
        open={Boolean(selected) && !editing}
        onClose={() => setBookingId(null)}
        title="Detalle de la cita"
        description={
          selected ? `${selected.code} · Reserva por ${selected.source}` : ""
        }
        wide
      >
        {selected && (
          <BookingDetails
            key={selected.id}
            state={state}
            booking={selected}
            refresh={refresh}
            notify={notify}
            onEdit={() => {
              setEditingSnapshot({
                ...selected,
                phone: state.clients.find((c) => c.id === selected.clientId)!
                  .phone,
              });
              setEditing(true);
            }}
            onClient={() => {
              setClientId(selected.clientId);
              setBookingId(null);
            }}
            onMessage={() => openMessage(selected)}
            act={act}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(selected) && editing}
        onClose={() => setEditing(false)}
        title="Reprogramar cita"
        description="La cita original se conserva hasta guardar una nueva hora."
        wide
      >
        {selected && editing && editingSnapshot && (
          <BookingFlow
            config={config}
            adminState={state}
            editing={editingSnapshot}
            onExit={() => setEditing(false)}
            onComplete={() => {
              setEditing(false);
              refresh(true);
              notify("Cita reprogramada. La hora anterior queda libre.");
            }}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(client)}
        onClose={() => setClientId(null)}
        title={client?.name || "Ficha de cliente"}
        description="Contexto útil para una atención más cercana."
        wide
      >
        {client && (
          <ClientDetails
            key={client.id}
            state={state}
            client={client}
            refresh={refresh}
            notify={notify}
            onMessage={() => openMessage(undefined, client)}
            openBooking={(id) => {
              setClientId(null);
              setBookingId(id);
            }}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(exportKind)}
        onClose={() => setExportKind(null)}
        title={
          exportKind === "clients" ? "Exportar clientes" : "Exportar citas"
        }
        description="Elige qué necesitas llevar a Excel. Las notas internas no se incluyen."
        wide
      >
        {exportKind && (
          <ExportDialog
            state={state}
            kind={exportKind}
            initial={filters}
            notify={notify}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(message)}
        onClose={() => setMessage(null)}
        title="Preparar WhatsApp"
        description={`Para ${message?.name || ""} · Simulación sin envío real.`}
      >
        {message && (
          <MessageComposer
            value={message.text}
            onSave={async (text) => {
              await api("admin", {
                action: "message",
                data: {
                  bookingId: message.bookingId,
                  clientId: message.clientId,
                  kind: "Mensaje de atención",
                  text,
                },
              });
              await refresh(true);
              setMessage(null);
              notify("Mensaje registrado como simulación. No se ha enviado.");
            }}
            notify={notify}
          />
        )}
      </Modal>
    </>
  );
}
function Today({
  state,
  openBooking,
  goAgenda,
  newBooking,
  onMessage,
  recentWhatsApp,
}: {
  state: State;
  openBooking: (id: string) => void;
  goAgenda: (date?: string, serviceId?: string, status?: string) => void;
  newBooking: () => void;
  onMessage: (b: Booking) => void;
  act: (b: Booking, status: Status) => Promise<void>;
  recentWhatsApp: string[];
}) {
  const today = dayKey(state.meta.now);
  const data = useMemo(() => metrics(state, today, today), [state, today]);
  const [showPast, setShowPast] = useState(false);
  const upcoming = data.all.filter(
    (b) =>
      ["confirmada", "pendiente"].includes(b.status) && b.end > state.meta.now,
  );
  const next = upcoming[0];
  const nextClient = state.clients.find((c) => c.id === next?.clientId);
  const pending = upcoming.filter((b) => b.status === "pendiente");
  const gaps = useMemo(
    () => upcomingGaps(state, 1).filter((g) => dayKey(g.start) === today),
    [state, today],
  );
  const cancelled = data.all.find((b) => b.status === "cancelada");
  const waiting = state.messages.find(
    (m) =>
      m.status.includes("sin respuesta") &&
      state.bookings.some(
        (b) =>
          b.id === m.bookingId &&
          dayKey(b.start) === today &&
          b.status === "pendiente",
      ),
  );
  // Reservas que han entrado por WhatsApp mientras la demo está abierta.
  const fromWhatsApp = recentWhatsApp
    .map((id) => state.bookings.find((b) => b.id === id))
    .filter((b): b is Booking => Boolean(b) && b!.status !== "cancelada");
  const latestWhatsApp = fromWhatsApp.at(-1);
  const latestClient = state.clients.find(
    (c) => c.id === latestWhatsApp?.clientId,
  );
  const visible = data.all.filter((b) => showPast || b.end > state.meta.now);
  const remaining = next
    ? Math.max(
        0,
        Math.round(
          (Date.parse(next.start) - Date.parse(state.meta.now)) / 60000,
        ),
      )
    : 0;
  const timeline: (
    | { type: "booking"; start: string; booking: Booking }
    | { type: "gap"; start: string; gap: (typeof gaps)[number] }
  )[] = [
    ...visible.map((booking) => ({
      type: "booking" as const,
      start: booking.start,
      booking,
    })),
    ...gaps
      .slice(0, 5)
      .map((gap) => ({ type: "gap" as const, start: gap.start, gap })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <>
      <PageTitle
        eyebrow="TU DÍA, EN EQUILIBRIO"
        title="Buenos días, equipo"
        description={`${dateLabel(state.meta.now)} · Un buen día empieza con todo en su sitio.`}
        action={
          <button className="button primary" onClick={newBooking}>
            <Plus size={17} />
            Nueva cita
          </button>
        }
      />
      <div className="daily-overview">
        <div className="next-card">
          <div className="next-card-top">
            <span>
              <span className="live-dot" />
              {remaining === 0 ? "AHORA EN LA CLÍNICA" : "TU PRÓXIMA CITA"}
            </span>
            <span>
              {next
                ? remaining === 0
                  ? "Es la hora"
                  : `En ${remaining} min`
                : "Un momento de calma"}
            </span>
          </div>
          {next && nextClient ? (
            <>
              <div className="next-person">
                <span className="next-avatar">
                  {nextClient.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <h2>{nextClient.name}</h2>
                  <p>
                    {next.serviceName} ·{" "}
                    {
                      state.professionals.find(
                        (p) => p.id === next.professionalId,
                      )?.name
                    }
                  </p>
                </div>
                <strong>
                  {timeLabel(next.start)}
                  <small>{next.duration} min</small>
                </strong>
              </div>
              <div className="next-card-bottom">
                <span>
                  <UserRound size={13} />
                  {clientSummary(state, nextClient).label}
                </span>
                <button onClick={() => openBooking(next.id)}>
                  Ver cita
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="next-person">
              <Leaf size={35} />
              <div>
                <h2>Todo al día</h2>
                <p>No quedan citas pendientes para hoy.</p>
              </div>
            </div>
          )}
        </div>
        <div className="daily-note">
          <span className="note-illustration">
            <Sparkles size={25} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">UN POCO MÁS DE PERSPECTIVA</span>
          <h3>
            {gaps.length
              ? "Todavía hay espacio para cuidar."
              : "La agenda está bien encaminada."}
          </h3>
          <p>
            {gaps.length
              ? `Hay huecos reservables hoy. Puedes revisar la agenda y encontrar el que mejor encaje.`
              : "Revisa las próximas citas y prepara la atención con calma."}
          </p>
          <TextLink onClick={() => goAgenda()}>Explorar la agenda</TextLink>
        </div>
      </div>
      <div className="metric-strip">
        <Metric
          label="Citas de hoy"
          value={data.all.length}
          detail={`${data.all.filter((b) => b.status === "atendida").length} ya atendidas`}
          help="Todas las citas fechadas hoy, incluidas las canceladas. Te da una vista del movimiento del día."
        />
        <Metric
          label="Confirmadas"
          value={data.all.filter((b) => b.status === "confirmada").length}
          help="Citas de hoy en estado confirmado, todavía sin marcar como atendidas."
        />
        <Metric
          label="Pendientes"
          value={pending.length}
          detail="Por confirmar"
          help="Reservas de hoy que aún necesitan confirmación. Mantienen su hueco reservado."
        />
        <Metric
          label="Canceladas"
          value={data.cancellations}
          help="Citas de hoy canceladas. Sus huecos se vuelven a ofrecer si aún cumplen la antelación."
        />
        <Metric
          label="Ocupación"
          value={`${data.occupancy}%`}
          help="Minutos de servicio no cancelados divididos entre minutos de trabajo tras bloqueos. No equivale a asistencia; no incluye los márgenes como tiempo ocupado."
        />
        <Metric
          label="Ingresos previstos"
          value={money(data.revenue)}
          help="Precio acordado de citas confirmadas o atendidas de hoy. No equivale a cobros ni contabilidad."
        />
      </div>
      <div className="work-grid">
        <section className="panel timeline-panel">
          <div className="panel-heading">
            <div className="heading-with-count">
              <h2>La agenda de hoy</h2>
              <span>{data.all.length}</span>
            </div>
            <TextLink onClick={() => goAgenda()}>Ver agenda completa</TextLink>
          </div>
          <div className="agenda-legend">
            <span>
              <i className="legend-dot" />
              Citas y huecos disponibles
            </span>
            <button onClick={() => setShowPast(!showPast)}>
              {showPast
                ? "Ocultar citas terminadas"
                : "Ver también las terminadas"}
            </button>
          </div>
          {timeline.length ? (
            timeline.map((row) =>
              row.type === "gap" ? (
                <button
                  className="gap-row"
                  key={`gap-${row.gap.professionalId}-${row.start}`}
                  onClick={newBooking}
                >
                  <span>{timeLabel(row.start)}</span>
                  <span className="gap-line" />
                  <Plus size={13} />
                  <div>
                    <strong>Un hueco disponible</strong>
                    <small>
                      {row.gap.professionalName} · Cabe{" "}
                      {row.gap.serviceName.toLowerCase()}
                    </small>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
              ) : (
                <AppointmentRow
                  key={row.booking.id}
                  state={state}
                  booking={row.booking}
                  onOpen={() => openBooking(row.booking.id)}
                  onMessage={() => onMessage(row.booking)}
                />
              ),
            )
          ) : (
            <Empty
              title="Todo listo por hoy"
              text="Puedes revisar los próximos días o crear una nueva cita."
            />
          )}
          <div className="panel-bottom">
            <span className="live-dot" />
            Los cambios de tus clientes aparecen aquí automáticamente.
          </div>
        </section>
        <aside className="work-aside">
          <section className="panel attention-panel">
            <div className="panel-heading">
              <h2>Un momento de atención</h2>
              <span className="attention-count">
                {Number(Boolean(latestWhatsApp)) +
                  Number(pending.length > 0) +
                  Number(Boolean(cancelled)) +
                  Number(Boolean(waiting)) +
                  Number(data.occupancy >= 80)}
              </span>
            </div>
            <div className="attention-content">
              {latestWhatsApp && (
                <div className="attention-item whatsapp-item">
                  <span className="attention-icon green">
                    <MessageCircle size={16} />
                  </span>
                  <div>
                    <h3>
                      {fromWhatsApp.length === 1
                        ? "Nueva reserva por WhatsApp"
                        : `${fromWhatsApp.length} reservas nuevas por WhatsApp`}
                    </h3>
                    <p>
                      {latestClient?.name} · {latestWhatsApp.serviceName} ·{" "}
                      {dateLabel(latestWhatsApp.start, "EEEE d")} a las{" "}
                      {timeLabel(latestWhatsApp.start)}. Reservada por el
                      asistente, sin llamadas.
                    </p>
                    <TextLink onClick={() => openBooking(latestWhatsApp.id)}>
                      Ver la reserva
                    </TextLink>
                  </div>
                </div>
              )}
              {pending.length > 0 && (
                <div className="attention-item">
                  <span className="attention-icon amber">
                    <Clock3 size={16} />
                  </span>
                  <div>
                    <h3>
                      {pending.length}{" "}
                      {pending.length === 1
                        ? "cita por confirmar"
                        : "citas por confirmar"}
                    </h3>
                    <p>Un mensaje puede dejarlo todo preparado.</p>
                    <TextLink onClick={() => goAgenda(today, "", "pendiente")}>
                      Revisar pendientes
                    </TextLink>
                  </div>
                </div>
              )}
              {cancelled && (
                <div className="attention-item">
                  <span className="attention-icon rose">
                    <CalendarDays size={16} />
                  </span>
                  <div>
                    <h3>Se ha liberado un hueco</h3>
                    <p>
                      {timeLabel(cancelled.start)} · {cancelled.serviceName}. La
                      cita está cancelada.
                    </p>
                    <TextLink onClick={() => openBooking(cancelled.id)}>
                      Ver el cambio
                    </TextLink>
                  </div>
                </div>
              )}
              {waiting && (
                <div className="attention-item">
                  <span className="attention-icon green">
                    <MessageCircle size={16} />
                  </span>
                  <div>
                    <h3>Una respuesta pendiente</h3>
                    <p>Hay una confirmación simulada sin respuesta.</p>
                    <TextLink onClick={() => openBooking(waiting.bookingId!)}>
                      Consultar la cita
                    </TextLink>
                  </div>
                </div>
              )}
              {data.occupancy >= 80 && (
                <div className="info-box">
                  La agenda está casi completa. Revisa los márgenes antes de
                  añadir una cita.
                </div>
              )}
              {!pending.length && !cancelled && !waiting && !latestWhatsApp && (
                <Empty
                  title="Todo bajo control"
                  text="No hay avisos que necesiten tu atención."
                />
              )}
            </div>
          </section>
          <section className="care-note">
            <div className="care-note-art">
              <Leaf size={41} strokeWidth={1} />
              <span />
            </div>
            <h3>
              Menos llamadas.
              <br />
              Más atención.
            </h3>
            <p>
              Tus clientes pueden reservar mientras tú te ocupas de lo
              importante.
            </p>
            <span>EL EQUILIBRIO ESTÁ EN LOS DETALLES</span>
          </section>
        </aside>
      </div>
    </>
  );
}
function AppointmentRow({
  state,
  booking: b,
  onOpen,
  onMessage,
}: {
  state: State;
  booking: Booking;
  onOpen: () => void;
  onMessage?: () => void;
}) {
  const c = state.clients.find((c) => c.id === b.clientId)!;
  const p = state.professionals.find((p) => p.id === b.professionalId)!;
  return (
    <div
      className={`appointment-row ${b.status === "cancelada" ? "cancelled-row" : ""} ${b.createdAt === state.meta.now ? "new-row" : ""}`}
    >
      <strong>
        {timeLabel(b.start)}
        <small>{timeLabel(b.end)}</small>
      </strong>
      <span className="appointment-mark" style={{ background: p.color }} />
      <button className="appointment-person" onClick={onOpen}>
        <span
          className="avatar"
          style={{ background: `${p.color}13`, color: p.color }}
        >
          {c.name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")}
        </span>
        <span>
          <strong>{c.name}</strong>
          <small>
            {b.serviceName} <b>·</b> {p.name}
          </small>
        </span>
      </button>
      <Badge status={b.status} />
      {onMessage && (
        <button
          className="icon-button row-message"
          aria-label={`WhatsApp para ${c.name}`}
          onClick={onMessage}
        >
          <MessageCircle size={16} />
        </button>
      )}
      <button
        className="icon-button"
        aria-label={`Abrir cita de ${c.name} a las ${timeLabel(b.start)}`}
        onClick={onOpen}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
function FilterFields({
  state,
  filters,
  onChange,
  dates = true,
}: {
  state: State;
  filters: Filters;
  onChange: (f: Filters) => void;
  dates?: boolean;
}) {
  return (
    <div className="filter-fields">
      {dates && (
        <>
          <label>
            Desde
            <input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
            />
          </label>
        </>
      )}
      <label>
        Profesional
        <select
          aria-label="Profesional"
          value={filters.professionalId || ""}
          onChange={(e) =>
            onChange({ ...filters, professionalId: e.target.value })
          }
        >
          <option value="">Todo el equipo</option>
          {state.professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Servicio
        <select
          aria-label="Servicio"
          value={filters.serviceId || ""}
          onChange={(e) => onChange({ ...filters, serviceId: e.target.value })}
        >
          <option value="">Todos los servicios</option>
          {state.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select
          aria-label="Estado"
          value={filters.status || ""}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
function Agenda({
  state,
  filters,
  setFilters,
  openBooking,
  newBooking,
  onExport,
}: {
  state: State;
  filters: Filters;
  setFilters: (f: Filters) => void;
  openBooking: (id: string) => void;
  newBooking: () => void;
  onExport: () => void;
}) {
  const [view, setView] = useState<"day" | "week">("day");
  const start = view === "week" ? weekStart(filters.from) : filters.from;
  const end = view === "week" ? nextDay(start, 6) : start;
  const bookings = filteredBookings(state, {
    ...filters,
    from: start,
    to: end,
  });
  function shift(n: number) {
    const date = nextDay(start, n * (view === "week" ? 7 : 1));
    setFilters({
      ...filters,
      from: date,
      to: view === "week" ? nextDay(date, 6) : date,
    });
  }
  return (
    <>
      <PageTitle
        eyebrow="ESPACIO PARA CADA PERSONA"
        title="Tu agenda"
        description="Cada cita en su sitio. Los cambios, siempre a mano."
        action={
          <div className="button-row">
            <button className="button secondary" onClick={onExport}>
              <ArrowDownToLine size={16} />
              Exportar
            </button>
            <button className="button primary" onClick={newBooking}>
              <Plus size={17} />
              Nueva cita
            </button>
          </div>
        }
      />
      <div className="panel agenda-view">
        <div className="agenda-toolbar">
          <div className="date-navigation">
            <button
              className="icon-button"
              aria-label="Periodo anterior"
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong>
              {view === "week"
                ? `${dateLabel(start, "d MMM")} — ${dateLabel(end, "d MMM yyyy")}`
                : dateLabel(start, "EEEE d 'de' MMMM")}
            </strong>
            <button
              className="icon-button"
              aria-label="Periodo siguiente"
              onClick={() => shift(1)}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="button secondary small"
              onClick={() =>
                setFilters({
                  ...filters,
                  from: dayKey(state.meta.now),
                  to: dayKey(state.meta.now),
                })
              }
            >
              Hoy
            </button>
            <input
              aria-label="Ir a fecha"
              type="date"
              value={start}
              onChange={(e) => {
                if (e.target.value)
                  setFilters({
                    ...filters,
                    from: e.target.value,
                    to: e.target.value,
                  });
              }}
            />
          </div>
          <div className="view-switch">
            <button
              className={view === "day" ? "selected" : ""}
              onClick={() => {
                setView("day");
                setFilters({ ...filters, to: filters.from });
              }}
            >
              Día
            </button>
            <button
              className={view === "week" ? "selected" : ""}
              onClick={() => {
                setView("week");
                setFilters({
                  ...filters,
                  from: weekStart(filters.from),
                  to: nextDay(weekStart(filters.from), 6),
                });
              }}
            >
              Semana
            </button>
          </div>
        </div>
        <FilterFields
          state={state}
          filters={filters}
          onChange={setFilters}
          dates={false}
        />
        {view === "day" ? (
          bookings.length ? (
            bookings.map((b) => (
              <AppointmentRow
                key={b.id}
                state={state}
                booking={b}
                onOpen={() => openBooking(b.id)}
              />
            ))
          ) : (
            <Empty
              title="La agenda tiene espacio"
              text="No hay citas con estos filtros. Puedes crear una nueva o elegir otro día."
              action={
                <button className="button secondary" onClick={newBooking}>
                  Crear cita
                </button>
              }
            />
          )
        ) : (
          <div className="week-scroll">
            <div className="week-grid">
              {daysBetween(start, end).map((date) => (
                <section
                  key={date}
                  className={`week-day ${date === dayKey(state.meta.now) ? "is-today" : ""}`}
                >
                  <header>
                    <span>{dateLabel(date, "EEE")}</span>
                    <strong>{dateLabel(date, "d")}</strong>
                    <small>
                      {bookings.filter((b) => dayKey(b.start) === date).length}{" "}
                      citas
                    </small>
                  </header>
                  <div>
                    {bookings
                      .filter((b) => dayKey(b.start) === date)
                      .map((b) => (
                        <button
                          key={b.id}
                          className={`week-booking ${b.status === "cancelada" ? "cancelled-row" : ""}`}
                          style={{
                            borderLeftColor: state.professionals.find(
                              (p) => p.id === b.professionalId,
                            )?.color,
                          }}
                          onClick={() => openBooking(b.id)}
                        >
                          <strong>
                            {timeLabel(b.start)} ·{" "}
                            {
                              state.professionals.find(
                                (p) => p.id === b.professionalId,
                              )?.name
                            }
                          </strong>
                          <span>
                            {
                              state.clients.find((c) => c.id === b.clientId)
                                ?.name
                            }
                          </span>
                          <small>{b.serviceName}</small>
                          <Badge status={b.status} />
                        </button>
                      ))}
                    {!bookings.some((b) => dayKey(b.start) === date) && (
                      <p className="week-empty">Sin citas</p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
function BookingDetails({
  state,
  booking: b,
  refresh,
  notify,
  onEdit,
  onClient,
  onMessage,
  act,
}: {
  state: State;
  booking: Booking;
  refresh: (force?: boolean) => Promise<void>;
  notify: (s: string) => void;
  onEdit: () => void;
  onClient: () => void;
  onMessage: () => void;
  act: (b: Booking, status: Status) => Promise<void>;
}) {
  const c = state.clients.find((c) => c.id === b.clientId)!;
  const [note, setNote] = useState(b.internalNote);
  const [noteVersion, setNoteVersion] = useState(b.version);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const saved = await api<Booking>("admin", {
        action: "change",
        data: { id: b.id, version: noteVersion, internalNote: note },
      });
      setNoteVersion(saved.version);
      await refresh(true);
      notify("Nota interna guardada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="booking-detail-head">
        <span className="avatar large">
          {c.name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")}
        </span>
        <div>
          <h2>{c.name}</h2>
          <TextLink onClick={onClient}>Abrir ficha del cliente</TextLink>
        </div>
        <Badge status={b.status} />
      </div>
      <div className="detail-facts">
        <div>
          <small>Servicio</small>
          <strong>{b.serviceName}</strong>
        </div>
        <div>
          <small>Profesional</small>
          <strong>
            {state.professionals.find((p) => p.id === b.professionalId)?.name}
          </strong>
        </div>
        <div>
          <small>Día y hora</small>
          <strong>
            {dateLabel(b.start, "dd MMM yyyy")} · {timeLabel(b.start)}
          </strong>
        </div>
        <div>
          <small>Duración y precio acordados</small>
          <strong>
            {b.duration} min · {money(b.price)}
          </strong>
        </div>
      </div>
      <div className="contact-line">
        <Phone size={15} />
        <span>{c.phone}</span>
        <button
          className="text-link"
          onClick={() =>
            copy(c.phone)
              .then(() => notify("Teléfono copiado."))
              .catch((e) => setError(e.message))
          }
        >
          <Copy size={13} />
          Copiar teléfono
        </button>
        <button className="text-link" onClick={onMessage}>
          <MessageCircle size={14} />
          WhatsApp
        </button>
      </div>
      {b.customerNote && (
        <div className="info-box">
          <strong>Nota del cliente</strong>
          <p>{b.customerNote}</p>
        </div>
      )}
      <ErrorBox error={error} />
      <div className="booking-actions">
        {b.status === "pendiente" && (
          <button
            className="button primary"
            onClick={() => act(b, "confirmada")}
          >
            <Check size={16} />
            Confirmar
          </button>
        )}
        {["confirmada", "pendiente"].includes(b.status) && (
          <>
            <button className="button secondary" onClick={onEdit}>
              <CalendarDays size={16} />
              Reprogramar
            </button>
            <button
              className="button secondary"
              disabled={b.start > state.meta.now}
              title={
                b.start > state.meta.now
                  ? "Disponible cuando llegue la hora de la cita"
                  : undefined
              }
              onClick={() => act(b, "atendida")}
            >
              Marcar atendida
            </button>
            <button
              className="button secondary"
              disabled={b.start > state.meta.now}
              onClick={() => act(b, "no presentada")}
            >
              No presentada
            </button>
            <button className="button danger" onClick={() => setCancel(true)}>
              Cancelar
            </button>
          </>
        )}
        {["atendida", "no presentada"].includes(b.status) && (
          <button
            className="button secondary"
            onClick={() =>
              act(b, b.status === "atendida" ? "no presentada" : "atendida")
            }
          >
            Corregir asistencia:{" "}
            {b.status === "atendida" ? "no presentada" : "atendida"}
          </button>
        )}
      </div>
      <label className="field note-field">
        Nota interna
        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => {
            if (note === b.internalNote) setNoteVersion(b.version);
            setNote(e.target.value);
          }}
          placeholder="Preferencias y detalles de atención. Sin información clínica."
        />
      </label>
      <button
        className="button secondary small"
        onClick={save}
        disabled={busy || note === b.internalNote}
      >
        Guardar nota
      </button>
      <div className="history">
        <h3>
          <History size={16} />
          Historial de la cita
        </h3>
        {state.events
          .filter((e) => e.bookingId === b.id)
          .slice()
          .reverse()
          .map((e) => (
            <div className="history-item" key={e.id}>
              <span />
              <div>
                <strong>{e.action}</strong>
                <small>
                  {dateLabel(e.at, "dd MMM")} · {timeLabel(e.at)} · {e.actor}
                </small>
                {e.before && <p>Antes: {e.before}</p>}
                {e.after && <p>Después: {e.after}</p>}
              </div>
            </div>
          ))}
      </div>
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title="¿Cancelar esta cita?"
        description="El hueco quedará libre. La cita y su historial se conservarán."
      >
        <p>
          {c.name} · {dateLabel(b.start)} · {timeLabel(b.start)}
        </p>
        <div className="button-row">
          <button className="button secondary" onClick={() => setCancel(false)}>
            Conservar cita
          </button>
          <button
            className="button danger"
            onClick={async () => {
              await act(b, "cancelada");
              setCancel(false);
            }}
          >
            Sí, cancelar
          </button>
        </div>
      </Modal>
    </>
  );
}
function Clients({
  state,
  inactive,
  setInactive,
  openClient,
  onExport,
  notify,
}: {
  state: State;
  inactive: boolean;
  setInactive: (v: boolean) => void;
  openClient: (id: string) => void;
  onExport: () => void;
  notify: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const clients = useMemo(
    () =>
      state.clients
        .map((c) => ({ client: c, summary: clientSummary(state, c) }))
        .filter(
          ({ client: c, summary }) =>
            (!inactive || summary.label === "Hace tiempo que no viene") &&
            (c.name
              .toLocaleLowerCase("es")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .includes(
                query
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, ""),
              ) ||
              c.phone.includes(query.replace(/\s/g, ""))),
        )
        .sort((a, b) => a.client.name.localeCompare(b.client.name, "es")),
    [state, inactive, query],
  );
  return (
    <>
      <PageTitle
        eyebrow="PERSONAS, NO SOLO CITAS"
        title="Tus clientes"
        description="Conoce su recorrido. Haz que cada visita se sienta cercana."
        action={
          <button className="button secondary" onClick={onExport}>
            <ArrowDownToLine size={16} />
            Exportar clientes
          </button>
        }
      />
      <div className="client-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar por nombre o teléfono…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <button
          className={`button ${inactive ? "primary" : "secondary"}`}
          onClick={() => {
            setInactive(!inactive);
            setPage(0);
          }}
        >
          <Clock3 size={16} />
          {inactive ? "Mostrando inactivos" : "Hace tiempo que no vienen"}
        </button>
        <button
          className="button secondary"
          onClick={() =>
            copy(
              tsv({
                headers: ["Nombre", "Teléfono", "Etiqueta"],
                rows: clients
                  .slice(page * 12, page * 12 + 12)
                  .map(({ client: c, summary }) => [
                    c.name,
                    c.phone,
                    summary.label,
                  ]),
              }),
            )
              .then(() => notify("Tabla visible copiada."))
              .catch((e) => notify(e.message))
          }
        >
          <Copy size={15} />
          Copiar tabla
        </button>
      </div>
      <div className="list-summary">
        {clients.length} clientes{" "}
        {inactive
          ? "sin próxima cita y con más de 90 días desde su última visita"
          : ""}
      </div>
      {clients.length ? (
        <div className="client-grid">
          {clients
            .slice(page * 12, page * 12 + 12)
            .map(({ client: c, summary }) => (
              <button
                key={c.id}
                className="client-card"
                onClick={() => openClient(c.id)}
              >
                <div className="client-card-top">
                  <span className="avatar large">
                    {c.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                <h3>{c.name}</h3>
                <p>{c.phone}</p>
                <span
                  className={`client-tag ${summary.label === "Habitual" ? "habitual" : ""}`}
                  title={summary.explanation}
                >
                  {summary.label}
                </span>
                <div className="client-card-facts">
                  <span>
                    <strong>{summary.visits}</strong> visitas
                  </span>
                  <span>
                    {summary.upcoming
                      ? `Próxima: ${dateLabel(summary.upcoming.start, "d MMM")}`
                      : summary.last
                        ? `Última: ${dateLabel(summary.last.start, "d MMM")}`
                        : "Primera visita por venir"}
                  </span>
                </div>
              </button>
            ))}
        </div>
      ) : (
        <Empty
          title="No encontramos coincidencias"
          text="Prueba con otro nombre o teléfono, o quita el filtro."
        />
      )}
      {clients.length > 12 && (
        <div className="pagination">
          <button
            className="button secondary small"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page + 1} de {Math.ceil(clients.length / 12)}
          </span>
          <button
            className="button secondary small"
            disabled={(page + 1) * 12 >= clients.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
function ClientDetails({
  state,
  client: c,
  refresh,
  notify,
  onMessage,
  openBooking,
}: {
  state: State;
  client: Client;
  refresh: (force?: boolean) => Promise<void>;
  notify: (s: string) => void;
  onMessage: () => void;
  openBooking: (id: string) => void;
}) {
  const summary = clientSummary(state, c);
  const [form, setForm] = useState({ ...c });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api("admin", { action: "client", data: form });
      await refresh(true);
      notify("Ficha de cliente guardada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="client-summary">
        <span className="client-tag">{summary.label}</span>
        <p>{summary.explanation}</p>
        <div className="detail-facts">
          <div>
            <small>Visitas atendidas</small>
            <strong>{summary.visits}</strong>
          </div>
          <div>
            <small>Cancelaciones / ausencias</small>
            <strong>
              {summary.cancellations} / {summary.misses}
            </strong>
          </div>
          <div>
            <small>Última visita</small>
            <strong>
              {summary.last
                ? `${dateLabel(summary.last.start, "dd MMM yyyy")} · hace ${summary.daysSince} días`
                : "Aún no ha venido"}
            </strong>
          </div>
          <div>
            <small>Servicios habituales</small>
            <strong>{summary.usual.join(", ") || "Por conocer"}</strong>
          </div>
        </div>
        {summary.upcoming && (
          <button
            className="upcoming-client"
            onClick={() => openBooking(summary.upcoming!.id)}
          >
            <CalendarDays size={18} />
            <span>
              Próxima cita
              <strong>
                {dateLabel(summary.upcoming.start, "EEE d MMM")} ·{" "}
                {timeLabel(summary.upcoming.start)}
              </strong>
            </span>
            <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      <div className="button-row">
        <button className="button secondary" onClick={onMessage}>
          <MessageCircle size={15} />
          Preparar WhatsApp
        </button>
        <button
          className="button secondary"
          onClick={() =>
            copy(c.phone)
              .then(() => notify("Teléfono copiado."))
              .catch((e) => setError(e.message))
          }
        >
          <Copy size={14} />
          Copiar teléfono
        </button>
      </div>
      <ErrorBox error={error} />
      <div className="form-row">
        <label className="field">
          Nombre
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          Teléfono
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
      </div>
      <label className="field">
        Correo electrónico
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label className="field">
        Notas internas
        <textarea
          rows={3}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <small>
          Preferencias de atención. No guardes diagnósticos ni información
          médica.
        </small>
      </label>
      <p className="quiet">
        Privacidad para gestionar citas:{" "}
        {c.privacyConsent ? "aceptada" : "pendiente"}
      </p>
      <label className="check-field">
        <input
          type="checkbox"
          checked={form.communicationConsent}
          onChange={(e) =>
            setForm({ ...form, communicationConsent: e.target.checked })
          }
        />
        Consiente recibir comunicaciones de la clínica.
      </label>
      <button className="button primary" disabled={busy} onClick={save}>
        Guardar ficha
      </button>
      <div className="history">
        <h3>
          <History size={16} />
          Historial de citas · {summary.bookings.length}
        </h3>
        {summary.bookings
          .slice()
          .reverse()
          .slice(0, all ? undefined : 8)
          .map((b) => (
            <button
              key={b.id}
              className="client-history-row"
              onClick={() => openBooking(b.id)}
            >
              <span>
                {dateLabel(b.start, "dd MMM yyyy")}
                <small>{b.serviceName}</small>
              </span>
              <Badge status={b.status} />
              <ChevronRight size={15} />
            </button>
          ))}
        {summary.bookings.length > 8 && (
          <TextLink onClick={() => setAll(!all)}>
            {all ? "Ver menos" : "Ver todas las citas"}
          </TextLink>
        )}
      </div>
    </>
  );
}
function Insights({
  state,
  onRecommendation,
}: {
  state: State;
  onRecommendation: (r: Recommendation) => void;
}) {
  const today = dayKey(state.meta.now);
  const [range, setRange] = useState({
    from: weekStart(today),
    to: nextDay(weekStart(today), 6),
  });
  const valid = Boolean(
    range.from &&
    range.to &&
    range.from <= range.to &&
    daysBetween(range.from, range.to).length <= 366,
  );
  const data = useMemo(
    () => metrics(state, valid ? range.from : today, valid ? range.to : today),
    [state, range, valid, today],
  );
  const recs = useMemo(
    () => (valid ? recommendations(state, range.from, range.to) : []),
    [state, range, valid],
  );
  return (
    <>
      <PageTitle
        eyebrow="DATOS QUE TE AYUDAN A DECIDIR"
        title="Cómo va el negocio"
        description="Una mirada sencilla a tu actividad. Y algunas ideas para el siguiente paso."
      />
      <div className="insight-period">
        <div className="view-switch">
          <button
            onClick={() =>
              setRange({
                from: weekStart(today),
                to: nextDay(weekStart(today), 6),
              })
            }
          >
            Esta semana
          </button>
          <button
            onClick={() => setRange({ from: nextDay(today, -29), to: today })}
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => setRange({ from: today, to: nextDay(today, 6) })}
          >
            Próximos 7 días
          </button>
        </div>
        <label>
          Desde
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </label>
      </div>
      {!valid ? (
        <ErrorBox error="Elige un periodo válido de hasta un año." />
      ) : (
        <>
          <div className="metric-strip insight-metrics">
            <Metric
              label="Citas"
              value={data.count}
              detail={
                data.change === null
                  ? "Sin base anterior para comparar"
                  : `${data.change >= 0 ? "+" : ""}${data.change}% frente al periodo anterior`
              }
              help="Citas no canceladas del periodo, comparadas con el periodo anterior de igual duración."
            />
            <Metric
              label="Ingresos previstos"
              value={money(data.revenue)}
              detail="No equivale a contabilidad"
              help="Suma de precios acordados de citas atendidas y confirmadas. No informa sobre cobros reales."
            />
            <Metric
              label="Ocupación de agenda"
              value={`${data.occupancy}%`}
              detail={`${Math.round(data.capacity / 60)} horas de capacidad`}
              help="Minutos de servicio de citas no canceladas / minutos de horario tras bloqueos. No mide asistencia. Los márgenes no se suman como tiempo de servicio."
            />
            <Metric
              label="Clientes nuevos"
              value={data.fresh}
              detail={`${data.recurring} recurrentes`}
              help="Clientes sin visita atendida anterior a su primera cita del periodo. Cada cliente se cuenta una vez."
            />
          </div>
          {!data.all.length ? (
            <Empty
              title="Aún no hay actividad en este periodo"
              text="Elige otras fechas para explorar los datos de ejemplo."
            />
          ) : (
            <>
              <div className="insight-charts">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Los servicios que más te piden</h2>
                  </div>
                  <div className="bar-list">
                    {data.serviceCounts.map((s) => (
                      <div key={s.id}>
                        <div>
                          <span>{s.name}</span>
                          <strong>{s.count} citas</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            style={{
                              width: `${data.count ? (s.count / data.count) * 100 : 0}%`,
                              background: s.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="quiet">
                      Citas del periodo, excluidas las canceladas.
                    </p>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Por dónde llegan las reservas</h2>
                  </div>
                  <div className="source-list">
                    {data.sources.map((s, i) => (
                      <div key={s.name}>
                        <span className={`source-icon source-${i}`}>
                          {i === 0 ? (
                            <MessageCircle size={18} />
                          ) : i === 1 ? (
                            <Phone size={18} />
                          ) : i === 2 ? (
                            <UserRound size={18} />
                          ) : (
                            <CalendarDays size={18} />
                          )}
                        </span>
                        <span>{s.name}</span>
                        <strong>{s.count}</strong>
                        <small>
                          {data.count
                            ? Math.round((s.count / data.count) * 100)
                            : 0}
                          %
                        </small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="attendance-summary">
                <span>
                  <X size={15} />
                  <strong>{data.cancellations}</strong> cancelaciones
                </span>
                <span>
                  <UserRound size={15} />
                  <strong>{data.misses}</strong> ausencias
                </span>
                <p>
                  Son señales para revisar, no conclusiones sobre las personas.
                </p>
              </div>
              <div className="recommendations-heading">
                <span className="insight-spark">
                  <Sparkles size={21} />
                </span>
                <div>
                  <h2>Lo que nos cuentan tus datos</h2>
                  <p>
                    Observaciones basadas en esta agenda, sin predicciones ni
                    promesas.
                  </p>
                </div>
              </div>
              <div className="recommendation-grid">
                {recs.map((r, i) => (
                  <article className="recommendation" key={r.title}>
                    <span className="recommendation-index">0{i + 1}</span>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                    <TextLink onClick={() => onRecommendation(r)}>
                      {r.action}
                    </TextLink>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
function ExportDialog({
  state,
  kind,
  initial,
  notify,
}: {
  state: State;
  kind: "bookings" | "clients";
  initial: Filters;
  notify: (s: string) => void;
}) {
  const [filters, setFilters] = useState(initial);
  const valid = Boolean(
    filters.from && filters.to && filters.from <= filters.to,
  );
  const table = exportTable(state, filters, kind);
  return (
    <>
      <FilterFields state={state} filters={filters} onChange={setFilters} />
      {!valid && (
        <ErrorBox error="La fecha inicial debe ser anterior o igual a la final." />
      )}
      <p className="export-count">
        {table.rows.length}{" "}
        {kind === "clients"
          ? "clientes únicos con citas que coinciden"
          : "citas que coinciden"}{" "}
        con los filtros.
      </p>
      <div className="export-columns">
        <strong>Columnas incluidas</strong>
        <p>{table.headers.join(" · ")}</p>
        <small>
          Sin notas internas, notas del cliente ni historial de cambios.
        </small>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.slice(0, 10).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="quiet">
        Vista previa de las primeras {Math.min(10, table.rows.length)} filas. La
        descarga incluye todas las coincidencias.
      </p>
      <div className="button-row">
        <button
          className="button primary"
          disabled={!valid || !table.rows.length}
          onClick={() => {
            download(
              `${kind === "clients" ? "clientes" : "citas"}-${filters.from}-${filters.to}.csv`,
              csv(table),
              "text/csv;charset=utf-8",
            );
            notify("CSV descargado para abrirlo en Excel.");
          }}
        >
          <ArrowDownToLine size={16} />
          Descargar CSV
        </button>
        <button
          className="button secondary"
          disabled={!valid || !table.rows.length}
          onClick={() =>
            copy(tsv({ ...table, rows: table.rows.slice(0, 10) }))
              .then(() => notify("Tabla visible copiada."))
              .catch((e) => notify(e.message))
          }
        >
          <Copy size={15} />
          Copiar tabla visible
        </button>
      </div>
    </>
  );
}
function MessageComposer({
  value,
  onSave,
  notify,
}: {
  value: string;
  onSave: (text: string) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="simulation-label">
        <MessageCircle size={16} />
        VISTA PREVIA · NO SE ENVIARÁ
      </div>
      <label className="field">
        Tu mensaje
        <textarea
          rows={6}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <ErrorBox error={error} />
      <div className="button-row">
        <button
          className="button primary"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(text);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Simular envío
        </button>
        <button
          className="button secondary"
          onClick={() =>
            copy(text)
              .then(() => notify("Mensaje copiado."))
              .catch((e) => setError(e.message))
          }
        >
          <Copy size={15} />
          Copiar mensaje
        </button>
      </div>
    </>
  );
}
