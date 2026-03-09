import React, { useState } from "react";
import { Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Step = 1 | 2 | 3;

export default function ApplyBarangayFacility() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [availability, setAvailability] = useState<boolean | null>(null);

  const [form, setForm] = useState({
    applicant_name: "",
    applicant_contact: "",
    facility_id: "",
    reservation_date: "",
    time_slot: "",
    purpose: "",
  });

  const update = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const generateId = () => {
    return "BRR-" + Date.now();
  };

  const checkAvailability = async () => {
    if (!form.facility_id || !form.reservation_date || !form.time_slot) return;

    const { data } = await supabase
      .from("barangay_reservation_record")
      .select("*")
      .eq("barangay_facility_id", form.facility_id)
      .eq("reservation_date", form.reservation_date)
      .eq("time_slot", form.time_slot)
      .in("status", ["pending", "approved"]);

    if (data && data.length > 0) {
      setAvailability(false);
    } else {
      setAvailability(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const taken = await supabase
      .from("barangay_reservation_record")
      .select("*")
      .eq("barangay_facility_id", form.facility_id)
      .eq("reservation_date", form.reservation_date)
      .eq("time_slot", form.time_slot)
      .in("status", ["pending", "approved"]);

    if (taken.data && taken.data.length > 0) {
      setSubmitting(false);

      alert("This facility is already reserved for that schedule.");

      return;
    }

    const id = generateId();

    const { error } = await supabase
      .from("barangay_reservation_record")
      .insert({
        reservation_id: id,
        barangay_facility_id: form.facility_id,
        reservation_date: form.reservation_date,
        time_slot: form.time_slot,
        status: "pending",
      });

    setSubmitting(false);

    if (!error) {
      setReservationId(id);
      setSubmitted(true);
    } else {
      alert(error.message);
    }
  };

  if (submitted)
    return (
      <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>

          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Reservation Submitted!
          </h2>

          <p className="text-slate-400 mb-2">
            Your facility reservation request has been submitted.
          </p>

          <div
            className="glass rounded-xl p-4 mb-6"
            style={{ border: "1px solid rgba(52,211,153,0.2)" }}
          >
            <div className="text-xs text-slate-400 mb-1">Reservation ID</div>
            <div className="font-mono font-bold text-white text-lg">
              {reservationId}
            </div>
          </div>

          <p className="text-slate-500 text-sm mb-6">
            The Barangay Secretary will review your request. Once approved, the
            Punong Barangay will issue the reservation permit.
          </p>

          <button
            className="btn-primary mx-auto"
            onClick={() => setSubmitted(false)}
          >
            Submit Another
          </button>
        </div>
      </div>
    );

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">
          Barangay Facility Reservation
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Online Reservation Request
        </p>
      </div>

      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:
                  step === s
                    ? "rgba(59,130,246,0.2)"
                    : step > s
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(255,255,255,0.04)",
                color:
                  step === s ? "#60a5fa" : step > s ? "#34d399" : "#64748b",
              }}
            >
              {step > s ? <CheckCircle size={14} /> : <span>{s}</span>}
              {s === 1
                ? "Applicant Info"
                : s === 2
                  ? "Reservation Details"
                  : "Review"}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Applicant Information</h2>

            <input
              className="input-field"
              placeholder="Full Name"
              value={form.applicant_name}
              onChange={(e) => update("applicant_name", e.target.value)}
            />

            <input
              className="input-field"
              placeholder="Contact Number"
              value={form.applicant_contact}
              onChange={(e) => update("applicant_contact", e.target.value)}
            />

            <button className="btn-primary" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Reservation Details</h2>

            <select
              className="input-field"
              value={form.facility_id}
              onChange={(e) => {
                update("facility_id", e.target.value);
                checkAvailability();
              }}
            >
              <option value="">Select Facility</option>
              <option value="BF-001">Barangay Hall</option>
              <option value="BF-002">Basketball Court</option>
              <option value="BF-003">Covered Court</option>
            </select>

            <input
              type="date"
              className="input-field"
              value={form.reservation_date}
              onChange={(e) => {
                update("reservation_date", e.target.value);
                checkAvailability();
              }}
            />

            <select
              className="input-field"
              value={form.time_slot}
              onChange={(e) => {
                update("time_slot", e.target.value);
                checkAvailability();
              }}
            >
              <option value="">Select Time Slot</option>
              <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
              <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
              <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM</option>
              <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM</option>
              <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
            </select>

            {availability === true && (
              <div className="text-emerald-400 text-xs mt-2">
                ✔ Facility available
              </div>
            )}

            {availability === false && (
              <div className="text-red-400 text-xs mt-2">
                ✖ Facility already reserved for this time
              </div>
            )}

            <textarea
              className="input-field"
              placeholder="Purpose of Reservation"
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            />

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>

              <button className="btn-primary" onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Review & Submit</h2>

            <div className="text-slate-300 text-sm space-y-1">
              <p>
                <b>Name:</b> {form.applicant_name}
              </p>
              <p>
                <b>Facility:</b> {form.facility_id}
              </p>
              <p>
                <b>Date:</b> {form.reservation_date}
              </p>
              <p>
                <b>Time:</b> {form.time_slot}
              </p>
            </div>

            <div
              className="px-4 py-3 rounded-xl text-sm text-slate-400"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(148,163,184,0.1)",
              }}
            >
              <AlertCircle size={14} className="inline mr-2 text-yellow-400" />
              By submitting, you confirm the reservation details are correct.
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>

              <button
                className="btn-primary flex-1 justify-center"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Reservation"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
