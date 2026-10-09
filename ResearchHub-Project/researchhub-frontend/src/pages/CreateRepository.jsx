import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Globe2,
  HelpCircle,
  History,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  LoaderCircle,
  Menu,
  MessageSquare,
  Settings,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRepository } from "../utils/repositories";
import NotificationBell from "../components/NotificationBell";

export default function CreateRepository() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState("projects");

  const [form, setForm] = React.useState(location.state?.repositoryData || {
    name: "",
    description: "",
    domain: "",
    type: "",
    privacy: "private"
  });
  const [memberEmails, setMemberEmails] = React.useState([]);
  const [memberEmailInput, setMemberEmailInput] = React.useState("");
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
    if (field === "type" && value === "individual") {
      setMemberEmails([]);
      setMemberEmailInput("");
    }

    setError("");
  };

  const handleContinue = async () => {
    if (!form.name.trim()) {
      setError("Please enter a project title.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a project description.");
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
    if (form.type === "group" && memberEmails.length === 0) {
      setError("Add at least one registered student email address to your group.");
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

    setSaving(true);
    setError("");

    try {
      const result = await createRepository(token, repositoryData, memberEmails);
      navigate("/dashboard/student", {
        replace: true,
        state: {
          repositoryCreated: true,
          alertMessage: result.message,
        },
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

  const addMemberEmail = () => {
    const email = memberEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid student email address.");
      return;
    }
    if (email === user?.email?.toLowerCase()) {
      setError("You cannot invite yourself to your own project.");
      return;
    }
    if (memberEmails.includes(email)) {
      setError("That student has already been added.");
      return;
    }
    setMemberEmails((emails) => [...emails, email]);
    setMemberEmailInput("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-gradient-to-b from-[#071A46] via-[#0B2B72] to-[#123C83] text-white transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <BookOpen size={23} />
          </div>
          <h1 className="text-xl font-bold">
            Research<span className="text-blue-300">Hub</span>
          </h1>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-5 text-blue-200 lg:hidden"
        >
          <X size={20} />
        </button>
        <nav className="student-sidebar-nav flex-1 space-y-1 overflow-y-auto px-3" aria-label="Student navigation">
          <button type="button" onClick={() => navigate("/dashboard/student")} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-blue-100/75 transition hover:bg-white/10 hover:text-white">
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            type="button"
            aria-expanded={expandedGroup === "projects"}
            onClick={() => setExpandedGroup((current) => current === "projects" ? "" : "projects")}
            className="flex w-full items-center gap-3 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white"
          >
            <FolderGit2 size={18} />
            <span className="flex-1 text-left">My Projects</span>
            {expandedGroup === "projects" ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          {expandedGroup === "projects" && (
            <div className="ml-5 space-y-1 border-l border-white/15 pl-3">
              <button type="button" onClick={() => navigate("/dashboard/student#repositories")} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-blue-100/75 transition hover:bg-white/10 hover:text-white">
                All Repositories
              </button>
              <button type="button" onClick={() => setSidebarOpen(false)} className="w-full rounded-lg bg-white/15 px-3 py-2 text-left text-xs font-semibold text-white">
                Create Project
              </button>
              <button type="button" onClick={() => navigate("/dashboard/student?filter=joined#repositories")} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-blue-100/75 transition hover:bg-white/10 hover:text-white">
                Joined Projects
              </button>
            </div>
          )}
          {[
            ["Milestones", CalendarDays, "/dashboard/student?view=milestones"],
            ["Tasks", ListChecks, "/tasks"],
            ["Find Mentor", UserRound, "/find-mentor"],
            ["Resources", FolderGit2, "/shared-library"],
            ["Research History", History, "/dashboard/student?view=research-history"],
            ["Discussions", MessageSquare, "/dashboard/student?view=discussions"],
            ["Profile", UserRound, "/complete-profile?edit=true"],
            ["Settings", Settings, "/complete-profile?edit=true"],
          ].map(([label, Icon, path]) => (
            <button key={label} type="button" onClick={() => navigate(path)} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-blue-100/75 transition hover:bg-white/10 hover:text-white">
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <button type="button" onClick={() => navigate("/help")} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-white/10 hover:text-white">
            <HelpCircle size={18} />
            Help
          </button>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-red-500/10 hover:text-red-300">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between bg-white px-5 shadow-sm lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 lg:hidden">
              <Menu size={20} />
            </button>
            <button type="button" onClick={() => navigate("/dashboard/student")} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-700">
              <ArrowLeft size={15} />
              Back to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                {(user?.name || "Student").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <span className="hidden sm:block">
                <span className="block max-w-36 truncate text-[10px] font-bold text-slate-700">{user?.name || "Student"}</span>
                <span className="block text-[9px] text-slate-400">Student</span>
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Student Research Portal
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#102A63]">
              Create Research Project
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Set up your research repository and start your research journey.
            </p>
          </div>


        {/* ================= FORM CARD ================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          {/* Header */}

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FolderGit2 size={17} />
            </div>

            <div>

              <h2 className="text-sm font-bold text-[#102A63]">
                STEP 1 · Project Information
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Provide the basic information about your research.
              </p>

            </div>

          </div>


          {/* ================= REPOSITORY NAME ================= */}

          <div className="mb-3">

            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Project Title <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              maxLength={120}
              value={form.name}
              onChange={(e) =>
                handleChange("name", e.target.value)
              }
              placeholder="e.g. AI-Based Early Detection System"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />

            <p className="mt-1 text-[9px] text-slate-400">
              Choose a clear title that represents your research project.
            </p>

          </div>


          {/* ================= DESCRIPTION ================= */}

          <div className="mb-3">

            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Research Description <span className="text-red-500">*</span>
            </label>

            <textarea
              rows="4"
              maxLength={1000}
              value={form.description}
              onChange={(e) =>
                handleChange("description", e.target.value)
              }
              placeholder="Describe your research problem, objective and scope..."
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />
            <p className="mt-1 text-right text-[9px] text-slate-400">{form.description.length}/1000</p>

          </div>


          {/* ================= DOMAIN ================= */}

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="mb-4">

            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Research Domain <span className="text-red-500">*</span>
            </label>

            <select
              value={form.domain}
              onChange={(e) =>
                handleChange("domain", e.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
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

          <div className="mb-4">

            <div className="mb-2">

              <label className="text-xs font-semibold text-slate-700">
                STEP 2 · Research Type <span className="text-red-500">*</span>
              </label>

              <p className="mt-0.5 text-[9px] text-slate-400">
                Choose how you want to work on this research.
              </p>

            </div>


            <div className="grid gap-2 md:grid-cols-2">


              {/* INDIVIDUAL */}

              <button
                type="button"
                onClick={() =>
                  handleChange("type", "individual")
                }
                className={`rounded-xl border p-3 text-left transition ${
                  form.type === "individual"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      form.type === "individual"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <UserRound size={17} />
                  </div>

                  {form.type === "individual" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={12} />
                    </div>
                  )}

                </div>


                <h3 className="mt-2 text-xs font-bold text-slate-900">
                  Individual Research
                </h3>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
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
                className={`rounded-xl border p-3 text-left transition ${
                  form.type === "group"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      form.type === "group"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Users size={17} />
                  </div>

                  {form.type === "group" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={12} />
                    </div>
                  )}

                </div>


                <h3 className="mt-2 text-xs font-bold text-slate-900">
                  Group Research
                </h3>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Create a shared research workspace
                  and invite other students to join.
                </p>

              </button>

            </div>

          </div>
          </div>

          {form.type === "group" && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <label htmlFor="group-member-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
                STEP 3 · Group Members
              </label>
              <p className="mb-3 text-[10px] text-slate-500">
                Add registered, verified student email addresses. Each student must accept before becoming a project member.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="group-member-email"
                  type="email"
                  value={memberEmailInput}
                  onChange={(event) => setMemberEmailInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addMemberEmail();
                    }
                  }}
                  placeholder="student@college.edu"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
                <button
                  type="button"
                  onClick={addMemberEmail}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
                >
                  Add student
                </button>
              </div>
              {memberEmails.length > 0 && (
                <ul className="mt-3 space-y-2" aria-label="Group members to invite">
                  {memberEmails.map((email) => (
                    <li key={email} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2">
                      <span className="truncate text-xs font-medium text-slate-700">{email}</span>
                      <button
                        type="button"
                        onClick={() => setMemberEmails((emails) => emails.filter((item) => item !== email))}
                        aria-label={`Remove ${email}`}
                        className="ml-3 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ================= PRIVACY ================= */}

          <div className="mb-4">

            <label className="mb-2 block text-xs font-semibold text-slate-700">
              STEP 4 · Privacy <span className="text-red-500">*</span>
            </label>


            <div className="grid gap-2 md:grid-cols-3">


              {/* PRIVATE */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "private")
                }
                className={`rounded-xl border p-3 text-left transition ${
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

                <p className="mt-2 text-xs font-bold text-slate-800">
                  Private
                </p>

                <p className="mt-1 text-[9px] leading-4 text-slate-500">
                  Only approved members can access.
                </p>

              </button>


              {/* SHARED */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "shared")
                }
                className={`rounded-xl border p-3 text-left transition ${
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

                <p className="mt-2 text-xs font-bold text-slate-800">
                  Shared
                </p>

                <p className="mt-1 text-[9px] leading-4 text-slate-500">
                  Shared with selected collaborators.
                </p>

              </button>


              {/* PUBLIC */}

              <button
                type="button"
                onClick={() =>
                  handleChange("privacy", "public")
                }
                className={`rounded-xl border p-3 text-left transition ${
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

                <p className="mt-2 text-xs font-bold text-slate-800">
                  Public
                </p>

                <p className="mt-1 text-[9px] leading-4 text-slate-500">
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

          <div className="flex flex-col-reverse items-stretch justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:justify-start"
            >
              <ArrowLeft size={17} />
              Cancel
            </button>


            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  STEP 5 · Create Project
                  <ArrowRight size={17} />
                </>
              )}
            </button>

          </div>

        </section>


        {/* ================= SECURITY NOTE ================= */}

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">

          <Lock
            size={14}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <p className="text-[10px] leading-4 text-slate-500">
            Your research workspace is associated with your ResearchHub
            account. Access will be controlled according to the repository
            permissions you select.
          </p>

        </div>

        </div>
      </main>

    </div>
  );
}
