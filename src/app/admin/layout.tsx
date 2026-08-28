import PortalLayout from "@/components/PortalLayout";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Therapists", href: "/admin/therapists" },
  { label: "Appointments", href: "/admin/appointments" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Documents", href: "/admin/documents" },
  { label: "Services", href: "/admin/services" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { error } = await requireAuth("admin");
  if (error) redirect("/auth/login");
  return <PortalLayout title="Admin Portal" navItems={NAV}>{children}</PortalLayout>;
}
