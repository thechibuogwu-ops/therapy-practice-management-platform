import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Light Wellness | Therapy Practice Management",
  description: "Manage your therapy practice with ease using Light Wellness, a comprehensive platform for scheduling, billing, and client management.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
