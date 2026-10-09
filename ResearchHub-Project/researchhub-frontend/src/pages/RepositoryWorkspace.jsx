import React, { useState, useEffect, useCallback } from "react";
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
  Menu,
  X,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import ResearchPaperWorkspace from "./ResearchPaperWorkspace";

const RESOURCE_TYPES = ["LINK", "PDF", "DOC", "DOCX", "IMAGE", "DATASET", "SOURCE_CODE", "PAPER", "TEMPLATE", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const COMMENT_TYPES = ["DISCUSSION", "QUESTION", "FEEDBACK", "REVISION"];

export default function RepositoryWorkspace() {
  const { repositoryId } = useParams();
  const { token, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tab
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");
    return ["overview", "team", "faculty", "research-paper", "milestones", "tasks", "discussions", "resources", "evaluations", "submissions", "results", "history", "notes"].includes(requestedTab)
      ? requestedTab
      : "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPaperSectionId, setSelectedPaperSectionId] = useState(null);

  // Core workspace state
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  // Sub-entity states
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [paperSubmissions, setPaperSubmissions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [projectResults, setProjectResults] = useState(null);
  const [publishingResults, setPublishingResults] = useState(false);
  const [resultsError, setResultsError] = useState("");
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
  const [milestonePlanModalOpen, setMilestonePlanModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    instructions: "",
    orderNo: "",
    marks: "",
    deadline: "",
    meetingDate: "",
  });
  const [milestonePlan, setMilestonePlan] = useState([
    { title: "", description: "", instructions: "", marks: "", deadline: "", meetingDate: "" },
  ]);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ milestoneId: "", title: "", description: "", priority: "MEDIUM", deadline: "", assignedTo: "" });

  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({ workUrl: "", notes: "", files: [] });
  const [suggestionResponses, setSuggestionResponses] = useState({});

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    decision: "APPROVED",
    remarks: "",
    improvements: "",
    marksAwarded: "",
    marksVisibleToStudent: false,
    suggestionsText: "",
    suggestionReviews: {},
  });
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", resourceType: "LINK", resourceUrl: "", notes: "", visibility: "PROJECT" });

  const [commentInput, setCommentInput] = useState("");
  const [commentType, setCommentType] = useState("DISCUSSION");

  const isFaculty = user?.role === "faculty";
  const isOwner = workspace?.repository?.owner_id === user?.id;

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadWorkspaceData = useCallback(async () => {
    if (!token || !repositoryId) {
      setError(
        !token
          ? "Your sign-in session has expired. Sign in again to open this workspace."
          : "A repository ID is required to load this workspace."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      const [
        workspaceResponse,
        documentsResponse,
        milestonesResponse,
        tasksResponse,
        submissionsResponse,
        paperSubmissionsResponse,
        projectResultsResponse,
        resourcesResponse,
        commentsResponse,
      ] = await Promise.all([
        fetch(`/api/repositories/${repositoryId}`, { headers }),
        fetch(`/api/repositories/${repositoryId}/documents`, { headers }),
        fetch(`/api/milestones/repository/${repositoryId}`, { headers }),
        fetch(`/api/tasks/repository/${repositoryId}`, { headers }),
        fetch(`/api/submissions/repository/${repositoryId}`, { headers }),
        fetch(`/api/research-papers/project/${repositoryId}/submissions`, { headers }),
        fetch(`/api/repositories/${repositoryId}/results`, { headers }),
        fetch(`/api/resources/repository/${repositoryId}`, { headers }),
        fetch(`/api/collaboration/repository/${repositoryId}`, { headers }),
      ]);

      const responses = [
        [workspaceResponse, "Unable to load this repository."],
        [documentsResponse, "Unable to load repository documents."],
        [milestonesResponse, "Unable to load repository milestones."],
        [tasksResponse, "Unable to load repository tasks."],
        [submissionsResponse, "Unable to load repository submissions."],
        [paperSubmissionsResponse, "Unable to load research paper evaluations."],
        [projectResultsResponse, "Unable to load project results."],
        [resourcesResponse, "Unable to load repository resources."],
        [commentsResponse, "Unable to load repository discussions."],
      ];
      const results = await Promise.all(responses.map(([response]) => response.json()));
      const failedResponseIndex = responses.findIndex(([response]) => !response.ok);
      if (failedResponseIndex !== -1) {
        throw new Error(
          results[failedResponseIndex].message || responses[failedResponseIndex][1]
        );
      }

      const [
        workspaceResult,
        documentsResult,
        milestonesResult,
        tasksResult,
        submissionsResult,
        paperSubmissionsResult,
        projectResultsResult,
        resourcesResult,
        commentsResult,
      ] = results;

      const repositoryGuidanceRequests = workspaceResult.guidanceRequests || [];

      setWorkspace({ ...workspaceResult, guidanceRequests: repositoryGuidanceRequests });
      setDocuments(documentsResult.documents || []);
      setMilestones(milestonesResult.milestones || []);
      setTasks(tasksResult.tasks || []);
      setSubmissions(submissionsResult.submissions || []);
      setPaperSubmissions(paperSubmissionsResult.submissions || []);
      setProjectResults(projectResultsResult);
      setEvaluations((submissionsResult.submissions || []).flatMap((submission) =>
        (submission.reviews || []).map((review) => ({
          ...review,
          milestone_title: submission.milestone_title,
          submitted_by_name: submission.submitted_by_name,
          allocated_marks: submission.allocated_marks,
        }))
      ));
      setResources(resourcesResult.resources || []);
      setComments(commentsResult.comments || []);
      setMentorRequests(repositoryGuidanceRequests);
    } catch (err) {
      console.error("Unable to load workspace data:", err);
      setError(err.message || "Unable to load workspace data.");
    } finally {
      setLoading(false);
    }
  }, [repositoryId, token, user]);

  const publishProjectResults = async () => {
    setPublishingResults(true);
    setResultsError("");
    try {
      const response = await fetch(`/api/repositories/${repositoryId}/results/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to publish project results.");
      setProjectResults({
        published: true,
        results: result.results,
      });
    } catch (publishError) {
      setResultsError(publishError.message || "Unable to publish project results.");
    } finally {
      setPublishingResults(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");
    if (["overview", "team", "faculty", "research-paper", "milestones", "tasks", "discussions", "resources", "evaluations", "submissions", "results", "history", "notes"].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search]);

  useEffect(() => {
    const submissionId = new URLSearchParams(location.search).get("submission");
    if (!submissionId || activeTab !== "submissions" || submissions.length === 0) return;
    document.getElementById(`submission-${submissionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTab, location.search, submissions]);

  useEffect(() => {
    if (activeTab !== "evaluations" || !location.hash.startsWith("#paper-evaluation-") || paperSubmissions.length === 0) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTab, location.hash, paperSubmissions]);

  // -------------------------------------------------------------
  // Milestone Handlers
  // -------------------------------------------------------------
  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/tasks/milestone/${taskForm.milestoneId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          deadline: taskForm.deadline,
          assignedTo: taskForm.assignedTo || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to create task.");

      setTaskModalOpen(false);
      setTaskForm({
        milestoneId: "",
        title: "",
        description: "",
        priority: "MEDIUM",
        deadline: "",
        assignedTo: "",
      });
      setNotice(result.message || "Task created.");
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateTaskStatus = async (task, status) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to update task.");
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to delete task.");
      setNotice(result.message || "Task deleted.");
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    try {
      const url = editingMilestone
        ? `/api/milestones/${editingMilestone.id}`
        : `/api/milestones/repository/${repositoryId}/plan`;
      const method = editingMilestone ? "PATCH" : "POST";
      const body = editingMilestone ? milestoneForm : { milestones: milestonePlan };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save milestone plan.");

      setMilestoneModalOpen(false);
      setEditingMilestone(null);
      setMilestonePlan([
        { title: "", description: "", instructions: "", marks: "", deadline: "", meetingDate: "" },
      ]);
      setMilestoneForm({
        title: "",
        description: "",
        instructions: "",
        orderNo: String(milestones.length + 1),
        marks: "",
        deadline: "",
        meetingDate: "",
      });
      setNotice(data.message || "Milestone plan saved.");
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const updatePlanMilestone = (index, field, value) => {
    setMilestonePlan((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  };

  const handleSaveMilestonePlan = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/milestones/repository/${repositoryId}/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ milestones: milestonePlan }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to publish the milestone plan.");
      setMilestonePlanModalOpen(false);
      setMilestonePlan([
        { title: "", description: "", instructions: "", marks: "", deadline: "", meetingDate: "" },
      ]);
      setNotice(result.message || "Milestone plan published.");
      await loadWorkspaceData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to delete milestone.");
      setNotice(result.message);
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearMilestonePlan = async () => {
    if (!window.confirm(
      "Clear every milestone in this project so you can publish a new plan? This only works if there are no submissions; submission history is never deleted.",
    )) return;

    try {
      const response = await fetch(`/api/milestones/repository/${repositoryId}/plan`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to clear the milestone plan.");
      setNotice(result.message);
      await loadWorkspaceData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleOpenSubmission = async (milestone) => {
    if (Number(milestone.submission_open) !== 1) {
      alert("This milestone's submission deadline has passed. Submissions and revisions are no longer accepted.");
      return;
    }
    try {
      const response = await fetch(`/api/milestones/${milestone.id}/start`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to start milestone.");
      setSubmittingMilestone(milestone);
      setSubmissionForm({ workUrl: "", notes: "", files: [] });
      setSuggestionResponses(Object.fromEntries(
        (milestone.previous_suggestions || []).map((suggestion) => [
          suggestion.id,
          { response: "", status: "IN_PROGRESS" },
        ]),
      ));
      setSubmissionModalOpen(true);
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitWork = async (event) => {
    event.preventDefault();
    if (!submittingMilestone) return;
    try {
      const body = new FormData();
      body.append("workUrl", submissionForm.workUrl);
      body.append("notes", submissionForm.notes);
      body.append("suggestionResponses", JSON.stringify(
        Object.entries(suggestionResponses).map(([suggestionId, response]) => ({
          suggestionId: Number(suggestionId),
          response: response.response,
          status: response.status,
        })),
      ));
      submissionForm.files.forEach((file) => body.append("files", file));
      const response = await fetch(`/api/submissions/milestone/${submittingMilestone.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to submit milestone.");
      setNotice(result.message);
      setSubmissionModalOpen(false);
      setSubmittingMilestone(null);
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenReview = async (submission) => {
    try {
      const response = await fetch(`/api/submissions/${submission.id}/start-review`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to open submission.");
      setReviewingSubmission(submission);
      setReviewForm({
        decision: "APPROVED",
        remarks: "",
        improvements: "",
        marksAwarded: "",
        marksVisibleToStudent: false,
        suggestionsText: "",
        suggestionReviews: Object.fromEntries(
          (submission.suggestion_responses || []).map((item) => [item.suggestion_id, "IN_PROGRESS"]),
        ),
      });
      setReviewModalOpen(true);
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewSubmission = async (event) => {
    event.preventDefault();
    if (!reviewingSubmission) return;
    try {
      const response = await fetch(`/api/submissions/${reviewingSubmission.id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: reviewForm.decision,
          remarks: reviewForm.remarks,
          improvements: reviewForm.improvements,
          marksAwarded: Number(reviewForm.marksAwarded),
          marksVisibleToStudent: reviewForm.marksVisibleToStudent,
          suggestions: reviewForm.suggestionsText
            .split("\n")
            .map((suggestionText) => suggestionText.trim())
            .filter(Boolean)
            .map((suggestionText) => ({ suggestionText })),
          suggestionReviews: Object.entries(reviewForm.suggestionReviews).map(
            ([suggestionId, decision]) => ({ suggestionId: Number(suggestionId), decision }),
          ),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to save review.");
      setNotice(result.message);
      setReviewModalOpen(false);
      setReviewingSubmission(null);
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadSubmissionFile = async (file) => {
    try {
      const response = await fetch(file.download_url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Unable to download file.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = file.file_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const refreshWhenVisible = async () => {
      if (!repositoryId || !token || document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch(`/api/repositories/${repositoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to refresh repository status.");
        }

        setWorkspace((current) => ({
          ...result,
          guidanceRequests: result.guidanceRequests ?? current?.guidanceRequests ?? [],
        }));
      } catch (requestError) {
        console.error("Repository status refresh failed:", requestError);
        setError(requestError.message || "Unable to refresh repository status.");
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

  // -------------------------------------------------------------
  // Discussion / Comments Handlers
  // -------------------------------------------------------------
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      const res = await fetch(`/api/collaboration/repository/${repositoryId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: commentInput, type: commentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post comment.");
      setCommentInput("");
      await loadWorkspaceData();
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: documentTitle, content: documentContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save note.");
      setEditingDocument(null);
      setDocumentTitle("");
      setDocumentContent("");
      setNotice(data.message || "Research note saved.");
      await loadWorkspaceData();
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
      await loadWorkspaceData();
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

  const handleResendInvitation = async (invitationId) => {
    setResending(invitationId);
    try {
      const res = await fetch(
        `/api/repositories/${repositoryId}/invitations/${invitationId}/resend`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend invitation.");
      setNotice(data.message || "Invitation email sent.");
      await loadWorkspaceData();
    } catch (err) {
      alert(err.message);
    } finally {
      setResending(null);
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
  const latestSubmissionByMilestone = new Map();
  for (const submission of submissions) {
    const milestoneId = Number(submission.milestone_id);
    const current = latestSubmissionByMilestone.get(milestoneId);
    if (
      !current ||
      Number(submission.version_number) > Number(current.version_number) ||
      (Number(submission.version_number) === Number(current.version_number) && Number(submission.id) > Number(current.id))
    ) {
      latestSubmissionByMilestone.set(milestoneId, submission);
    }
  }
  const completedMilestones = milestones.filter((milestone) =>
    ["COMPLETED", "APPROVED"].includes(milestone.effective_status || milestone.status)
  ).length;
  const projectProgress = milestones.length
    ? Math.round((completedMilestones / milestones.length) * 100)
    : 0;
  const nextMilestone = milestones.find(
    (milestone) => !["COMPLETED", "APPROVED"].includes(milestone.effective_status || milestone.status),
  );
  const projectActivity = [
    ...milestones.map((milestone) => ({
      id: `milestone-${milestone.id}`,
      title: `Milestone added: ${milestone.title}`,
      createdAt: milestone.created_at,
      actor: milestone.created_by_name,
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      title: `Task added: ${task.title}`,
      createdAt: task.created_at,
      actor: task.created_by_name,
    })),
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      title: "Research discussion updated",
      createdAt: comment.created_at,
      actor: comment.author_name,
    })),
    ...mentorRequests.map((request) => ({
      id: `guidance-${request.id}`,
      title: `Faculty guidance request ${request.status.toLowerCase()}: ${request.faculty_name}`,
      createdAt: request.responded_at || request.created_at,
    })),
  ]
    .filter((activity) => activity.createdAt)
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
    .slice(0, 5);

  const backLink = isFaculty ? "/dashboard/faculty" : "/dashboard/student";
  const workspaceTabs = [
    { id: "overview", label: "Overview", icon: FolderGit2 },
    { id: "team", label: `Team (${members.length})`, icon: Users },
    { id: "faculty", label: "Faculty", icon: Handshake },
    { id: "research-paper", label: "Research Paper", icon: FileText },
    { id: "milestones", label: `Milestones (${milestones.length})`, icon: CalendarDays },
    { id: "tasks", label: `Tasks (${tasks.length})`, icon: Check },
    { id: "resources", label: `Resources (${resources.length})`, icon: FolderGit2 },
    { id: "discussions", label: `Discussions (${comments.length})`, icon: MessageSquare },
    { id: "submissions", label: `Submissions (${submissions.length})`, icon: FileText },
    { id: "evaluations", label: `Marks & Evaluation (${evaluations.length})`, icon: Award },
    { id: "results", label: "Results", icon: Award },
    { id: "history", label: "History", icon: Clock },
    { id: "notes", label: `Notes (${documents.length})`, icon: Edit3 },
  ];

  return (
    <div className="min-h-screen bg-[#F5F8FC] pb-16 text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close workspace navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-gradient-to-b from-[#071A46] via-[#0B2B72] to-[#123C83] text-white shadow-xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Link to={backLink} className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <BookOpen size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Research<span className="text-blue-300">Hub</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Close workspace navigation"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-5 text-blue-200 lg:hidden"
        >
          <X size={20} />
        </button>
        <nav className="student-sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Workspace navigation">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/70">
            Workspace
          </p>
          <Link
            to={backLink}
            onClick={() => setSidebarOpen(false)}
            className="mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-100/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            Dashboard
          </Link>
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/70">
            Project
          </p>
          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                  navigate(
                    { pathname: location.pathname, search: `?tab=${tab.id}`, hash: "" },
                    { replace: true },
                  );
                }}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-blue-100/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={17} />
                <span className="flex-1 text-left">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-bold">{user?.name || "ResearchHub member"}</p>
          <p className="mt-0.5 text-xs capitalize text-blue-200/70">{user?.role}</p>
        </div>
      </aside>

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md lg:ml-60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open workspace navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 lg:hidden"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>
            <div className="flex items-center gap-2 font-bold text-[#102A63]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
                <FolderGit2 size={18} />
              </span>
              <span className="max-w-[180px] truncate sm:max-w-md">{repo?.name || "Workspace"}</span>
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

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:ml-60 lg:px-10">
        {notice && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-emerald-600 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {error && workspace && (
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
        ) : workspace ? (
          <>
            {/* Project Header Banner */}
            <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#071A46] via-[#0B2B72] to-[#1D4ED8] p-6 text-white lg:p-8">
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
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-50">{repo?.description}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-blue-50/90">
                    <span>
                      Owner: {members.find((member) => member.member_role === "owner")?.name || "Research team"}
                    </span>
                    {repo?.created_at && (
                      <span>Created {new Date(repo.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
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
            </div>

            </div>

            {/* TAB CONTENT */}

            {/* 1. OVERVIEW & MEMBERS TAB */}
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  {/* Milestone summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-bold text-[#102A63] text-base mb-2">Milestone Summary</h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Marks allocated: {totalMilestoneMarks} / 100</span>
                      <span>{completedMilestones} of {milestones.length} approved</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("milestones")}
                      className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      View all milestones
                    </button>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <BookOpen size={20} />
                        </span>
                        <div>
                          <h3 className="font-bold text-[#102A63]">Research Paper</h3>
                          {repo?.research_paper_id && (
                            <p className="mt-1 text-sm font-semibold text-blue-800">
                              {repo.research_paper_template || "Selected research paper format"}
                            </p>
                          )}
                          <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                            {repo?.research_paper_id
                              ? `${repo.paper_completed_section_count || 0} of ${repo.paper_required_section_count || 0} required sections complete. This paper format is fixed for the project.`
                              : acceptedMentorReq
                                ? "Select an academic paper format, then write and save your research in its structured sections."
                                : "Choose a faculty collaborator first. Then select a research paper format and start writing."}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab(repo?.research_paper_id || acceptedMentorReq ? "research-paper" : "faculty")}
                          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                        >
                          {repo?.research_paper_id
                            ? "Open research paper"
                            : acceptedMentorReq
                              ? "Choose paper template"
                              : "Choose faculty"}
                        </button>
                        {repo?.research_paper_id && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("milestones")}
                            className="rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            View milestones
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

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
                  </div>
                </div>
              </section>

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

            {activeTab === "team" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#102A63]">Research team</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Accepted members only. Pending invitations are not included in the team count.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                          {member.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                          <p className="truncate text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          member.member_role === "owner"
                            ? "border border-purple-200 bg-purple-50 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {member.member_role}
                        </span>
                        {isOwner && member.member_role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Remove member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "faculty" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                      <Handshake size={15} /> Project-specific guidance
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-[#102A63]">Faculty collaboration</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Guidance requests and assignment status for this project.
                    </p>
                  </div>
                  {isOwner && !acceptedMentorReq && !pendingMentorReq && (
                    <button
                      type="button"
                      onClick={() => navigate("/find-mentor", { state: { repositoryId: workspace.repository.id } })}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B285F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#123C83]"
                    >
                      <Handshake size={16} /> Find faculty
                    </button>
                  )}
                </div>

                {acceptedMentorReq ? (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Faculty Guidance Active</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{acceptedMentorReq.faculty_name}</p>
                    {acceptedMentorReq.designation && (
                      <p className="mt-0.5 text-sm text-slate-600">{acceptedMentorReq.designation}</p>
                    )}
                  </div>
                ) : pendingMentorReq ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Status: Pending</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Request sent to <span className="font-semibold">{pendingMentorReq.faculty_name}</span>.
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No active faculty mentor is assigned. The project owner can send a guidance request.
                  </p>
                )}

                {mentorRequests.filter((request) => request.status === "REJECTED").map((request) => (
                  <div key={request.id} className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">Previous request: Rejected</p>
                    <p className="mt-1 text-sm text-slate-700">{request.faculty_name}</p>
                    {request.rejection_reason && (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-red-700">
                        Reason: {request.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}

            {activeTab === "history" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#102A63]">Project history</h2>
                <p className="mt-1 text-sm text-slate-500">Recent recorded activity in this workspace.</p>
                {projectActivity.length > 0 ? (
                  <ol className="mt-5 space-y-4">
                    {projectActivity.map((activity) => (
                      <li key={activity.id} className="flex gap-3">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {activity.actor ? `${activity.actor} · ` : ""}
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No project activity has been recorded yet.
                  </p>
                )}
              </section>
            )}

            {/* 2. MILESTONES TAB */}
            {activeTab === "milestones" && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2B72] via-[#12449A] to-[#1760C5] px-5 py-5 text-white shadow-sm sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Project schedule</p>
                      <h2 className="mt-1 text-xl font-bold">Milestones &amp; Schedule</h2>
                      <p className="mt-1 text-xs text-blue-100">
                        The complete project plan shared by faculty and students.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-right">
                        <p className="text-[10px] font-medium text-blue-100">Total marks allocated</p>
                        <p className="text-lg font-bold">{totalMilestoneMarks} <span className="text-xs font-medium text-blue-100">/ 100</span></p>
                      </div>
                      {isFaculty && (
                        <div className="flex flex-wrap gap-2">
                          {milestones.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearMilestonePlan}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                            >
                              <Trash2 size={14} /> Clear plan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMilestonePlan([
                                { title: "", description: "", instructions: "", marks: "", deadline: "", meetingDate: "" },
                              ]);
                              setMilestonePlanModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
                          >
                            <Plus size={15} /> Add milestone
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
                      <div>
                        <h3 className="text-sm font-bold text-[#102A63]">Milestone plan</h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">All milestones are listed in order.</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                        {milestones.length} milestones
                      </span>
                    </div>

                    {milestones.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <CalendarDays size={34} className="mx-auto text-slate-300" />
                        <h3 className="mt-3 text-sm font-bold text-slate-700">No milestones in this plan yet</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {isFaculty ? "Add the complete milestone plan for everyone to see." : "Your faculty mentor will publish the project plan here."}
                        </p>
                      </div>
                    ) : (
                      <ol className="divide-y divide-slate-100">
                        {milestones.map((m) => {
                          const status = m.effective_status || m.status;
                          const latestSubmission = latestSubmissionByMilestone.get(Number(m.id));
                          const canReviewSubmission = latestSubmission
                            && ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(latestSubmission.status);
                          const approved = ["COMPLETED", "APPROVED"].includes(status);
                          const statusClass = approved
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "OVERDUE"
                              ? "bg-rose-50 text-rose-700"
                              : status === "REVISION_REQUIRED"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700";
                          return (
                            <li key={m.id} className="relative px-4 py-4 transition hover:bg-slate-50/70 sm:px-5">
                              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                <div className="flex min-w-0 items-start gap-3">
                                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    approved ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {approved ? <Check size={14} /> : m.order_no}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="truncate text-sm font-bold text-slate-900">{m.title}</h4>
                                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusClass}`}>
                                        {String(status).replaceAll("_", " ")}
                                      </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {m.description || m.instructions || "Milestone details are available below."}
                                    </p>
                                    {m.paper_sections?.length > 0 && (
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] text-slate-500">Paper sections:</span>
                                        {m.paper_sections.map((section) => (
                                          <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedPaperSectionId(section.id);
                                              setActiveTab("research-paper");
                                            }}
                                            className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
                                          >
                                            {section.title}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                      <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Meeting: {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : "Not set"}</span>
                                      <span className="inline-flex items-center gap-1"><Clock size={11} /> Due: {new Date(m.deadline).toLocaleDateString()}</span>
                                      <span className="inline-flex items-center gap-1"><Award size={11} /> {m.marks} marks</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pl-10 md:justify-end md:pl-0">
                                  {!isFaculty && ["NOT_STARTED", "IN_PROGRESS", "OVERDUE", "REVISION_REQUIRED"].includes(status) && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSubmission(m)}
                                      disabled={Number(m.submission_open) !== 1}
                                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
                                    >
                                      {Number(m.submission_open) !== 1
                                        ? "Deadline passed"
                                        : status === "REVISION_REQUIRED"
                                          ? "Submit revision"
                                          : status === "NOT_STARTED"
                                            ? "Open milestone"
                                            : "Continue"}
                                    </button>
                                  )}
                                  {isFaculty && (
                                    <div className="flex items-center gap-1">
                                      {canReviewSubmission && (
                                        <button
                                          type="button"
                                          onClick={() => navigate(
                                            `/repository/${repositoryId}?tab=submissions&submission=${latestSubmission.id}`,
                                          )}
                                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700"
                                        >
                                          Review milestone
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        aria-label={`Edit ${m.title}`}
                                        onClick={() => {
                                          setEditingMilestone(m);
                                          setMilestoneForm({
                                            title: m.title,
                                            description: m.description || "",
                                            instructions: m.instructions || "",
                                            orderNo: String(m.order_no),
                                            marks: String(m.marks ?? ""),
                                            deadline: String(m.deadline).slice(0, 16),
                                            meetingDate: m.meeting_date ? String(m.meeting_date).slice(0, 10) : "",
                                          });
                                          setMilestoneModalOpen(true);
                                        }}
                                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Delete ${m.title}`}
                                        onClick={() => handleDeleteMilestone(m.id)}
                                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                  <details className="group relative">
                                    <summary className="cursor-pointer list-none rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                                      Details
                                    </summary>
                                    <div className="absolute right-0 z-20 mt-2 w-[min(22rem,80vw)] rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xl">
                                      {m.description && <p className="leading-5 text-slate-700">{m.description}</p>}
                                      {m.instructions && (
                                        <div className="mt-3 rounded-lg bg-blue-50 p-3">
                                          <p className="text-[10px] font-bold uppercase text-blue-700">Student instructions</p>
                                          <p className="mt-1 whitespace-pre-line leading-5 text-slate-700">{m.instructions}</p>
                                        </div>
                                      )}
                                      {m.previous_suggestions?.length > 0 && (
                                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                          <p className="font-bold text-amber-900">Previous suggestions to address</p>
                                          <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-950">
                                            {m.previous_suggestions.map((suggestion) => (
                                              <li key={suggestion.id}>
                                                <span className="font-medium">M{suggestion.source_milestone_number}:</span> {suggestion.suggestion_text}
                                                <span className="ml-1 text-amber-700">({suggestion.status.replaceAll("_", " ").toLowerCase()})</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>

                  <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-sm font-bold text-[#102A63]">Project progress</h3>
                      <div className="mt-4 flex items-center gap-3">
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                          style={{ background: `conic-gradient(#2563eb ${projectProgress * 3.6}deg, #e8eef7 0deg)` }}
                        >
                          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-sm font-bold text-blue-700">
                            {projectProgress}%
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {completedMilestones} of {milestones.length} milestones approved
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">{totalMilestoneMarks} marks allocated</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-sm font-bold text-[#102A63]">Next milestone</h3>
                      {nextMilestone ? (
                        <>
                          <p className="mt-3 text-xs font-bold text-slate-900">{nextMilestone.title}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Milestone {nextMilestone.order_no}</p>
                          <div className="mt-3 space-y-2 text-[10px] text-slate-600">
                            <p className="flex items-center gap-2"><CalendarDays size={12} className="text-blue-600" /> Meeting: {nextMilestone.meeting_date ? new Date(nextMilestone.meeting_date).toLocaleDateString() : "Not set"}</p>
                            <p className="flex items-center gap-2"><Clock size={12} className="text-blue-600" /> Deadline: {new Date(nextMilestone.deadline).toLocaleDateString()}</p>
                            <p className="flex items-center gap-2"><Award size={12} className="text-amber-500" /> Marks: {nextMilestone.marks}</p>
                          </div>
                          {!isFaculty && ["NOT_STARTED", "IN_PROGRESS", "OVERDUE", "REVISION_REQUIRED"].includes(nextMilestone.effective_status || nextMilestone.status) && (
                            <button
                              type="button"
                              onClick={() => handleOpenSubmission(nextMilestone)}
                              disabled={Number(nextMilestone.submission_open) !== 1}
                              className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            >
                              {Number(nextMilestone.submission_open) === 1 ? "Open milestone" : "Deadline passed"}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          {milestones.length ? "All milestones are approved." : "No milestone is scheduled yet."}
                        </p>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#102A63]">Recent activity</h3>
                        <span className="text-[10px] text-slate-400">Latest</span>
                      </div>
                      {projectActivity.length ? (
                        <ol className="mt-3 space-y-3">
                          {projectActivity.slice(0, 4).map((activity) => (
                            <li key={activity.id} className="flex gap-2.5">
                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                <Check size={11} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold leading-4 text-slate-800">{activity.title}</p>
                                <p className="mt-0.5 text-[9px] text-slate-400">
                                  {activity.actor ? `${activity.actor} · ` : ""}
                                  {new Date(activity.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">No recent project activity.</p>
                      )}
                    </section>
                  </aside>
                </div>
              </div>
            )}

            {activeTab === "research-paper" && (
              <ResearchPaperWorkspace
                repositoryId={repositoryId}
                token={token}
                isFaculty={isFaculty}
                selectedSectionId={selectedPaperSectionId}
                onPaperSubmissionsChange={setPaperSubmissions}
                onChooseFaculty={() => setActiveTab("faculty")}
              />
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
                          {isFaculty ? (
                            <span className="font-semibold text-slate-600">
                              {task.status.replace("_", " ")}
                            </span>
                          ) : (
                            <select
                              value={task.status}
                              disabled={task.assigned_to && Number(task.assigned_to) !== Number(user?.id)}
                              onChange={(e) => handleUpdateTaskStatus(task, e.target.value)}
                              className="rounded-lg border border-slate-200 p-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          )}

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
                        id={`submission-${sub.id}`}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                              Version {sub.version_number}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Milestone {sub.milestone_number}: {sub.milestone_title}
                            </span>
                            <span className="text-xs text-slate-400">
                              · Submitted by {sub.submitted_by_name} on {new Date(sub.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {sub.project_name} · Group: {sub.group_members || sub.submitted_by_name}
                          </p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            sub.is_late ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {sub.is_late ? "LATE" : "ON TIME"} · {sub.status.replaceAll("_", " ")}
                          </span>

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
                          {sub.paper_sections?.length > 0 && (
                            <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">Relevant research paper sections</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {sub.paper_sections.map((section) => (
                                  <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaperSectionId(section.id);
                                      setActiveTab("research-paper");
                                    }}
                                    className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
                                  >
                                    {section.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {sub.files?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sub.files.map((file) => (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => handleDownloadSubmissionFile(file)}
                                  className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  <FileText size={13} className="mr-1 inline" />
                                  {file.file_name}
                                </button>
                              ))}
                            </div>
                          )}

                          {sub.suggestion_responses?.length > 0 && (
                            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                              <h4 className="text-xs font-bold text-amber-900">Previous feedback responses</h4>
                              <div className="mt-2 space-y-2">
                                {sub.suggestion_responses.map((response) => (
                                  <div key={response.suggestion_id} className="rounded-lg bg-white p-2.5 text-xs">
                                    <p className="font-semibold text-slate-700">
                                      M{response.source_milestone_number}: {response.suggestion_text}
                                    </p>
                                    <p className="mt-1 text-slate-600">Response: {response.response}</p>
                                    <p className="mt-1 font-semibold text-blue-700">
                                      Student marked {response.status.replace("_", " ").toLowerCase()} · Faculty: {response.faculty_status.replace("_", " ").toLowerCase()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(sub.reviews || []).map((review) => (
                            <div key={review.id} className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                              <p className="font-bold text-slate-800">Faculty feedback · {review.decision.replace("_", " ")}</p>
                              {review.remarks && <p className="mt-1 whitespace-pre-line">{review.remarks}</p>}
                              {review.improvements && <p className="mt-1 whitespace-pre-line"><strong>Improvements:</strong> {review.improvements}</p>}
                              {review.suggestions?.length > 0 && (
                                <ul className="mt-2 list-disc space-y-1 pl-4">
                                  {review.suggestions.map((suggestion) => (
                                    <li key={suggestion.id}>
                                      {suggestion.suggestion_text}
                                      {suggestion.improvement_text && <span> — {suggestion.improvement_text}</span>}
                                      <span className="text-slate-500"> ({suggestion.status.replace("_", " ").toLowerCase()})</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <p className="mt-2 font-semibold text-slate-700">
                                {Object.hasOwn(review, "marks_awarded")
                                  ? `Awarded marks: ${review.marks_awarded} / ${sub.allocated_marks}`
                                  : isFaculty
                                    ? `Marks pending: ${sub.allocated_marks} allocated`
                                    : "Marks awarded: Not released"}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Review Action for Faculty */}
                        {isFaculty && ["SUBMITTED", "UNDER_REVIEW"].includes(sub.status) && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(sub)}
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

            {activeTab === "results" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-[#102A63]">Project results</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Milestone marks for {workspace?.repository?.name || "this project"}.
                    </p>
                  </div>
                  {isFaculty && !projectResults?.published && (
                    <button
                      type="button"
                      disabled={!projectResults?.ready || publishingResults}
                      onClick={publishProjectResults}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {publishingResults ? <LoaderCircle size={16} className="animate-spin" /> : <Award size={16} />}
                      Publish result
                    </button>
                  )}
                </div>

                {resultsError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{resultsError}</p>
                )}

                {!isFaculty && !projectResults?.published ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                    <Clock size={30} className="mx-auto text-amber-600" />
                    <h3 className="mt-3 font-bold text-amber-900">Result will be published soon</h3>
                    <p className="mt-1 text-sm text-amber-800">Your faculty will publish the final results after all milestones are evaluated.</p>
                  </div>
                ) : (
                  <>
                    {isFaculty && !projectResults?.published && !projectResults?.ready && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Results can be published after every milestone is approved and has marks.
                      </p>
                    )}
                    {projectResults?.results?.length ? (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full min-w-[620px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-5 py-3">Group / students</th>
                              <th className="px-5 py-3">Milestone</th>
                              <th className="px-5 py-3 text-right">Marks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projectResults.results.map((result) => (
                              <tr key={result.milestoneId}>
                                <td className="px-5 py-4">
                                  <p className="font-semibold text-slate-800">{result.groupName || projectResults.groupName || workspace?.repository?.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">{result.memberNames || projectResults.memberNames || "Student members"}</p>
                                </td>
                                <td className="px-5 py-4 text-slate-700">
                                  M{result.milestoneNumber}: {result.milestoneTitle}
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-slate-800">
                                  {result.awardedMarks ?? "—"} / {result.maximumMarks}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-slate-900">
                              <td className="px-5 py-4" colSpan={2}>Total</td>
                              <td className="px-5 py-4 text-right">
                                {projectResults.results.reduce((total, result) => total + Number(result.awardedMarks || 0), 0)} / {projectResults.results.reduce((total, result) => total + Number(result.maximumMarks || 0), 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No milestone results are available yet.</p>
                    )}
                    {projectResults?.published && (
                      <p className="text-xs text-emerald-700">Final results have been published to the student dashboard.</p>
                    )}
                  </>
                )}
              </section>
            )}

            {/* 5. MARKS & EVALUATIONS TAB */}
            {activeTab === "evaluations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#102A63]">Marks & Evaluation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marks are recorded with a faculty review. Students only see marks after they are released.
                  </p>
                </div>
                {submissions.every((submission) => !(submission.reviews || []).length) &&
                  paperSubmissions.every((submission) => !(submission.reviews || []).length) && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                      <Award size={38} className="mx-auto text-slate-300" />
                      <h3 className="mt-3 text-base font-bold text-slate-700">No evaluations recorded yet</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Faculty feedback and marks for milestone and paper submissions will appear here.
                      </p>
                    </div>
                  )}
                {submissions.flatMap((submission) =>
                  (submission.reviews || []).map((review) => (
                    <article key={`milestone-${review.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{submission.milestone_title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Milestone {submission.milestone_number} · {submission.submitted_by_name} · reviewed {new Date(review.reviewed_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {review.decision.replace("_", " ")}
                        </span>
                      </div>
                      {review.remarks && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{review.remarks}</p>}
                      {review.improvements && <p className="mt-2 whitespace-pre-line text-sm text-slate-700"><strong>Improvements:</strong> {review.improvements}</p>}
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Awarded marks: {Object.hasOwn(review, "marks_awarded")
                          ? `${review.marks_awarded} / ${submission.allocated_marks}`
                          : isFaculty
                            ? "Not recorded"
                            : "Not released"}
                      </p>
                      {review.suggestions?.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {review.suggestions.map((suggestion) => (
                            <li key={suggestion.id}>{suggestion.suggestion_text}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  )),
                )}
                {paperSubmissions.map((submission) => {
                  const review = submission.reviews?.[0];
                  return (
                    <article
                      key={`paper-${submission.id}`}
                      id={`paper-evaluation-${submission.id}`}
                      className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            Research paper · Version {submission.version_number}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {submission.submitted_by_name} · submitted {new Date(submission.submitted_at).toLocaleString()}
                            {review && ` · reviewed ${new Date(review.reviewed_at).toLocaleString()}`}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          submission.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : submission.status === "REVISION_REQUIRED"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-blue-50 text-blue-700"
                        }`}>
                          {submission.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      {submission.student_notes && (
                        <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{submission.student_notes}</p>
                      )}
                      {review ? (
                        <>
                          {review.remarks && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{review.remarks}</p>}
                          {review.improvements && <p className="mt-2 whitespace-pre-line text-sm text-slate-700"><strong>Improvements:</strong> {review.improvements}</p>}
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            Awarded marks: {Object.hasOwn(review, "marks_awarded") ? `${review.marks_awarded} / 100` : "Not released"}
                          </p>
                          {review.suggestions?.length > 0 && (
                            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                              <h4 className="text-xs font-bold text-amber-900">
                                {submission.status === "REVISION_REQUIRED" ? "Carry-forward suggestions" : "Faculty suggestions"}
                              </h4>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {review.suggestions.map((suggestion) => (
                                  <li key={suggestion.id}>
                                    {suggestion.suggestion_text}
                                    {!isFaculty && ` · ${suggestion.status.replaceAll("_", " ").toLowerCase()}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">This paper version is waiting for faculty evaluation.</p>
                      )}
                      {isFaculty && !review && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("research-paper")}
                          className="mt-4 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          Open paper to review
                        </button>
                      )}
                    </article>
                  );
                })}
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
                        <p className="truncate font-semibold text-slate-800">
                          {doc.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-slate-500">
                          {doc.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-[#102A63] text-sm">
                    {editingDocument ? "Edit note" : "New note"}
                  </h3>
                  <form onSubmit={handleSaveDocument} className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Title
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(event) => setDocumentTitle(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Content
                      <textarea
                        rows={12}
                        value={documentContent}
                        onChange={(event) => setDocumentContent(event.target.value)}
                        className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={savingDocument}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingDocument ? "Saving..." : "Save note"}
                    </button>
                  </form>
                </section>

                {(workspace?.invitations || []).length > 0 && (
                  <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
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
                      {(workspace?.invitations || []).map((invitation) => (
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
                                  handleGenerateLink(invitation.id)
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
                                onClick={() => handleResendInvitation(invitation.id)}
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
                                  handleCopyLink(
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
                  </aside>
                )}
              </div>
            )}
          </>
        ) : (
          <section className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <AlertCircle size={32} className="mx-auto text-red-500" />
            <h1 className="mt-3 text-lg font-bold text-slate-900">
              Unable to open this workspace
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {error || "Workspace data could not be loaded."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={loadWorkspaceData}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <RefreshCw size={15} />
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign in again
              </button>
            </div>
          </section>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Create / Edit Milestone Modal */}
      {milestoneModalOpen && editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Project milestones</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {editingMilestone ? "Edit milestone" : "Create a milestone"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Set the deliverable, schedule, and marks for students.</p>
              </div>
              <button
                type="button"
                aria-label="Close milestone form"
                onClick={() => setMilestoneModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSaveMilestone} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Milestone title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  maxLength={180}
                  placeholder="e.g. Literature review"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Description</label>
                <textarea
                  rows={2}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  maxLength={10000}
                  placeholder="Briefly describe the work expected."
                  className="w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Instructions for students</label>
                <textarea
                  rows={2}
                  value={milestoneForm.instructions}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, instructions: e.target.value })}
                  maxLength={10000}
                  placeholder="Add requirements, formatting guidance, or submission expectations."
                  className="w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h4 className="text-sm font-semibold text-slate-900">Schedule and grading</h4>
                <p className="mt-1 text-xs text-slate-500">Set when the work is due and how it contributes to the project.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Milestone number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={milestoneForm.orderNo}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, orderNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Allocated marks <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={milestoneForm.marks}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, marks: e.target.value })}
                    placeholder="e.g. 20"
                    aria-describedby="milestone-marks-help"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                  <p id="milestone-marks-help" className="mt-1.5 text-xs text-slate-500">
                    {Math.max(0, 100 - totalMilestoneMarks + Number(editingMilestone?.marks || 0))} marks remaining in this project.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Deadline <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={milestoneForm.deadline}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Meeting date</label>
                  <input
                    type="date"
                    value={milestoneForm.meetingDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, meetingDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                </div>
              </section>
              {!editingMilestone && (
                <details className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Add a first task <span className="font-normal text-slate-500">(optional)</span>
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        You can also add tasks separately after creating the milestone.
                      </span>
                    </span>
                    <Plus size={18} className="shrink-0 text-slate-500 transition group-open:rotate-45" />
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Task title</label>
                      <input
                        type="text"
                        value={milestoneTaskForm.title}
                        onChange={(event) =>
                          setMilestoneTaskForm({ ...milestoneTaskForm, title: event.target.value })
                        }
                        maxLength={180}
                        placeholder="e.g. Review five recent research papers"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Task description</label>
                      <textarea
                        rows={2}
                        value={milestoneTaskForm.description}
                        onChange={(event) =>
                          setMilestoneTaskForm({ ...milestoneTaskForm, description: event.target.value })
                        }
                        maxLength={10000}
                        placeholder="Describe the expected task deliverable."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Task deadline</label>
                        <input
                          type="datetime-local"
                          value={milestoneTaskForm.deadline}
                          onChange={(event) =>
                            setMilestoneTaskForm({ ...milestoneTaskForm, deadline: event.target.value })
                          }
                          max={milestoneForm.deadline || undefined}
                          required={Boolean(milestoneTaskForm.title.trim())}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                        <select
                          value={milestoneTaskForm.priority}
                          onChange={(event) =>
                            setMilestoneTaskForm({ ...milestoneTaskForm, priority: event.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          {PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to student</label>
                      <select
                        value={milestoneTaskForm.assignedTo}
                        onChange={(event) =>
                          setMilestoneTaskForm({ ...milestoneTaskForm, assignedTo: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </details>
              )}
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  {editingMilestone ? "Save changes" : "Create milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create the project milestone plan in one submission */}
      {milestonePlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Project schedule</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Create the milestone plan</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Add the full sequence now. The complete ordered plan will be published to faculty and students together.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close milestone plan"
                onClick={() => setMilestonePlanModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveMilestonePlan} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-4 overflow-y-auto bg-slate-50/70 px-5 py-5 sm:px-8">
                {milestonePlan.map((milestone, index) => (
                  <section key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                          {milestones.length + index + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Milestone {milestones.length + index + 1}</h4>
                          <p className="text-xs text-slate-500">Define the work, due date, and marks.</p>
                        </div>
                      </div>
                      {milestonePlan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMilestonePlan((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          aria-label={`Remove milestone ${index + 1}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Title <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(event) => updatePlanMilestone(index, "title", event.target.value)}
                          maxLength={180}
                          placeholder="e.g. Literature review"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Marks <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={milestone.marks}
                          onChange={(event) => updatePlanMilestone(index, "marks", event.target.value)}
                          placeholder="e.g. 20"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Deadline <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={milestone.deadline}
                          onChange={(event) => updatePlanMilestone(index, "deadline", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Meeting date <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={milestone.meetingDate}
                          onChange={(event) => updatePlanMilestone(index, "meetingDate", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div className="flex items-end text-xs text-slate-500">
                        Meeting date is included in the shared project schedule.
                      </div>
                      <div className="grid gap-4 border-t border-slate-100 pt-4 sm:col-span-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Description <span className="text-red-600">*</span>
                          </label>
                          <textarea
                            rows={2}
                            maxLength={10000}
                            value={milestone.description}
                            onChange={(event) => updatePlanMilestone(index, "description", event.target.value)}
                            placeholder="Describe the milestone deliverable."
                            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Student instructions <span className="text-red-600">*</span>
                          </label>
                          <textarea
                            rows={2}
                            maxLength={10000}
                            value={milestone.instructions}
                            onChange={(event) => updatePlanMilestone(index, "instructions", event.target.value)}
                            placeholder="Explain what students need to do and submit."
                            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                ))}

                <button
                  type="button"
                  onClick={() => setMilestonePlan((current) => [
                    ...current,
                    { title: "", description: "", instructions: "", marks: "", deadline: "", meetingDate: "" },
                  ])}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Plus size={16} /> Add another milestone
                </button>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className={`text-sm font-medium ${
                  totalMilestoneMarks + milestonePlan.reduce((sum, milestone) => sum + (Number(milestone.marks) || 0), 0) > 100
                    ? "text-red-600"
                    : "text-slate-600"
                }`}>
                  Plan allocation: {milestonePlan.reduce((sum, milestone) => sum + (Number(milestone.marks) || 0), 0)} marks
                  {" · "}Project total: {totalMilestoneMarks + milestonePlan.reduce((sum, milestone) => sum + (Number(milestone.marks) || 0), 0)} / 100
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setMilestonePlanModalOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={totalMilestoneMarks + milestonePlan.reduce((sum, milestone) => sum + (Number(milestone.marks) || 0), 0) > 100}
                    className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Publish full plan
                  </button>
                </div>
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Milestone {submittingMilestone?.order_no}: {submittingMilestone?.title}
              </h3>
              <button onClick={() => setSubmissionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitWork} className="mt-4 space-y-3.5 text-xs">
              <p className="rounded-xl bg-blue-50 p-3 text-slate-700">
                Deadline: {submittingMilestone && new Date(submittingMilestone.deadline).toLocaleString()}
              </p>
              {submittingMilestone?.instructions && (
                <p className="whitespace-pre-line rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-slate-700">
                  {submittingMilestone.instructions}
                </p>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Upload PDF, materials, or questionnaire</label>
                <input
                  type="file"
                  multiple
                  accept=".csv,.doc,.docx,.jpg,.jpeg,.pdf,.png,.ppt,.pptx,.txt,.xls,.xlsx,.zip"
                  onChange={(event) => setSubmissionForm({
                    ...submissionForm,
                    files: Array.from(event.target.files || []),
                  })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
                <p className="mt-1 text-[11px] text-slate-500">Attach PDFs, questionnaires, or other supporting files. Up to 10 files, 15 MB each.</p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Work link (optional)</label>
                <input
                  type="url"
                  value={submissionForm.workUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, workUrl: e.target.value })}
                  placeholder="https://github.com/... or https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student notes / questionnaire responses</label>
                <textarea
                  rows={4}
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
                  placeholder="Summarize your work or enter questionnaire responses..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              {submittingMilestone?.paper_sections?.length > 0 && (
                <section className="rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                  <h4 className="text-sm font-bold text-violet-950">Research paper sections included</h4>
                  <p className="mt-1 text-xs text-violet-800">This milestone checks the linked sections of the project paper.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {submittingMilestone.paper_sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaperSectionId(section.id);
                          setSubmissionModalOpen(false);
                          setActiveTab("research-paper");
                        }}
                        className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                      >
                        <BookOpen size={13} className="mr-1.5 inline" /> {section.title}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {submittingMilestone?.previous_suggestions?.length > 0 && (
                <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div>
                    <h4 className="font-bold text-amber-950">Previous feedback to address</h4>
                    <p className="mt-1 text-[11px] text-amber-800">Include your response to every outstanding suggestion with this milestone.</p>
                  </div>
                  {submittingMilestone.previous_suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="rounded-xl bg-white p-3">
                      <p className="font-semibold text-slate-800">
                        M{suggestion.source_milestone_number}: {suggestion.suggestion_text}
                      </p>
                      {suggestion.improvement_text && <p className="mt-1 text-slate-600">{suggestion.improvement_text}</p>}
                      <textarea
                        rows={2}
                        value={suggestionResponses[suggestion.id]?.response || ""}
                        onChange={(event) => setSuggestionResponses({
                          ...suggestionResponses,
                          [suggestion.id]: {
                            ...suggestionResponses[suggestion.id],
                            response: event.target.value,
                          },
                        })}
                        placeholder="Describe the changes you made or work still in progress"
                        className="mt-2 w-full rounded-lg border border-slate-200 p-2"
                        required
                      />
                      <div className="mt-2">
                        <select
                          value={suggestionResponses[suggestion.id]?.status || "IN_PROGRESS"}
                          onChange={(event) => setSuggestionResponses({
                            ...suggestionResponses,
                            [suggestion.id]: {
                              ...suggestionResponses[suggestion.id],
                              status: event.target.value,
                            },
                          })}
                          className="rounded-lg border border-slate-200 p-2"
                        >
                          <option value="IN_PROGRESS">Still in progress</option>
                          <option value="ADDRESSED">Addressed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </section>
              )}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Review M{reviewingSubmission?.milestone_number}: {reviewingSubmission?.milestone_title}
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReviewSubmission} className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-bold text-slate-800">
                  {reviewingSubmission?.project_name} · {reviewingSubmission?.group_members}
                </p>
                <p className="mt-1 text-slate-600">
                  Submitted by {reviewingSubmission?.submitted_by_name} · {reviewingSubmission && new Date(reviewingSubmission.submitted_at).toLocaleString()} · {reviewingSubmission?.is_late ? "Late" : "On time"}
                </p>
                {reviewingSubmission?.work_url && (
                  <a href={reviewingSubmission.work_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-700 underline">
                    Open work link
                  </a>
                )}
                {reviewingSubmission?.notes && <p className="mt-2 whitespace-pre-line text-slate-700">{reviewingSubmission.notes}</p>}
                {reviewingSubmission?.files?.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleDownloadSubmissionFile(file)}
                    className="mr-2 mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700"
                  >
                    {file.file_name}
                  </button>
                ))}
              </div>
              {reviewingSubmission?.suggestion_responses?.length > 0 && (
                <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <h4 className="font-bold text-amber-950">Responses to previous suggestions</h4>
                  {reviewingSubmission.suggestion_responses.map((item) => (
                    <div key={item.suggestion_id} className="rounded-lg bg-white p-2.5">
                      <p className="font-semibold">M{item.source_milestone_number}: {item.suggestion_text}</p>
                      <p className="mt-1 text-slate-600">Student response: {item.response}</p>
                      <label className="mt-2 flex items-center gap-2 font-semibold">
                        Faculty verification
                        <select
                          value={reviewForm.suggestionReviews[item.suggestion_id] || "IN_PROGRESS"}
                          onChange={(event) => setReviewForm({
                            ...reviewForm,
                            suggestionReviews: {
                              ...reviewForm.suggestionReviews,
                              [item.suggestion_id]: event.target.value,
                            },
                          })}
                          className="rounded-lg border border-slate-200 p-1.5"
                        >
                          <option value="ACCEPTED">Satisfactory</option>
                          <option value="IN_PROGRESS">Needs more work</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </section>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Decision *</label>
                <select
                  value={reviewForm.decision}
                  onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="REVISION_REQUIRED">REVISION REQUIRED</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={4}
                  value={reviewForm.remarks}
                  onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                  placeholder="Summarize the quality of the submitted work."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Improvements</label>
                <textarea
                  rows={3}
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                  placeholder="General improvements or guidance for the student."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Suggestions (one per line)</label>
                <textarea
                  rows={4}
                  value={reviewForm.suggestionsText}
                  onChange={(e) => setReviewForm({ ...reviewForm, suggestionsText: e.target.value })}
                  placeholder={"Add five recent research papers.\nImprove the comparison table."}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marks (max {reviewingSubmission?.allocated_marks}) *</label>
                  <input
                    type="number"
                    min="0"
                    max={reviewingSubmission?.allocated_marks}
                    step="0.5"
                    value={reviewForm.marksAwarded}
                    onChange={(e) => setReviewForm({ ...reviewForm, marksAwarded: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>
                <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 p-3 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={reviewForm.marksVisibleToStudent}
                    onChange={(e) => setReviewForm({ ...reviewForm, marksVisibleToStudent: e.target.checked })}
                  />
                  Release marks to students
                </label>
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

    </div>
  );
}
