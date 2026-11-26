export const statuses = [
  "pendiente",
  "confirmada",
  "atendida",
  "cancelada",
  "no presentada",
] as const;
export type Status = (typeof statuses)[number];
export type Source = "WhatsApp" | "teléfono" | "presencial" | "web";
export interface Business {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  primaryColor: string;
  timezone: string;
  minNoticeHours: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  cancellationHours: number;
  confirmationText: string;
  reminderText: string;
  version: number;
}
export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
  color: string;
}
export interface Professional {
  id: string;
  name: string;
  role: string;
  active: boolean;
  color: string;
}
export interface Assignment {
  id: string;
  serviceId: string;
  professionalId: string;
}
export interface Schedule {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}
export interface Block {
  id: string;
  professionalId: string | null;
  start: string;
  end: string;
  reason: string;
}
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  privacyConsent: boolean;
  communicationConsent: boolean;
  notes: string;
  createdAt: string;
}
export interface Booking {
  id: string;
  code: string;
  clientId: string;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  start: string;
  end: string;
  duration: number;
  price: number;
  bufferMinutes: number;
  status: Status;
  source: Source;
  customerNote: string;
  internalNote: string;
  createdAt: string;
  version: number;
}
export interface BookingEvent {
  id: string;
  bookingId: string;
  at: string;
  action: string;
  actor: string;
  before: string;
  after: string;
}
export interface Message {
  id: string;
  bookingId: string | null;
  clientId: string | null;
  at: string;
  kind: string;
  text: string;
  status: string;
}
export interface Operation {
  id: string;
  bookingId: string;
  fingerprint: string;
}
export interface Meta {
  id: string;
  now: string;
  revision: number;
}
export interface State {
  business: Business;
  meta: Meta;
  services: Service[];
  professionals: Professional[];
  assignments: Assignment[];
  schedules: Schedule[];
  blocks: Block[];
  clients: Client[];
  bookings: Booking[];
  events: BookingEvent[];
  messages: Message[];
  operations: Operation[];
}
export interface Slot {
  start: string;
  end: string;
  professionalId: string;
}
export interface AvailabilityDay {
  date: string;
  slots: Slot[];
  reason: string;
}
export interface PublicConfig {
  business: Business;
  meta: Meta;
  services: Service[];
  professionals: Professional[];
}
export interface PublicBooking {
  id: string;
  code: string;
  serviceName: string;
  professionalName: string;
  start: string;
  end: string;
  duration: number;
  price: number;
  status: Status;
  version: number;
  serviceId: string;
  professionalId: string;
  clientName: string;
  phone: string;
  confirmation: string;
  reminder: string;
}
export interface Filters {
  from: string;
  to: string;
  professionalId?: string;
  serviceId?: string;
  status?: string;
}
