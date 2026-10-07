import React from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <p className="mt-4 text-2xl font-bold text-[#102A63]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </article>
  );
}

export const DashboardFaculty = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(Boolean(token));

  React.useEffect(() => {
    if (!token) {
      return undefined;
    }

    let active = true;
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/faculty/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load dashboard.");
        if (active) setDashboard(result);
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const summary = dashboard?.summary || {};
  const projects = dashboard?.projects || [];

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-[#102A63]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
              <BookOpen size={18} />
            </span>
            ResearchHub
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">{user?.name || "Professor"}</p>
              <p className="text-[10px] text-slate-500">Professor / Faculty</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-700"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Faculty research portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102A63]">
            Welcome back, {user?.name || "Professor"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Monitor your assigned research projects and reviews.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-blue-600" />
            Loading your dashboard…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FolderKanban} label="Assigned projects" value={summary.assigned_projects ?? 0} />
              <StatCard icon={ClipboardCheck} label="Pending reviews" value={summary.pending_reviews ?? 0} tone="amber" />
              <StatCard icon={CheckCircle2} label="Completed milestones" value={summary.completed_milestones ?? 0} tone="green" />
              <StatCard icon={AlertCircle} label="Overdue milestones" value={summary.overdue_milestones ?? 0} tone="red" />
            </div>

            <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-[#102A63]">Assigned projects</h2>
                  <p className="mt-1 text-xs text-slate-500">Projects whose guidance requests you accepted.</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Users size={19} />
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-10 text-center">
                  <Users size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No assigned projects yet</p>
                  <p className="mt-1 text-xs text-slate-500">Accepted guidance requests will appear here.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {projects.map((project) => (
                    <article key={project.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-800">{project.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{project.domain} · {project.research_type} research</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div><p className="text-slate-400">Researcher</p><p className="mt-1 font-semibold text-slate-700">{project.owner_name}</p></div>
                        <div><p className="text-slate-400">Completion</p><p className="mt-1 font-semibold text-slate-700">{project.completion_percentage}%</p></div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
};
