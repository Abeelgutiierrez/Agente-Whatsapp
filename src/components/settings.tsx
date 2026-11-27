"use client";
import { useState } from "react";
import {
  CalendarOff,
  Check,
  Clock3,
  Leaf,
  MessageCircle,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  UsersRound,
} from "lucide-react";
import type { State } from "@/domain/types";
import { atTime, dateLabel, dayKey, timeLabel } from "@/domain/time";
import { api, uid } from "@/lib/http";
import { ErrorBox, Modal, PageTitle } from "./ui";
type ConfigDraft = Pick<
  State,
  | "business"
  | "services"
  | "professionals"
  | "assignments"
  | "schedules"
  | "blocks"
>;
const draftFrom = (state: State): ConfigDraft =>
  structuredClone({
    business: state.business,
    services: state.services,
    professionals: state.professionals,
    assignments: state.assignments,
    schedules: state.schedules,
    blocks: state.blocks,
  });
const tabs = [
  ["business", "Tu negocio"],
  ["services", "Servicios"],
  ["team", "Equipo"],
  ["hours", "Horarios"],
  ["blocks", "Bloqueos"],
  ["rules", "Reservas"],
  ["messages", "Mensajes"],
] as const;
export function Settings({
  state,
  refresh,
  notify,
}: {
  state: State;
  refresh: (force?: boolean) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(state));
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("business");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [professional, setProfessional] = useState(state.professionals[0].id);
  const [block, setBlock] = useState({
    professionalId: "",
    start: `${dayKey(state.meta.now)}T12:00`,
    end: `${dayKey(state.meta.now)}T13:00`,
    reason: "",
  });
  const changed = JSON.stringify(draft) !== JSON.stringify(draftFrom(state));
  async function save() {
    setBusy(true);
    setError("");
    try {
      const b = await api<State["business"]>("admin", {
        action: "config",
        data: draft,
      });
      setDraft({ ...draft, business: b });
      await refresh(true);
      notify("Configuración guardada. La disponibilidad ya está actualizada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    setError("");
    try {
      const restored = await api<State>("admin", {
        action: "reset",
        confirmation,
      });
      setDraft(draftFrom(restored));
      setReset(false);
      setConfirmation("");
      await refresh(true);
      notify("Demo restablecida con los datos iniciales.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function addBlock() {
    if (!block.reason.trim() || !block.start || !block.end) {
      setError("Indica el motivo y las fechas del bloqueo.");
      return;
    }
    const start = atTime(block.start.split("T")[0], block.start.split("T")[1]);
    const end = atTime(block.end.split("T")[0], block.end.split("T")[1]);
    if (start >= end) {
      setError("El bloqueo debe terminar después de empezar.");
      return;
    }
    setDraft({
      ...draft,
      blocks: [
        ...draft.blocks,
        {
          id: uid(),
          professionalId: block.professionalId || null,
          start,
          end,
          reason: block.reason,
        },
      ],
    });
    setBlock({ ...block, reason: "" });
    setError("");
  }
  return (
    <>
      <PageTitle
        eyebrow="TU CLÍNICA, A TU MANERA"
        title="Configuración"
        description="Un espacio adaptable a cómo trabaja tu equipo."
        action={
          <button
            className="button primary"
            disabled={busy || !changed}
            onClick={save}
          >
            <Check size={17} />
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        }
      />
      <div
        className="settings-tabs"
        role="group"
        aria-label="Secciones de configuración"
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {changed && (
        <div className="unsaved-note">
          Tienes cambios sin guardar. Se aplicarán al pulsar «Guardar cambios».
        </div>
      )}
      <section className="panel settings-panel">
        {tab === "business" && (
          <>
            <div className="settings-section-title">
              <Leaf size={22} />
              <div>
                <h2>La identidad de tu negocio</h2>
                <p>Estos datos aparecen en la reserva y en los mensajes.</p>
              </div>
            </div>
            <div className="form-row">
              <label className="field">
                Nombre del negocio
                <input
                  value={draft.business.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      business: { ...draft.business, name: e.target.value },
                    })
                  }
                />
              </label>
              <label className="field">
                Lema
                <input
                  value={draft.business.tagline}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      business: { ...draft.business, tagline: e.target.value },
                    })
                  }
                />
              </label>
            </div>
            <label className="field">
              Dirección
              <input
                value={draft.business.address}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    business: { ...draft.business, address: e.target.value },
                  })
                }
              />
            </label>
            <label className="field">
              Teléfono de contacto
              <input
                value={draft.business.phone}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    business: { ...draft.business, phone: e.target.value },
                  })
                }
              />
              <small>
                Los contactos son ficticios; las conversaciones se simulan.
              </small>
            </label>
            <label className="field">
              Color principal
              <select
                value={draft.business.primaryColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    business: {
                      ...draft.business,
                      primaryColor: e.target.value,
                    },
                  })
                }
              >
                <option value="#111113">Negro ANA</option>
                <option value="#245b50">Verde Armonía</option>
                <option value="#365c77">Azul sereno</option>
                <option value="#665074">Ciruela suave</option>
                <option value="#73563e">Tierra cálida</option>
              </select>
            </label>
            <div
              className="brand-swatch"
              style={{ background: draft.business.primaryColor }}
            >
              <Leaf size={24} />
              <span>
                {draft.business.name}
                <small>{draft.business.tagline}</small>
              </span>
            </div>
          </>
        )}
        {tab === "services" && (
          <>
            <div className="settings-section-title">
              <Settings2 size={22} />
              <div>
                <h2>Servicios que ofreces</h2>
                <p>
                  El precio y la duración acordados de citas existentes se
                  conservan.
                </p>
              </div>
            </div>
            {draft.services.map((s, i) => (
              <div className="settings-item" key={s.id}>
                <div className="form-row">
                  <label className="field">
                    Nombre del servicio
                    <input
                      value={s.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          services: draft.services.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          services: draft.services.map((x, j) =>
                            j === i ? { ...x, active: e.target.checked } : x,
                          ),
                        })
                      }
                    />
                    Disponible para reservar
                  </label>
                </div>
                <label className="field">
                  Descripción breve
                  <textarea
                    rows={2}
                    value={s.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        services: draft.services.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <div className="form-row">
                  <label className="field">
                    Duración (minutos)
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={s.duration}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          services: draft.services.map((x, j) =>
                            j === i
                              ? { ...x, duration: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Precio (€)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={s.price / 100}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          services: draft.services.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  price: Math.round(
                                    Number(e.target.value) * 100,
                                  ),
                                }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              className="button secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  services: [
                    ...draft.services,
                    {
                      id: uid(),
                      name: "Nuevo servicio",
                      description: "",
                      duration: 30,
                      price: 3000,
                      active: false,
                      color: "#528278",
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Añadir servicio
            </button>
          </>
        )}
        {tab === "team" && (
          <>
            <div className="settings-section-title">
              <UsersRound size={22} />
              <div>
                <h2>Las personas de tu equipo</h2>
                <p>Asigna qué servicios realiza cada profesional.</p>
              </div>
            </div>
            {draft.professionals.map((p, i) => (
              <div className="settings-item" key={p.id}>
                <div className="form-row">
                  <label className="field">
                    Nombre
                    <input
                      value={p.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          professionals: draft.professionals.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Especialidad visible
                    <input
                      value={p.role}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          professionals: draft.professionals.map((x, j) =>
                            j === i ? { ...x, role: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        professionals: draft.professionals.map((x, j) =>
                          j === i ? { ...x, active: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  Profesional activo
                </label>
                <div className="assignment-options">
                  {draft.services.map((s) => (
                    <label className="check-field" key={s.id}>
                      <input
                        type="checkbox"
                        checked={draft.assignments.some(
                          (a) =>
                            a.serviceId === s.id && a.professionalId === p.id,
                        )}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            assignments: e.target.checked
                              ? [
                                  ...draft.assignments,
                                  {
                                    id: uid(),
                                    serviceId: s.id,
                                    professionalId: p.id,
                                  },
                                ]
                              : draft.assignments.filter(
                                  (a) =>
                                    !(
                                      a.serviceId === s.id &&
                                      a.professionalId === p.id
                                    ),
                                ),
                          })
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="button secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  professionals: [
                    ...draft.professionals,
                    {
                      id: uid(),
                      name: "Nuevo profesional",
                      role: "Atención al cliente",
                      active: false,
                      color: "#528278",
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Añadir profesional
            </button>
            <p className="quiet">
              Después de añadirlo, configura sus horarios antes de activarlo.
            </p>
          </>
        )}
        {tab === "hours" && (
          <>
            <div className="settings-section-title">
              <Clock3 size={22} />
              <div>
                <h2>Horarios habituales</h2>
                <p>Los descansos entre tramos no se ofrecen para reservar.</p>
              </div>
            </div>
            <label className="field">
              Profesional
              <select
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
              >
                {draft.professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {[
              [1, "Lunes"],
              [2, "Martes"],
              [3, "Miércoles"],
              [4, "Jueves"],
              [5, "Viernes"],
              [6, "Sábado"],
              [0, "Domingo"],
            ].map(([weekday, label]) => (
              <div className="schedule-day" key={weekday}>
                <strong>{label}</strong>
                <div>
                  {draft.schedules
                    .filter(
                      (s) =>
                        s.professionalId === professional &&
                        s.weekday === weekday,
                    )
                    .map((s) => (
                      <div className="schedule-interval" key={s.id}>
                        <label>
                          Desde
                          <input
                            type="time"
                            aria-label={`${label}, inicio`}
                            value={s.startTime}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                schedules: draft.schedules.map((x) =>
                                  x.id === s.id
                                    ? { ...x, startTime: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <span>—</span>
                        <label>
                          Hasta
                          <input
                            type="time"
                            aria-label={`${label}, fin`}
                            value={s.endTime}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                schedules: draft.schedules.map((x) =>
                                  x.id === s.id
                                    ? { ...x, endTime: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label={`Quitar tramo de ${label} ${s.startTime}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              schedules: draft.schedules.filter(
                                (x) => x.id !== s.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  {!draft.schedules.some(
                    (s) =>
                      s.professionalId === professional &&
                      s.weekday === weekday,
                  ) && <small className="quiet">No trabaja este día</small>}
                  <button
                    className="text-link"
                    onClick={() => {
                      const has = draft.schedules.some(
                        (s) =>
                          s.professionalId === professional &&
                          s.weekday === weekday,
                      );
                      setDraft({
                        ...draft,
                        schedules: [
                          ...draft.schedules,
                          {
                            id: uid(),
                            professionalId: professional,
                            weekday: Number(weekday),
                            startTime: has ? "16:00" : "09:00",
                            endTime: has ? "20:00" : "14:00",
                          },
                        ],
                      });
                    }}
                  >
                    <Plus size={13} />
                    Añadir tramo
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        {tab === "blocks" && (
          <>
            <div className="settings-section-title">
              <CalendarOff size={22} />
              <div>
                <h2>Vacaciones, descansos y bloqueos</h2>
                <p>
                  Si el bloqueo afecta a citas existentes, te indicaremos cuáles
                  resolver.
                </p>
              </div>
            </div>
            <div className="form-row">
              <label className="field">
                A quién afecta
                <select
                  value={block.professionalId}
                  onChange={(e) =>
                    setBlock({ ...block, professionalId: e.target.value })
                  }
                >
                  <option value="">Toda la clínica</option>
                  {draft.professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Motivo
                <input
                  value={block.reason}
                  onChange={(e) =>
                    setBlock({ ...block, reason: e.target.value })
                  }
                  placeholder="Vacaciones, descanso, formación…"
                />
              </label>
            </div>
            <div className="form-row">
              <label className="field">
                Inicio (hora de Madrid)
                <input
                  type="datetime-local"
                  value={block.start}
                  onChange={(e) =>
                    setBlock({ ...block, start: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Fin (hora de Madrid)
                <input
                  type="datetime-local"
                  value={block.end}
                  onChange={(e) => setBlock({ ...block, end: e.target.value })}
                />
              </label>
            </div>
            <button className="button secondary" onClick={addBlock}>
              <Plus size={16} />
              Añadir bloqueo
            </button>
            <div className="block-list">
              {draft.blocks.map((b) => (
                <div key={b.id}>
                  <span className="attention-icon amber">
                    <CalendarOff size={17} />
                  </span>
                  <div>
                    <strong>{b.reason}</strong>
                    <small>
                      {b.professionalId
                        ? draft.professionals.find(
                            (p) => p.id === b.professionalId,
                          )?.name
                        : "Toda la clínica"}{" "}
                      · {dateLabel(b.start, "dd MMM")} {timeLabel(b.start)} →{" "}
                      {dateLabel(b.end, "dd MMM")} {timeLabel(b.end)}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Eliminar bloqueo ${b.reason}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        blocks: draft.blocks.filter((x) => x.id !== b.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "rules" && (
          <>
            <div className="settings-section-title">
              <Settings2 size={22} />
              <div>
                <h2>Reglas que cuidan tu agenda</h2>
                <p>
                  Se aplican tanto a las reservas online como a las que crea
                  recepción.
                </p>
              </div>
            </div>
            <div className="form-row">
              {(
                [
                  {
                    key: "minNoticeHours",
                    label: "Antelación mínima (horas)",
                    help: "Tiempo mínimo entre ahora y el inicio de una cita.",
                    min: 0,
                    max: 168,
                  },
                  {
                    key: "maxAdvanceDays",
                    label: "Hasta cuántos días se puede reservar",
                    help: "Ventana futura que se muestra al cliente.",
                    min: 1,
                    max: 180,
                  },
                  {
                    key: "bufferMinutes",
                    label: "Separación posterior (minutos)",
                    help: "Margen después de cada sesión, dentro del horario.",
                    min: 0,
                    max: 60,
                  },
                  {
                    key: "slotStepMinutes",
                    label: "Proponer una hora cada (minutos)",
                    help: "Intervalo entre posibles horas de inicio.",
                    min: 5,
                    max: 60,
                  },
                  {
                    key: "cancellationHours",
                    label: "Cambiar o cancelar hasta (horas antes)",
                    help: "Después de este plazo, el cliente contacta con la clínica.",
                    min: 0,
                    max: 168,
                  },
                ] as const
              ).map((f) => (
                <label className="field" key={f.key}>
                  {f.label}
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={draft.business[f.key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        business: {
                          ...draft.business,
                          [f.key]: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <small>{f.help}</small>
                </label>
              ))}
            </div>
            <div className="info-box">
              Las reservas online quedan confirmadas al instante. Los cambios de
              reglas no modifican precios, duraciones ni márgenes ya acordados.
            </div>
          </>
        )}
        {tab === "messages" && (
          <>
            <div className="settings-section-title">
              <MessageCircle size={22} />
              <div>
                <h2>Mensajes con tu voz</h2>
                <p>
                  Vistas previas de confirmación y recordatorio. No hay envíos
                  automáticos.
                </p>
              </div>
            </div>
            <label className="field">
              Confirmación de reserva
              <textarea
                rows={5}
                value={draft.business.confirmationText}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    business: {
                      ...draft.business,
                      confirmationText: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="field">
              Recordatorio de 24 horas
              <textarea
                rows={5}
                value={draft.business.reminderText}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    business: {
                      ...draft.business,
                      reminderText: e.target.value,
                    },
                  })
                }
              />
            </label>
            <div className="info-box">
              Puedes usar:{" "}
              {
                "{nombre}, {servicio}, {negocio}, {fecha}, {hora}, {profesional}, {codigo}"
              }
              . La confirmación del cliente mostrará el mensaje con los datos de
              su cita.
            </div>
          </>
        )}
        <div className="settings-save">
          <span>
            {changed
              ? "Cambios pendientes de guardar"
              : "Configuración guardada"}
          </span>
          <button
            className="button primary"
            disabled={busy || !changed}
            onClick={save}
          >
            Guardar configuración
          </button>
        </div>
      </section>
      <section className="reset-panel">
        <div>
          <h3>Preparar una nueva demostración</h3>
          <p>
            Recupera los clientes, citas y configuración iniciales. Se perderán
            los cambios hechos en esta demo.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setReset(true);
            setConfirmation("");
          }}
        >
          <RotateCcw size={16} />
          Restablecer demo
        </button>
      </section>
      <Modal
        open={reset}
        onClose={() => setReset(false)}
        title="Restablecer la demo"
        description="Esta acción sustituirá todos los cambios por los datos ficticios iniciales."
      >
        <label className="field">
          Escribe RESTABLECER para confirmar
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </label>
        <ErrorBox error={error} />
        <div className="button-row">
          <button className="button secondary" onClick={() => setReset(false)}>
            Conservar mis cambios
          </button>
          <button
            className="button danger"
            disabled={confirmation !== "RESTABLECER" || busy}
            onClick={restore}
          >
            Restablecer datos
          </button>
        </div>
      </Modal>
    </>
  );
}
