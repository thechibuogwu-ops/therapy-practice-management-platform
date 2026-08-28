import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { ensureConversationForClient, getConversationPartnerName } from "@/lib/private-care";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!user || !["client", "therapist"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let requestedClientId: string | undefined;
  if (user.role === "therapist") {
    const body = await req.json().catch(() => ({}));
    requestedClientId = typeof body.clientId === "string" ? body.clientId : undefined;
    if (!requestedClientId) return NextResponse.json({ error: "Client is required." }, { status: 400 });
  }

  const conversation = await ensureConversationForClient(user, requestedClientId);
  if (!conversation) return NextResponse.json({ error: "Conversation could not be created for this relationship." }, { status: 403 });
  return NextResponse.json({ conversation: { ...conversation, partnerName: await getConversationPartnerName(conversation, user.role) } });
}
