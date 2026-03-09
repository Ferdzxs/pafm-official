import React, { useState } from "react";
import {
  Upload,
  CheckCircle,
  Loader2,
  AlertCircle,
  Droplets,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

type ServiceType = "water_connection" | "drainage" | "leak_report";

export default function ApplyUtilityRequestPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serviceType, setServiceType] =
    useState<ServiceType>("water_connection");

  // Unified form state
  const [form, setForm] = useState({
    contact_number: "",
    address: "",
    description: "",
    severity: "low",
    property_type: "residential",
  });

  const update = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    // Mock API call delay
    setTimeout(() => {
      setSubmitted(true);
      toast.success("Request submitted successfully.");
      setSubmitting(false);
    }, 1500);
  };

  if (submitted)
    return (
      <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Request Submitted!
          </h2>
          <p className="text-slate-400 mb-6">
            Your utility request has been routed to the Utility Engineering
            team.
          </p>
          <button
            className="btn-primary mx-auto"
            onClick={() => {
              setSubmitted(false);
              setForm({ ...form, description: "" });
            }}
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
          Utility Service Request
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Water Connection, Drainage & Leak Reports
        </p>
      </div>

      <div
        className="glass rounded-2xl p-6"
        style={{ border: "1px solid rgba(148,163,184,0.1)" }}
      >
        {/* Service Type Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wide">
            Select Request Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "water_connection",
                icon: Droplets,
                label: "New Water Supply",
                desc: "Apply for residential/commercial water connection",
              },
              {
                id: "drainage",
                icon: MapPin,
                label: "Drainage Request",
                desc: "Request declogging or drainage repair",
              },
              {
                id: "leak_report",
                icon: AlertTriangle,
                label: "Report a Leak",
                desc: "Report a public pipe leak or water obstruction",
              },
            ].map((type) => {
              const Icon = type.icon;
              const active = serviceType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setServiceType(type.id as ServiceType)}
                  className="p-3 text-left rounded-xl transition-all"
                  style={{
                    background: active
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(59,130,246,0.4)" : "rgba(148,163,184,0.1)"}`,
                  }}
                >
                  <Icon
                    size={18}
                    className={`mb-2 ${active ? "text-blue-400" : "text-slate-500"}`}
                  />
                  <div
                    className={`font-semibold text-sm mb-0.5 ${active ? "text-blue-400" : "text-slate-300"}`}
                  >
                    {type.label}
                  </div>
                  <div className="text-xs text-slate-500 leading-snug">
                    {type.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Contact Number *
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="09xxxxxxxxx"
              value={form.contact_number}
              onChange={(e) => update("contact_number", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              {serviceType === "leak_report"
                ? "Exact Location of Leak *"
                : "Service Address *"}
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Complete address or landmark specifics..."
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
          </div>

          {serviceType === "water_connection" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Property Type *
              </label>
              <select
                className="input-field"
                value={form.property_type}
                onChange={(e) => update("property_type", e.target.value)}
                required
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
          )}

          {serviceType === "leak_report" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Severity Profile *
              </label>
              <select
                className="input-field"
                value={form.severity}
                onChange={(e) => update("severity", e.target.value)}
                required
              >
                <option value="low">Low (Minor drip or small puddle)</option>
                <option value="medium">
                  Medium (Steady stream or pooling water)
                </option>
                <option value="high">
                  High / Emergency (Geyser, flooding, or major road hazard)
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Additional Details / Description
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={
                serviceType === "leak_report"
                  ? "Describe the leak specifically..."
                  : "Any other requests..."
              }
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Supporting Photo (Optional)
            </label>
            <div className="border border-dashed border-slate-700/60 rounded-xl p-4 text-center hover:border-slate-500 transition-colors cursor-pointer bg-black/10">
              <Upload size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-xs text-slate-400">Upload Image / PDF</p>
            </div>
          </div>

          <div
            className="px-4 py-3 mt-4 rounded-xl text-xs text-slate-400"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            <AlertCircle size={14} className="inline mr-2 text-blue-400" />
            By submitting, your request will be immediately routed to the
            appropriate engineering dispatcher for validation.
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center mt-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
