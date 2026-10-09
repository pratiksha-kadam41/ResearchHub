import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  Download,
  FileClock,
  FileText,
  LoaderCircle,
  MessageSquare,
  Save,
  Users,
} from "lucide-react";
import "./researchPaper.css";

const PaperRichEditor = lazy(() => import("../components/PaperRichEditor"));
const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };
const emptySections = [];
const parseContent = (content) => {
  try {
    const value = typeof content === "string" ? JSON.parse(content) : content;
    return value?.type === "doc" ? value : emptyDocument;
  } catch {
    return emptyDocument;
  }
};

function PaperEditor(props) {
  return (
    <Suspense fallback={<div className="min-h-40 animate-pulse rounded-lg bg-slate-50" />}>
      <PaperRichEditor {...props} />
    </Suspense>
  );
}

export default function ResearchPaperWorkspace({
  repositoryId,
  token,
  isFaculty,
  selectedSectionId,
  onChooseFaculty,
  onPaperSubmissionsChange,
}) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingPaper, setCreatingPaper] = useState(false);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState({});
  const [history, setHistory] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printOnPreviewOpen, setPrintOnPreviewOpen] = useState(false);
  const [paperSubmissions, setPaperSubmissions] = useState([]);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [paperReviewForm, setPaperReviewForm] = useState({
    decision: "REVISION_REQUIRED",
    remarks: "",
    improvements: "",
    marksAwarded: "",
    marksVisibleToStudent: false,
    suggestionsText: "",
    suggestionReviews: {},
  });
  const [savingPaperReview, setSavingPaperReview] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!repositoryId || !token) return;
    try {
      const response = await fetch(`/api/research-papers/project/${repositoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load this research paper.");
      let loadedSubmissions = [];
      if (result.paper) {
        const submissionsResponse = await fetch(
          `/api/research-papers/project/${repositoryId}/submissions`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const submissionsResult = await submissionsResponse.json();
        if (!submissionsResponse.ok) {
          throw new Error(submissionsResult.message || "Unable to load paper evaluation history.");
        }
        loadedSubmissions = submissionsResult.submissions || [];
      }
      setWorkspace(result);
      setPaperSubmissions(loadedSubmissions);
      onPaperSubmissionsChange?.(loadedSubmissions);
      setSelectedId((current) => {
        const preferredId = selectedSectionId || current;
        return result.sections.find((section) => Number(section.id) === Number(preferredId))?.id
          || result.sections[0]?.id
          || null;
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [onPaperSubmissionsChange, repositoryId, selectedSectionId, token]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!previewOpen || !printOnPreviewOpen) return undefined;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintOnPreviewOpen(false);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [previewOpen, printOnPreviewOpen]);

  const paper = workspace?.paper;
  const sections = workspace?.sections ?? emptySections;
  const selectedSection = sections.find((section) => Number(section.id) === Number(selectedId));
  const currentDocument = selectedSection
    ? drafts[selectedSection.id] || parseContent(selectedSection.content)
    : emptyDocument;
  const totalWords = useMemo(
    () => sections.reduce((total, section) => total + Number(section.word_count || 0), 0),
    [sections],
  );
  const latestPaperSubmission = paperSubmissions[0];
  const canSubmitPaper = !latestPaperSubmission
    || latestPaperSubmission.status === "REVISION_REQUIRED";
  const paperIsReadOnly = isFaculty || !canSubmitPaper;

  const handleCreatePaper = async (selectedTemplateId) => {
    if (!selectedTemplateId || creatingPaper) return;
    setTemplateId(String(selectedTemplateId));
    setCreatingPaper(true);
    setError("");
    try {
      const response = await fetch(`/api/research-papers/project/${repositoryId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: Number(selectedTemplateId) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create the paper.");
      setNotice(result.message);
      await loadWorkspace();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setCreatingPaper(false);
    }
  };

  const saveSection = async () => {
    if (!paper || !selectedSection || !currentDocument) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/research-papers/${paper.id}/sections/${selectedSection.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: JSON.stringify(currentDocument) }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save this section.");
      setNotice(`Saved ${selectedSection.section_title}.`);
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (section) => {
    try {
      const response = await fetch(
        `/api/research-papers/${paper.id}/sections/${section.id}/history`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load section history.");
      setHistory({ section, versions: result.versions });
    } catch (historyError) {
      setError(historyError.message);
    }
  };

  const openPaperReview = (submission) => {
    setReviewingSubmission(submission);
    setPaperReviewForm({
      decision: "REVISION_REQUIRED",
      remarks: "",
      improvements: "",
      marksAwarded: "",
      marksVisibleToStudent: false,
      suggestionsText: "",
      suggestionReviews: Object.fromEntries(
        (submission.suggestion_responses || []).map((response) => [
          response.suggestion_id,
          "IN_PROGRESS",
        ]),
      ),
    });
  };

  const savePaperReview = async (event) => {
    event.preventDefault();
    if (!reviewingSubmission || savingPaperReview) return;
    setSavingPaperReview(true);
    setError("");
    try {
      const response = await fetch(
        `/api/research-papers/submissions/${reviewingSubmission.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: paperReviewForm.decision,
            remarks: paperReviewForm.remarks,
            improvements: paperReviewForm.improvements,
            marksAwarded: Number(paperReviewForm.marksAwarded),
            marksVisibleToStudent: paperReviewForm.marksVisibleToStudent,
            suggestions: paperReviewForm.suggestionsText
              .split("\n")
              .map((suggestion) => suggestion.trim())
              .filter(Boolean)
              .map((suggestionText) => ({ suggestionText })),
            suggestionReviews: Object.entries(paperReviewForm.suggestionReviews).map(
              ([suggestionId, decision]) => ({ suggestionId: Number(suggestionId), decision }),
            ),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save paper evaluation.");
      setNotice(result.message);
      setReviewingSubmission(null);
      await loadWorkspace();
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setSavingPaperReview(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle size={18} className="animate-spin text-blue-600" /> Loading research paper…
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <AlertCircle size={18} className="mr-2 inline" />{error}
        <button type="button" onClick={loadWorkspace} className="ml-3 font-semibold underline">Retry</button>
      </div>
    );
  }

  if (!paper) {
    const templates = workspace?.templates || [];
    const hasFacultyCollaborator = Boolean(workspace?.project?.faculty_name);
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Project research paper</p>
          <h2 className="mt-1 text-2xl font-bold text-[#102A63]">
            {hasFacultyCollaborator ? "Choose your paper template" : "Connect with a faculty collaborator"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {hasFacultyCollaborator
              ? <>Choose a format to create the shared research paper for <strong>{workspace?.project?.name}</strong>. The selected format will be fixed for this project; you can then write in each paper section.</>
              : <>Choose a faculty collaborator for <strong>{workspace?.project?.name}</strong> first. Once the collaboration is accepted, you can select a paper template and start writing.</>}
          </p>
        </header>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!isFaculty && !hasFacultyCollaborator ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Users size={20} />
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Faculty collaboration comes first</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  After a faculty member accepts your project collaboration request, the available research paper templates will appear here.
                </p>
                <button
                  type="button"
                  onClick={onChooseFaculty}
                  className="mt-4 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Choose faculty collaborator
                </button>
              </div>
            </div>
          </div>
        ) : !isFaculty ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => handleCreatePaper(template.id)}
                  disabled={creatingPaper}
                  aria-busy={creatingPaper && String(template.id) === templateId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    {creatingPaper && String(template.id) === templateId
                      ? <LoaderCircle size={20} className="animate-spin" />
                      : <FileText size={20} />}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{template.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {template.type} · {template.sections?.length || 0} paper sections
                  </p>
                  <span className="mt-4 inline-flex rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">
                    {creatingPaper && String(template.id) === templateId ? "Opening your paper…" : "Use this template"}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-sm text-slate-600">
            A project student must choose a template to create the shared paper. You can access it here once it is created.
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{paper.template_name} · {paper.status.replaceAll("_", " ")}</span>
            <span className="shrink-0 text-slate-500">{workspace.completion}% complete</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${workspace.completion}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => selectedSection && loadHistory(selectedSection)}
            disabled={!selectedSection}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileClock size={14} className="mr-1.5 inline" /> Version history
          </button>
          <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <BookOpen size={14} className="mr-1.5 inline" /> Preview
          </button>
          <button
            type="button"
            onClick={() => {
              setPrintOnPreviewOpen(true);
              setPreviewOpen(true);
            }}
            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <Download size={14} className="mr-1.5 inline" /> Export PDF
          </button>
        </div>
      </div>

      <article className="paper-preview-print mx-auto min-h-[1056px] w-full max-w-[816px] bg-white px-7 py-10 text-slate-900 shadow-lg sm:px-16 sm:py-16">
        <header className="border-b border-slate-300 pb-8 text-center">
          {workspace.project.institution && (
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{workspace.project.institution}</p>
          )}
          <h1 className="mt-5 font-serif text-3xl font-bold leading-tight">{paper.title}</h1>
          <p className="mt-4 text-sm">{workspace.members?.map((member) => member.name).join(", ")}</p>
          <p className="mt-1 text-xs text-slate-500">{workspace.project.name} · {paper.template_name}</p>
        </header>

        <div className="paper-preview-body mt-8">
          {sections.map((section) => {
            const isSelected = Number(selectedId) === Number(section.id);
            const isTitle = section.section_key === "title";
            const sectionNumber = section.section_order - (sections.some((item) => item.section_key === "title") ? 1 : 0);
            return (
              <section key={section.id} className="mt-8 break-inside-avoid">
                {!isTitle && (
                  <h2 className="mb-3 font-serif text-lg font-bold">
                    {["abstract", "keywords", "references"].includes(section.section_key)
                      ? section.section_title
                      : `${sectionNumber}. ${section.section_title}`}
                  </h2>
                )}
                {isSelected ? (
                  <div className="rounded-lg border border-blue-100 p-3 sm:p-4">
                    {isTitle && <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Paper title</p>}
                    <PaperEditor
                      key={section.id}
                      content={currentDocument}
                      readOnly={paperIsReadOnly}
                      onChange={(content) => setDrafts((current) => ({ ...current, [section.id]: content }))}
                    />
                    {!paperIsReadOnly && <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        {section.word_count || 0} words
                        {section.updated_by_name ? ` · Saved by ${section.updated_by_name}` : " · Not saved yet"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadHistory(section)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <FileClock size={13} className="mr-1 inline" /> History
                        </button>
                        <button
                          type="button"
                          onClick={saveSection}
                          disabled={saving}
                          className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          {saving ? <LoaderCircle size={13} className="mr-1 inline animate-spin" /> : <Save size={13} className="mr-1 inline" />}
                          Save section
                        </button>
                      </div>
                    </div>}
                  </div>
                ) : (
                  <div className="group relative">
                    <StaticPaperContent content={parseContent(drafts[section.id] || section.content)} />
                    {Number(section.word_count || 0) === 0 && !drafts[section.id] && (
                      <p className="mt-2 text-sm italic text-slate-400">Write your {section.section_title.toLowerCase()} here.</p>
                    )}
                    {!paperIsReadOnly && <button
                      type="button"
                      onClick={() => setSelectedId(section.id)}
                      className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      {Number(section.word_count || 0) > 0 || drafts[section.id] ? "Edit section" : "Write this section"}
                    </button>}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <footer className="mt-14 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
          {paper.template_name} · {workspace.project.name}
        </footer>
      </article>

      {isFaculty && paperSubmissions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[#102A63]">Paper submission versions</h2>
            <p className="text-xs text-slate-500">
              Each version is an immutable copy of the paper submitted for faculty review.
            </p>
          </div>
          {paperSubmissions.map((submission) => {
            const review = submission.reviews?.[0];
            return (
              <article key={submission.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Version {submission.version_number}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted by {submission.submitted_by_name} · {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {submission.status.replaceAll("_", " ")}
                  </span>
                </div>
                {submission.student_notes && (
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{submission.student_notes}</p>
                )}
                {review && (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      <MessageSquare size={14} className="mr-1 inline" />
                      Faculty decision: {review.decision.replaceAll("_", " ")}
                    </p>
                    {review.remarks && <p className="whitespace-pre-line text-slate-700">{review.remarks}</p>}
                    {review.improvements && <p className="whitespace-pre-line text-slate-700"><strong>Improvements:</strong> {review.improvements}</p>}
                    <p className="font-semibold text-slate-700">
                      <Award size={14} className="mr-1 inline" />
                      Marks: {Object.hasOwn(review, "marks_awarded") ? `${review.marks_awarded} / 100` : "Not released"}
                    </p>
                    {review.suggestions?.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-slate-700">
                        {review.suggestions.map((suggestion) => (
                          <li key={suggestion.id}>{suggestion.suggestion_text} · {suggestion.status.replaceAll("_", " ").toLowerCase()}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {isFaculty && !review && (
                  <button
                    type="button"
                    onClick={() => openPaperReview(submission)}
                    className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    <MessageSquare size={13} className="mr-1.5 inline" /> Review this submitted version
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Paper preview</h3>
                <p className="text-[10px] text-slate-500">Academic document layout · {totalWords} words</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"><Download size={13} className="mr-1 inline" /> Export PDF</button>
                <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Close</button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 sm:p-8">
              <PaperDocument
                workspace={workspace}
                paper={paper}
                sections={sections.map((section) => ({
                  ...section,
                  content: drafts[section.id]
                    ? JSON.stringify(drafts[section.id])
                    : section.content,
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Paper version history</h3>
                <p className="text-xs text-slate-500">Previous saved versions are kept for each section.</p>
              </div>
              <button type="button" onClick={() => setHistory(null)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                Section
                <select
                  value={history.section.id}
                  onChange={(event) => {
                    const section = sections.find((item) => Number(item.id) === Number(event.target.value));
                    if (section) loadHistory(section);
                  }}
                  className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>{section.section_title}</option>
                  ))}
                </select>
              </label>
              {history.versions.length ? history.versions.map((version) => (
                <article key={version.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="font-bold text-slate-800">Version {version.version_number}</p>
                    <p className="text-slate-500">{version.updated_by_name} · {new Date(version.created_at).toLocaleString()}</p>
                    {!isFaculty && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrafts((current) => ({ ...current, [history.section.id]: parseContent(version.content) }));
                          setSelectedId(history.section.id);
                          setHistory(null);
                          setNotice(`Version ${version.version_number} loaded in the editor. Save to create a new version.`);
                        }}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Restore to editor
                      </button>
                    )}
                  </div>
                  <PaperEditor readOnly content={parseContent(version.content)} />
                </article>
              )) : (
                <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No saved revisions for this section yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewingSubmission && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Evaluate paper · Version {reviewingSubmission.version_number}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted by {reviewingSubmission.submitted_by_name} · {new Date(reviewingSubmission.submitted_at).toLocaleString()}
                </p>
              </div>
              <button type="button" onClick={() => setReviewingSubmission(null)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="mb-5 max-h-[55vh] overflow-y-auto rounded-xl bg-slate-100 p-3 sm:p-5">
                <PaperDocument
                  workspace={{
                    project_name: reviewingSubmission.paper_snapshot.project_name,
                    institution: reviewingSubmission.paper_snapshot.institution,
                    authors: reviewingSubmission.paper_snapshot.authors,
                  }}
                  paper={{
                    title: reviewingSubmission.paper_snapshot.title,
                    template_name: reviewingSubmission.paper_snapshot.template_name,
                  }}
                  sections={reviewingSubmission.paper_snapshot.sections}
                />
              </div>
              {reviewingSubmission.suggestion_responses?.length > 0 && (
                <section className="mb-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <h3 className="font-bold text-amber-950">Student responses to previous suggestions</h3>
                  {reviewingSubmission.suggestion_responses.map((response) => (
                    <div key={response.suggestion_id} className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold text-slate-800">
                        From previous evaluation: {response.suggestion_text}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{response.response}</p>
                      <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                        Faculty decision
                        <select
                          value={paperReviewForm.suggestionReviews[response.suggestion_id] || "IN_PROGRESS"}
                          onChange={(event) => setPaperReviewForm((current) => ({
                            ...current,
                            suggestionReviews: {
                              ...current.suggestionReviews,
                              [response.suggestion_id]: event.target.value,
                            },
                          }))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
                        >
                          <option value="ACCEPTED">Addressed</option>
                          <option value="IN_PROGRESS">Still needs work</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </section>
              )}
              <form onSubmit={savePaperReview} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Decision
                  <select
                    value={paperReviewForm.decision}
                    onChange={(event) => setPaperReviewForm((current) => ({ ...current, decision: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <option value="REVISION_REQUIRED">Revision required</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Evaluation feedback
                  <textarea
                    rows={3}
                    value={paperReviewForm.remarks}
                    onChange={(event) => setPaperReviewForm((current) => ({ ...current, remarks: event.target.value }))}
                    maxLength={10000}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 font-normal"
                    placeholder="Summarize the quality of this submitted paper version."
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Improvements required
                  <textarea
                    rows={3}
                    value={paperReviewForm.improvements}
                    onChange={(event) => setPaperReviewForm((current) => ({ ...current, improvements: event.target.value }))}
                    maxLength={10000}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 font-normal"
                    placeholder="Give specific improvements for the next paper version."
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Suggestions for next evaluation (one per line)
                  <textarea
                    rows={3}
                    value={paperReviewForm.suggestionsText}
                    onChange={(event) => setPaperReviewForm((current) => ({ ...current, suggestionsText: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 font-normal"
                    placeholder={"Add more recent research sources.\nClarify the methodology."}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Marks (out of 100)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      value={paperReviewForm.marksAwarded}
                      onChange={(event) => setPaperReviewForm((current) => ({ ...current, marksAwarded: event.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5"
                    />
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={paperReviewForm.marksVisibleToStudent}
                      onChange={(event) => setPaperReviewForm((current) => ({
                        ...current,
                        marksVisibleToStudent: event.target.checked,
                      }))}
                    />
                    Release marks to students
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setReviewingSubmission(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button
                    type="submit"
                    disabled={savingPaperReview}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {savingPaperReview ? "Saving evaluation…" : "Save evaluation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaperDocument({ workspace, paper, sections }) {
  const projectName = workspace.project?.name || workspace.project_name;
  const institution = workspace.project?.institution || workspace.institution;
  const authors = workspace.authors || workspace.members?.map((member) => member.name) || [];
  return (
    <article className="paper-preview-print paper-print-document mx-auto min-h-[1056px] max-w-[816px] bg-white px-12 py-16 text-slate-900 shadow-xl sm:px-20">
      <header className="border-b border-slate-300 pb-8 text-center">
        {institution && <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{institution}</p>}
        <h1 className="mt-6 font-serif text-3xl font-bold leading-tight">{paper.title}</h1>
        {authors.length > 0 && <p className="mt-5 text-sm">{authors.join(", ")}</p>}
        {institution && <p className="mt-1 text-xs text-slate-600">{institution}</p>}
        <p className="mt-4 text-xs text-slate-500">{projectName}</p>
      </header>
      <div className="paper-preview-body mt-8">
        {sections.filter((section) => section.section_key !== "title").map((section) => (
          <section key={section.id} className="mt-7 break-inside-avoid">
            <h2 className="mb-2 font-serif text-lg font-bold">
              {["abstract", "keywords", "references"].includes(section.section_key)
                ? section.section_title
                : `${section.section_order - (sections.find((item) => item.section_key === "title") ? 1 : 0)}. ${section.section_title}`}
            </h2>
            <StaticPaperContent content={parseContent(section.content)} />
          </section>
        ))}
      </div>
      <footer className="mt-14 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        {paper.template_name} · {projectName}
      </footer>
    </article>
  );
}

function StaticPaperContent({ content }) {
  return (
    <div className="paper-editor-content paper-editor-readonly">
      {(content.content || []).map((node, index) => renderPaperNode(node, `node-${index}`))}
    </div>
  );
}

function renderPaperNode(node, key) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "text") {
    let text = node.text || "";
    for (const mark of node.marks || []) {
      if (mark.type === "bold") text = <strong key={`${key}-bold`}>{text}</strong>;
      else if (mark.type === "italic") text = <em key={`${key}-italic`}>{text}</em>;
      else if (mark.type === "underline") text = <u key={`${key}-underline`}>{text}</u>;
      else if (mark.type === "link") {
        const href = mark.attrs?.href;
        if (typeof href === "string" && /^(https?:|mailto:)/i.test(href)) {
          text = <a key={`${key}-link`} href={href} rel="noopener noreferrer">{text}</a>;
        }
      }
    }
    return text;
  }

  const children = (node.content || []).map((child, index) =>
    renderPaperNode(child, `${key}-${index}`),
  );
  const align = ["left", "center", "right", "justify"].includes(node.attrs?.textAlign)
    ? node.attrs.textAlign
    : undefined;
  const props = { key, style: align ? { textAlign: align } : undefined };

  switch (node.type) {
    case "paragraph": return <p {...props}>{children}</p>;
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 2));
      if (level === 1) return <h1 {...props}>{children}</h1>;
      if (level === 3) return <h3 {...props}>{children}</h3>;
      return <h2 {...props}>{children}</h2>;
    }
    case "bulletList": return <ul {...props}>{children}</ul>;
    case "orderedList": return <ol {...props}>{children}</ol>;
    case "listItem": return <li {...props}>{children}</li>;
    case "blockquote": return <blockquote {...props}>{children}</blockquote>;
    case "hardBreak": return <br key={key} />;
    case "table": return <table {...props}><tbody>{children}</tbody></table>;
    case "tableRow": return <tr {...props}>{children}</tr>;
    case "tableHeader": return <th {...props}>{children}</th>;
    case "tableCell": return <td {...props}>{children}</td>;
    default: return <Fragment key={key}>{children}</Fragment>;
  }
}
