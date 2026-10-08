import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  FileText,
  FolderGit2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  Sparkles,
  Users,
  UserRound,
  Plus,
  Trash2,
  Edit3,
  MessageSquare,
  Award,
  AlertCircle,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Send,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

const RESOURCE_TYPES = ["LINK", "PDF", "DOC", "DOCX", "IMAGE", "DATASET", "SOURCE_CODE", "PAPER", "TEMPLATE", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const COMMENT_TYPES = ["DISCUSSION", "QUESTION", "FEEDBACK", "REVISION"];

export default function RepositoryWorkspace() {
  const { repositoryId } = useParams();
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tab
  const [activeTab, setActiveTab] = useState("overview");

  // Core workspace state
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  // Sub-entity states
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [resources, setResources] = useState([]);
  const [comments, setComments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [mentorRequests, setMentorRequests] = useState([]);

  // Invitation link states
  const [invitationLinks, setInvitationLinks] = useState(() =>
    Object.fromEntries(
      (location.state?.invitations || [])
        .filter((inv) => inv.invitationUrl)
        .map((inv) => [inv.email, inv.invitationUrl])
    )
  );
  const [copiedEmail, setCopiedEmail] = useState("");
  const [generatingLink, setGeneratingLink] = useState(null);
  const [resending, setResending] = useState(null);

  // Notes state
  const [savingDocument, setSavingDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");

  // Modals state
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", marks: "", deadline: "" });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ milestoneId: "", title: "", description: "", priority: "MEDIUM", deadline: "", assignedTo: "" });

  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({ workUrl: "", notes: "" });

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: "APPROVED", feedback: "" });

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({ studentId: "", milestoneId: "", originalMarks: "", deductedMarks: "0", deductionReason: "" });

  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", resourceType: "LINK", resourceUrl: "", notes: "", visibility: "PROJECT" });

  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extendingMilestone, setExtendingMilestone] = useState(null);
  const [extensionForm, setExtensionForm] = useState({ requestedDeadline: "", reason: "" });

  const [commentInput, setCommentInput] = useState("");
  const [commentType, setCommentType] = useState("DISCUSSION");

  const isFaculty = user?.role === "faculty";
  const isOwner = workspace?.repository?.owner_id === user?.id;

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadWorkspaceData = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      setLoading(true);
      setError("");

      const [repoRes, docsRes, msRes, taskRes, subRes, evalRes, resRes, commRes, reqRes] =
        await Promise.all([
          fetch(`/api/repositories/${repositoryId}`, { headers }),
          fetch(`/api/repositories/${repositoryId}/documents`, { headers }),
          fetch(`/api/milestones/repository/${repositoryId}`, { headers }),
          fetch(`/api/tasks/repository/${repositoryId}`, { headers }),
          fetch(`/api/submissions/repository/${repositoryId}`, { headers }),
          fetch(`/api/submissions/evaluations/repository/${repositoryId}`, { headers }),
          fetch(`/api/resources/repository/${repositoryId}`, { headers }),
          fetch(`/api/collaboration/repository/${repositoryId}`, { headers }),
          fetch("/api/mentor-requests", { headers }),
        ]);

      if (!repoRes.ok) {
        const repoData = await repoRes.json();
        throw new Error(repoData.message || "Unable to load repository.");
      }

      const repoData = await repoRes.json();
      setWorkspace(repoData);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }
      if (msRes.ok) {
        const msData = await msRes.json();
        setMilestones(msData.milestones || []);
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData.submissions || []);
      }
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluations(evalData.evaluations || []);
      }
      if (resRes.ok) {
        const resData = await resRes.json();
        setResources(resData.resources || []);
      }
      if (commRes.ok) {
        const commData = await commRes.json();
        setComments(commData.comments || []);
      }
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        const relevantReqs = (reqData.requests || []).filter(
          (r) => String(r.repository_id) === String(repositoryId)
        );
        setMentorRequests(relevantReqs);
      }
    } catch (err) {
      setError(err.message || "Failed to load project workspace.");
    } finally {
      setLoading(false);
    }
  }, [repositoryId, token]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // -------------------------------------------------------------
  // Milestone Handlers
  // -------------------------------------------------------------
  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    try {
      const url = editingMilestone
        ? `/api/milestones/${editingMilestone.id}`
        : `/api/milestones/repository/${repositoryId}`;
      const method = editingMilestone ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(milestoneForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save milestone.");

      setMilestoneModalOpen(false);
      setEditingMilestone(null);
      setMilestoneForm({ title: "", description: "", marks: "", deadline: "" });
      setNotice(data.message || "Milestone saved.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (!confirm("Are you sure you want to delete this milestone? Associated tasks will be deleted.")) return;
    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete milestone.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateMilestoneProgress = async (id, percentage) => {
    try {
      const res = await fetch(`/api/milestones/${id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completionPercentage: percentage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update milestone progress.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/milestones/${extendingMilestone.id}/extensions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(extensionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to request extension.");
      setExtensionModalOpen(false);
      setExtendingMilestone(null);
      setNotice("Deadline extension request submitted to professor.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDecideExtension = async (milestoneId, decision) => {
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/extensions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to decide extension.");
      setNotice(`Deadline extension ${decision.toLowerCase()}.`);
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Task Handlers
  // -------------------------------------------------------------
  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tasks/milestone/${taskForm.milestoneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          deadline: taskForm.deadline,
          assignedTo: taskForm.assignedTo ? Number(taskForm.assignedTo) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create task.");
      setTaskModalOpen(false);
      setTaskForm({ milestoneId: "", title: "", description: "", priority: "MEDIUM", deadline: "", assignedTo: "" });
      setNotice("Task created and assigned.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete task.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateTaskStatus = async (task, newStatus) => {
    try {
      const progress = newStatus === "COMPLETED" ? 100 : newStatus === "IN_PROGRESS" ? 50 : 0;
      const res = await fetch(`/api/tasks/${task.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, progressPercentage: progress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update task.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Submission & Review Handlers
  // -------------------------------------------------------------
  const handleSubmitWork = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/submissions/milestone/${submittingMilestone.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(submissionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit work.");
      setSubmissionModalOpen(false);
      setSubmittingMilestone(null);
      setSubmissionForm({ workUrl: "", notes: "" });
      setNotice(data.message || "Milestone work submitted for review.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewSubmission = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/submissions/${reviewingSubmission.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record review.");
      setReviewModalOpen(false);
      setReviewingSubmission(null);
      setNotice("Review recorded successfully.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Evaluation Handlers
  // -------------------------------------------------------------
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/submissions/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          repositoryId,
          studentId: evalForm.studentId,
          milestoneId: evalForm.milestoneId || null,
          originalMarks: evalForm.originalMarks,
          deductedMarks: evalForm.deductedMarks || 0,
          deductionReason: evalForm.deductionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record marks.");
      setEvalModalOpen(false);
      setEvalForm({ studentId: "", milestoneId: "", originalMarks: "", deductedMarks: "0", deductionReason: "" });
      setNotice(`Evaluation recorded. Final Marks: ${data.finalMarks}`);
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Resource Handlers
  // -------------------------------------------------------------
  const handleSaveResource = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...resourceForm, repositoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save resource.");
      setResourceModalOpen(false);
      setResourceForm({ title: "", resourceType: "LINK", resourceUrl: "", notes: "", visibility: "PROJECT" });
      setNotice("Resource added to repository.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!confirm("Delete this research resource?")) return;
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete resource.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Discussion / Comments Handlers
  // -------------------------------------------------------------
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      const res = await fetch(`/api/collaboration/repository/${repositoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: commentInput, type: commentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post comment.");
      setCommentInput("");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Notes / Document Handlers
  // -------------------------------------------------------------
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    setSavingDocument(true);
    try {
      const method = editingDocument ? "PUT" : "POST";
      const url = editingDocument
        ? `/api/repositories/${repositoryId}/documents/${editingDocument.id}`
        : `/api/repositories/${repositoryId}/documents`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: documentTitle, content: documentContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save note.");
      setEditingDocument(null);
      setDocumentTitle("");
      setDocumentContent("");
      setNotice(data.message || "Research note saved.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingDocument(false);
    }
  };

  // Member removal
  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this student from the research group?")) return;
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove member.");
      setNotice("Group member removed.");
      loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Resend invitation & link generation
  const handleGenerateLink = async (invitationId) => {
    setGeneratingLink(invitationId);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/invitations/${invitationId}/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate link.");
      setInvitationLinks((prev) => ({ ...prev, [data.email]: data.invitationUrl }));
      setNotice(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleCopyLink = async (email, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(""), 2500);
    } catch {
      alert("Unable to copy to clipboard.");
    }
  };

  const repo = workspace?.repository;
  const members = workspace?.members || [];
  const invitations = workspace?.invitations || [];

  // Mentor request status check
  const acceptedMentorReq = mentorRequests.find((r) => r.status === "ACCEPTED");
  const pendingMentorReq = mentorRequests.find((r) => r.status === "PENDING");

  const totalMilestoneMarks = milestones.reduce((sum, m) => sum + Number(m.marks ?? m.weight ?? 0), 0);

  const backLink = isFaculty ? "/dashboard/faculty" : "/dashboard/student";

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="flex items-center gap-2 font-bold text-[#102A63]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
                <FolderGit2 size={18} />
              </span>
              <span className="truncate max-w-[200px] sm:max-w-md">{repo?.name || "Workspace"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">
              {repo?.status || "ongoing"}
            </span>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {notice && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-emerald-600 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <LoaderCircle size={20} className="animate-spin text-blue-600" />
            Loading project workspace...
          </div>
        ) : (
          <>
            {/* Project Header Banner */}
            <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#071A46] via-[#0B2B72] to-[#123C83] p-6 lg:p-8 text-white shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                      {repo?.domain}
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                      {repo?.research_type} research
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase backdrop-blur-md">
                      {repo?.privacy}
                    </span>
                  </div>
                  <h1 className="mt-3 text-2xl lg:text-3xl font-extrabold tracking-tight">{repo?.name}</h1>
                  <p className="mt-2 text-sm text-blue-100 max-w-3xl leading-relaxed">{repo?.description}</p>
                </div>

                {/* Assigned Mentor Callout */}
                <div className="rounded-2xl bg-white/10 p-4 lg:w-80 backdrop-blur-md border border-white/10 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Faculty Guidance / Mentor
                  </p>
                  {acceptedMentorReq ? (
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white font-bold">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {acceptedMentorReq.faculty_name || "Faculty Mentor"}
                        </p>
                        <p className="text-xs text-blue-200">{acceptedMentorReq.designation || "Assigned Mentor"}</p>
                      </div>
                    </div>
                  ) : pendingMentorReq ? (
                    <div className="mt-2 text-xs text-amber-200 flex items-center gap-2">
                      <Clock size={16} />
                      <span>Guidance request to {pendingMentorReq.faculty_name || "professor"} is pending.</span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-blue-200">No mentor assigned yet.</p>
                      {!isFaculty && (
                        <Link
                          to="/find-mentor"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#102A63] hover:bg-blue-50 transition"
                        >
                          Find a Mentor <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="mt-8 flex gap-2 overflow-x-auto border-t border-white/10 pt-4 scrollbar-none">
                {[
                  { id: "overview", label: "Overview & Members", icon: Users },
                  { id: "milestones", label: `Milestones (${milestones.length})`, icon: CalendarDays },
                  { id: "tasks", label: `Tasks (${tasks.length})`, icon: Check },
                  { id: "submissions", label: `Submissions (${submissions.length})`, icon: FileText },
                  { id: "evaluations", label: `Marks & Evaluations (${evaluations.length})`, icon: Award },
                  { id: "resources", label: `Resources (${resources.length})`, icon: FolderGit2 },
                  { id: "discussions", label: `Discussions (${comments.length})`, icon: MessageSquare },
                  { id: "notes", label: `Notes (${documents.length})`, icon: Edit3 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-white text-[#0B285F] shadow-sm"
                          : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB CONTENT */}

            {/* 1. OVERVIEW & MEMBERS TAB */}
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  {/* Milestones Progress summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-bold text-[#102A63] text-base mb-2">Milestone Progress Roadmap</h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Total Marks Allocated: {totalMilestoneMarks} / 20</span>
                      <span>{milestones.filter((m) => m.status === "COMPLETED").length} of {milestones.length} Completed</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{
                          width: `${
                            milestones.length > 0
                              ? Math.round(
                                  milestones.reduce((s, m) => s + Number(m.completion_percentage || 0), 0) /
                                    milestones.length
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Research Group Members */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-[#102A63] text-base">Research Team Members ({members.length})</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Students collaborating on this project.</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{m.name}</p>
                              <p className="text-[11px] text-slate-500">{m.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                m.member_role === "owner"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {m.member_role}
                            </span>
                            {isOwner && m.member_role !== "owner" && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition"
                                title="Remove member"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Invitations Sidebar (Owner only) */}
                <div className="space-y-6">
                  {isOwner && repo?.research_type === "group" && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold text-[#102A63] text-base">Pending Invitations ({invitations.length})</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Invited students can join by clicking their secure link.
                      </p>

                      {invitations.length === 0 ? (
                        <p className="mt-4 text-xs text-slate-400 italic">No pending invitations.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {invitations.map((inv) => (
                            <div key={inv.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                              <p className="text-xs font-bold text-slate-800 truncate">{inv.email}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Status: <span className="font-semibold uppercase">{inv.delivery_status}</span>
                              </p>
                              <div className="mt-2.5 flex items-center gap-2">
                                {invitationLinks[inv.email] ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(inv.email, invitationLinks[inv.email])}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                                  >
                                    {copiedEmail === inv.email ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedEmail === inv.email ? "Copied" : "Copy Link"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateLink(inv.id)}
                                    disabled={generatingLink === inv.id}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white"
                                  >
                                    <Sparkles size={12} />
                                    {generatingLink === inv.id ? "Generating..." : "Get Link"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Details Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-xs">
                    <h3 className="font-bold text-[#102A63] text-sm mb-3">Project Metadata</h3>
                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created</span>
                        <span>{new Date(repo?.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Privacy</span>
                        <span className="font-semibold capitalize">{repo?.privacy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type</span>
                        <span className="capitalize">{repo?.research_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MILESTONES TAB */}
            {activeTab === "milestones" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#102A63]">Milestones & Schedule</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Structured milestone deliverables with marks (Total: {totalMilestoneMarks} / 20).
                    </p>
                  </div>
                  {isFaculty && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMilestone(null);
                        setMilestoneForm({ title: "", description: "", marks: "", deadline: "" });
                        setMilestoneModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <Plus size={15} /> Create Milestone
                    </button>
                  )}
                </div>

                {milestones.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <CalendarDays size={38} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-700">No milestones yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {isFaculty
                        ? "Define milestone deliverables, marks, and deadlines for this project."
                        : "Your assigned faculty mentor will create milestones."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {milestones.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">{m.title}</h3>
                              <p className="text-xs font-semibold text-blue-600 mt-0.5">
                                Marks: {m.marks ?? m.weight ?? 0} · Deadline: {new Date(m.deadline).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                m.effective_status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : m.effective_status === "OVERDUE"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {m.effective_status || m.status}
                            </span>
                          </div>

                          {m.description && (
                            <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {m.description}
                            </p>
                          )}

                          {/* Progress slider / bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span>Progress: {m.completion_percentage}%</span>
                              <span className="text-[11px] text-slate-400">
                                Submissions: {m.submission_status || "DRAFT"}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${m.completion_percentage}%` }}
                              />
                            </div>
                            {!isFaculty && m.status !== "COMPLETED" && (
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={m.completion_percentage}
                                  onChange={(e) => handleUpdateMilestoneProgress(m.id, e.target.value)}
                                  className="w-full accent-blue-600"
                                />
                              </div>
                            )}
                          </div>

                          {/* Extension request alert */}
                          {m.extension_status === "PENDING" && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                              <p className="font-semibold flex items-center gap-1">
                                <Clock size={13} /> Extension Requested: {new Date(m.extension_requested_deadline).toLocaleDateString()}
                              </p>
                              <p className="italic text-[11px] mt-0.5">"{m.extension_reason}"</p>
                              {isFaculty && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDecideExtension(m.id, "APPROVED")}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                                  >
                                    Approve Extension
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDecideExtension(m.id, "REJECTED")}
                                    className="rounded-lg bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-200"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {!isFaculty && m.status !== "COMPLETED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubmittingMilestone(m);
                                    setSubmissionModalOpen(true);
                                  }}
                                  className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100 transition"
                                >
                                  Submit Work
                                </button>
                                {m.extension_status !== "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExtendingMilestone(m);
                                      setExtensionModalOpen(true);
                                    }}
                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition"
                                  >
                                    Request Extension
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {isFaculty && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMilestone(m);
                                  setMilestoneForm({
                                    title: m.title,
                                    description: m.description || "",
                                    marks: m.marks ?? m.weight ?? "",
                                    deadline: String(m.deadline).slice(0, 16),
                                  });
                                  setMilestoneModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. TASKS TAB */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#102A63]">Task Management</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sub-tasks mapped to milestone deliverables.
                    </p>
                  </div>
                  {isFaculty && milestones.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskForm({
                          milestoneId: String(milestones[0]?.id || ""),
                          title: "",
                          description: "",
                          priority: "MEDIUM",
                          deadline: "",
                          assignedTo: "",
                        });
                        setTaskModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <Plus size={15} /> Add Task
                    </button>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <Check size={38} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-700">No tasks created yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {isFaculty
                        ? "Assign tasks to students under existing milestones."
                        : "Assigned tasks from your professor will appear here."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                task.priority === "URGENT"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : task.priority === "HIGH"
                                  ? "bg-orange-50 text-orange-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.is_overdue ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 flex items-center gap-1">
                                <AlertTriangle size={11} /> Overdue
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-2.5 font-bold text-slate-900 text-sm">{task.title}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Milestone: {task.milestone_title || "Project milestone"}
                          </p>

                          {task.description && (
                            <p className="mt-2 text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-lg">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                            <div>
                              <span className="text-slate-400 block">Assignee</span>
                              <span className="font-semibold text-slate-700 truncate block">
                                {task.assignee_name || "Unassigned"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Deadline</span>
                              <span className="font-semibold text-slate-700">
                                {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          {/* Student Status Toggle */}
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task, e.target.value)}
                            className="rounded-lg border border-slate-200 p-1 text-xs font-semibold text-slate-700"
                          >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>

                          {isFaculty && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. SUBMISSIONS & REVIEWS TAB */}
            {activeTab === "submissions" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#102A63]">Submissions & Reviews</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    History of submitted deliverables, versions, and professor review feedback.
                  </p>
                </div>

                {submissions.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <FileText size={38} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-700">No submissions yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Students submit work for milestones in the Milestones tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                              Version {sub.version_number}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {sub.milestone_title}
                            </span>
                            <span className="text-xs text-slate-400">
                              · Submitted by {sub.submitted_by_name} on {new Date(sub.submitted_at).toLocaleDateString()}
                            </span>
                          </div>

                          {sub.work_url && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                              <ExternalLink size={13} />
                              <a
                                href={sub.work_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline hover:text-blue-800 break-all"
                              >
                                {sub.work_url}
                              </a>
                            </div>
                          )}

                          {sub.notes && (
                            <p className="mt-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                              {sub.notes}
                            </p>
                          )}

                          {sub.latest_decision && (
                            <div
                              className={`mt-3 p-3 rounded-xl border text-xs ${
                                sub.latest_decision === "APPROVED"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                  : sub.latest_decision === "REVISION_REQUIRED"
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : "bg-red-50 border-red-200 text-red-900"
                              }`}
                            >
                              <p className="font-bold uppercase tracking-wider text-[10px]">
                                Faculty Decision: {sub.latest_decision.replace("_", " ")}
                              </p>
                              {sub.latest_feedback && (
                                <p className="mt-1 italic">"{sub.latest_feedback}"</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Review Action for Faculty */}
                        {isFaculty && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingSubmission(sub);
                                setReviewForm({ decision: "APPROVED", feedback: "" });
                                setReviewModalOpen(true);
                              }}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                            >
                              Review Submission
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. MARKS & EVALUATIONS TAB */}
            {activeTab === "evaluations" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#102A63]">Academic Evaluations & Marks</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluated scores, penalties for late submissions/absence, and rationale.
                    </p>
                  </div>
                  {isFaculty && (
                    <button
                      type="button"
                      onClick={() => {
                        setEvalForm({
                          studentId: String(members[0]?.id || ""),
                          milestoneId: String(milestones[0]?.id || ""),
                          originalMarks: "",
                          deductedMarks: "0",
                          deductionReason: "",
                        });
                        setEvalModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <Plus size={15} /> Enter Evaluation Marks
                    </button>
                  )}
                </div>

                {evaluations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <Award size={38} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-700">No marks recorded yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      When your faculty mentor evaluates milestones, scores and penalty deductions will be listed here.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                          <th className="p-3.5">Student</th>
                          <th className="p-3.5">Evaluator</th>
                          <th className="p-3.5">Original Marks</th>
                          <th className="p-3.5">Penalty Deductions</th>
                          <th className="p-3.5 font-bold text-slate-900">Final Marks</th>
                          <th className="p-3.5">Deduction Reason</th>
                          <th className="p-3.5">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {evaluations.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-semibold text-slate-800">{ev.student_name}</td>
                            <td className="p-3.5">{ev.evaluator_name}</td>
                            <td className="p-3.5">{ev.original_marks}</td>
                            <td className="p-3.5 text-red-600">
                              {Number(ev.deducted_marks) > 0 ? `-${ev.deducted_marks}` : "0"}
                            </td>
                            <td className="p-3.5 font-bold text-emerald-700 text-sm">{ev.final_marks}</td>
                            <td className="p-3.5 text-slate-500 italic max-w-xs truncate">
                              {ev.deduction_reason || "None"}
                            </td>
                            <td className="p-3.5 text-slate-400">
                              {new Date(ev.evaluation_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 6. RESOURCES TAB */}
            {activeTab === "resources" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#102A63]">Research Resources & Materials</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Datasets, source code, research papers, and reference documents.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResourceForm({ title: "", resourceType: "LINK", resourceUrl: "", notes: "", visibility: "PROJECT" });
                      setResourceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <Plus size={15} /> Add Resource
                  </button>
                </div>

                {resources.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <FolderGit2 size={38} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-700">No resources linked yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload or link research assets to share them with your team.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {resources.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                              {res.resource_type}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                              {res.visibility}
                            </span>
                          </div>

                          <h3 className="mt-3 text-sm font-bold text-slate-900 line-clamp-1">{res.title}</h3>
                          {res.notes && (
                            <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                              {res.notes}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-slate-400">
                            By {res.uploaded_by_name} · {new Date(res.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <a
                            href={res.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Open Link <ExternalLink size={12} />
                          </a>
                          {(res.uploaded_by === user?.id || isFaculty) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteResource(res.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. DISCUSSIONS TAB */}
            {activeTab === "discussions" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#102A63]">Project Discussion & Mentor Feedback</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ask research questions, discuss findings, or request revision feedback.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {/* Comments feed */}
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No comments yet. Start the conversation below!
                      </div>
                    ) : (
                      comments.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl border text-xs ${
                            c.comment_type === "REVISION"
                              ? "bg-amber-50/50 border-amber-200"
                              : c.comment_type === "FEEDBACK"
                              ? "bg-emerald-50/50 border-emerald-200"
                              : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">
                              {c.author_name}{" "}
                              <span className="text-[10px] font-normal text-slate-500">
                                ({c.author_role === "faculty" ? "Mentor" : "Student"})
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase bg-white border border-slate-200 text-slate-600">
                                {c.comment_type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line mt-1">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleSendComment} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={commentType}
                        onChange={(e) => setCommentType(e.target.value)}
                        className="rounded-xl border border-slate-200 p-2 text-xs font-semibold text-slate-700 bg-white"
                      >
                        {COMMENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Write a comment, research question, or feedback..."
                        className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        <Send size={13} /> Post
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 8. RESEARCH NOTES TAB */}
            {activeTab === "notes" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-[#102A63] text-sm">Project Notes ({documents.length})</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDocument(null);
                        setDocumentTitle("");
                        setDocumentContent("");
                      }}
                      className="rounded-lg bg-blue-50 p-1 text-blue-700 hover:bg-blue-100"
                      title="New Note"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setEditingDocument(doc);
                          setDocumentTitle(doc.title);
                          setDocumentContent(doc.content);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                          editingDocument?.id === doc.id
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-100 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <p className="font-bold text-slate-800 truncate">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Updated by {doc.updated_by_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-[#102A63] text-base mb-4">
                    {editingDocument ? "Edit Note" : "Create New Shared Research Note"}
                  </h3>
                  <form onSubmit={handleSaveDocument} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="e.g. Literature Review Summary, Experiment 1 Protocol"
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Content</label>
                      <textarea
                        rows={12}
                        value={documentContent}
                        onChange={(e) => setDocumentContent(e.target.value)}
                        placeholder="Write your research notes, meeting summaries, or hypothesis..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        disabled={savingDocument}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {savingDocument ? "Saving..." : "Save Research Note"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Create / Edit Milestone Modal */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingMilestone ? "Edit Milestone" : "Create Project Milestone"}
              </h3>
              <button onClick={() => setMilestoneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMilestone} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g. Literature Survey & Dataset Selection"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Scope of work and expectations for this milestone..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marks (1–20) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="20"
                    value={milestoneForm.marks}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, marks: e.target.value })}
                    placeholder="e.g. 6"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deadline Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={milestoneForm.deadline}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Milestone Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Milestone *</label>
                <select
                  value={taskForm.milestoneId}
                  onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                >
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Clean raw dataset and run preprocessing pipeline"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign to Member</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="">-- Unassigned --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deadline Date & Time *</label>
                <input
                  type="datetime-local"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Work Modal */}
      {submissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Submit Work for {submittingMilestone?.title}
              </h3>
              <button onClick={() => setSubmissionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitWork} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Attachment Link (URL)</label>
                <input
                  type="url"
                  value={submissionForm.workUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, workUrl: e.target.value })}
                  placeholder="https://github.com/... or https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Submission Notes / Summary *</label>
                <textarea
                  rows={4}
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
                  placeholder="Explain completed methodology, findings, and attachments..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSubmissionModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal (Faculty) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Review Milestone Submission</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReviewSubmission} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Decision *</label>
                <select
                  value={reviewForm.decision}
                  onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="REVISION_REQUIRED">REVISION REQUIRED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Feedback & Comments</label>
                <textarea
                  rows={4}
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                  placeholder="Provide structured feedback, required edits, or congratulations..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Marks / Evaluation Modal (Faculty) */}
      {evalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Academic Evaluation</h3>
              <button onClick={() => setEvalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEvaluation} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student *</label>
                <select
                  value={evalForm.studentId}
                  onChange={(e) => setEvalForm({ ...evalForm, studentId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Milestone (Optional)</label>
                <select
                  value={evalForm.milestoneId}
                  onChange={(e) => setEvalForm({ ...evalForm, milestoneId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  <option value="">-- Project Overall --</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Original Marks *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={evalForm.originalMarks}
                    onChange={(e) => setEvalForm({ ...evalForm, originalMarks: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deducted Penalties</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={evalForm.deductedMarks}
                    onChange={(e) => setEvalForm({ ...evalForm, deductedMarks: e.target.value })}
                    placeholder="e.g. 2"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Penalty Deduction</label>
                <input
                  type="text"
                  value={evalForm.deductionReason}
                  onChange={(e) => setEvalForm({ ...evalForm, deductionReason: e.target.value })}
                  placeholder="e.g. Late submission penalty: 2 marks deducted"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-slate-600">
                Calculated Final Marks:{" "}
                <strong className="text-emerald-700 text-sm">
                  {Math.max(0, Number(evalForm.originalMarks || 0) - Number(evalForm.deductedMarks || 0))}
                </strong>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEvalModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {resourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Research Resource</h3>
              <button onClick={() => setResourceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveResource} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Title *</label>
                <input
                  type="text"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="e.g. Kaggle Benchmark Dataset, IEEE Paper PDF Link"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Resource Type</label>
                  <select
                    value={resourceForm.resourceType}
                    onChange={(e) => setResourceForm({ ...resourceForm, resourceType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={resourceForm.visibility}
                    onChange={(e) => setResourceForm({ ...resourceForm, visibility: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="PROJECT">Project Only</option>
                    <option value="SHARED">Shared Library</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource URL *</label>
                <input
                  type="url"
                  value={resourceForm.resourceUrl}
                  onChange={(e) => setResourceForm({ ...resourceForm, resourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={resourceForm.notes}
                  onChange={(e) => setResourceForm({ ...resourceForm, notes: e.target.value })}
                  placeholder="Summary of contents or instructions..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResourceModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Extension Modal */}
      {extensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Request Deadline Extension for {extendingMilestone?.title}
              </h3>
              <button onClick={() => setExtensionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRequestExtension} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested New Deadline *</label>
                <input
                  type="datetime-local"
                  value={extensionForm.requestedDeadline}
                  onChange={(e) => setExtensionForm({ ...extensionForm, requestedDeadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Extension *</label>
                <textarea
                  rows={3}
                  value={extensionForm.reason}
                  onChange={(e) => setExtensionForm({ ...extensionForm, reason: e.target.value })}
                  placeholder="Explain why extra time is needed (e.g. data collection delays, hardware issues)..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Submit Extension Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
