import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ChartNoAxesColumn,
  Clock,
  Users,
} from "lucide-react";
import { AnaLogo, AnaMark } from "@/components/brand";
import { LandingVideo } from "@/components/landing-video";
import "./landing.css";

export const metadata: Metadata = {
  title: "ANA · Menos llamadas, más tiempo para tus clientes",
  description:
    "Tus clientes reservan solos por WhatsApp y tú tienes la agenda, los clientes y los horarios en un único panel.",
};

const features = [
  {
    icon: CalendarCheck,
    title: "Reservas 24/7",
    text: "Tus clientes eligen servicio, día y hora desde el móvil o WhatsApp, a cualquier hora. Sin llamadas.",
  },
  {
    icon: Clock,
    title: "Agenda y horarios",
    text: "Tu día y tu semana de un vistazo. Marca horarios, vacaciones y huecos libres en segundos.",
  },
  {
    icon: Users,
    title: "Tus clientes",
    text: "Cada cliente con su historial de citas y sus notas. Encuentras a quien buscas al momento.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Cómo va tu negocio",
    text: "Citas, ausencias y servicios más pedidos, explicados en lenguaje claro.",
  },
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link href="/" className="lp-logo" aria-label="ANA, inicio">
          <AnaMark size={36} />
        </Link>
        <Link className="lp-nav-cta" href="/demo">
          Probar la demo <ArrowRight size={15} aria-hidden />
        </Link>
      </header>

      <main>
        <section className="lp-hero">
          <p className="lp-kicker">Software a medida · Automatizaciones</p>
          <h1>
            Menos llamadas.
            <br />
            <span>Más tiempo para tus clientes.</span>
          </h1>
          <p className="lp-lead">
            Tus clientes reservan solos por WhatsApp y tú tienes la agenda, los
            clientes y los horarios en un único panel.
          </p>
        </section>

        <section className="lp-stage" aria-label="Vídeo de presentación">
          <ol className="lp-steps" aria-label="Cómo empezar">
            <li className="is-active">
              <span>1</span> Mira el vídeo
            </li>
            <li>
              <span>2</span> Pruébalo tú
            </li>
          </ol>
          <LandingVideo />
          <div className="lp-after">
            <Link className="lp-btn lp-btn-primary lp-btn-lg" href="/demo">
              Probar la demo <ArrowRight size={20} aria-hidden />
            </Link>
            <small>Gratis y sin registro · Datos de ejemplo</small>
          </div>
        </section>

        <section className="lp-features" aria-labelledby="lp-features-title">
          <p className="lp-kicker">Qué incluye</p>
          <h2 id="lp-features-title">Todo tu negocio, en un solo sitio</h2>
          <div className="lp-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="lp-card">
                <div className="lp-card-top">
                  <span className="lp-icon">
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="lp-index">0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <AnaLogo className="lp-final-logo" />
          <h2>¿Quieres probarlo tú?</h2>
          <p>Reserva como un cliente o gestiona la agenda como el negocio.</p>
          <Link className="lp-btn lp-btn-primary lp-btn-lg" href="/demo">
            Entrar en la demo <ArrowRight size={20} aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <AnaLogo className="lp-footer-logo" />
        <span>Software a medida para pequeños negocios</span>
      </footer>
    </div>
  );
}
