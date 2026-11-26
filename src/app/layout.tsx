import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Clínica Armonía · Tu día, en equilibrio",
  description:
    "Reserva tu cita y cuida de tu negocio. Piloto local con datos ficticios.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
