import React, { useState, useEffect } from "react";
import {
  Search,
  UserCheck,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  Award,
  Layers,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

export default function FindMentor() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [mentorRequests, setMentorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Request Modal State
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [modalError, setModalError] = useState("");

  // Details Modal
  const [viewingProfile, setViewingProfile] = useState(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [facRes, repoRes, reqRes] = await Promise.all([
        fetch(`/api/faculty?search=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/repositories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/mentor-requests", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [facData, repoData, reqData] = await Promise.all([
        facRes.json(),
        repoRes.json(),
        reqRes.json(),
      ]);

      if (facRes.ok) setFacultyList(facData.faculty || []);
      if (repoRes.ok) setRepositories(repoData.repositories || []);
      if (reqRes.ok) setMentorRequests(reqData.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load mentor discovery data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, token]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedRepoId) {
      setModalError("Please select a research project/repository.");
      return;
    }

    setSendingRequest(true);
    setModalError("");

    try {
      const response = await fetch("/api/mentor-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facultyId: selectedFaculty.id,
          repositoryId: selectedRepoId,
          message: requestMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to send guidance request.");
      }

      setSuccessNotice(`Guidance request sent to ${selectedFaculty.name}!`);
      setSelectedFaculty(null);
      setSelectedRepoId("");
      setRequestMessage("");
      fetchData();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm("Are you sure you want to cancel this guidance request?")) return;
    try {
      const response = await fetch(`/api/mentor-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel request.");
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} /> Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} /> Rejected
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="flex items-center gap-2 font-bold text-[#102A63]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
                <BookOpen size={18} />
              </span>
              <span>Find a Research Mentor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {successNotice && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>{successNotice}</span>
            <button
              onClick={() => setSuccessNotice("")}
              className="text-emerald-600 hover:text-emerald-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#0B285F] to-[#1E4E9E] p-8 text-white shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Discover Expert Professors & Mentors
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-2xl">
            Explore faculty research interests, specializations, and publications. Send guidance requests directly for your individual or group projects.
          </p>
          <div className="mt-6 flex max-w-xl items-center rounded-2xl bg-white p-2 shadow-inner text-slate-800">
            <Search size={20} className="ml-2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, expertise, domain (e.g. Machine Learning, NLP)..."
              className="w-full bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Guidance Requests History Section */}
        {mentorRequests.length > 0 && (
          <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#102A63] flex items-center gap-2">
              <Clock size={19} className="text-blue-600" /> My Guidance Requests
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status of mentorship requests you have sent to professors.
            </p>

            <div className="mt-4 divide-y divide-slate-100 overflow-x-auto">
              {mentorRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {req.faculty_name || "Professor"}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({req.designation || "Faculty"})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Project: <span className="font-semibold text-slate-700">{req.repository_name}</span> · {req.domain}
                    </p>
                    {req.message && (
                      <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{req.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(req.status)}
                    {req.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 transition"
                      >
                        Cancel
                      </button>
                    )}
                    {req.status === "ACCEPTED" && (
                      <Link
                        to={`/repository/${req.repository_id}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Open Project
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Professors Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#102A63]">
              Available Faculty Mentors ({facultyList.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin text-blue-600" />
              Searching faculty profiles...
            </div>
          ) : facultyList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <GraduationCap size={40} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-base font-bold text-slate-700">No professors found</h3>
              <p className="mt-1 text-xs text-slate-500">
                Try searching with different keywords or research areas.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {facultyList.map((faculty) => (
                <article
                  key={faculty.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{faculty.name}</h3>
                        <p className="text-xs font-semibold text-blue-600">
                          {faculty.designation || "Assistant Professor"}
                        </p>
                        <p className="text-xs text-slate-500">{faculty.institution}</p>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
                        {faculty.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>

                    {/* Research Areas / Expertise tags */}
                    <div className="mt-4 space-y-2">
                      {faculty.expertise && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Expertise
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-2">
                            {faculty.expertise}
                          </p>
                        </div>
                      )}

                      {faculty.research_areas && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Research Areas
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-2">
                            {faculty.research_areas}
                          </p>
                        </div>
                      )}

                      {faculty.guidance_areas && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Available For
                          </p>
                          <p className="text-xs font-medium text-emerald-700">
                            {faculty.guidance_areas}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewingProfile(faculty)}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFaculty(faculty);
                        setModalError("");
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <Send size={13} /> Request
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Send Guidance Request Modal */}
        {selectedFaculty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  Request Guidance from {selectedFaculty.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedFaculty(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSendRequest} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Research Project *
                  </label>
                  {repositories.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      You haven't created any research projects yet. Create a project first to request mentorship.
                    </div>
                  ) : (
                    <select
                      value={selectedRepoId}
                      onChange={(e) => setSelectedRepoId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Choose a project --</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.name} ({repo.domain} · {repo.research_type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Message to Professor (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Introduce your research objective, methodology ideas, or specific areas where you would like mentorship..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFaculty(null)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingRequest || repositories.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {sendingRequest ? "Sending..." : "Submit Request"}
                    <Send size={13} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Profile Modal */}
        {viewingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewingProfile.name}</h3>
                  <p className="text-xs font-semibold text-blue-600">{viewingProfile.designation || "Faculty"}</p>
                  <p className="text-xs text-slate-500">{viewingProfile.institution}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProfile(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs text-slate-700">
                {viewingProfile.research_interests && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600">
                      Research Interests
                    </h4>
                    <p className="mt-1 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {viewingProfile.research_interests}
                    </p>
                  </div>
                )}

                {viewingProfile.expertise && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600">
                      Expertise
                    </h4>
                    <p className="mt-1 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {viewingProfile.expertise}
                    </p>
                  </div>
                )}

                {viewingProfile.publications && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600">
                      Selected Publications
                    </h4>
                    <p className="mt-1 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {viewingProfile.publications}
                    </p>
                  </div>
                )}

                {viewingProfile.experience && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600">
                      Academic & Industry Experience
                    </h4>
                    <p className="mt-1 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {viewingProfile.experience}
                    </p>
                  </div>
                )}

                {viewingProfile.guidance_areas && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-600">
                      Mentorship Guidance Areas
                    </h4>
                    <p className="mt-1 whitespace-pre-line bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-emerald-900">
                      {viewingProfile.guidance_areas}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingProfile(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prof = viewingProfile;
                    setViewingProfile(null);
                    setSelectedFaculty(prof);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  <Send size={13} /> Request Guidance
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
