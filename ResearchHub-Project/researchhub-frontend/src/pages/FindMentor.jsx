import React from "react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  Loader2,
  LoaderCircle,
  Search,
  Send,
  User,
  X,
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
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [repoId, setRepoId] = React.useState(fixedRepositoryId);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState("");
  const [sentFor, setSentFor] = React.useState({}); // { [facultyId]: true } after success

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

  /* ── open request modal ── */
  const openModal = (fac) => {
    setSelected(fac);
    setRepoId(fixedRepositoryId || repositories[0]?.id?.toString() || "");
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
    <div className="min-h-screen bg-[#F5F8FC]">

      {/* header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard/student")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
              <BookOpen size={18} />
            </span>
            <span className="font-bold tracking-tight text-[#102A63]">ResearchHub</span>
          </div>
          <div className="w-32" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* heading */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Collaboration</p>
          <h1 className="mt-2 text-2xl font-bold text-[#102A63] lg:text-3xl">Find a faculty collaborator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse faculty members and send a guidance request for your research repository.
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
              placeholder="Search by name, institution, research area..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <button
            type="button"
            onClick={doSearch}
            className="rounded-xl bg-[#0B285F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#123C83]"
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
                <div className="mt-5 pt-4 border-t border-slate-100">
                  {sentFor[fac.id] ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 size={15} />
                      Request sent
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openModal(fac)}
                      disabled={repositories.length === 0}
                      className="w-full rounded-xl bg-[#0B285F] py-2.5 text-xs font-bold text-white transition hover:bg-[#123C83] disabled:cursor-not-allowed disabled:opacity-50"
                      title={repositories.length === 0 ? "Create a repository first" : ""}
                    >
                      {repositories.length === 0 ? "Create a repository first" : "Request collaboration"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

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
                {repositories.length === 0 ? (
                  <p className="text-xs text-amber-600">You have no repositories yet. Create one first.</p>
                ) : fixedRepositoryId ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {repositories.find((repository) => String(repository.id) === fixedRepositoryId)?.name
                      || "Selected repository"}
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
                      {repositories.map((r) => (
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
                  disabled={sending || !repoId}
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
