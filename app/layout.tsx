import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tank Atlas | Rafineri ve Tank Envanteri",
  description: "Türkiye rafinerilerini uydu üzerinden inceleyin, tank ve ekipman bilgilerinizi güvenle kaydedin.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
