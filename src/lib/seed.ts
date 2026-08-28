import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { users, therapists, clients, services, availability, practiceSettings } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function seed() {
  // Admin
  const adminHash = await hashPassword("Admin@123");
  await db.insert(users).values({
    email: "admin@diba.co.ke", fullName: "Practice Admin", passwordHash: adminHash, role: "admin", verified: true,
  }).onConflictDoNothing({ target: users.email });

  // Therapists
  const therapistsData = [
    { email: "sarah@diba.co.ke", fullName: "Dr. Sarah Wanjiku", bio: "Dr. Wanjiku is a clinical psychologist with over 10 years of experience supporting individuals facing trauma, anxiety and life transitions. She combines cognitive behavioral therapy with culturally responsive approaches, creating a safe, non-judgmental space where clients can explore difficult feelings and develop lasting strategies for wellbeing.", specialty: "Trauma & Anxiety" },
    { email: "james@diba.co.ke", fullName: "Dr. James Mutua", bio: "Dr. Mutua specialises in family therapy and relationship counselling. With extensive experience in couples work and family dynamics, he helps partners and families develop healthier communication patterns and resolve longstanding conflicts with empathy and clinical rigour.", specialty: "Family & Relationships" },
    { email: "aisha@diba.co.ke", fullName: "Dr. Aisha Omar", bio: "Dr. Omar is a child and adolescent psychologist dedicated to supporting young people through developmental challenges, school-related stress, anxiety and behavioural difficulties. She uses play therapy and age-appropriate evidence-based interventions.", specialty: "Youth & Development" },
    { email: "peter@diba.co.ke", fullName: "Dr. Peter Kamau", bio: "Dr. Kamau specialises in addiction counselling and recovery support. He provides compassionate, evidence-based treatment for substance use disorders and co-occurring mental health conditions, guiding clients through every stage of their recovery journey.", specialty: "Substance Recovery" },
  ];

  for (const t of therapistsData) {
    const hash = await hashPassword("Therapist@123");
    const [u] = await db.insert(users).values({ email: t.email, fullName: t.fullName, passwordHash: hash, role: "therapist", verified: true }).onConflictDoNothing({ target: users.email }).returning();
    let userId = u?.id;
    if (!userId) {
      const [found] = await db.select().from(users).where(eq(users.email, t.email)).limit(1);
      userId = found?.id;
    }
    if (userId) {
      // Check if therapist record exists
      const [existing] = await db.select().from(therapists).where(eq(therapists.userId, userId)).limit(1);
      if (!existing) {
        const [therapist] = await db.insert(therapists).values({ userId, bio: t.bio, specialty: t.specialty }).returning();
        // Add default availability: Mon-Fri 9:00-17:00
        if (therapist) {
          for (let day = 1; day <= 5; day++) {
            await db.insert(availability).values({
              therapistId: therapist.id,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
            }).onConflictDoNothing();
          }
        }
      } else {
        // Update bio/specialty if needed
        await db.update(therapists).set({ bio: t.bio, specialty: t.specialty }).where(eq(therapists.id, existing.id));
        // Ensure availability exists
        const existingAvail = await db.select().from(availability).where(eq(availability.therapistId, existing.id)).limit(1);
        if (existingAvail.length === 0) {
          for (let day = 1; day <= 5; day++) {
            await db.insert(availability).values({
              therapistId: existing.id,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
            }).onConflictDoNothing();
          }
        }
      }
    }
  }

  // Services
  const existingServices = await db.select().from(services).limit(1);
  if (existingServices.length === 0) {
    await db.insert(services).values([
      { name: "Initial Consultation", description: "A comprehensive first session assessment to understand your needs and develop a personalised care plan.", durationMinutes: 60, priceKES: 3000 },
      { name: "Individual Therapy", description: "One-on-one therapy session with your assigned therapist, focused on your personal goals.", durationMinutes: 50, priceKES: 5000 },
      { name: "Couples Therapy", description: "A joint session for partners seeking to improve communication, resolve conflict and strengthen their relationship.", durationMinutes: 60, priceKES: 7000 },
    ]);
  }

  // Practice settings
  const existingSettings = await db.select().from(practiceSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(practiceSettings).values({ name: "DIBA Holistic Wellness Care", email: "hello@diba.co.ke", phone: "+254 712 345 678", address: "Nairobi, Kenya" });
  }
}
