import React from "react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Save,
  Target,
  User,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── small helpers ──────────────────────────────────────────── */
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
    />
  );
}

function Textarea({ rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
    />
  );
}

/* ── page ──────────────────────────────────────────────────── */
export default function CompleteFacultyProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "true";

  const [form, setForm] = React.useState({
    designation: "",
    research_areas: "",
    expertise: "",
    research_interests: "",
    experience: "",
    publications: "",
    research_projects: "",
    guidance_areas: "",
  });
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  /* pre-fill in edit mode */
  React.useEffect(() => {
    if (!isEdit || !token) {
      setLoading(false);
      return;
    }
    fetch("/api/faculty/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          const p = data.profile;
          setForm({
            designation: p.designation || "",
            research_areas: p.research_areas || "",
            expertise: p.expertise || "",
            research_interests: p.research_interests || "",
            experience: p.experience || "",
            publications: p.publications || "",
            research_projects: p.research_projects || "",
            guidance_areas: p.guidance_areas || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isEdit, token]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.designation.trim()) {
      setError("Designation is required.");
      return;
    }
    if (!form.research_areas.trim()) {
      setError("Research areas are required.");
      return;
    }
    if (!form.guidance_areas.trim()) {
      setError("Guidance areas are required so students can find you.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/faculty/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save profile.");
      navigate("/dashboard/faculty", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
        <LoaderCircle size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
              <BookOpen size={18} />
            </span>
            <span className="font-bold tracking-tight text-[#102A63]">ResearchHub</span>
          </div>
          {!isEdit && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Step 1 — Set up your faculty profile
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* heading */}
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Faculty profile
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#102A63]">
            {isEdit ? "Edit your profile" : "Complete your faculty profile"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit
              ? "Update your details. Students discover you based on this information."
              : "Fill in your details so students can find you as a research collaborator."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Basic info ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <User size={18} />
              </span>
              <h2 className="font-bold text-slate-900">Basic information</h2>
            </div>
            <div className="space-y-5">
              <Field label="Designation" required hint="e.g. Assistant Professor, Associate Professor, Professor">
                <Input
                  value={form.designation}
                  onChange={set("designation")}
                  placeholder="e.g. Assistant Professor"
                />
              </Field>
              <Field label="Experience" hint="Brief description of your teaching and research experience">
                <Textarea
                  rows={3}
                  value={form.experience}
                  onChange={set("experience")}
                  placeholder="e.g. 10 years of experience in AI research and teaching..."
                />
              </Field>
            </div>
          </section>

          {/* ── Section 2: Research ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Lightbulb size={18} />
              </span>
              <h2 className="font-bold text-slate-900">Research focus</h2>
            </div>
            <div className="space-y-5">
              <Field label="Research areas" required hint="Main areas of your research (comma-separated)">
                <Input
                  value={form.research_areas}
                  onChange={set("research_areas")}
                  placeholder="e.g. Machine Learning, Computer Vision, NLP"
                />
              </Field>
              <Field label="Expertise" hint="Specific techniques or tools you specialise in">
                <Input
                  value={form.expertise}
                  onChange={set("expertise")}
                  placeholder="e.g. Deep Learning, PyTorch, Data Analysis"
                />
              </Field>
              <Field label="Research interests" hint="Topics you are personally curious about or currently studying">
                <Textarea
                  rows={3}
                  value={form.research_interests}
                  onChange={set("research_interests")}
                  placeholder="e.g. Federated learning, Explainable AI..."
                />
              </Field>
            </div>
          </section>

          {/* ── Section 3: Guidance ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Target size={18} />
              </span>
              <h2 className="font-bold text-slate-900">Guidance & projects</h2>
            </div>
            <div className="space-y-5">
              <Field
                label="Areas you can guide students in"
                required
                hint="Students will see this when choosing a collaborator"
              >
                <Textarea
                  rows={3}
                  value={form.guidance_areas}
                  onChange={set("guidance_areas")}
                  placeholder="e.g. Final year projects in AI/ML, Data Science dissertations, IoT research..."
                />
              </Field>
              <Field label="Publications" hint="List key papers or books (optional)">
                <Textarea
                  rows={3}
                  value={form.publications}
                  onChange={set("publications")}
                  placeholder="e.g. 'Deep Neural Networks for Image Classification', IEEE 2022..."
                />
              </Field>
              <Field label="Research projects" hint="Past or ongoing projects you have led (optional)">
                <Textarea
                  rows={3}
                  value={form.research_projects}
                  onChange={set("research_projects")}
                  placeholder="e.g. Smart Agriculture IoT System (2021–2023)..."
                />
              </Field>
            </div>
          </section>

          {/* error */}
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {/* submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B285F] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#123C83] disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (
                <><LoaderCircle size={17} className="animate-spin" /> Saving…</>
              ) : isEdit ? (
                <><Save size={17} /> Save changes</>
              ) : (
                <>Continue to dashboard <ArrowRight size={17} /></>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
