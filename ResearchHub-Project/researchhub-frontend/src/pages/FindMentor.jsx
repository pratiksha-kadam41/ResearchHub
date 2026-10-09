import React from "react";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  LayoutDashboard,
  Loader2,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Send,
  User,
  UserRound,
  X,
  MapPin,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── small helper ───────────────────────────────────────────── */
function Badge({ text }) {
  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
      {text}
    </span>
  );
}

/* ── component ─────────────────────────────────────────────── */
export default function FindMentor() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const fixedRepositoryId = location.state?.repositoryId
    ? String(location.state.repositoryId)
    : "";

  /* faculty list */
  const [faculty, setFaculty] = React.useState([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");
  const [search, setSearch] = React.useState("");

  /* repositories for the request form */
  const [repositories, setRepositories] = React.useState([]);

  /* request modal state */
  const [selected, setSelected] = React.useState(null); // faculty object
  const [profileSelected, setProfileSelected] = React.useState(null);
  const [repoId, setRepoId] = React.useState(fixedRepositoryId);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState("");
  const [sentFor, setSentFor] = React.useState({}); // { [facultyId]: true } after success
  const ownedRepositories = repositories.filter(
    (repository) => Number(repository.owner_id) === Number(user?.id),
  );

  /* ── fetch faculty list + own repos on mount ── */
  React.useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      try {
        const [facResp, repoResp] = await Promise.allSettled([
          fetch("/api/faculty", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/repositories", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (facResp.status === "fulfilled") {
          const data = await facResp.value.json();
          if (active) setFaculty(data.faculty || []);
        }
        if (repoResp.status === "fulfilled") {
          const data = await repoResp.value.json();
          if (active) setRepositories(data.repositories || []);
        }
      } catch {
        if (active) setListError("Unable to load faculty list.");
      } finally {
        if (active) setListLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [token]);

  /* ── search: re-fetch with query ── */
  const doSearch = async () => {
    if (!token) return;
    setListLoading(true);
    setListError("");
    try {
      const resp = await fetch(
        `/api/faculty${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Search failed.");
      setFaculty(data.faculty || []);
    } catch (err) {
      setListError(err.message || "Unable to search faculty.");
    } finally {
      setListLoading(false);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter") doSearch();
  };

  const navigateTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ── open request modal ── */
  const openModal = (fac) => {
    setSelected(fac);
    setRepoId(fixedRepositoryId || ownedRepositories[0]?.id?.toString() || "");
    setMessage("");
    setSendError("");
  };

  /* ── send request ── */
  const handleSend = async (e) => {
    e.preventDefault();
    setSendError("");

    if (!repoId) {
      setSendError("Please select a repository first.");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch("/api/mentor-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repositoryId: Number(repoId),
          facultyId: selected.id,
          message: message.trim(),
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || "Unable to send request.");

      setSentFor((prev) => ({ ...prev, [selected.id]: true }));
      if (fixedRepositoryId) {
        navigate(`/repository/${fixedRepositoryId}`, {
          replace: true,
          state: { notice: `Collaboration request sent to ${selected.name}.` },
        });
        return;
      }
      setSelected(null);
    } catch (err) {
      setSendError(err.message || "Unable to send request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  /* ── render ── */
  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900">
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
            <BookOpen size={23} />
          </span>
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
          {[
            ["Dashboard", LayoutDashboard, "/dashboard/student"],
            ["Create Project", Plus, "/repository/create"],
            ["My Project", FolderGit2, "/dashboard/student#repositories"],
            ["Joined Project", FolderGit2, "/dashboard/student?filter=joined#repositories"],
            ["Find Mentor", UserRound, "/find-mentor"],
          ].map(([label, Icon, path]) => (
            <button
              key={label}
              type="button"
              aria-current={label === "Find Mentor" ? "page" : undefined}
              onClick={() => navigateTo(path)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                label === "Find Mentor"
                  ? "bg-white/15 text-white"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={() => navigateTo("/complete-profile?edit=true")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-white/10 hover:text-white"
          >
            <UserRound size={18} />
            Profile
          </button>
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
              <h1 className="truncate text-base font-bold text-[#102A63] lg:text-lg">Find a faculty collaborator</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Connect with faculty for your research project</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 sm:inline-flex">
            Collaboration
          </span>
        </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* heading */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Collaboration</p>
          <h1 className="mt-2 text-2xl font-bold text-[#102A63] lg:text-3xl">Find a faculty collaborator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search by faculty expertise and request guidance for a project you own.
          </p>
        </div>

        {/* search bar */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search name, institution, research area, or expertise..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <button
            type="button"
            onClick={doSearch}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            Search
          </button>
        </div>

        {/* faculty grid */}
        {listLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-500">
            <Loader2 size={20} className="mr-2 animate-spin text-blue-600" />
            Loading faculty…
          </div>
        ) : listError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
        ) : faculty.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm">
            <User size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No faculty found</p>
            <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {faculty.map((fac) => (
              <article
                key={fac.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                {/* avatar + name */}
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B285F] text-sm font-bold text-white">
                    {fac.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{fac.name}</h3>
                    <p className="text-xs text-slate-500">{fac.designation || "Faculty"}</p>
                    {fac.institution && (
                      <p className="mt-0.5 text-[11px] text-slate-400">{fac.institution}</p>
                    )}
                  </div>
                </div>

                {/* research areas */}
                {fac.research_areas && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Research areas</p>
                    <div className="flex flex-wrap gap-1">
                      {fac.research_areas.split(",").slice(0, 4).map((area) => (
                        <Badge key={area} text={area.trim()} />
                      ))}
                    </div>
                  </div>
                )}

                {/* guidance areas */}
                {fac.guidance_areas && (
                  <div className="mt-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Can guide in</p>
                    <p className="line-clamp-2 text-xs text-slate-600">{fac.guidance_areas}</p>
                  </div>
                )}

                {/* expertise */}
                {fac.expertise && (
                  <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                    <Briefcase size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{fac.expertise}</span>
                  </div>
                )}

                {/* action button */}
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setProfileSelected(fac)}
                    className="flex-1 rounded-xl border border-blue-200 py-2.5 text-xs font-bold text-[#0B285F] transition hover:bg-blue-50"
                  >
                    View profile
                  </button>
                {sentFor[fac.id] ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={15} />
                    Request sent
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal(fac)}
                    disabled={ownedRepositories.length === 0}
                    className="flex-1 rounded-xl bg-[#0B285F] py-2.5 text-xs font-bold text-white transition hover:bg-[#123C83] disabled:cursor-not-allowed disabled:opacity-50"
                    title={ownedRepositories.length === 0 ? "Create a project first" : ""}
                  >
                    {ownedRepositories.length === 0 ? "No owned projects" : "Request guidance"}
                  </button>
                )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      </main>

      {profileSelected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onClick={() => setProfileSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-profile-title"
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B285F] text-lg font-bold text-white">
                  {profileSelected.name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div>
                  <h2 id="faculty-profile-title" className="text-xl font-bold text-[#102A63]">
                    {profileSelected.name}
                  </h2>
                  <p className="text-sm text-slate-500">{profileSelected.designation || "Faculty"}</p>
                  {profileSelected.institution && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={13} /> {profileSelected.institution}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              {[
                ["Research areas", profileSelected.research_areas],
                ["Expertise", profileSelected.expertise],
                ["Research interests", profileSelected.research_interests],
                ["Guidance areas", profileSelected.guidance_areas],
              ].map(([heading, content]) => (
                <div key={heading} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">{heading}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {content || "Not provided"}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Projects currently guiding ({Number(profileSelected.guided_project_count) || 0})
                </h3>
                {profileSelected.guided_projects && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {profileSelected.guided_projects.split("\n").filter(Boolean).map((project) => (
                      <li key={project} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                        <span>{project}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {Number(profileSelected.private_guided_project_count) > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    {profileSelected.private_guided_project_count} private project
                    {Number(profileSelected.private_guided_project_count) === 1 ? "" : "s"} hidden.
                  </p>
                )}
                {!Number(profileSelected.guided_project_count) && (
                  <p className="mt-2 text-sm text-slate-500">No active projects yet.</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileSelected(null);
                openModal(profileSelected);
              }}
              disabled={ownedRepositories.length === 0}
              className="w-full rounded-xl bg-[#0B285F] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#123C83] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request guidance for a project
            </button>
          </section>
        </div>
      )}

      {/* ── Request modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={() => !sending && setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#102A63]">Request collaboration</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sending request to <span className="font-semibold text-slate-700">{selected.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => !sending && setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {/* A request started inside a repository stays tied to that repository. */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {fixedRepositoryId ? "Repository" : "Select repository"}
                  <span className="text-red-500"> *</span>
                </label>
                {ownedRepositories.length === 0 ? (
                  <p className="text-xs text-amber-600">You do not own a project yet. Create a project first.</p>
                ) : fixedRepositoryId ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {ownedRepositories.find((repository) => String(repository.id) === fixedRepositoryId)?.name
                      || "This project is not available for your account."}
                  </p>
                ) : (
                  <div className="relative">
                    <FolderGit2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={repoId}
                      onChange={(e) => setRepoId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">— Choose a repository —</option>
                      {ownedRepositories.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.research_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* message */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Message <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Briefly describe your research and what guidance you need..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  maxLength={2000}
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{message.length}/2000</p>
              </div>

              {sendError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {sendError}
                </p>
              )}

              {/* buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => !sending && setSelected(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !repoId || !ownedRepositories.some((repository) => String(repository.id) === String(repoId))}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B285F] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#123C83] disabled:cursor-wait disabled:opacity-60"
                >
                  {sending ? (
                    <><LoaderCircle size={16} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Send size={15} /> Send request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
