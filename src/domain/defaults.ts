import type {
  Business,
  Professional,
  Service,
  Schedule,
  Assignment,
} from "./types";
export const business: Business = {
  id: "armonia",
  name: "Clínica Armonía",
  tagline: "Un espacio para sentirte mejor.",
  address: "Calle del Olivo, 12 · Madrid (dirección ficticia)",
  phone: "000 000 000",
  primaryColor: "#111113",
  timezone: "Europe/Madrid",
  minNoticeHours: 1,
  maxAdvanceDays: 60,
  bufferMinutes: 10,
  slotStepMinutes: 10,
  cancellationHours: 24,
  version: 1,
  confirmationText:
    "Hola {nombre} 👋 Tu cita de {servicio} en {negocio} está confirmada para el {fecha} a las {hora}, con {profesional}. Tu localizador es {codigo}. ¡Te esperamos!",
  reminderText:
    "Hola {nombre}, te recordamos tu cita de {servicio} mañana a las {hora} en {negocio}. Si necesitas cambiarla, puedes gestionar tu cita con el localizador {codigo}.",
};
export const services: Service[] = [
  {
    id: "fisio",
    name: "Fisioterapia",
    description:
      "Recupera movimiento y bienestar con una sesión adaptada a ti.",
    duration: 50,
    price: 4200,
    active: true,
    color: "#528278",
  },
  {
    id: "osteo",
    name: "Osteopatía",
    description: "Una atención manual y global para ayudarte a sentirte mejor.",
    duration: 50,
    price: 4800,
    active: true,
    color: "#aa7a52",
  },
  {
    id: "masaje",
    name: "Masaje terapéutico",
    description: "Un momento para aliviar tensiones y cuidar tu cuerpo.",
    duration: 30,
    price: 3200,
    active: true,
    color: "#8b789b",
  },
  {
    id: "podo",
    name: "Podología",
    description: "Cuida la salud y comodidad de tus pies, paso a paso.",
    duration: 40,
    price: 3800,
    active: true,
    color: "#5d85a0",
  },
];
export const professionals: Professional[] = [
  {
    id: "laura",
    name: "Laura",
    role: "Fisioterapia y osteopatía",
    active: true,
    color: "#528278",
  },
  {
    id: "marta",
    name: "Marta",
    role: "Fisioterapia y masaje",
    active: true,
    color: "#8b789b",
  },
  {
    id: "carlos",
    name: "Carlos",
    role: "Podología",
    active: true,
    color: "#5d85a0",
  },
];
export const assignments: Assignment[] = [
  ["laura", "fisio"],
  ["laura", "osteo"],
  ["marta", "fisio"],
  ["marta", "masaje"],
  ["carlos", "podo"],
].map(([professionalId, serviceId]) => ({
  id: `${professionalId}-${serviceId}`,
  professionalId,
  serviceId,
}));
export const schedules: Schedule[] = professionals.flatMap((p) =>
  [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    (weekday === 6
      ? [["09:00", "13:00"]]
      : [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ]
    ).map(([startTime, endTime], i) => ({
      id: `${p.id}-${weekday}-${i}`,
      professionalId: p.id,
      weekday,
      startTime,
      endTime,
    })),
  ),
);
