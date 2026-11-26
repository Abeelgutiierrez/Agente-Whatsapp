import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Demo · Clínica Armonía",
};
export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
