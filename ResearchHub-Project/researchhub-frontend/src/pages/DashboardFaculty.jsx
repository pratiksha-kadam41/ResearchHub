import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FolderKanban,
  History,
  MapPin,
  Loader2,
  LoaderCircle,
  LogOut,
  Menu,
  Pencil,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

/* ── helpers ───────────────────────────────────────────────── */
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

/* status badge colours */
const statusColour = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

/* ── component ─────────────────────────────────────────────── */
export const DashboardFaculty = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("dashboard");

  /* dashboard data */
  const [dashboard, setDashboard] = React.useState(null);
  const [dashError, setDashError] = React.useState("");
  const [loading, setLoading] = React.useState(Boolean(token));

  /* mentor requests */
  const [requests, setRequests] = React.useState([]);
  const [actionId, setActionId] = React.useState(null); // request being processed
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [requestError, setRequestError] = React.useState("");
  const [isRejecting, setIsRejecting] = React.useState(false);

  /* notifications */
  const [notifications, setNotifications] = React.useState([]);
  const [notifOpen, setNotifOpen] = React.useState(false);

  /* ── load everything on mount ── */
  React.useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      try {
        /* 1. check profile first */
        const profileResp = await fetch("/api/faculty/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileResp.json();

        if (!profileResp.ok) throw new Error(profileData.message || "Unable to load profile.");

        /* redirect if profile has no designation yet (first login) */
        const p = profileData.profile;
        if (!p.designation) {
          navigate("/complete-faculty-profile", { replace: true });
          return;
        }

        /* 2. load dashboard, mentor requests, notifications in parallel */
        const [dashResp, reqResp, notifResp] = await Promise.all([
          fetch("/api/faculty/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/mentor-requests", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [dashData, reqData, notifData] = await Promise.all([
          dashResp.json(),
          reqResp.json(),
          notifResp.json(),
        ]);

        if (!dashResp.ok) throw new Error(dashData.message || "Unable to load dashboard.");

        if (active) {
          setDashboard(dashData);
          setRequests(reqData.requests || []);
          setNotifications(notifData.notifications || []);
        }
      } catch (err) {
        if (active) setDashError(err.message || "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [token, navigate]);

  /* ── handlers ── */
  const handleLogout = () => { logout(); navigate("/login"); };

  const handleRequest = async (requestId, status, reason = "") => {
    if (!token) return;
    setActionId(requestId);
    setRequestError("");
    try {
      const resp = await fetch(`/api/mentor-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || "Unable to update request.");

      /* update list in-place */
      setRequests((prev) =>
        prev.map((r) => r.id === requestId
          ? { ...r, status, rejection_reason: status === "REJECTED" ? reason.trim() : null }
          : r),
      );
      setSelectedRequest(null);
      setRejectionReason("");
      setIsRejecting(false);

      /* if accepted, refresh dashboard summary */
      if (status === "ACCEPTED") {
        const dashResp = await fetch("/api/faculty/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dashData = await dashResp.json();
        if (dashResp.ok) setDashboard(dashData);
      }
    } catch (err) {
      setRequestError(err.message || "Unable to update this request.");
    } finally {
      setActionId(null);
    }
  };

  const closeRequestDialog = () => {
    setSelectedRequest(null);
    setRejectionReason("");
    setRequestError("");
    setIsRejecting(false);
  };

  const markNotifRead = async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const requestHistory = requests.filter((r) => r.status !== "PENDING");
  const summary = dashboard?.summary || {};
  const projects = dashboard?.projects || [];
  const pageTitle = activeSection === "history"
    ? "Request history"
    : activeSection === "requests"
      ? "Guidance requests"
      : "Faculty dashboard";

  /* ── render ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
        <LoaderCircle size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-slate-900">

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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <BookOpen size={22} />
          </span>
          <span className="text-xl font-bold">Research<span className="text-blue-300">Hub</span></span>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-5 text-blue-200 lg:hidden"
        >
          <X size={20} />
        </button>
        <nav aria-label="Faculty dashboard" className="flex-1 space-y-1 px-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: FolderKanban },
            { id: "requests", label: "Guidance requests", icon: ClipboardCheck, count: pendingRequests.length },
            { id: "history", label: "Request history", icon: History, count: requestHistory.length },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-white/15 text-white" : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/complete-faculty-profile?edit=true")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-white/10 hover:text-white"
          >
            <Pencil size={17} />
            Edit profile
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── header ── */}
      <div className="lg:ml-[250px]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">

          {/* brand */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[#102A63]">{pageTitle}</h1>
              <p className="hidden text-[10px] text-slate-400 sm:block">Faculty research portal</p>
            </div>
          </div>

          {/* right side */}
          <div className="flex items-center gap-2">

            {/* notifications bell */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close notifications"
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-slate-400">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotifRead(n.id);
                              if (n.link_url) navigate(n.link_url);
                              setNotifOpen(false);
                            }}
                            className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${!n.is_read ? "bg-blue-50/50" : ""}`}
                          >
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.is_read ? "bg-blue-500" : "bg-transparent"}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{n.message}</p>
                              <p className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* name */}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">{user?.name || "Professor"}</p>
              <p className="text-[10px] text-slate-500">Faculty / Mentor</p>
            </div>

          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* page title */}
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Faculty research portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102A63]">
            {activeSection === "dashboard"
              ? `Welcome back, ${user?.name || "Professor"}`
              : activeSection === "history" ? "Request history" : "Guidance requests"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {activeSection === "dashboard"
              ? "Your accepted research repositories and project progress."
              : activeSection === "history"
                ? "Accepted and declined guidance requests."
                : "Review student research proposals before responding."}
          </p>
        </div>

        {dashError && (
          <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0" />
            <p>{dashError}</p>
          </div>
        )}

        {activeSection === "dashboard" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FolderKanban} label="Accepted repositories" value={summary.assigned_projects ?? 0} />
            <StatCard icon={ClipboardCheck} label="Pending reviews" value={summary.pending_reviews ?? 0} tone="amber" />
            <StatCard icon={CheckCircle2} label="Completed milestones" value={summary.completed_milestones ?? 0} tone="green" />
            <StatCard icon={AlertCircle} label="Overdue milestones" value={summary.overdue_milestones ?? 0} tone="red" />
          </div>
        )}

        {/* ── Pending guidance requests ── */}
        {activeSection === "requests" && (
          <section className="mt-7 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#102A63]">Pending guidance requests</h2>
                <p className="mt-1 text-xs text-slate-500">Open a request to review its research details and student team.</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ClipboardCheck size={18} />
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No pending guidance requests.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setSelectedRequest(req);
                      setRejectionReason("");
                      setRequestError("");
                      setIsRejecting(false);
                    }}
                    className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-800">{req.repository_name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {req.requester_name} · {req.domain || "Research area not specified"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">
                      <Eye size={14} />
                      Review request
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "history" && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <History size={19} />
              </span>
              <div>
                <h2 className="font-bold text-[#102A63]">Resolved guidance requests</h2>
                <p className="mt-1 text-xs text-slate-500">Previous decisions, including any rejection feedback.</p>
              </div>
            </div>
            {requestHistory.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No resolved guidance requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {requestHistory.map((req) => (
                  <article key={req.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{req.repository_name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{req.requester_name} · {req.domain || "Research area not specified"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColour[req.status] || "bg-slate-100 text-slate-500"}`}>
                        {req.status.toLowerCase()}
                      </span>
                    </div>
                    {req.rejection_reason && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                        Rejection reason: {req.rejection_reason}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── accepted repositories on the main dashboard ── */}
        {activeSection === "dashboard" && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-[#102A63]">Accepted repositories</h2>
              <p className="mt-1 text-xs text-slate-500">Research repositories for which you accepted a guidance request.</p>
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
                    <div>
                      <p className="text-slate-400">Researcher</p>
                      <p className="mt-1 font-semibold text-slate-700">{project.owner_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Completion</p>
                      <p className="mt-1 font-semibold text-slate-700">{project.completion_percentage}%</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}

      </section>

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRequestDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            {selectedRequest && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Guidance request</p>
                    <h2 id="request-detail-title" className="mt-1 text-xl font-bold text-[#102A63]">{selectedRequest.repository_name}</h2>
                  </div>
                  <button type="button" aria-label="Close request details" onClick={closeRequestDialog} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Research topic</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedRequest.repository_name}</p>
                    {selectedRequest.research_topic && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedRequest.research_topic}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <MapPin size={13} /> Research area
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedRequest.domain || "Not specified"}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <Users size={13} /> Student team
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {(selectedRequest.student_names
                      ? selectedRequest.student_names.split("\n").filter(Boolean)
                      : [selectedRequest.requester_name]
                    ).map((studentName) => <li key={studentName}>{studentName}</li>)}
                  </ul>
                </div>

                {selectedRequest.message && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Message from the student</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedRequest.message}</p>
                  </div>
                )}

                {requestError && (
                  <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{requestError}</p>
                )}

                {isRejecting && (
                  <form
                    className="mt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleRequest(selectedRequest.id, "REJECTED", rejectionReason);
                    }}
                  >
                    <label htmlFor="rejection-reason" className="mb-2 block text-sm font-semibold text-slate-700">
                      Reason for rejection <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="rejection-reason"
                      required
                      maxLength={2000}
                      rows={4}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Explain why you are unable to guide this research project."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setIsRejecting(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        Back
                      </button>
                      <button type="submit" disabled={actionId === selectedRequest.id || !rejectionReason.trim()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
                        {actionId === selectedRequest.id && <Loader2 size={15} className="animate-spin" />}
                        Confirm rejection
                      </button>
                    </div>
                  </form>
                )}

                {!isRejecting && (
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setIsRejecting(true)} disabled={actionId === selectedRequest.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      <XCircle size={15} /> Reject
                    </button>
                    <button type="button" onClick={() => handleRequest(selectedRequest.id, "ACCEPTED")} disabled={actionId === selectedRequest.id} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                      {actionId === selectedRequest.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Accept request
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      </div>
    </main>
  );
};
