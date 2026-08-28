import PortalLayout from "@/components/PortalLayout";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";

const NAV = [
  { label: "Dashboard", href: "/client" },
  { label: "My Therapist", href: "/client/therapist" },
  { label: "Appointments", href: "/client/appointments" },
  { label: "Messages", href: "/client/messages" },
  { label: "Documents", href: "/client/documents" },
  { label: "Payments", href: "/client/payments" },
  { label: "Profile", href: "/client/profile" },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { error } = await requireAuth("client");
  if (error) redirect("/auth/login");
  return <PortalLayout title="Client Portal" navItems={NAV}>{children}</PortalLayout>;
}
