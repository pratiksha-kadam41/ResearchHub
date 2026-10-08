import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FolderGit2,
  Globe2,
  Lock,
  LoaderCircle,
  Users,
  UserRound
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRepository } from "../utils/repositories";

export default function CreateRepository() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const [form, setForm] = React.useState(location.state?.repositoryData || {
    name: "",
    description: "",
    domain: "",
    type: "",
    privacy: "private"
  });
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [profileChecking, setProfileChecking] = React.useState(true);

  // Gate: redirect to complete-profile if the student hasn't completed it yet
  React.useEffect(() => {
    if (!token) {
      setProfileChecking(false);
      return;
    }
    fetch("/api/student/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profileCompleted === false) {
          navigate("/complete-profile", { replace: true });
        }
      })
      .catch(() => {
        // Network error — allow through, backend will validate
      })
      .finally(() => setProfileChecking(false));
  }, [token, navigate]);

  if (profileChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
        <LoaderCircle size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));

    setError("");
  };

  const handleContinue = async () => {
    if (!form.name.trim()) {
      setError("Please enter a repository name.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a repository description.");
      return;
    }

    if (!form.domain) {
      setError("Please select a research domain.");
      return;
    }

    if (!form.type) {
      setError("Please select Individual or Group Research.");
      return;
    }

    if (!token) {
      setError("Your session has expired. Sign in again before creating a repository.");
      return;
    }

    const repositoryData = {
      name: form.name,
      description: form.description,
      domain: form.domain,
      researchType: form.type,
      privacy: form.privacy
    };

    if (form.type === "group") {
      navigate("/repository/group-invite", {
        state: { repositoryData: form }
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createRepository(token, repositoryData);
      navigate("/dashboard/student", {
        replace: true,
        state: { repositoryCreated: true },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to create this repository. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800">

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <BookOpen size={18} />
            </div>

            <span className="font-bold tracking-tight text-slate-900">
              ResearchHub
            </span>

          </div>

          <div className="w-20" />

        </div>
      </header>


      {/* ================= MAIN ================= */}

      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">

        {/* Page Heading */}

        <div className="mb-8">

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Research Workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Create New Repository
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create a dedicated workspace for your research project.
            You can work individually or collaborate with a research group.
          </p>

        </div>


        {/* ================= FORM CARD ================= */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">

          {/* Header */}

          <div className="mb-7 flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FolderGit2 size={21} />
            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-900">
                Repository Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide the basic information about your research.
              </p>

            </div>

          </div>


          {/* ================= REPOSITORY NAME ================= */}

          <div className="mb-6">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Repository Name
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                handleChange("name", e.target.value)
              }
              placeholder="e.g. AI-Based Early Detection System"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

            <p className="mt-2 text-xs text-slate-400">
              Choose a clear name that represents your research project.
            </p>

          </div>


          {/* ================= DESCRIPTION ================= */}

          <div className="mb-6">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Research Description
            </label>

            <textarea
              rows="4"
              value={form.description}
              onChange={(e) =>
                handleChange("description", e.target.value)
              }
              placeholder="Describe your research problem, objective and scope..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

          </div>


          {/* ================= DOMAIN ================= */}

          <div className="mb-8">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Research Domain
            </label>

            <select
              value={form.domain}
              onChange={(e) =>
                handleChange("domain", e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >

              <option value="">
                Select research domain
              </option>

              <option value="Artificial Intelligence">
                Artificial Intelligence
              </option>

              <option value="Machine Learning">
                Machine Learning
              </option>

              <option value="Data Science">
                Data Science
              </option>

              <option value="Cyber Security">
                Cyber Security
              </option>

              <option value="Web & Software Engineering">
                Web & Software Engineering
              </option>

              <option value="IoT & Smart Systems">
                IoT & Smart Systems
              </option>

              <option value="Cloud Computing">
                Cloud Computing
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </div>


          {/* ================= RESEARCH TYPE ================= */}

          <div className="mb-8">

            <div className="mb-3">

              <label className="text-sm font-semibold text-slate-700">
                Research Type
              </label>

              <p className="mt-1 text-xs text-slate-400">
                Choose how you want to work on this research.
              </p>

            </div>


            <div className="grid gap-4 md:grid-cols-2">


              {/* INDIVIDUAL */}

              <button
                type="button"
                onClick={() =>
                  handleChange("type", "individual")
                }
                className={`rounded-2xl border p-6 text-left transition ${
                  form.type === "individual"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      form.type === "individual"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <UserRound size={23} />
                  </div>

                  {form.type === "individual" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={14} />
                    </div>
                  )}

                </div>


                <h3 className="mt-5 text-base font-bold text-slate-900">
                  Individual Research
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Work independently on your research.
                  You will be the owner of this repository.
                </p>

              </button>

              {/* GROUP */}

              <button
                type="button"
                onClick={() =>
                  handleChange("type", "group")
                }
                className={`rounded-2xl border p-6 text-left transition ${
                  form.type === "group"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      form.type === "group"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Users size={23} />
                  </div>

                  {form.type === "group" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={14} />
                    </div>
                  )}

                </div>


                <h3 className="mt-5 text-base font-bold text-slate-900">
                  Group Research
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create a shared research workspace
                  and invite other students to join.
                </p>

              </button>

            </div>

          </div>

          {/* ================= PRIVACY ================= */}

          <div className="mb-7">

            <label className="mb-3 block text-sm font-semibold text-slate-700">
              Repository Privacy
            </label>


            <div className="grid gap-3 md:grid-cols-2">


              {/* PRIVATE */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "private")
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.privacy === "private"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >

                <Lock
                  size={19}
                  className={
                    form.privacy === "private"
                      ? "text-blue-600"
                      : "text-slate-500"
                  }
                />

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Private
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Only approved members can access.
                </p>

              </button>


              {/* SHARED */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "shared")
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.privacy === "shared"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >

                <Users
                  size={19}
                  className={
                    form.privacy === "shared"
                      ? "text-blue-600"
                      : "text-slate-500"
                  }
                />

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Shared
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Shared with selected collaborators.
                </p>

              </button>


              {/* PUBLIC */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "public")
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.privacy === "public"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >

                <Globe2
                  size={19}
                  className={
                    form.privacy === "public"
                      ? "text-blue-600"
                      : "text-slate-500"
                  }
                />

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Public
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Intended for work you are ready to share publicly.
                </p>

              </button>


            </div>

          </div>


          {/* ================= ERROR ================= */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}


          {/* ================= BUTTONS ================= */}

          <div className="flex items-center justify-between border-t border-slate-100 pt-6">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={17} />
              Cancel
            </button>


            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {form.type === "group" ? "Continue to invite members" : "Create repository"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>

          </div>

        </section>


        {/* ================= SECURITY NOTE ================= */}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">

          <Lock
            size={17}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <p className="text-xs leading-5 text-slate-500">
            Your research workspace is associated with your ResearchHub
            account. Access will be controlled according to the repository
            permissions you select.
          </p>

        </div>

      </main>

    </div>
  );
}
