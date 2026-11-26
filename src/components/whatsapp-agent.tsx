"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  Leaf,
  MoreHorizontal,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import type {
  AvailabilityDay,
  PublicBooking,
  PublicConfig,
  Service,
  Slot,
} from "@/domain/types";
import { dateLabel, dayKey, money, nextDay, timeLabel } from "@/domain/time";
import { api, uid } from "@/lib/http";

// Asistente de WhatsApp simulado: conversación guiada y determinista (sin IA ni
// envíos reales). Usa las mismas API públicas que el formulario de reserva, así
// que la cita aparece en la vista negocio como cualquier reserva de WhatsApp.

type Step =
  | "menu"
  | "service"
  | "day"
  | "time"
  | "name"
  | "phone"
  | "privacy"
  | "marketing"
  | "review"
  | "sending"
  | "done";
type Reply = { label: string; value: string };
type Msg = { id: number; from: "bot" | "user"; text: string };
type Draft = {
  service?: Service;
  day?: AvailabilityDay;
  slot?: Slot;
  name?: string;
  phone?: string;
  communicationConsent?: boolean;
};

const norm = (s: string) =>
  s
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const yes = (s: string) =>
  /^(si|vale|ok|okay|claro|acepto|de acuerdo|confirmo|confirmar|perfecto|correcto|adelante)\b/.test(
    norm(s),
  );
const no = (s: string) => /^(no|nop|nunca|prefiero que no)\b/.test(norm(s));
const weekdays = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];
const TYPING_MS = 650;

export function WhatsAppAgent({
  config,
  onManage,
  onContact,
  onForm,
  onBooked,
  onSeeBusiness,
}: {
  config: PublicConfig;
  onManage: () => void;
  onContact: () => void;
  onForm: () => void;
  onBooked: (booking: PublicBooking) => void;
  onSeeBusiness: (booking: PublicBooking) => void;
}) {
  const business = config.business;
  const today = dayKey(config.meta.now);
  const clock = timeLabel(config.meta.now);
  const menu: Reply[] = [
    { label: "Reservar cita", value: "reservar" },
    { label: "Consultar o gestionar mi cita", value: "gestionar" },
    { label: "Hablar con la clínica", value: "humano" },
  ];
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 0,
      from: "bot",
      text: `Hola 👋 Soy el asistente de ${business.name}.\n\nTe ayudo a reservar tu cita aquí mismo, en un minuto. ¿Qué necesitas?`,
    },
  ]);
  const [step, setStep] = useState<Step>("menu");
  const [replies, setReplies] = useState<Reply[]>(menu);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [dayPage, setDayPage] = useState(0);
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [operationKey, setOperationKey] = useState(uid);
  const list = useRef<HTMLDivElement>(null);
  const counter = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, replies]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function push(from: Msg["from"], body: string) {
    setMessages((m) => [...m, { id: counter.current++, from, text: body }]);
  }
  // El asistente "escribe" cada mensaje con una pequeña pausa.
  function say(lines: string[], next: Step, options: Reply[] = []) {
    setTyping(true);
    setReplies([]);
    lines.forEach((line, i) => {
      timers.current.push(
        setTimeout(
          () => {
            push("bot", line);
            if (i === lines.length - 1) {
              setTyping(false);
              setStep(next);
              setReplies(options);
            }
          },
          TYPING_MS * (i + 1),
        ),
      );
    });
  }

  const serviceReplies = (): Reply[] =>
    config.services
      .filter((s) => s.active)
      .map((s) => ({
        label: `${s.name} · ${money(s.price)}`,
        value: s.id,
      }));
  function dayName(date: string) {
    if (date === today) return `Hoy, ${dateLabel(date, "EEEE d")}`;
    if (date === nextDay(today, 1)) return `Mañana, ${dateLabel(date, "EEEE d")}`;
    return dateLabel(date, "EEEE d 'de' MMMM");
  }
  const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  function dayReplies(all: AvailabilityDay[], page: number): Reply[] {
    const open = all.filter((d) => d.slots.length);
    const shown = open.slice(page * 4, page * 4 + 4).map((d) => ({
      label: capital(dayName(d.date)),
      value: d.date,
    }));
    return open.length > (page + 1) * 4
      ? [...shown, { label: "Ver otros días", value: "mas-dias" }]
      : shown;
  }
  function uniqueSlots(day: AvailabilityDay) {
    return day.slots.filter(
      (s, i, all) => all.findIndex((o) => o.start === s.start) === i,
    );
  }
  function timeReplies(day: AvailabilityDay, filter?: "am" | "pm"): Reply[] {
    const slots = uniqueSlots(day);
    const am = slots.filter((s) => Number(timeLabel(s.start).slice(0, 2)) < 14);
    const pm = slots.filter((s) => Number(timeLabel(s.start).slice(0, 2)) >= 14);
    const pick =
      filter === "am"
        ? am.slice(0, 10)
        : filter === "pm"
          ? pm.slice(0, 10)
          : [...am.slice(0, 5), ...pm.slice(0, 5)];
    return [
      ...pick.map((s) => ({ label: timeLabel(s.start), value: s.start })),
      { label: "Otro día", value: "otro-dia" },
    ];
  }
  function professional(id: string) {
    return config.professionals.find((p) => p.id === id)?.name || "el equipo";
  }

  async function chooseService(service: Service) {
    const next = { ...draft, service, day: undefined, slot: undefined };
    setDraft(next);
    setTyping(true);
    setReplies([]);
    try {
      const q = new URLSearchParams({
        serviceId: service.id,
        from: today,
        days: "21",
      });
      const data = await api<AvailabilityDay[]>(`availability?${q}`);
      setDays(data);
      setDayPage(0);
      const open = data.filter((d) => d.slots.length);
      if (!open.length) {
        say(
          [
            `Ahora mismo no me quedan huecos de ${service.name} en las próximas semanas 😕`,
            "¿Quieres probar con otro servicio o prefieres que te atienda alguien del equipo?",
          ],
          "service",
          [...serviceReplies(), { label: "Hablar con la clínica", value: "humano" }],
        );
        return;
      }
      say(
        [
          `Genial, ${service.name} 🙌\nSon ${service.duration} minutos y cuesta ${money(service.price)} (se paga en la clínica).`,
          "¿Qué día te viene bien? Estos son los primeros con hueco:",
        ],
        "day",
        dayReplies(data, 0),
      );
    } catch (e) {
      say(
        [
          `Uy, no he podido consultar la agenda: ${(e as Error).message}`,
          "¿Lo intentamos otra vez?",
        ],
        "service",
        serviceReplies(),
      );
    }
  }
  function chooseDay(day: AvailabilityDay) {
    setDraft((d) => ({ ...d, day, slot: undefined }));
    say(
      [
        `${capital(dayName(day.date))}, perfecto. Tengo estas horas libres (hora de Madrid). ¿Cuál prefieres?`,
      ],
      "time",
      timeReplies(day),
    );
  }
  function chooseSlot(slot: Slot) {
    setDraft((d) => ({ ...d, slot }));
    say(
      [
        `Te reservo las ${timeLabel(slot.start)} con ${professional(slot.professionalId)} ✨`,
        "Para guardar la cita necesito un par de datos. ¿Cómo te llamas? (nombre y apellido)",
      ],
      "name",
    );
  }
  function review(d: Draft) {
    if (!d.service || !d.slot || !d.day) return;
    say(
      [
        `Repasamos tu cita 📋\n\n• ${d.service.name}\n• ${capital(dateLabel(d.slot.start))} a las ${timeLabel(d.slot.start)}\n• Con ${professional(d.slot.professionalId)}\n• ${d.service.duration} min · ${money(d.service.price)}\n• A nombre de ${d.name} (${d.phone})\n\nPuedes cambiarla o cancelarla hasta ${business.cancellationHours} h antes. ¿La confirmo?`,
      ],
      "review",
      [
        { label: "Sí, confirmar", value: "confirmar" },
        { label: "Cambiar algo", value: "cambiar" },
      ],
    );
  }
  async function submit(d: Draft) {
    if (!d.service || !d.slot || !d.name || !d.phone) return;
    setStep("sending");
    setReplies([]);
    setTyping(true);
    try {
      const result = await api<PublicBooking>("bookings", {
        serviceId: d.service.id,
        professionalId: d.slot.professionalId,
        start: d.slot.start,
        operationKey,
        client: {
          name: d.name,
          phone: d.phone,
          email: "",
          privacyConsent: true,
          communicationConsent: Boolean(d.communicationConsent),
        },
        customerNote: "",
        source: "WhatsApp",
      });
      setBooking(result);
      onBooked(result);
      say(
        [
          `¡Hecho, ${d.name.split(" ")[0]}! ✅ Tu cita está confirmada.\n\nLocalizador: ${result.code}\n${capital(dateLabel(result.start))} · ${timeLabel(result.start)}\n${result.serviceName} con ${result.professionalName}`,
          `Te escribiremos un recordatorio 24 h antes. Para cambiarla, escríbeme "gestionar mi cita" con tu localizador.\n\n📍 ${business.address}`,
        ],
        "done",
        [
          { label: "Hacer otra reserva", value: "otra" },
          { label: "Consultar o gestionar mi cita", value: "gestionar" },
        ],
      );
    } catch (e) {
      const message = (e as Error).message;
      setOperationKey(uid());
      if (/hueco|hora no está/.test(message) && d.service) {
        push(
          "bot",
          "Vaya, esa hora se acaba de ocupar 😅 Te enseño lo que queda libre.",
        );
        chooseService(d.service);
      } else
        say(
          [`No he podido guardar la cita: ${message}`, "¿Lo intentamos de nuevo?"],
          "review",
          [
            { label: "Sí, confirmar", value: "confirmar" },
            { label: "Cambiar algo", value: "cambiar" },
          ],
        );
    }
  }

  function startBooking() {
    say(["¡Claro! ¿Qué servicio necesitas?"], "service", serviceReplies());
  }
  function matchService(input: string) {
    const typed = words(input).filter((w) => w.length >= 4);
    return config.services
      .filter((s) => s.active)
      .find((s) =>
        words(s.name).some((w) =>
          typed.some((t) => w.startsWith(t) || t.startsWith(w.slice(0, 5))),
        ),
      );
  }
  function matchDay(input: string) {
    const t = norm(input);
    const open = days.filter((d) => d.slots.length);
    if (/\bhoy\b/.test(t)) return days.find((d) => d.date === today);
    if (/pasado manana/.test(t))
      return days.find((d) => d.date === nextDay(today, 2));
    if (/\bmanana\b/.test(t))
      return days.find((d) => d.date === nextDay(today, 1));
    const wd = weekdays.findIndex((w) => t.includes(w));
    if (wd >= 0)
      return open.find((d) => new Date(`${d.date}T12:00:00Z`).getUTCDay() === wd);
    const num = t.match(/\b(\d{1,2})\b/);
    if (num) return days.find((d) => Number(d.date.slice(8)) === Number(num[1]));
    if (/primer|cuanto antes|lo antes|cualquier/.test(t)) return open[0];
    return undefined;
  }
  function matchSlot(input: string, day: AvailabilityDay) {
    const t = norm(input);
    const slots = uniqueSlots(day);
    if (/primer|cuanto antes|cualquier|lo antes/.test(t)) return slots[0];
    const m = t.match(/(\d{1,2})(?:[:.h ]+(\d{2}))?/);
    if (!m) return undefined;
    let h = Number(m[1]);
    if (h < 8 && /tarde/.test(t)) h += 12;
    if (h >= 1 && h <= 7) h += 12;
    const min = m[2] ? Number(m[2]) : undefined;
    return slots.find((s) => {
      const [sh, sm] = timeLabel(s.start).split(":").map(Number);
      return sh === h && (min === undefined ? true : sm === min);
    });
  }

  // Interpreta una respuesta, venga de un botón (value) o escrita a mano (text).
  function handle(input: string, value?: string) {
    const t = norm(input);
    if (/^(menu|inicio|empezar|volver)$/.test(t) && step !== "sending") {
      say(["Volvemos al principio. ¿Qué necesitas?"], "menu", menu);
      return;
    }
    switch (step) {
      case "menu":
      case "done": {
        if (value === "gestionar" || /gestion|consult|cancel|cambiar|localizador|mi cita/.test(t)) {
          say(
            ["Te abro la gestión de citas. Necesitarás tu localizador y tu teléfono 🔎"],
            step,
            step === "done" ? replies : menu,
          );
          timers.current.push(setTimeout(onManage, TYPING_MS + 300));
          return;
        }
        if (value === "humano" || /humano|persona|alguien|hablar|llamar|equipo/.test(t)) {
          say(
            ["Te paso con el equipo de la clínica 🤝 Mientras, aquí tienes nuestros datos."],
            step,
            step === "done" ? replies : menu,
          );
          timers.current.push(setTimeout(onContact, TYPING_MS + 300));
          return;
        }
        const service = matchService(input);
        if (service) {
          setDraft({});
          chooseService(service);
          return;
        }
        if (value === "reservar" || value === "otra" || /reserv|cita|hora|pedir|quiero/.test(t)) {
          setDraft({});
          setBooking(null);
          setOperationKey(uid());
          startBooking();
          return;
        }
        if (/^(hola|buenas|buenos|hey|ey)/.test(t)) {
          say(["¡Hola! 😊 ¿En qué te puedo ayudar?"], step, menu);
          return;
        }
        if (/precio|cuanto|cuesta|servicio/.test(t)) {
          say(
            [
              config.services
                .filter((s) => s.active)
                .map((s) => `• ${s.name}: ${s.duration} min · ${money(s.price)}`)
                .join("\n"),
              "¿Te reservo alguno?",
            ],
            "service",
            serviceReplies(),
          );
          return;
        }
        say(
          ["Puedo reservarte una cita, ayudarte con la que ya tienes o pasarte con el equipo. ¿Qué prefieres?"],
          step,
          menu,
        );
        return;
      }
      case "service": {
        if (value === "humano") {
          say(["Te paso con el equipo de la clínica 🤝"], "menu", menu);
          timers.current.push(setTimeout(onContact, TYPING_MS + 300));
          return;
        }
        const service =
          config.services.find((s) => s.id === value) || matchService(input);
        if (service) chooseService(service);
        else
          say(
            ["No he encontrado ese servicio 🤔 Elige uno de estos:"],
            "service",
            serviceReplies(),
          );
        return;
      }
      case "day": {
        if (value === "mas-dias" || /otro|mas|siguiente/.test(t)) {
          const page = dayReplies(days, dayPage + 1).length ? dayPage + 1 : 0;
          setDayPage(page);
          say(["Estos son los siguientes días con hueco:"], "day", dayReplies(days, page));
          return;
        }
        const day = days.find((d) => d.date === value) || matchDay(input);
        if (day && day.slots.length) chooseDay(day);
        else
          say(
            [
              day
                ? `Ese día no me quedan huecos${day.reason ? ` (${day.reason.toLowerCase().replace(/\.$/, "")})` : ""}. ¿Te va bien alguno de estos?`
                : "No te he entendido el día. Puedes escribir «mañana», «el jueves» o elegir uno:",
            ],
            "day",
            dayReplies(days, dayPage),
          );
        return;
      }
      case "time": {
        const day = draft.day;
        if (!day) return;
        if (value === "otro-dia" || /otro dia|cambiar dia/.test(t)) {
          say(["Sin problema. ¿Qué otro día te va bien?"], "day", dayReplies(days, dayPage));
          return;
        }
        if (!value && /\b(por la )?(manana|tarde)\b/.test(t) && !/\d/.test(t)) {
          const pm = t.includes("tarde");
          const options = timeReplies(day, pm ? "pm" : "am");
          say(
            [
              options.length > 1
                ? `Por la ${pm ? "tarde" : "mañana"} tengo estas horas:`
                : `Por la ${pm ? "tarde" : "mañana"} ya no me queda nada ese día. ¿Miramos otro?`,
            ],
            "time",
            options.length > 1 ? options : timeReplies(day),
          );
          return;
        }
        const slot =
          day.slots.find((s) => s.start === value) || matchSlot(input, day);
        if (slot) chooseSlot(slot);
        else
          say(
            ["Esa hora no está libre. Elige una de estas o escribe por ejemplo «a las 17:00»:"],
            "time",
            timeReplies(day),
          );
        return;
      }
      case "name": {
        const name = input.trim().replace(/\s+/g, " ");
        if (name.length < 2 || name.length > 100 || !/\p{L}/u.test(name)) {
          say(["¿Me dices tu nombre y apellido, por favor?"], "name");
          return;
        }
        setDraft((d) => ({ ...d, name }));
        say(
          [
            `Un placer, ${name.split(" ")[0]} 😊 ¿A qué teléfono te escribimos para la confirmación? (usa uno ficticio, es una demo)`,
          ],
          "phone",
        );
        return;
      }
      case "phone": {
        const phone = input.trim();
        if (!/^[+0-9 ()-]{9,22}$/.test(phone) || phone.replace(/\D/g, "").length < 9) {
          say(["Ese teléfono no parece válido. Escríbelo con 9 cifras, por ejemplo 000 987 654."], "phone");
          return;
        }
        setDraft((d) => ({ ...d, phone }));
        say(
          [
            `Una última cosa 🔒 Para guardar tu cita, ${business.name} usará tu nombre y teléfono solo para gestionarla. En esta demo se guardan únicamente en el ordenador que la ejecuta. ¿Lo aceptas?`,
          ],
          "privacy",
          [
            { label: "Acepto", value: "si" },
            { label: "No acepto", value: "no" },
          ],
        );
        return;
      }
      case "privacy": {
        if (value === "si" || (!value && yes(input))) {
          say(
            ["¡Gracias! Y, solo si te apetece: ¿quieres recibir novedades y promociones de la clínica? (opcional)"],
            "marketing",
            [
              { label: "Sí, quiero", value: "si" },
              { label: "No, gracias", value: "no" },
            ],
          );
        } else if (value === "no" || no(input)) {
          say(
            ["Lo entiendo. Sin ese permiso no puedo guardar la cita por aquí. Si cambias de opinión, pulsa «Acepto» o habla con la clínica."],
            "privacy",
            [
              { label: "Acepto", value: "si" },
              { label: "Hablar con la clínica", value: "humano" },
            ],
          );
        } else
          say(["¿Aceptas que usemos tus datos para gestionar la cita?"], "privacy", [
            { label: "Acepto", value: "si" },
            { label: "No acepto", value: "no" },
          ]);
        return;
      }
      case "marketing": {
        const communicationConsent = value ? value === "si" : yes(input);
        const next = { ...draft, communicationConsent };
        setDraft(next);
        review(next);
        return;
      }
      case "review": {
        if (value === "confirmar" || (!value && yes(input))) {
          submit(draft);
        } else if (value === "cambiar" || /cambiar|no|otro/.test(t)) {
          say(["Sin problema, empecemos de nuevo. ¿Qué servicio necesitas?"], "service", serviceReplies());
        } else
          say(["¿Confirmo la cita?"], "review", [
            { label: "Sí, confirmar", value: "confirmar" },
            { label: "Cambiar algo", value: "cambiar" },
          ]);
        return;
      }
      default:
        return;
    }
  }

  function answer(reply: Reply) {
    if (typing || step === "sending") return;
    if (step === "privacy" && reply.value === "humano") {
      push("user", reply.label);
      onContact();
      return;
    }
    push("user", reply.label);
    handle(reply.label, reply.value);
  }
  function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || typing || step === "sending") return;
    push("user", value);
    setText("");
    handle(value);
  }

  const placeholder: Partial<Record<Step, string>> = {
    name: "Escribe tu nombre y apellido",
    phone: "Escribe tu teléfono (ficticio)",
    day: "Por ejemplo: mañana, el jueves…",
    time: "Por ejemplo: a las 17:00",
  };

  return (
    <div className="agent-wrap">
      <section className="chat-preview agent-chat" aria-label="WhatsApp simulado">
        <div className="chat-top">
          <span className="chat-avatar">
            <Leaf size={25} />
          </span>
          <div>
            <strong>{business.name}</strong>
            <small>
              <span />
              {typing ? "escribiendo…" : "Cuenta de empresa · en línea"}
            </small>
          </div>
          <MoreHorizontal size={22} />
        </div>
        <div
          className="chat-body agent-body"
          ref={list}
          role="log"
          aria-live="polite"
          aria-label="Conversación"
        >
          <span className="chat-today">HOY</span>
          <div className="chat-security">
            <ShieldCheck size={12} />
            Conversación simulada. No se envía ningún mensaje real.
          </div>
          {messages.map((m) => (
            <div key={m.id} className={`agent-msg ${m.from === "user" ? "from-user" : "from-bot"}`}>
              <div className="agent-bubble">
                {m.text}
                <span className="agent-time">
                  {clock}
                  {m.from === "user" && <CheckCheck size={13} />}
                </span>
              </div>
            </div>
          ))}
          {typing && (
            <div className="agent-msg from-bot" aria-label="El asistente está escribiendo">
              <div className="agent-bubble agent-typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {replies.length > 0 && (
            <div className="agent-replies" role="group" aria-label="Respuestas rápidas">
              {replies.map((r) => (
                <button key={r.value + r.label} onClick={() => answer(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <form className="agent-input" onSubmit={send}>
          <input
            aria-label="Escribe un mensaje"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder[step] || "Escribe un mensaje"}
            maxLength={200}
            inputMode={step === "phone" ? "tel" : undefined}
            disabled={step === "sending"}
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={!text.trim() || typing || step === "sending"}
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </section>
      {booking && step === "done" && (
        <div className="agent-demo-callout" role="status">
          <span>
            <strong>Así lo ve la clínica:</strong> la reserva ya está en su agenda.
          </span>
          <button className="button primary" onClick={() => onSeeBusiness(booking)}>
            Ver en la vista negocio
            <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      <button className="text-link agent-form-link" onClick={onForm}>
        Prefiero reservar con el formulario
      </button>
    </div>
  );
}
