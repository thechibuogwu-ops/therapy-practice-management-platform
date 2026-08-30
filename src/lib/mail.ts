const RESEND_API_URL = "https://api.resend.com/emails";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("Email not sent: RESEND_API_KEY or EMAIL_FROM is missing.");
    return { ok: false, error: "Email delivery not configured." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Resend API error:", res.status, errText);
      return { ok: false, error: "Failed to send email." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Email send exception:", err);
    return { ok: false, error: "Failed to send email." };
  }
}

export function activationEmailHtml(fullName: string, activationUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome, ${escapeHtml(fullName)}</h2>
      <p>You've been invited to activate your account. Click the link below to set up your password and get started.</p>
      <p style="margin: 24px 0;">
        <a href="${activationUrl}" style="background:#111;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
          Activate Your Account
        </a>
      </p>
      <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br>${activationUrl}</p>
    </div>
  `;
}

export function bookingConfirmationHtml(clientName: string, details: {
  therapistName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Booking Confirmed</h2>
      <p>Hi ${escapeHtml(clientName)},</p>
      <p>Your session has been booked. Here are the details:</p>
      <ul>
        <li><strong>Therapist:</strong> ${escapeHtml(details.therapistName)}</li>
        <li><strong>Service:</strong> ${escapeHtml(details.serviceName)}</li>
        <li><strong>Date:</strong> ${escapeHtml(details.date)}</li>
        <li><strong>Time:</strong> ${escapeHtml(details.startTime)}</li>
      </ul>
      <p>We look forward to seeing you.</p>
    </div>
  `;
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}