import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planificación Docente",
  description: "Gestión académica de sílabos, Anexo 1 y planes de clase.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

