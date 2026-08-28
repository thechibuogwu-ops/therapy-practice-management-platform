"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { addCalendarDays, formatPracticeDate, getNairobiToday } from "@/lib/practice-time";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type Therapist = { id: string; fullName: string; specialty: string | null };
type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceKES: number };
type Slot = { startTime: string; endTime: string };

export default function BookPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f4f2ee] flex items-center justify-center"><p className="text-[#8a7e6a]">Loading booking…</p></main>}>
      <BookPageInner />
    </Suspense>
  );
}

function BookPageInner() {
  const searchParams = useSearchParams();
  const preselectedTherapist = searchParams.get("therapist");

  const [step, setStep] = useState(1);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // Load therapists and services
  useEffect(() => {
    fetch("/api/public/therapists").then(r => r.json()).then(d => {
      if (d.therapists) {
        setTherapists(d.therapists);
        if (preselectedTherapist) {
          const found = d.therapists.find((t: Therapist) => t.id === preselectedTherapist);
          if (found) { setSelectedTherapist(found.id); setStep(2); }
        }
      }
    });
    fetch("/api/public/services").then(r => r.json()).then(d => { if (d.services) setServices(d.services); });
  }, [preselectedTherapist]);

  // Load availability when therapist + service + date are selected
  useEffect(() => {
    let cancelled = false;
    const loadAvailability = async () => {
      if (!selectedTherapist || !selectedService || !selectedDate) {
        await Promise.resolve();
        if (!cancelled) { setSlots([]); setSlotsMsg(""); setSelectedSlot(null); }
        return;
      }
      await Promise.resolve();
      if (cancelled) return;
      setSlotsLoading(true); setSlotsMsg(""); setSelectedSlot(null);
      try {
        const response = await fetch(`/api/public/availability?therapistId=${selectedTherapist}&serviceId=${selectedService}&date=${selectedDate}`);
        const d = await response.json();
        if (cancelled) return;
        setSlots(d.slots || []);
        if (d.message || d.error) setSlotsMsg(d.message || d.error);
        else if ((d.slots || []).length === 0) setSlotsMsg("No available times on this date. Please try another day.");
      } catch {
        if (!cancelled) setSlotsMsg("Failed to load availability.");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };
    void loadAvailability();
    return () => { cancelled = true; };
  }, [selectedTherapist, selectedService, selectedDate]);

  const selectedTherapistObj = therapists.find(t => t.id === selectedTherapist);
  const selectedServiceObj = services.find(s => s.id === selectedService);

  // Practice date is always Africa/Nairobi; never derive it from browser UTC.
  const minDate = addCalendarDays(getNairobiToday(), 1);

  async function handleBook() {
    setBooking(true);
    setBookingError("");
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: selectedTherapist,
          serviceId: selectedService,
          date: selectedDate,
          startTime: selectedSlot!.startTime,
          clientName,
          clientEmail,
          clientPhone,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBookingError(data.error || "Booking failed"); setBooking(false); return; }
      setConfirmation(data);

      // Initialize payment if price > 0
      if (data.service?.priceKES > 0 && data.appointment?.id) {
        const payRes = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: data.appointment.id, paymentAuthorization: data.paymentAuthorization }),
        });
        const payData = await payRes.json();
        setPaymentInfo(payData);
        if (payData.status === "redirect" && payData.paymentUrl) {
          // Redirect to payment provider
          window.location.href = payData.paymentUrl;
          return;
        }
      }
      setStep(7);
    } catch {
      setBookingError("An unexpected error occurred. Please try again.");
    }
    setBooking(false);
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  const steps = [
    { n: 1, label: "Therapist" },
    { n: 2, label: "Service" },
    { n: 3, label: "Date & Time" },
    { n: 4, label: "Your Details" },
    { n: 5, label: "Confirm" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#2a2724] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <p className="text-[#9a8e7e] uppercase tracking-[0.22em] text-[10px] font-bold mb-4">Booking</p>
        <h1 className="font-serif text-[2.4rem] md:text-[3rem] font-medium text-[#1a3325] mb-4 leading-[1.05]">Book a Session</h1>
        <p className="text-[16px] text-[#6b655c] mb-10">Select your preferred therapist, service, date and time.</p>

        {/* Progress */}
        {step < 7 && (
          <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
            {steps.map(s => (
              <div key={s.n} className={`flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide shrink-0 ${step >= s.n ? "text-[#1a3325]" : "text-[#c4bfb4]"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] ${step > s.n ? "bg-[#1a3325] text-white" : step === s.n ? "bg-[#1a3325] text-white" : "bg-[#e5e0d6] text-[#9a8e7e]"}`}>
                  {step > s.n ? <Check size={14} /> : s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
                {s.n < 5 && <span className="text-[#ddd8cf] mx-1">—</span>}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Choose Therapist */}
        {step === 1 && (
          <div>
            <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-6">Choose Your Therapist</h2>
            {therapists.length === 0 ? (
              <p className="text-[#8a7e6a]">Loading therapists…</p>
            ) : (
              <div className="space-y-3">
                {therapists.map(t => (
                  <button key={t.id} onClick={() => { setSelectedTherapist(t.id); setStep(2); }}
                    className={`w-full text-left p-5 rounded-xl border transition ${selectedTherapist === t.id ? "border-[#1a3325] bg-[#1a3325]/5" : "border-[#e5e0d6] bg-[#f8f6f0] hover:border-[#c4bfb4]"}`}>
                    <h3 className="font-medium text-[#1a3325] text-[16px]">{t.fullName}</h3>
                    <p className="text-[14px] text-[#8a7e6a]">{t.specialty}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Service */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[14px] text-[#8a7e6a] hover:text-[#1a3325] transition mb-6"><ArrowLeft size={14} /> Back</button>
            <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-2">Choose a Service</h2>
            <p className="text-[14px] text-[#8a7e6a] mb-6">with {selectedTherapistObj?.fullName}</p>
            {services.length === 0 ? (
              <p className="text-[#8a7e6a]">Loading services…</p>
            ) : (
              <div className="space-y-3">
                {services.map(s => (
                  <button key={s.id} onClick={() => { setSelectedService(s.id); setStep(3); }}
                    className={`w-full text-left p-5 rounded-xl border transition ${selectedService === s.id ? "border-[#1a3325] bg-[#1a3325]/5" : "border-[#e5e0d6] bg-[#f8f6f0] hover:border-[#c4bfb4]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-[#1a3325] text-[16px]">{s.name}</h3>
                        <p className="text-[14px] text-[#8a7e6a] mt-1">{s.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#1a3325] text-[15px]">KES {s.priceKES.toLocaleString()}</p>
                        <p className="text-[12px] text-[#8a7e6a]">{s.durationMinutes} min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-[14px] text-[#8a7e6a] hover:text-[#1a3325] transition mb-6"><ArrowLeft size={14} /> Back</button>
            <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-2">Choose Date & Time</h2>
            <p className="text-[14px] text-[#8a7e6a] mb-6">{selectedTherapistObj?.fullName} · {selectedServiceObj?.name}</p>

            <div className="mb-6">
              <label htmlFor="date" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Date</label>
              <input id="date" type="date" min={minDate} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-3">Available Times</label>
                {slotsLoading ? (
                  <p className="text-[#8a7e6a] py-4">Loading availability…</p>
                ) : slotsMsg && slots.length === 0 ? (
                  <div className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl p-5 text-[15px] text-[#6b655c]">{slotsMsg}</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button key={s.startTime} onClick={() => setSelectedSlot(s)}
                        className={`py-3 rounded-lg text-[14px] font-medium border transition ${selectedSlot?.startTime === s.startTime ? "bg-[#1a3325] text-white border-[#1a3325]" : "bg-[#f8f6f0] border-[#e5e0d6] text-[#3d3830] hover:border-[#1a3325]/40"}`}>
                        {formatTime(s.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <button onClick={() => setStep(4)} className="mt-8 w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] transition flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}

        {/* Step 4: Client Details */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="inline-flex items-center gap-1 text-[14px] text-[#8a7e6a] hover:text-[#1a3325] transition mb-6"><ArrowLeft size={14} /> Back</button>
            <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-6">Your Details</h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Full Name *</label>
                <input id="name" value={clientName} onChange={e => setClientName(e.target.value)} required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="Your full name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Email Address *</label>
                <input id="email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Phone Number</label>
                <input id="phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="+254 7XX XXX XXX" />
              </div>
              <div>
                <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-[#8a7e6a] mb-2">Notes (optional)</label>
                <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#ddd9cf] text-[#2a2724] placeholder:text-[#a8a093] focus:outline-none focus:ring-2 focus:ring-[#1a3325]/15 focus:border-[#1a3325]/40 transition" placeholder="Anything that helps us prepare…" />
              </div>
            </div>
            {clientName && clientEmail && (
              <button onClick={() => setStep(5)} className="mt-8 w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] transition flex items-center justify-center gap-2">
                Review Booking <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div>
            <button onClick={() => setStep(4)} className="inline-flex items-center gap-1 text-[14px] text-[#8a7e6a] hover:text-[#1a3325] transition mb-6"><ArrowLeft size={14} /> Back</button>
            <h2 className="font-serif text-xl font-medium text-[#1a3325] mb-6">Confirm Your Booking</h2>
            <div className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl p-6 md:p-8 space-y-4 mb-8">
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Therapist</span><span className="font-medium text-[#1a3325]">{selectedTherapistObj?.fullName}</span></div>
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Service</span><span className="font-medium text-[#1a3325]">{selectedServiceObj?.name}</span></div>
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Date</span><span className="font-medium text-[#1a3325]">{formatPracticeDate(selectedDate, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Time</span><span className="font-medium text-[#1a3325]">{formatTime(selectedSlot!.startTime)} — {formatTime(selectedSlot!.endTime)}</span></div>
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Duration</span><span className="font-medium text-[#1a3325]">{selectedServiceObj?.durationMinutes} minutes</span></div>
              <div className="flex justify-between border-b border-[#eceae6] pb-3"><span className="text-[#8a7e6a] text-sm">Client</span><span className="font-medium text-[#1a3325]">{clientName}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Amount</span><span className="font-bold text-[#1a3325] text-lg">KES {selectedServiceObj?.priceKES.toLocaleString()}</span></div>
            </div>

            {bookingError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-3 rounded-lg mb-6">{bookingError}</div>}

            <button onClick={handleBook} disabled={booking}
              className="w-full bg-[#1a3325] text-white font-bold py-3.5 rounded-md hover:bg-[#143025] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {booking ? "Processing…" : (selectedServiceObj && selectedServiceObj.priceKES > 0 ? "Confirm & Pay" : "Confirm Booking")}
            </button>
          </div>
        )}

        {/* Step 7: Confirmation */}
        {step === 7 && confirmation && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-[#1a3325] text-white rounded-full flex items-center justify-center mx-auto mb-6"><Check size={28} /></div>
            <h2 className="font-serif text-[2rem] font-medium text-[#1a3325] mb-4">Booking Confirmed</h2>
            <p className="text-[16px] text-[#6b655c] mb-8 max-w-md mx-auto">Your appointment has been booked successfully. You will receive confirmation at {clientEmail}.</p>

            <div className="bg-[#f8f6f0] border border-[#e5e0d6] rounded-xl p-6 md:p-8 text-left space-y-3 max-w-md mx-auto mb-8">
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Therapist</span><span className="font-medium text-[#1a3325]">{selectedTherapistObj?.fullName}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Service</span><span className="font-medium text-[#1a3325]">{confirmation.service?.name}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Date</span><span className="font-medium text-[#1a3325]">{formatPracticeDate(confirmation.appointment.date, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Time</span><span className="font-medium text-[#1a3325]">{formatTime(confirmation.appointment.startTime)} — {formatTime(confirmation.appointment.endTime)}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Status</span><span className="font-medium text-[#1a3325] capitalize">{confirmation.appointment.status}</span></div>
              <div className="flex justify-between"><span className="text-[#8a7e6a] text-sm">Payment</span><span className="font-medium text-[#1a3325] capitalize">{confirmation.appointment.paymentStatus}</span></div>
              {paymentInfo?.status === "manual" && (
                <div className="pt-3 border-t border-[#eceae6]">
                  <p className="text-[13px] text-[#6b655c]">{paymentInfo.message}</p>
                  <p className="text-[13px] text-[#6b655c] mt-1">Ref: {paymentInfo.transactionRef}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="text-[14px] font-bold bg-[#1a3325] text-white px-6 py-2.5 rounded-md hover:bg-[#143025] transition">Return Home</Link>
              <Link href="/auth/login" className="text-[14px] font-medium text-[#1a3325] border border-[#ddd8cf] px-6 py-2.5 rounded-md hover:border-[#1a3325] transition">Sign In to Portal</Link>
            </div>
          </div>
        )}
      </div>
      </main>

      <PublicFooter />
    </div>
  );
}
