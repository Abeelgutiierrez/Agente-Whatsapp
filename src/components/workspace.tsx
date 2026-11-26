"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Clock3,
  HeartHandshake,
  House,
  Leaf,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type {
  PublicConfig,
  PublicBooking,
  State,
  Booking,
} from "@/domain/types";
import { dateLabel, timeLabel, money } from "@/domain/time";
import { api } from "@/lib/http";
import { BookingFlow, Confirmation } from "./booking-flow";
import { Business } from "./business";
import { WhatsAppAgent } from "./whatsapp-agent";
import { Badge, ErrorBox, Loading, Modal } from "./ui";
export type Section = "today" | "agenda" | "clients" | "insights" | "settings";
const navigation = [
  { id: "today", label: "Hoy", icon: House },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clients", label: "Clientes", icon: UsersRound },
  { id: "insights", label: "Cómo va el negocio", icon: ChartNoAxesCombined },
] as const;
export function Workspace() {
  const [view, setView] = useState<"business" | "client" | null>(null);
  const [section, setSection] = useState<Section>("today");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [newBooking, setNewBooking] = useState(false);
  const [toast, setToast] = useState("");
  const [help, setHelp] = useState(false);
  const [focusBooking, setFocusBooking] = useState<string | null>(null);
  // Reservas de WhatsApp que han entrado mientras la demo está abierta.
  const [recentWhatsApp, setRecentWhatsApp] = useState<string[]>([]);
  const revision = useRef(-1);
  const knownBookings = useRef<Set<string> | null>(null);
  const refresh = useCallback(async (force = false) => {
    try {
      const data = await api<State & { unchanged?: boolean }>(
        `business?revision=${force ? -1 : revision.current}`,
      );
      if (!data.unchanged) {
        // Aviso en vivo cuando entra una reserva nueva por WhatsApp.
        const known = knownBookings.current;
        const fresh = known
          ? data.bookings.filter(
              (b) => !known.has(b.id) && b.source === "WhatsApp",
            )
          : [];
        knownBookings.current = new Set(data.bookings.map((b) => b.id));
        const last = fresh.at(-1);
        if (fresh.length)
          setRecentWhatsApp((ids) => [
            ...ids,
            ...fresh.map((b) => b.id).filter((id) => !ids.includes(id)),
          ]);
        if (last) {
          const person = data.clients.find((c) => c.id === last.clientId);
          setToast(
            `Nueva reserva por WhatsApp: ${person?.name || "cliente"} · ${last.serviceName} · ${dateLabel(last.start, "EEEE d")} a las ${timeLabel(last.start)}`,
          );
        }
        revision.current = data.meta.revision;
        setState(data);
        setConfig({
          business: data.business,
          meta: data.meta,
          services: data.services.filter((s) => s.active),
          professionals: data.professionals.filter((p) => p.active),
        });
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    setView(
      new URLSearchParams(window.location.search).get("vista") === "cliente"
        ? "client"
        : "business",
    );
    api<PublicConfig>("config")
      .then(setConfig)
      .catch((e) => setError(e.message));
    // Foto inicial de la agenda para detectar después las reservas nuevas.
    api<State>("business?revision=-1")
      .then((data) => {
        knownBookings.current ??= new Set(data.bookings.map((b) => b.id));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (view !== "business") return;
    refresh(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 3000);
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [view, refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 7000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [section, view]);
  function switchView(next: "business" | "client") {
    setView(next);
    window.history.replaceState(
      null,
      "",
      next === "client" ? "/demo?vista=cliente" : "/demo",
    );
  }
  if (!config || !view)
    return (
      <>
        <ErrorBox error={error} />
        <Loading />
      </>
    );
  const business = config.business;
  return (
    <div
      className={`app-shell ${view === "client" ? "client-shell" : ""}`}
      style={{ "--brand": business.primaryColor } as React.CSSProperties}
    >
      {view === "business" && (
        <aside className="sidebar">
          <Link
            className="brand"
            href="/demo"
            aria-label={`${business.name}, inicio`}
          >
            <div className="brand-symbol">
              <Leaf size={24} />
            </div>
            <div>
              <strong>{business.name}</strong>
              <small>GESTIÓN CON CALMA</small>
            </div>
          </Link>
          <div className="workspace-label">TU ESPACIO DE TRABAJO</div>
          <nav aria-label="Navegación del negocio">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={section === item.id ? "active" : ""}
                onClick={() => setSection(item.id)}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.id === "today" && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="sidebar-note-icon">
                <Sparkles size={18} />
              </span>
              <strong>Más tiempo para las personas.</strong>
              <p>Tu agenda se ocupa del resto.</p>
            </div>
            <button
              className={
                section === "settings"
                  ? "active sidebar-setting"
                  : "sidebar-setting"
              }
              onClick={() => setSection("settings")}
            >
              <Settings2 size={18} />
              Configuración
            </button>
            <button className="sidebar-setting" onClick={() => setHelp(true)}>
              <CircleHelp size={18} />
              Ayuda con la demo
            </button>
            <div className="profile">
              <span className="avatar">A</span>
              <div>
                <strong>Equipo de recepción</strong>
                <small>Recepción</small>
              </div>
              <span className="online-dot" />
            </div>
          </div>
        </aside>
      )}
      <div className="main-shell">
        <header className="topbar">
          {view === "business" ? (
            <div className="breadcrumb">
              Mi clínica
              <ChevronRight size={13} />
              <strong>
                {section === "settings"
                  ? "Configuración"
                  : navigation.find((n) => n.id === section)?.label}
              </strong>
            </div>
          ) : (
            <a className="brand client-brand" href="/demo?vista=cliente">
              <div className="brand-symbol">
                <Leaf size={22} />
              </div>
              <strong>{business.name}</strong>
            </a>
          )}
          <div className="topbar-right">
            <span className="demo-chip">
              <span />
              Demo interactiva
            </span>
            <div className="view-switch" aria-label="Cambiar experiencia">
              <button
                className={view === "client" ? "selected" : ""}
                onClick={() => switchView("client")}
              >
                Vista cliente
              </button>
              <button
                className={view === "business" ? "selected" : ""}
                onClick={() => switchView("business")}
              >
                Vista negocio
              </button>
            </div>
          </div>
        </header>
        <div className="demo-date">
          <Clock3 size={12} />
          <span>
            Fecha de demo: {dateLabel(config.meta.now, "EEEE d MMM yyyy")} ·{" "}
            {timeLabel(config.meta.now)}
          </span>
          <span className="demo-date-note">
            Datos ficticios · mensajes simulados
          </span>
        </div>
        {view === "client" ? (
          <PatientExperience
            config={config}
            onSeeBusiness={(b) => {
              setFocusBooking(b.id);
              setRecentWhatsApp((ids) =>
                ids.includes(b.id) ? ids : [...ids, b.id],
              );
              setSection("today");
              switchView("business");
            }}
          />
        ) : (
          <main id="main-content" className="business-main">
            <ErrorBox error={error} />
            {!state ? (
              <Loading />
            ) : (
              <Business
                state={state}
                config={config}
                section={section}
                onSection={setSection}
                refresh={refresh}
                notify={setToast}
                newBooking={() => setNewBooking(true)}
                focusBooking={focusBooking}
                recentWhatsApp={recentWhatsApp}
                onFocusHandled={() => setFocusBooking(null)}
              />
            )}
          </main>
        )}
        <footer className="app-footer">
          <Leaf size={12} />
          {business.name}
          <span>Un poco más de calma, cada día.</span>
        </footer>
      </div>
      <Modal
        open={newBooking}
        onClose={() => setNewBooking(false)}
        title="Nueva cita"
        description="Para una reserva por teléfono o en la clínica."
        wide
      >
        {state && (
          <BookingFlow
            config={config}
            adminState={state}
            onExit={() => setNewBooking(false)}
            onComplete={() => {
              setNewBooking(false);
              refresh(true);
              setToast("Cita guardada en la agenda.");
            }}
          />
        )}
      </Modal>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Un recorrido de 5–7 minutos"
        description="Todo funciona con datos ficticios y se conserva al recargar."
      >
        <ol className="help-steps">
          <li>Abre Vista cliente y enseña el mensaje de WhatsApp.</li>
          <li>Reserva Fisioterapia en el primer hueco disponible.</li>
          <li>Vuelve a Vista negocio: la nueva cita aparece en la agenda.</li>
          <li>Abre la cita, reprograma y consulta su historial.</li>
          <li>Visita Clientes y Cómo va el negocio.</li>
          <li>Exporta las citas filtradas para Excel.</li>
        </ol>
        <div className="info-box">
          La fecha está fijada para enseñar siempre un día con actividad. Puedes
          recuperar los datos desde Configuración.
        </div>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function PatientExperience({
  config,
  onSeeBusiness,
}: {
  config: PublicConfig;
  onSeeBusiness: (booking: PublicBooking) => void;
}) {
  const [mode, setMode] = useState<"welcome" | "book" | "done" | "edit">(
    "welcome",
  );
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [manage, setManage] = useState(false);
  const [contact, setContact] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function complete(result: PublicBooking | Booking) {
    const b = result as PublicBooking;
    setBooking(b);
    setCode(b.code);
    setPhone(b.phone);
    setMode("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function lookup() {
    setBusy(true);
    setError("");
    try {
      setBooking(
        await api<PublicBooking>("manage", { code, phone, action: "lookup" }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancelBooking() {
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const b = await api<PublicBooking>("manage", {
        code: booking.code,
        phone: booking.phone,
        action: "cancel",
        change: { version: booking.version },
      });
      setBooking(b);
      setCancel(false);
      setManage(false);
      setMode("done");
    } catch (e) {
      setError((e as Error).message);
      setCancel(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={`patient-main ${mode !== "welcome" ? "patient-narrow" : ""}`}
    >
      {mode === "welcome" && (
        <div className="welcome-layout">
          <section className="welcome-intro">
            <div className="welcome-eyebrow">
              <span />
              CERCA DE TI, TAMBIÉN ONLINE
            </div>
            <h1>
              Tu bienestar <br />
              empieza con <br />
              <em>
                un momento
                <br className="desktop-only" /> para ti.
              </em>
            </h1>
            <p>
              Reserva tu próxima visita en menos de un minuto. Sin llamadas, sin
              esperas. A tu ritmo.
            </p>
            <div className="welcome-trust">
              <div>
                <ShieldCheck size={19} />
                <span>
                  Confirmación
                  <br />
                  <strong>al instante</strong>
                </span>
              </div>
              <div>
                <HeartHandshake size={19} />
                <span>
                  El equipo de siempre,
                  <br />
                  <strong>más cerca</strong>
                </span>
              </div>
            </div>
            <div className="welcome-decoration" aria-hidden="true">
              <Leaf size={135} strokeWidth={0.55} />
              <span />
            </div>
          </section>
          <WhatsAppAgent
            config={config}
            onManage={() => {
              setManage(true);
              setError("");
            }}
            onContact={() => setContact(true)}
            onForm={() => setMode("book")}
            onBooked={(b) => {
              setCode(b.code);
              setPhone(b.phone);
            }}
            onSeeBusiness={onSeeBusiness}
          />
        </div>
      )}
      {(mode === "book" || mode === "edit") && (
        <BookingFlow
          config={config}
          editing={mode === "edit" && booking ? booking : undefined}
          onExit={() => setMode(booking ? "done" : "welcome")}
          onComplete={complete}
        />
      )}
      {mode === "done" && booking && (
        <Confirmation
          booking={booking}
          config={config}
          onContact={() => setContact(true)}
          onManage={() => {
            setManage(true);
            setError("");
          }}
          onHome={() => {
            setMode("welcome");
            setBooking(null);
          }}
        />
      )}
      <Modal
        open={manage}
        onClose={() => setManage(false)}
        title="Tu cita, a mano"
        description="Introduce el localizador y el teléfono que usaste al reservar."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <div className="form-row">
            <label className="field">
              Localizador
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setBooking(null);
                }}
                placeholder="AR-…"
                required
              />
            </label>
            <label className="field">
              Teléfono
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setBooking(null);
                }}
                required
              />
            </label>
          </div>
          <button className="button secondary" disabled={busy}>
            Consultar cita
          </button>
        </form>
        <ErrorBox error={error} />
        {booking && (
          <div className="manage-result">
            <h3>{booking.serviceName}</h3>
            <p>
              {dateLabel(booking.start)} · {timeLabel(booking.start)}
            </p>
            <p>
              Con {booking.professionalName} · {money(booking.price)}
            </p>
            <Badge status={booking.status} />
            {["confirmada", "pendiente"].includes(booking.status) && (
              <>
                <p className="policy">
                  Puedes cambiar o cancelar hasta{" "}
                  {config.business.cancellationHours} h antes. Después, habla
                  con la clínica.
                </p>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        (Date.parse(booking.start) -
                          Date.parse(config.meta.now)) /
                          3600000 <
                        config.business.cancellationHours
                      ) {
                        setError(
                          "Para cambiar una cita tan próxima, habla con la clínica.",
                        );
                        return;
                      }
                      setManage(false);
                      setMode("edit");
                    }}
                  >
                    Cambiar cita
                  </button>
                  <button
                    className="button danger"
                    onClick={() => setCancel(true)}
                  >
                    Cancelar cita
                  </button>
                </div>
              </>
            )}
            <button
              className="text-link"
              onClick={() => {
                setManage(false);
                setContact(true);
              }}
            >
              Hablar con la clínica
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </Modal>
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title="¿Cancelar esta cita?"
        description="El hueco quedará disponible para otra persona."
      >
        <p>
          {booking?.serviceName} · {booking && dateLabel(booking.start)} ·{" "}
          {booking && timeLabel(booking.start)}
        </p>
        <div className="button-row">
          <button className="button secondary" onClick={() => setCancel(false)}>
            Conservar mi cita
          </button>
          <button
            className="button danger"
            disabled={busy}
            onClick={cancelBooking}
          >
            Sí, cancelar cita
          </button>
        </div>
      </Modal>
      <Modal
        open={contact}
        onClose={() => setContact(false)}
        title="Hablemos"
        description="WhatsApp simulado · no se enviará ningún mensaje."
      >
        <div className="chat-bubble">
          Hola 👋 Estamos aquí para ayudarte con tu cita o para orientarte sobre
          nuestros servicios.
        </div>
        <p>{config.business.address}</p>
        <p className="quiet">
          Lunes a viernes, mañana y tarde. Sábados por la mañana.
        </p>
        <button
          className="button primary"
          onClick={() => {
            setContact(false);
            setMode("book");
          }}
        >
          Buscar una cita
          <ArrowRight size={16} />
        </button>
      </Modal>
    </main>
  );
}
