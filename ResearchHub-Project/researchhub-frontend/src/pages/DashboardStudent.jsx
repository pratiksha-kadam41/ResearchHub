import React from "react";
import {
  BookOpen,
  Bell,
  CheckCircle2,
  FolderGit2,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/student" },
  { label: "Create Project", icon: Plus, path: "/repository/create" },
  { label: "Find Mentor", icon: UserRound, path: "/find-mentor" },
  { label: "My Tasks", icon: LayoutDashboard, path: "/tasks" },
  { label: "Shared Library", icon: FolderGit2, path: "/shared-library" },
];

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-white/15 text-white"
          : "text-blue-100/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={20} />
      </div>
      <p className="mt-4 text-2xl font-bold text-[#102A63]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

export const DashboardStudent = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [student, setStudent] = React.useState(user);
  const [studentError, setStudentError] = React.useState("");
  const [repositories, setRepositories] = React.useState([]);
  const [repositorySearch, setRepositorySearch] = React.useState("");
  const [repositoryFilter, setRepositoryFilter] = React.useState("all");
  const [repositoriesLoading, setRepositoriesLoading] = React.useState(true);
  const [repositoriesError, setRepositoriesError] = React.useState("");
  const [profile, setProfile] = React.useState(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileIncomplete, setProfileIncomplete] = React.useState(false);
  const [invitations, setInvitations] = React.useState([]);
  const [invitationsLoading, setInvitationsLoading] = React.useState(true);
  const [invitationActionId, setInvitationActionId] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [showCreatedAlert, setShowCreatedAlert] = React.useState(
    Boolean(location.state?.repositoryCreated),
  );
  const [alertMessage, setAlertMessage] = React.useState(
    location.state?.repositoryCreated ? "Repository created successfully" : "",
  );

  React.useEffect(() => {
    if (!token) {
      return undefined;
    }

    let active = true;
    const loadDashboard = async () => {
      try {
        // Core requests — must succeed
        const [studentResponse, repositoryResponse] = await Promise.all([
          fetch("/api/student/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/repositories", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const [studentResult, repositoryResult] = await Promise.all([
          studentResponse.json(),
          repositoryResponse.json(),
        ]);

        if (!studentResponse.ok) {
          throw new Error(studentResult.message || "Unable to load your account.");
        }
        if (!repositoryResponse.ok) {
          throw new Error(repositoryResult.message || "Unable to load your repositories.");
        }

        if (active) {
          setStudent(studentResult.user);
          setRepositories(repositoryResult.repositories);
        }

        // Secondary requests — load independently, never crash the dashboard
        const [invResp, notifResp] = await Promise.allSettled([
          fetch("/api/repositories/invitations/mine", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch("/api/notifications", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
        ]);

        if (active) {
          if (invResp.status === "fulfilled") {
            setInvitations(invResp.value.invitations || []);
          }
          if (notifResp.status === "fulfilled") {
            setNotifications(notifResp.value.notifications || []);
          }
        }
      } catch (error) {
        console.error("Student dashboard load error:", error);
        if (active) {
          setStudentError(error.message || "Unable to load your account.");
          setRepositoriesError(error.message || "Unable to load your repositories.");
        }
      } finally {
        if (active) {
          setRepositoriesLoading(false);
          setInvitationsLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  React.useEffect(() => {
    if (!location.state?.repositoryCreated) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setShowCreatedAlert(false);
      navigate(location.pathname, { replace: true, state: null });
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [location.key, location.pathname, location.state?.repositoryCreated, navigate]);

  const name = student?.name || student?.fullName || student?.username || "Student";
  const individualCount = repositories.filter(
    (repository) => repository.research_type === "individual",
  ).length;
  const groupCount = repositories.filter(
    (repository) => repository.research_type === "group",
  ).length;
  const visibleRepositories = repositories.filter((repository) => {
    const query = repositorySearch.trim().toLowerCase();
    const matchesSearch = !query || [
      repository.name,
      repository.description,
      repository.domain,
      repository.faculty_collaborator_name,
    ].some((value) => value?.toLowerCase().includes(query));
    const matchesFilter = repositoryFilter === "all"
      || (repositoryFilter === "group" && repository.research_type === "group")
      || (repositoryFilter === "individual" && repository.research_type === "individual")
      || (repositoryFilter === "collaboration" && repository.guidance_request_status);
    return matchesSearch && matchesFilter;
  });
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navigateTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleInvitationResponse = async (invitation, decision) => {
    if (!token) return;
    setInvitationActionId(invitation.id);
    try {
      // Use the ID-based in-app endpoint (invitation.id, not token_hash)
      const response = await fetch(
        `/api/repositories/invitations/${invitation.id}/respond/${decision}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Unable to ${decision} invitation.`);
      }

      // Remove this invitation from the pending list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));

      // Mark the matching notification as read
      setNotifications((prev) =>
        prev.map((n) =>
          n.type === "REPOSITORY_INVITATION" &&
          n.title.includes(invitation.repository_name)
            ? { ...n, is_read: true }
            : n,
        ),
      );

      if (decision === "accept") {
        // Reload repositories — accepted repo now appears in the list
        const repoResponse = await fetch("/api/repositories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const repoResult = await repoResponse.json();
        if (repoResponse.ok) {
          setRepositories(repoResult.repositories);
        }
        // Show the repository-created success toast
        setAlertMessage(`You joined "${invitation.repository_name}" successfully.`);
        setShowCreatedAlert(true);
        window.setTimeout(() => setShowCreatedAlert(false), 4500);
      }
    } catch (error) {
      console.error(`Invitation ${decision} error:`, error);
      alert(error.message || `Unable to ${decision} the invitation. Please try again.`);
    } finally {
      setInvitationActionId(null);
    }
  };

  const markNotificationRead = async (notifId) => {
    if (!token) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
    );
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Mark notification read failed:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Mark all notifications read failed:", err);
    }
  };

  const openProfile = async () => {
    setProfileOpen(true);
    setProfileError("");
    if (profile || !token) return;

    setProfileLoading(true);
    try {
      const response = await fetch("/api/student/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (response.status === 404 && result.profileCompleted === false) {
        setProfileOpen(false);
        setProfileIncomplete(true);
        return;
      }
      if (!response.ok) {
        throw new Error(result.message || "Unable to load your profile.");
      }
      setProfile(result.profile);
    } catch (error) {
      console.error("Student profile load error:", error);
      setProfileError(error.message || "Unable to load your profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900">
      {showCreatedAlert && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg"
        >
          <span className="flex-1">
              {alertMessage || "Repository created successfully"}
            </span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => {
              setShowCreatedAlert(false);
              navigate(location.pathname, { replace: true, state: null });
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path}
              onClick={() => navigateTo(item.path)}
            />
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <SidebarItem
            icon={HelpCircle}
            label="Help"
            onClick={() => navigateTo("/help")}
          />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-white px-5 shadow-sm lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[#102A63] lg:text-lg">
                Welcome back, {name}
              </h2>
              <p className="text-[10px] text-slate-400 lg:text-xs">
                Your research repositories and group memberships
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ── Bell / Notifications ── */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <Bell size={20} />
                {notifications.filter((n) => !n.is_read).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {notifications.filter((n) => !n.is_read).length > 9
                      ? "9+"
                      : notifications.filter((n) => !n.is_read).length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  {/* backdrop */}
                  <button
                    type="button"
                    aria-label="Close notifications"
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                      {notifications.some((n) => !n.is_read) && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(notif.id);
                              if (notif.link_url) {
                                navigate(notif.link_url);
                                setNotificationsOpen(false);
                              }
                            }}
                            className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                              !notif.is_read ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                !notif.is_read ? "bg-blue-500" : "bg-transparent"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800">
                                {notif.title}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                {notif.message}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Profile avatar ── */}
            <button
              type="button"
              onClick={openProfile}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                {initials}
              </span>
              <span className="hidden md:block">
                <span className="block text-[11px] font-bold text-slate-800">{name}</span>
                <span className="block text-[9px] text-slate-400">
                  {student?.role || "Student"}
                </span>
              </span>
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] p-5 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Student Research Portal
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#102A63] lg:text-3xl">
                Research Dashboard
              </h1>
            </div>
            <button
              type="button"
              onClick={() => navigateTo("/repository/create")}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0B285F] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#123C83]"
            >
              <Plus size={16} />
              Create Repository
            </button>
          </div>

          {studentError && (
            <p role="alert" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {studentError}
            </p>
          )}
          {!token && (
            <p role="alert" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your session has expired. Please sign in again.
            </p>
          )}

          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={FolderKanban}
              label="My repositories"
              value={repositoriesLoading && token ? "…" : !token || repositoriesError ? "—" : repositories.length}
            />
            <SummaryCard
              icon={FolderGit2}
              label="Individual research"
              value={repositoriesLoading && token ? "…" : !token || repositoriesError ? "—" : individualCount}
            />
            <SummaryCard
              icon={Users}
              label="Group research"
              value={repositoriesLoading && token ? "…" : !token || repositoriesError ? "—" : groupCount}
            />
          </section>

          {/* ── Pending invitations ─────────────────────────────── */}
          {(invitationsLoading || invitations.length > 0) && (
            <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm lg:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#102A63]">Pending invitations</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Group repositories you have been invited to join.
                  </p>
                </div>
                <Bell size={20} className="text-blue-600" />
              </div>

              {invitationsLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                  <Loader2 size={17} className="animate-spin text-blue-600" />
                  Loading invitations…
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const busy = invitationActionId === inv.id;
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {inv.repository_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-600">{inv.inviter_name}</span>
                            {" invited you · "}
                            {inv.domain}
                            {" · "}
                            {inv.research_type === "group" ? "Group" : "Individual"} research
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleInvitationResponse(inv, "accept")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleInvitationResponse(inv, "reject")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Repositories ────────────────────────────────────── */}
          <section className="rounded-2xl bg-white p-5 shadow-sm lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#102A63]">My repositories</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Repositories you own or have joined.
                </p>
              </div>
              <FolderGit2 size={20} className="text-blue-600" />
            </div>

            {repositories.length > 0 && (
              <div className="mb-5 space-y-3">
                <label className="relative block">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={repositorySearch}
                    onChange={(event) => setRepositorySearch(event.target.value)}
                    placeholder="Search repositories by name, topic, or faculty"
                    aria-label="Search repositories"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
                <div className="flex flex-wrap gap-2" aria-label="Filter repositories">
                  {[
                    ["all", "All repositories"],
                    ["collaboration", "With faculty requests"],
                    ["group", "Group research"],
                    ["individual", "Individual research"],
                  ].map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={repositoryFilter === filter}
                      onClick={() => setRepositoryFilter(filter)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        repositoryFilter === filter
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!token ? (
              <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Sign in to view your repositories.
              </p>
            ) : repositoriesError ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {repositoriesError}
              </p>
            ) : repositoriesLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-blue-600" />
                Loading your repositories…
              </div>
            ) : repositories.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
                <FolderGit2 size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No repositories yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Create a repository or accept an invitation to see it here.
                </p>
              </div>
            ) : (
              visibleRepositories.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No repositories match your search or filter.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleRepositories.map((repository) => {
                    const guidanceStatus = repository.faculty_collaborator_name
                      ? "ACCEPTED"
                      : repository.guidance_request_status || "NOT_REQUESTED";
                    const collaborationStyles = {
                      ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                      PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
                      REJECTED: "bg-red-50 text-red-700 ring-red-200",
                      NOT_REQUESTED: "bg-slate-100 text-slate-600 ring-slate-200",
                    };
                    const collaborationLabels = {
                      ACCEPTED: "Faculty accepted",
                      PENDING: "Request pending",
                      REJECTED: "Request declined",
                      NOT_REQUESTED: "No faculty request",
                    };

                    return (
                      <button
                        key={repository.id}
                        type="button"
                        onClick={() => navigate(`/repository/${repository.id}`)}
                        className="group flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                            {repository.research_type === "group" ? "Group research" : "Individual research"}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${collaborationStyles[guidanceStatus] || collaborationStyles.NOT_REQUESTED}`}>
                            {collaborationLabels[guidanceStatus] || guidanceStatus.toLowerCase()}
                          </span>
                        </span>
                        <span className="mt-3 block truncate text-sm font-bold text-slate-800 group-hover:text-blue-800">
                          {repository.name}
                        </span>
                        {repository.faculty_collaborator_name && (
                          <span className="mt-1 block text-xs font-semibold text-emerald-700">
                            Faculty collaborator: {repository.faculty_collaborator_name}
                          </span>
                        )}
                        <span className="mt-2 block text-[11px] font-medium text-slate-500">
                          {repository.domain || "Research area not specified"}
                        </span>
                        {repository.description && (
                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                            {repository.description}
                          </span>
                        )}
                        <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-[10px] text-slate-500">
                          <span>
                            {repository.member_count} {Number(repository.member_count) === 1 ? "member" : "members"}
                            {" · "}{repository.status}
                          </span>
                          <span className="font-semibold text-blue-700 group-hover:underline">Open repository →</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </section>
        </div>
      </main>

      {profileOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onClick={() => setProfileOpen(false)}
        >
          <section
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#102A63]">My Profile</h2>
              <button
                type="button"
                aria-label="Close profile"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            {profileLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : profileError ? (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {profileError}
              </p>
            ) : profile ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Name", name],
                    ["Email", profile.email || student?.email],
                    ["Phone", profile.phone],
                    ["Institution", profile.institution || student?.institution],
                    ["Course", profile.course || student?.course],
                    ["Specialization", profile.specialization],
                    ["Enrollment number", profile.enrollment_number],
                    ["Research interests", profile.research_interests],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[9px] font-semibold uppercase text-slate-400">
                          {label}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{value}</p>
                      </div>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/complete-profile?edit=true")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B285F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#123C83]"
                >
                  <Pencil size={14} />
                  Edit profile
                </button>
              </>
            ) : null}
          </section>
        </div>
      )}

      {profileIncomplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <UserRound size={28} className="mx-auto text-blue-700" />
            <h2 className="mt-4 text-xl font-bold text-[#102A63]">
              Complete your profile
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Complete your student profile before starting your research work.
            </p>
            <button
              type="button"
              onClick={() => navigate("/complete-profile")}
              className="mt-6 w-full rounded-xl bg-[#0B285F] py-3 text-sm font-bold text-white hover:bg-[#123C83]"
            >
              Complete profile
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
