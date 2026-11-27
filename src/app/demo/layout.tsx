import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Demo · ANA",
};
export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
