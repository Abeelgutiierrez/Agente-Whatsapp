import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ChartNoAxesColumn,
  Clock,
  Users,
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: "Reservas, clientes y horarios en un solo panel",
  description:
    "Tus clientes reservan solos y tú ves tu día, tus clientes y tus horarios en un único panel sencillo.",
};

const features = [
  {
    icon: CalendarCheck,
    title: "Reservas online",
    text: "Tus clientes eligen servicio, día y hora desde el móvil, a cualquier hora. Sin llamadas ni esperas.",
  },
  {
    icon: Clock,
    title: "Agenda y horarios",
    text: "Ves tu día y tu semana de un vistazo. Marcas tus horarios, vacaciones y huecos libres en un momento.",
  },
  {
    icon: Users,
    title: "Tus clientes",
    text: "Cada cliente con su historial de citas y sus notas. Encuentras a quien buscas en segundos.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Cómo va tu negocio",
    text: "Citas, ausencias y servicios más pedidos, explicados en lenguaje claro para tomar mejores decisiones.",
  },
];

export default function Landing() {
  return (
    <main className="lp">
      <section className="lp-hero">
        <span className="lp-tag">Reservas · Clientes · Horarios</span>
        <h1>Tu negocio organizado, sin complicaciones</h1>
        <p>
          Un panel sencillo donde tus clientes reservan solos y tú tienes la
          agenda, los clientes y los horarios siempre a mano.
        </p>
        <Link className="lp-cta" href="/demo">
          Ver demo <ArrowRight size={20} aria-hidden />
        </Link>
        <small>Gratis y sin registro. Datos de ejemplo.</small>
      </section>

      <section className="lp-features" aria-label="Qué incluye">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="lp-card">
            <div className="lp-icon">
              <Icon size={24} aria-hidden />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <footer className="lp-footer">
        <Link href="/demo">Probar la demo →</Link>
      </footer>
    </main>
  );
}
