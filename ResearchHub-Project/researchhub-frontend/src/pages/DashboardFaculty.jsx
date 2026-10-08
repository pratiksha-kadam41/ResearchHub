import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Users,
  Clock,
  Check,
  X,
  ExternalLink,
  UserRound,
  Library,
  Save,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

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

  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    designation: "",
    research_areas: "",
    expertise: "",
    research_interests: "",
    experience: "",
    publications: "",
    research_projects: "",
    guidance_areas: "",
  });

  const loadData = async () => {
    if (!token) return;
    try {
      const [dashRes, reqRes] = await Promise.all([
        fetch("/api/faculty/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/mentor-requests", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [dashData, reqData] = await Promise.all([dashRes.json(), reqRes.json()]);

      if (!dashRes.ok) throw new Error(dashData.message || "Unable to load dashboard.");
      setDashboard(dashData);
      if (reqRes.ok) setRequests(reqData.requests || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRespondRequest = async (requestId, decision) => {
    try {
      const response = await fetch(`/api/mentor-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: decision }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Unable to ${decision.toLowerCase()} request.`);
      }
      setNotice(`Guidance request ${decision.toLowerCase()} successfully.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openProfileModal = async () => {
    setProfileModalOpen(true);
    setProfileLoading(true);
    try {
      const response = await fetch("/api/faculty/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.profile) {
        setProfileForm({
          designation: data.profile.designation || "",
          research_areas: data.profile.research_areas || "",
          expertise: data.profile.expertise || "",
          research_interests: data.profile.research_interests || "",
          experience: data.profile.experience || "",
          publications: data.profile.publications || "",
          research_projects: data.profile.research_projects || "",
          guidance_areas: data.profile.guidance_areas || "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const response = await fetch("/api/faculty/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }
      setProfileModalOpen(false);
      setNotice("Faculty profile updated successfully.");
    } catch (err) {
      alert(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const summary = dashboard?.summary || {};
  const projects = dashboard?.projects || [];
  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-slate-900 pb-12">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3 font-bold text-[#102A63]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
              <BookOpen size={18} />
            </span>
            <span className="text-lg">ResearchHub</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/shared-library"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Library size={15} /> Shared Library
            </Link>

            <button
              type="button"
              onClick={openProfileModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <UserRound size={15} /> My Profile
            </button>

            <NotificationBell />

            <div className="hidden sm:block text-right border-l border-slate-200 pl-3">
              <p className="text-xs font-bold text-slate-800">{user?.name || "Professor"}</p>
              <p className="text-[10px] text-slate-500">Faculty / Mentor</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Faculty research portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102A63]">
            Welcome back, {user?.name || "Professor"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your assigned research projects, review milestone submissions, and evaluate academic marks.
          </p>
        </div>

        {notice && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-emerald-600 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

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

            {/* Incoming Guidance Requests */}
            {pendingRequests.length > 0 && (
              <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-amber-900 flex items-center gap-2 text-base">
                      <Clock size={18} className="text-amber-600" /> Incoming Guidance Requests ({pendingRequests.length})
                    </h2>
                    <p className="mt-1 text-xs text-amber-700">
                      Students have requested your guidance for these research repositories.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-xs"
                    >
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {req.repository_name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by <span className="font-semibold text-slate-700">{req.requester_name}</span> ({req.requester_email}) · Domain: {req.domain}
                        </p>
                        {req.message && (
                          <p className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            "{req.message}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(req.id, "REJECTED")}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(req.id, "ACCEPTED")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          <Check size={14} /> Accept Guidance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Assigned Projects */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-[#102A63] text-lg">Assigned Research Projects</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Projects under your supervision. Open a workspace to manage milestones, assign tasks, review work, and enter marks.
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Users size={19} />
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-10 text-center">
                  <Users size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No assigned projects yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Accepted guidance requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {projects.map((project) => (
                    <article key={project.id} className="rounded-2xl border border-slate-200 p-5 hover:border-blue-300 transition flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-slate-800">{project.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {project.domain} · {project.research_type} research
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
                            {project.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-slate-400">Lead Researcher</p>
                            <p className="mt-1 font-semibold text-slate-700">{project.owner_name}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Completion</p>
                            <p className="mt-1 font-semibold text-slate-700">{project.completion_percentage}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                        <Link
                          to={`/repository/${project.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B285F] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition"
                        >
                          Open Workspace <ExternalLink size={13} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>

      {/* Profile Edit Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Faculty Profile</h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {profileLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading profile...</div>
            ) : (
              <form onSubmit={saveProfile} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Designation</label>
                  <input
                    type="text"
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                    placeholder="e.g. Associate Professor, Head of Research, Professor"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Research Areas</label>
                  <input
                    type="text"
                    value={profileForm.research_areas}
                    onChange={(e) => setProfileForm({ ...profileForm, research_areas: e.target.value })}
                    placeholder="e.g. Artificial Intelligence, Cloud Security, Computational Biology"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Areas of Expertise</label>
                  <textarea
                    rows={2}
                    value={profileForm.expertise}
                    onChange={(e) => setProfileForm({ ...profileForm, expertise: e.target.value })}
                    placeholder="Key technical and methodologies expertise..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Research Interests</label>
                  <textarea
                    rows={2}
                    value={profileForm.research_interests}
                    onChange={(e) => setProfileForm({ ...profileForm, research_interests: e.target.value })}
                    placeholder="Specific academic questions and research topics..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience</label>
                  <textarea
                    rows={2}
                    value={profileForm.experience}
                    onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                    placeholder="Teaching, lab management, and research grant experience..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selected Publications</label>
                  <textarea
                    rows={2}
                    value={profileForm.publications}
                    onChange={(e) => setProfileForm({ ...profileForm, publications: e.target.value })}
                    placeholder="Key journal papers, conferences, DOI links..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Areas Open for Student Guidance / Review</label>
                  <input
                    type="text"
                    value={profileForm.guidance_areas}
                    onChange={(e) => setProfileForm({ ...profileForm, guidance_areas: e.target.value })}
                    placeholder="e.g. Capstone Research, Master's Thesis, IEEE Submissions"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Save size={14} />
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
