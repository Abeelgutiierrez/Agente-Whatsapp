"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  ShieldCheck,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Leaf,
  Footprints,
  Activity,
  Sparkles,
} from "lucide-react";
import type {
  AvailabilityDay,
  PublicConfig,
  PublicBooking,
  Slot,
  State,
  Booking,
} from "@/domain/types";
import { dayKey, nextDay, dateLabel, timeLabel, money } from "@/domain/time";
import { api, download, uid } from "@/lib/http";
import { ErrorBox, Modal, Badge } from "./ui";
const icons = [Activity, Leaf, Sparkles, Footprints];
export type Editing = {
  id: string;
  code: string;
  phone: string;
  version: number;
  serviceId: string;
  professionalId: string;
  duration: number;
  price: number;
};
export function BookingFlow({
  config,
  adminState,
  editing,
  onExit,
  onComplete,
}: {
  config: PublicConfig;
  adminState?: State;
  editing?: Editing;
  onExit: () => void;
  onComplete: (booking: PublicBooking | Booking) => void;
}) {
  const [step, setStep] = useState(editing ? 1 : 0);
  const [serviceId, setServiceId] = useState(editing?.serviceId || "");
  const [professionalId, setProfessionalId] = useState(
    editing && adminState ? editing.professionalId : "",
  );
  const [from, setFrom] = useState(dayKey(config.meta.now));
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    privacyConsent: false,
    communicationConsent: false,
    customerNote: "",
  });
  const [source, setSource] = useState("teléfono");
  const [status, setStatus] = useState("confirmada");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [help, setHelp] = useState(false);
  const [operationKey, setOperationKey] = useState(uid);
  const service = config.services.find((s) => s.id === serviceId);
  const chosenDay = days.find((d) => d.date === selectedDate);
  const agreedDuration =
    editing && editing.serviceId === serviceId
      ? editing.duration
      : service?.duration;
  const agreedPrice =
    editing && editing.serviceId === serviceId ? editing.price : service?.price;
  useEffect(() => {
    if (!serviceId) return;
    let current = true;
    setLoading(true);
    const q = new URLSearchParams({
      serviceId,
      from,
      days: "7",
      ...(professionalId ? { professionalId } : {}),
    });
    if (editing) {
      if (adminState) q.set("bookingId", editing.id);
      else {
        q.set("code", editing.code);
        q.set("phone", editing.phone);
      }
    }
    api<AvailabilityDay[]>(
      `${adminState ? "business-availability" : "availability"}?${q}`,
    )
      .then((data) => {
        if (current) setDays(data);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [serviceId, from, professionalId, editing, adminState, refresh]);
  function back() {
    setError("");
    if (step === 0 || (editing && step === 1)) onExit();
    else setStep(step === 4 && editing ? 2 : step - 1);
  }
  async function nearest() {
    setBusy(true);
    setError("");
    try {
      const q = new URLSearchParams({
        serviceId,
        from: nextDay(from, 7),
        days: "61",
        ...(professionalId ? { professionalId } : {}),
      });
      if (editing) {
        if (adminState) q.set("bookingId", editing.id);
        else {
          q.set("code", editing.code);
          q.set("phone", editing.phone);
        }
      }
      const data = await api<AvailabilityDay[]>(
        `${adminState ? "business-availability" : "availability"}?${q}`,
      );
      const day = data.find((d) => d.slots.length);
      if (day) {
        setFrom(day.date);
        setSelectedDate(day.date);
        setStep(2);
      } else
        setError(
          "No hay huecos dentro del plazo de reserva. Habla con la clínica para que te ayudemos.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!slot || !service) return;
    setBusy(true);
    setError("");
    try {
      let booking: PublicBooking | Booking;
      if (editing) {
        const change = {
          id: editing.id,
          version: editing.version,
          serviceId,
          professionalId: slot.professionalId,
          start: slot.start,
        };
        booking = adminState
          ? await api<Booking>("admin", { action: "change", data: change })
          : await api<PublicBooking>("manage", {
              code: editing.code,
              phone: editing.phone,
              action: "change",
              change,
            });
      } else {
        const data = {
          serviceId,
          professionalId: slot.professionalId,
          start: slot.start,
          operationKey,
          client: { ...form },
          customerNote: form.customerNote,
          source: adminState ? source : "WhatsApp",
          status,
        };
        booking = adminState
          ? await api<Booking>("admin", { action: "book", data })
          : await api<PublicBooking>("bookings", data);
      }
      onComplete(booking);
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      if (/hueco|hora no está/.test(message)) {
        setStep(2);
        setSlot(null);
        setRefresh((n) => n + 1);
        setOperationKey(uid());
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`booking-flow ${adminState ? "booking-in-modal" : ""}`}>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} />
        {step === 0 ? "Volver al mensaje" : "Atrás"}
      </button>
      <div className="booking-progress" aria-label={`Paso ${step + 1} de 5`}>
        {["Servicio", "Día", "Hora", "Tus datos", "Confirmar"].map(
          (label, i) => (
            <div key={label} className={i <= step ? "reached" : ""}>
              <span>{i < step ? <Check size={12} /> : i + 1}</span>
              <small>{label}</small>
            </div>
          ),
        )}
      </div>
      <div className="booking-heading">
        <span className="eyebrow">
          {editing
            ? "Busquemos otro momento"
            : adminState
              ? "Agenda una nueva visita"
              : "Un momento para cuidarte"}
        </span>
        <h1>
          {
            [
              "¿En qué podemos ayudarte?",
              "¿Qué día te viene bien?",
              "Elige tu momento",
              adminState ? "¿Quién viene a la cita?" : "Ya casi estamos",
              "Todo listo para tu cita",
            ][step]
          }
        </h1>
        <p>
          {
            [
              "Elige el servicio que necesitas. Nosotros cuidamos del resto.",
              "Solo te mostramos días con citas disponibles.",
              "Estos horarios tienen disponibilidad para tu sesión.",
              "Solo necesitamos unos datos para guardar tu reserva.",
              "Comprueba los detalles antes de reservar.",
            ][step]
          }
        </p>
      </div>
      {service && step > 0 && (
        <div className="service-summary">
          <span className="summary-icon">
            <HeartHandshake size={20} />
          </span>
          <div>
            <strong>{service.name}</strong>
            <small>
              {agreedDuration} minutos · {money(agreedPrice || 0)}
            </small>
          </div>
          {(!editing || adminState) && (
            <button className="text-link" onClick={() => setStep(0)}>
              Cambiar
            </button>
          )}
        </div>
      )}
      <ErrorBox error={error} />
      {step === 0 && (
        <>
          <div className="service-options">
            {config.services
              .filter((s) => s.active)
              .map((s, i) => {
                const Icon = icons[i % icons.length];
                return (
                  <button
                    key={s.id}
                    className="service-option"
                    onClick={() => {
                      setServiceId(s.id);
                      setProfessionalId("");
                      setSlot(null);
                      setStep(1);
                      setError("");
                    }}
                  >
                    <span
                      className="service-icon"
                      style={{ color: s.color, background: `${s.color}14` }}
                    >
                      <Icon size={25} />
                    </span>
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.description}</p>
                      <span>
                        <Clock3 size={13} />
                        {s.duration} min <b>·</b> {money(s.price)}
                      </span>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                );
              })}
          </div>
          <button className="subtle-contact" onClick={() => setHelp(true)}>
            <MessageCircle size={17} />
            ¿No sabes cuál elegir? Habla con la clínica
          </button>
        </>
      )}
      {(step === 1 || step === 2) && (
        <>
          {adminState && (
            <label className="field">
              Profesional
              <select
                value={professionalId}
                onChange={(e) => {
                  setProfessionalId(e.target.value);
                  setSlot(null);
                }}
              >
                <option value="">Cualquiera disponible</option>
                {config.professionals
                  .filter((p) =>
                    adminState.assignments.some(
                      (a) =>
                        a.serviceId === serviceId && a.professionalId === p.id,
                    ),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div className="calendar-card">
            <div className="calendar-nav">
              <button
                className="icon-button"
                aria-label="Semana anterior"
                disabled={from <= dayKey(config.meta.now)}
                onClick={() => {
                  setFrom(
                    nextDay(from, -7) < dayKey(config.meta.now)
                      ? dayKey(config.meta.now)
                      : nextDay(from, -7),
                  );
                  setSlot(null);
                }}
              >
                <ChevronLeft size={19} />
              </button>
              <strong>{dateLabel(from, "MMMM yyyy")}</strong>
              <button
                className="icon-button"
                aria-label="Semana siguiente"
                disabled={
                  nextDay(from, 7) >
                  nextDay(
                    dayKey(config.meta.now),
                    config.business.maxAdvanceDays,
                  )
                }
                onClick={() => {
                  setFrom(nextDay(from, 7));
                  setSlot(null);
                }}
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div className="calendar-week" aria-busy={loading}>
              {days.map((day) => (
                <button
                  key={day.date}
                  disabled={!day.slots.length || loading}
                  title={
                    day.reason || `${day.slots.length} opciones disponibles`
                  }
                  aria-label={`${dateLabel(day.date)}${day.slots.length ? ", disponible" : `, ${day.reason}`}`}
                  className={selectedDate === day.date ? "selected" : ""}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setSlot(null);
                    setStep(2);
                    setError("");
                  }}
                >
                  <small>{dateLabel(day.date, "EEE")}</small>
                  <strong>{dateLabel(day.date, "d")}</strong>
                  <span>{day.slots.length ? "·" : "—"}</span>
                </button>
              ))}
            </div>
            <small className="calendar-legend">
              — Sin disponibilidad · Horas en Madrid
            </small>
            {loading && <p role="status">Consultando huecos…</p>}
          </div>
          {!loading && days.length > 0 && !days.some((d) => d.slots.length) && (
            <div className="empty">
              <h3>Esta semana no quedan huecos</h3>
              <p>Busquemos el siguiente día disponible.</p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={nearest}
              >
                Buscar próxima disponibilidad
              </button>
            </div>
          )}
          {step === 2 && chosenDay && (
            <div className="time-picker">
              <h3>{dateLabel(selectedDate, "EEEE d 'de' MMMM")}</h3>
              {["Mañana", "Tarde"].map((period, i) => {
                const options = chosenDay.slots
                  .filter(
                    (s) =>
                      Number(timeLabel(s.start).slice(0, 2)) < 14 === (i === 0),
                  )
                  .filter(
                    (s, index, all) =>
                      all.findIndex((other) => other.start === s.start) ===
                      index,
                  );
                return (
                  options.length > 0 && (
                    <div key={period}>
                      <p className="time-period">{period}</p>
                      <div className="time-grid">
                        {options.map((s) => (
                          <button
                            key={s.start}
                            className={
                              slot?.start === s.start ? "selected" : ""
                            }
                            onClick={() => setSlot(s)}
                          >
                            {timeLabel(s.start)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                );
              })}
              {!chosenDay.slots.length && (
                <p>No quedan horas. Elige otro día.</p>
              )}
              <p className="quiet">
                <UserRound size={14} />
                {slot
                  ? `Te atenderá ${config.professionals.find((p) => p.id === slot.professionalId)?.name}.`
                  : "Te asignaremos un profesional disponible."}
              </p>
              <button
                className="button primary full"
                disabled={!slot || loading}
                onClick={() => setStep(editing ? 4 : 3)}
              >
                Continuar
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </>
      )}
      {step === 3 && (
        <form
          className="client-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.privacyConsent) {
              setError("Acepta la información de privacidad para continuar.");
              return;
            }
            setError("");
            setStep(4);
          }}
        >
          {adminState && (
            <label className="field">
              Usar un cliente existente
              <select
                defaultValue=""
                onChange={(e) => {
                  const c = adminState.clients.find(
                    (c) => c.id === e.target.value,
                  );
                  if (c)
                    setForm({
                      ...form,
                      name: c.name,
                      phone: c.phone,
                      email: c.email,
                      privacyConsent: c.privacyConsent,
                      communicationConsent: c.communicationConsent,
                    });
                }}
              >
                <option value="">Cliente nuevo</option>
                {adminState.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Nombre y apellidos
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tu nombre"
            />
          </label>
          <label className="field">
            Teléfono
            <input
              type="tel"
              aria-label="Teléfono"
              autoComplete="tel"
              required
              pattern="[+0-9 ()-]{9,22}"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="000 123 456"
            />
            <small>Usa un número ficticio para esta demostración.</small>
          </label>
          <label className="field">
            Correo electrónico <span>(opcional)</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nombre@example.invalid"
            />
          </label>
          <label className="field">
            ¿Algo que debamos saber? <span>(opcional)</span>
            <textarea
              rows={2}
              maxLength={500}
              value={form.customerNote}
              onChange={(e) =>
                setForm({ ...form, customerNote: e.target.value })
              }
              placeholder="Por ejemplo, prefiero que me llaméis por la tarde."
            />
            <small>No incluyas información médica.</small>
          </label>
          {adminState && (
            <div className="form-row">
              <label className="field">
                Procedencia
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {["teléfono", "presencial", "WhatsApp", "web"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Estado inicial
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="confirmada">Confirmada</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </label>
            </div>
          )}
          <label className="check-field">
            <input
              type="checkbox"
              required
              checked={form.privacyConsent}
              onChange={(e) =>
                setForm({ ...form, privacyConsent: e.target.checked })
              }
            />
            <span>
              Acepto que la clínica utilice estos datos para gestionar mi cita.
              En esta demo se guardan solo en el ordenador que la ejecuta.
            </span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.communicationConsent}
              onChange={(e) =>
                setForm({ ...form, communicationConsent: e.target.checked })
              }
            />
            <span>Quiero recibir comunicaciones de la clínica (opcional).</span>
          </label>
          <button className="button primary full" type="submit">
            Revisar mi cita
            <ArrowRight size={17} />
          </button>
        </form>
      )}
      {step === 4 && slot && service && (
        <>
          <div className="review-card">
            <div>
              <CalendarDays size={20} />
              <span>
                <strong>{dateLabel(slot.start)}</strong>
                <small>
                  {timeLabel(slot.start)} · {agreedDuration} minutos
                </small>
              </span>
            </div>
            <div>
              <UserRound size={20} />
              <span>
                <strong>
                  {
                    config.professionals.find(
                      (p) => p.id === slot.professionalId,
                    )?.name
                  }
                </strong>
                <small>Tu profesional</small>
              </span>
            </div>
            {!editing && (
              <div>
                <HeartHandshake size={20} />
                <span>
                  <strong>{form.name}</strong>
                  <small>{form.phone}</small>
                </span>
              </div>
            )}
            <div className="review-price">
              <span>Precio de la sesión</span>
              <strong>{money(agreedPrice || 0)}</strong>
            </div>
          </div>
          <p className="quiet">
            <ShieldCheck size={16} />
            Pago en la clínica. Sin pagos online.
          </p>
          <p className="policy">
            Puedes cambiar o cancelar hasta {config.business.cancellationHours}{" "}
            horas antes. Después, contacta con la clínica.
          </p>
          <button
            className="button primary full"
            disabled={busy}
            onClick={submit}
          >
            {busy
              ? "Guardando tu cita…"
              : editing
                ? "Guardar nueva fecha"
                : "Confirmar mi reserva"}
            <Check size={18} />
          </button>
        </>
      )}
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Estamos para ayudarte"
        description="Conversación de demostración · no se enviará ningún mensaje."
      >
        <div className="chat-bubble">
          Hola 👋 Cuéntanos qué servicio te interesa y nuestro equipo te
          orientará para elegir tu cita.
        </div>
        <p className="quiet">
          {config.business.name} · {config.business.address}
        </p>
        <button className="button primary" onClick={() => setHelp(false)}>
          Volver a reservar
        </button>
      </Modal>
    </div>
  );
}
export function Confirmation({
  booking,
  config,
  onManage,
  onHome,
  onContact,
}: {
  booking: PublicBooking;
  config: PublicConfig;
  onManage: () => void;
  onHome: () => void;
  onContact: () => void;
}) {
  function calendar() {
    const stamp = (v: string) =>
      new Date(v)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escape = (v: string) =>
      v
        .replaceAll("\\", "\\\\")
        .replaceAll("\n", "\\n")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;");
    download(
      `${booking.code}.ics`,
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Armonia//Reservas Demo//ES",
        "BEGIN:VEVENT",
        `UID:${booking.id}@armonia.demo`,
        `DTSTAMP:${stamp(config.meta.now)}`,
        `DTSTART:${stamp(booking.start)}`,
        `DTEND:${stamp(booking.end)}`,
        `SUMMARY:${escape(`${booking.serviceName} · ${config.business.name}`)}`,
        `LOCATION:${escape(config.business.address)}`,
        `DESCRIPTION:${escape(`Localizador ${booking.code}. Profesional: ${booking.professionalName}. Cita ficticia de demostración.`)}`,
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
      "text/calendar;charset=utf-8",
    );
  }
  return (
    <div className="confirmation">
      <div className="confirmation-check">
        <CheckCircle2 size={42} />
      </div>
      <span className="eyebrow">Ya tienes tu momento</span>
      <h1>
        {booking.status === "cancelada"
          ? "Tu cita está cancelada"
          : "¡Nos vemos pronto!"}
      </h1>
      <p>
        {booking.status === "cancelada"
          ? "El hueco vuelve a estar disponible."
          : "Tu reserva está confirmada. Nosotros nos ocupamos del resto."}
      </p>
      <div className="confirmation-ticket">
        <div className="ticket-top">
          <span>Tu localizador</span>
          <strong>{booking.code}</strong>
        </div>
        <h2>{booking.serviceName}</h2>
        <p>
          <CalendarDays size={17} />
          {dateLabel(booking.start)}
        </p>
        <p>
          <Clock3 size={17} />
          {timeLabel(booking.start)} · {booking.duration} min
        </p>
        <p>
          <UserRound size={17} />
          {booking.professionalName} · {booking.clientName}
        </p>
        <div className="ticket-bottom">
          <Badge status={booking.status} />
          <strong>{money(booking.price)}</strong>
        </div>
      </div>
      {booking.status !== "cancelada" && (
        <button className="button primary full" onClick={calendar}>
          <Download size={17} />
          Añadir a mi calendario
        </button>
      )}
      <button className="button secondary full" onClick={onManage}>
        Cambiar o cancelar mi cita
      </button>
      <details className="message-preview">
        <summary>
          <MessageCircle size={18} />
          Así recibirías tus mensajes <span>Demo</span>
        </summary>
        <p className="eyebrow">Confirmación</p>
        <div className="chat-bubble">{booking.confirmation}</div>
        <p className="eyebrow">Recordatorio · 24 h antes</p>
        <div className="chat-bubble">{booking.reminder}</div>
        <small>
          Vistas previas. No se programan ni envían mensajes reales.
        </small>
      </details>
      <p className="policy">
        {config.business.name} · {config.business.address}
      </p>
      <button className="button secondary full" onClick={onContact}>
        <MessageCircle size={16} /> Hablar con la clínica
      </button>
      <button className="text-link" onClick={onHome}>
        Volver al inicio
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
