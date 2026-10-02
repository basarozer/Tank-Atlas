import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tank Atlas | Refinery and Tank Inventory",
  description: "Explore facilities on satellite maps and manage your tank and equipment inventory.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
