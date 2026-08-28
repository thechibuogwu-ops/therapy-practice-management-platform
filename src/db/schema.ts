import { pgTable, serial, text, timestamp, boolean, integer, varchar, uuid, decimal, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "therapist", "client"] }).notNull(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 30 }),
  active: boolean("active").notNull().default(true),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxInvitationUser: index("idx_invitation_user").on(table.userId),
  idxInvitationExpiry: index("idx_invitation_expiry").on(table.expiresAt),
}));

export const therapists = pgTable("therapists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  professionalTitle: text("professional_title"),
  specialty: text("specialty"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  priceKES: integer("price_kes").notNull(),
  active: boolean("active").default(true),
});

export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sun
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeoff = pgTable("timeoff", {
  id: uuid("id").primaryKey().defaultRandom(),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  idxTimeoffTherapist: index("idx_timeoff_therapist").on(table.therapistId),
}));

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id").references(() => services.id),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),
  status: text("status", { enum: ["pending","confirmed","completed","cancelled","rescheduled","no-show"] }).default("pending"),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  paymentStatus: text("payment_status", { enum: ["pending","successful","failed","refunded"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  idxApptClient: index("idx_appt_client").on(table.clientId),
  idxApptTherapist: index("idx_appt_therapist").on(table.therapistId),
}));

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  unqClientTherapist: uniqueIndex("unq_client_therapist").on(table.clientId, table.therapistId),
  idxConversationTherapist: index("idx_conversation_therapist").on(table.therapistId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxMsgConvCreated: index("idx_msg_conv_created").on(table.conversationId, table.createdAt),
  idxMsgConvUnread: index("idx_msg_conv_unread").on(table.conversationId, table.read),
}));

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxAttachmentMessage: index("idx_attachment_message").on(table.messageId),
}));

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  therapistId: uuid("therapist_id").references(() => therapists.id),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  category: text("category").notNull().default("general"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxDocClient: index("idx_doc_client").on(table.clientId, table.createdAt),
  idxDocTherapist: index("idx_doc_therapist").on(table.therapistId, table.createdAt),
}));

export const sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  therapistId: uuid("therapist_id").notNull().references(() => therapists.id, { onDelete: "restrict" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  idxSessionNotesTherapistClient: index("idx_session_notes_therapist_client").on(table.therapistId, table.clientId, table.createdAt),
  idxSessionNotesAppointment: index("idx_session_notes_appointment").on(table.appointmentId),
  idxSessionNotesCreated: index("idx_session_notes_created").on(table.createdAt),
}));

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  amountKES: integer("amount_kes").notNull(),
  currency: text("currency").default("KES"),
  provider: text("provider").notNull(), // paystack, flutterwave
  transactionRef: text("transaction_ref").notNull(),
  method: text("method"), // mpesa, card, etc.
  status: text("status", { enum: ["pending","successful","failed","refunded"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  idxPayClient: index("idx_pay_client").on(table.clientId),
  unqPaymentTransactionRef: uniqueIndex("unq_payment_transaction_ref").on(table.transactionRef),
}));

export const paymentCheckoutTokens = pgTable("payment_checkout_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxCheckoutAppointment: index("idx_checkout_appointment").on(table.appointmentId),
  idxCheckoutExpiry: index("idx_checkout_expiry").on(table.expiresAt),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  idxNotiUser: index("idx_noti_user").on(table.userId),
}));

export const practiceSettings = pgTable("practice_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").default("DIBA Holistic Wellness"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  currency: text("currency").default("KES"),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  idxAuditEntity: index("idx_audit_entity").on(table.entityType, table.entityId),
  idxAuditActor: index("idx_audit_actor").on(table.actorUserId),
}));

export const usersRelations = relations(users, ({ one }) => ({
  therapist: one(therapists, { fields: [users.id], references: [therapists.userId] }),
  client: one(clients, { fields: [users.id], references: [clients.userId] }),
}));

export const therapistsRelations = relations(therapists, ({ one, many }) => ({
  user: one(users, { fields: [therapists.userId], references: [users.id] }),
  clients: many(clients),
  availability: many(availability),
  conversations: many(conversations),
  appointmentsAsTherapist: many(appointments),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  therapist: one(therapists, { fields: [clients.therapistId], references: [therapists.id] }),
  appointments: many(appointments),
  conversations: many(conversations),
  documents: many(documents),
  payments: many(payments),
}));
