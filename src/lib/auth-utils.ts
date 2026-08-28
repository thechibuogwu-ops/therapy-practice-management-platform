import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/db";
import { users, clients, therapists } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
  return user?.active && user.verified ? user : null;
}

export async function requireAuth(role?: string) {
  const user = await getAuthUser();
  if (!user) return { user: null, error: "Unauthorized" as const };
  if (role && user.role !== role) return { user: null, error: "Forbidden" as const };
  return { user, error: null };
}

export async function getClientRecord(userId: string) {
  const [c] = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  return c || null;
}

export async function getTherapistRecord(userId: string) {
  const [t] = await db.select().from(therapists).where(and(eq(therapists.userId, userId), eq(therapists.active, true))).limit(1);
  return t || null;
}
