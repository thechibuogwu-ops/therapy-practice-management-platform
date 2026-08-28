import PortalLayout from "@/components/PortalLayout";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";

const NAV = [
  { label: "Dashboard", href: "/therapist" },
  { label: "My Clients", href: "/therapist/clients" },
  { label: "Appointments", href: "/therapist/appointments" },
  { label: "Calendar", href: "/therapist/calendar" },
  { label: "Messages", href: "/therapist/messages" },
  { label: "Documents", href: "/therapist/documents" },
  { label: "Availability", href: "/therapist/availability" },
  { label: "Profile", href: "/therapist/profile" },
];

export default async function TherapistLayout({ children }: { children: ReactNode }) {
  const { error } = await requireAuth("therapist");
  if (error) redirect("/auth/login");
  return <PortalLayout title="Therapist Portal" navItems={NAV}>{children}</PortalLayout>;
}
