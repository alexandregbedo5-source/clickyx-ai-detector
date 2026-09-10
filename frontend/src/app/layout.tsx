import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "ClickyX — Détecteur d'images IA",
  description:
    "Forensic numérique : estime la probabilité qu'une image soit générée par une IA (FFT + bruit résiduel + CNN).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          ClickyX — IA Forensics · analyse CPU, sans service tiers
        </footer>
      </body>
    </html>
  );
}
