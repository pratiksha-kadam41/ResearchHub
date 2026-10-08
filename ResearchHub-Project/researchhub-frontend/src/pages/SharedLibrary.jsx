import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ArrowLeft,
  Search,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Link as LinkIcon,
  Filter,
  LoaderCircle,
  FolderGit2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

const RESOURCE_TYPES = ["ALL", "PAPER", "DATASET", "SOURCE_CODE", "TEMPLATE", "PDF", "LINK", "OTHER"];

export default function SharedLibrary() {
  const { token, user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchResources = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const typeParam = selectedType !== "ALL" ? `?type=${selectedType}` : "";
      const response = await fetch(`/api/resources/library${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error("Failed to load shared library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedType, token]);

  const filteredResources = resources.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.repository_name?.toLowerCase().includes(q) ||
      r.uploaded_by_name?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  });

  const getIcon = (type) => {
    switch (type) {
      case "DATASET":
        return <FileSpreadsheet size={18} className="text-emerald-600" />;
      case "SOURCE_CODE":
        return <FileCode size={18} className="text-amber-600" />;
      case "IMAGE":
        return <ImageIcon size={18} className="text-purple-600" />;
      case "LINK":
        return <LinkIcon size={18} className="text-blue-600" />;
      default:
        return <FileText size={18} className="text-blue-600" />;
    }
  };

  const backLink = user?.role === "faculty" ? "/dashboard/faculty" : "/dashboard/student";

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to={backLink}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="flex items-center gap-2 font-bold text-[#102A63]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B285F] text-white">
                <BookOpen size={18} />
              </span>
              <span>Shared Research Asset Library</span>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#0B285F] to-[#14428B] p-8 text-white shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Academic Assets & References
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-2xl">
            Browse published reference papers, benchmark datasets, research templates, and shared code repositories made available across ResearchHub.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 items-center rounded-2xl bg-white p-2 text-slate-800 shadow-inner">
              <Search size={18} className="ml-2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources by title, project name, or contributor..."
                className="w-full bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedType === type
                      ? "bg-white text-[#102A63] shadow-sm"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <LoaderCircle size={20} className="animate-spin text-blue-600" />
            Loading shared resources...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <FileText size={40} className="mx-auto text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-700">No resources found</h3>
            <p className="mt-1 text-xs text-slate-500">
              When students and professors publish materials with Shared or Public visibility, they appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                      {getIcon(item.resource_type)}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
                      {item.resource_type.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <FolderGit2 size={13} /> {item.repository_name || "Research Project"}
                  </p>

                  {item.notes && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400">By {item.uploaded_by_name}</span>
                  <a
                    href={item.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Open Resource <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
