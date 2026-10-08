import React from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  FileText,
  FolderGit2,
  Handshake,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RepositoryWorkspace() {
  const { repositoryId } = useParams();
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = React.useState(null);
  const [documents, setDocuments] = React.useState([]);
  const [error, setError] = React.useState("");
  const [resending, setResending] = React.useState(null);
  const [generatingLink, setGeneratingLink] = React.useState(null);
  const [invitationLinks, setInvitationLinks] = React.useState(() =>
    Object.fromEntries(
      (location.state?.invitations || [])
        .filter((invitation) => invitation.invitationUrl)
        .map((invitation) => [invitation.email, invitation.invitationUrl]),
    ),
  );
  const [copiedEmail, setCopiedEmail] = React.useState("");
  const [savingDocument, setSavingDocument] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState(null);
  const [documentTitle, setDocumentTitle] = React.useState("");
  const [documentContent, setDocumentContent] = React.useState("");
  const [notice, setNotice] = React.useState(location.state?.notice || "");
  const [emailConfigurationError] = React.useState(
    location.state?.emailConfigurationError || "",
  );

  const loadWorkspace = React.useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const isStudent = user?.role?.toLowerCase() === "student";
    const [workspaceResponse, documentsResponse, mentorRequestsResponse] = await Promise.all([
      fetch(`/api/repositories/${repositoryId}`, { headers }),
      fetch(`/api/repositories/${repositoryId}/documents`, { headers }),
      ...(isStudent ? [fetch("/api/mentor-requests", { headers })] : []),
    ]);
    const [workspaceResult, documentsResult, mentorRequestsResult] = await Promise.all([
      workspaceResponse.json(),
      documentsResponse.json(),
      ...(isStudent ? [mentorRequestsResponse.json()] : []),
    ]);

    if (!workspaceResponse.ok) {
      throw new Error(workspaceResult.message || "Unable to load this repository.");
    }
    if (!documentsResponse.ok) {
      throw new Error(documentsResult.message || "Unable to load research notes.");
    }
    if (isStudent && !mentorRequestsResponse.ok) {
      throw new Error(mentorRequestsResult.message || "Unable to load faculty collaboration status.");
    }

    const repositoryGuidanceRequests = isStudent
      ? (mentorRequestsResult.requests || [])
        .filter((request) => Number(request.repository_id) === Number(repositoryId))
        .map((request) => ({
          id: request.id,
          status: request.status,
          rejection_reason: request.rejection_reason,
          responded_at: request.responded_at,
          faculty_name: request.faculty_name,
        }))
      : workspaceResult.guidanceRequests || [];

    return {
      workspace: { ...workspaceResult, guidanceRequests: repositoryGuidanceRequests },
      documents: documentsResult.documents,
    };
  }, [repositoryId, token, user?.role]);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await loadWorkspace();

        if (active) {
          setWorkspace(result.workspace);
          setDocuments(result.documents);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  React.useEffect(() => {
    const refreshWhenVisible = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch(`/api/repositories/${repositoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to refresh repository status.",
          );
        }

        setWorkspace((current) => ({
          ...result,
          guidanceRequests: result.guidanceRequests ?? current?.guidanceRequests ?? [],
        }));
      } catch (requestError) {
        console.error("Repository status refresh failed:", requestError);
        setError(
          requestError.message || "Unable to refresh repository status.",
        );
      }
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 15000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [repositoryId, token]);

  const saveDocument = async (event) => {
    event.preventDefault();
    setSavingDocument(true);
    setError("");
    setNotice("");

    try {
      const method = editingDocument ? "PUT" : "POST";
      const documentPath = editingDocument
        ? `/${editingDocument.id}`
        : "";
      const response = await fetch(
        `/api/repositories/${repositoryId}/documents${documentPath}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: documentTitle,
            content: documentContent,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save this research note.");
      }

      const updated = await loadWorkspace();
      setWorkspace(updated.workspace);
      setDocuments(updated.documents);
      setEditingDocument(null);
      setDocumentTitle("");
      setDocumentContent("");
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingDocument(false);
    }
  };

  const resendInvitation = async (invitationId) => {
    setResending(invitationId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/invitations/${invitationId}/resend`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to resend this invitation.");
      }

      setNotice(result.message);
      const updated = await loadWorkspace();
      setWorkspace(updated.workspace);
      setDocuments(updated.documents);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(null);
    }
  };

  const generateInvitationLink = async (invitationId, email) => {
    setGeneratingLink(invitationId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/invitations/${invitationId}/link`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to generate this invitation link.");
      }

      setInvitationLinks((current) => ({
        ...current,
        [email]: result.invitationUrl,
      }));
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGeneratingLink(null);
    }
  };

  const copyInvitationLink = async (email, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(""), 2000);
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the invitation link from the field.",
      );
    }
  };

  const isOwner = workspace?.repository.owner_id === user?.id;

  return (
    <main className="min-h-screen bg-[#F4F7FC] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081D4B]/95 text-white shadow-lg shadow-blue-950/10 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard/student")}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-100 ring-1 ring-white/15">
              <BookOpen size={19} />
            </span>
            <span className="font-bold tracking-tight">
              Research<span className="text-blue-300">Hub</span>
            </span>
          </div>
          <span className="hidden text-xs font-medium text-blue-200 sm:block">
            Research workspace
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        {notice && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <Check size={18} className="mt-0.5 shrink-0" />
            <p>{notice}</p>
          </div>
        )}
        {emailConfigurationError && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
            <p className="font-bold">Automatic email is unavailable.</p>
            <p className="mt-1 leading-6">
              {emailConfigurationError} Use the invitation links below to share
              with your group; links expire in 7 days.
            </p>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {!workspace && !error && (
          <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-medium text-slate-500 shadow-sm">
            <span className="flex items-center gap-3">
              <LoaderCircle size={20} className="animate-spin text-blue-600" />
              Loading repository workspace...
            </span>
          </div>
        )}

        {workspace && (
          <>
            <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071A46] via-[#0B2B72] to-[#174DA5] px-6 py-7 text-white shadow-xl shadow-blue-950/15 sm:px-8 sm:py-9 lg:px-10">
              <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-100">
                      <FolderGit2 size={13} />
                      {workspace.repository.research_type === "group"
                        ? "Group research"
                        : "Individual research"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-3 py-1.5 text-[11px] font-semibold capitalize text-emerald-100 ring-1 ring-emerald-200/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      {workspace.repository.status}
                    </span>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                    Research workspace
                  </p>
                  <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                    {workspace.repository.name}
                  </h1>
                  <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-blue-100/85 sm:text-base">
                    {workspace.repository.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-blue-50">
                      {workspace.repository.domain}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium capitalize text-blue-50">
                      <LockKeyhole size={13} />
                      {workspace.repository.privacy}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-blue-50">
                      <CalendarDays size={13} />
                      Created{" "}
                      {new Date(workspace.repository.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:min-w-64">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-blue-200">
                      <Users size={16} />
                      <span className="text-xs font-semibold">Team</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{workspace.members.length}</p>
                    <p className="mt-0.5 text-[11px] text-blue-200">accepted members</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-blue-200">
                      <FileText size={16} />
                      <span className="text-xs font-semibold">Notes</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{documents.length}</p>
                    <p className="mt-0.5 text-[11px] text-blue-200">shared updates</p>
                  </div>
                </div>
              </div>
            </section>

            {user?.role?.toLowerCase() === "student" && (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                      <Handshake size={15} /> Faculty collaboration
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-[#102A63]">Guidance requests for this repository</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Request a faculty collaborator specifically for this research project.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/find-mentor", { state: { repositoryId: workspace.repository.id } })}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B285F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#123C83]"
                  >
                    <Handshake size={16} />
                    Request collaboration
                  </button>
                </div>

                {workspace.guidanceRequests?.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {workspace.guidanceRequests.map((request) => (
                      <article key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {request.status === "ACCEPTED" ? "Faculty collaborator: " : "Request to: "}
                            {request.faculty_name}
                          </p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            request.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-700"
                              : request.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : request.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-200 text-slate-600"
                          }`}>
                            {request.status.toLowerCase()}
                          </span>
                        </div>
                        {request.status === "REJECTED" && request.rejection_reason && (
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-red-700">
                            Reason: {request.rejection_reason}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No faculty collaboration request has been sent for this repository.
                  </p>
                )}
              </section>
            )}

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <Sparkles size={17} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                          Collaborate
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-[#102A63]">
                        Shared research notes
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Capture ideas and keep the team’s research in one place.
                      </p>
                    </div>
                    <span className="hidden rounded-xl bg-blue-50 p-3 text-blue-600 sm:flex">
                      <FileText size={19} />
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <form
                    onSubmit={saveDocument}
                    className="rounded-2xl border border-blue-100 bg-[#F7FAFF] p-4 sm:p-5"
                  >
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      {editingDocument ? "Edit research note" : "Add a team update"}
                    </label>
                    <input
                      required
                      maxLength={150}
                      value={documentTitle}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      placeholder="Give your note a clear title"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                    <textarea
                      required
                      maxLength={50000}
                      rows={4}
                      value={documentContent}
                      onChange={(event) => setDocumentContent(event.target.value)}
                      placeholder="Share a research idea, finding, or progress update..."
                      className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {editingDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDocument(null);
                            setDocumentTitle("");
                            setDocumentContent("");
                          }}
                          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingDocument}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
                      >
                        {savingDocument ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                        {editingDocument ? "Save changes" : "Share note"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-6 space-y-3">
                    {documents.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
                        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                          <FileText size={20} />
                        </span>
                        <h3 className="mt-3 text-sm font-bold text-slate-800">
                          Your research notes start here
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Share the first idea or progress update with your team.
                        </p>
                      </div>
                    ) : (
                      documents.map((document) => (
                        <article
                          key={document.id}
                          className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="break-words font-bold text-slate-900">
                                {document.title}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Updated by{" "}
                                <span className="font-semibold text-slate-700">
                                  {document.updated_by_name}
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDocument(document);
                                setDocumentTitle(document.title);
                                setDocumentContent(document.content);
                                setError("");
                              }}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                            >
                              Edit note
                            </button>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                            {document.content}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-[#102A63]">Research team</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {workspace.members.length} accepted{" "}
                        {workspace.members.length === 1 ? "member" : "members"}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Users size={19} />
                    </span>
                  </div>

                  <ul className="mt-4 divide-y divide-slate-100">
                    {workspace.members.map((member, index) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            index === 0
                              ? "bg-[#0B285F] text-white"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {member.name
                            .split(/\s+/)
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {member.name}
                            {member.id === user?.id ? " (you)" : ""}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {member.email}
                          </span>
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-600">
                          {member.member_role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {workspace.invitations.length > 0 && (
                  <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Mail size={18} />
                      </span>
                      <div>
                        <h2 className="font-bold text-[#102A63]">
                          Invitations
                        </h2>
                        <p className="text-xs text-slate-500">
                          Accepted, pending, and declined responses
                        </p>
                      </div>
                    </div>

                    <ul className="mt-4 space-y-3">
                      {workspace.invitations.map((invitation) => (
                        <li
                          key={invitation.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                        >
                          <p className="break-all text-xs font-semibold text-slate-800">
                            {invitation.email}
                          </p>
                          <p
                            className={`mt-1 text-[11px] font-semibold ${
                              invitation.response_status === "accepted"
                                ? "text-emerald-700"
                                : invitation.response_status === "rejected"
                                  ? "text-slate-600"
                                  : "text-amber-700"
                            }`}
                          >
                            Status:{" "}
                            {invitation.response_status === "accepted"
                              ? "Accepted"
                              : invitation.response_status === "rejected"
                                ? "Rejected"
                                : "Pending"}
                          </p>
                          {invitation.response_status === "pending" && (
                            <p className="mt-1 text-[11px] capitalize text-slate-500">
                              {invitation.delivery_status === "sent"
                                ? "Invitation email sent"
                                : invitation.delivery_status === "failed"
                                  ? "Invitation email delivery failed"
                                  : "Invitation email not sent yet"}
                            </p>
                          )}
                          {isOwner && invitation.response_status !== "accepted" && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={generatingLink === invitation.id}
                                onClick={() =>
                                  generateInvitationLink(
                                    invitation.id,
                                    invitation.email,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"
                              >
                                {generatingLink === invitation.id ? (
                                  <LoaderCircle size={13} className="animate-spin" />
                                ) : (
                                  <Mail size={13} />
                                )}
                                {invitation.response_status === "rejected"
                                  ? "Invite again with link"
                                  : "Generate link"}
                              </button>
                              <button
                                type="button"
                                disabled={resending === invitation.id}
                                onClick={() => resendInvitation(invitation.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"
                              >
                                {resending === invitation.id ? (
                                  <LoaderCircle size={13} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={13} />
                                )}
                                {invitation.response_status === "rejected"
                                  ? "Invite again by email"
                                  : invitation.delivery_status === "sent"
                                    ? "Resend email"
                                    : "Send email"}
                              </button>
                            </div>
                          )}
                          {invitation.response_status === "pending" &&
                            invitationLinks[invitation.email] && (
                            <div className="mt-3">
                              <p className="mb-1.5 text-[11px] text-slate-500">
                                Share with this invitee:
                              </p>
                              <input
                                readOnly
                                aria-label={`Invitation link for ${invitation.email}`}
                                value={invitationLinks[invitation.email]}
                                onFocus={(event) => event.target.select()}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  copyInvitationLink(
                                    invitation.email,
                                    invitationLinks[invitation.email],
                                  )
                                }
                                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                {copiedEmail === invitation.email ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                                {copiedEmail === invitation.email
                                  ? "Copied to clipboard"
                                  : "Copy invitation link"}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[11px] leading-5 text-slate-500">
                      Invitation links expire 7 days after they are generated.
                    </p>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
