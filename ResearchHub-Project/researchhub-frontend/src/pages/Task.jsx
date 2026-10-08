import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";

const Tasks = () => {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loadingRepositories, setLoadingRepositories] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => {
    return localStorage.getItem("token");
  };

  // Load repositories
  useEffect(() => {
    const loadRepositories = async () => {
      try {
        setLoadingRepositories(true);
        setError("");

        const token = getToken();

        const response = await fetch("/api/repositories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load repositories.");
        }

        setRepositories(data.repositories || []);

        if (data.repositories?.length > 0) {
          setSelectedRepository(String(data.repositories[0].id));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingRepositories(false);
      }
    };

    loadRepositories();
  }, []);

  // Load tasks when repository changes
  useEffect(() => {
    if (!selectedRepository) {
      setTasks([]);
      return;
    }

    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        setError("");

        const token = getToken();

        const response = await fetch(
          `/api/tasks/repository/${selectedRepository}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load tasks.");
        }

        setTasks(data.tasks || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingTasks(false);
      }
    };

    loadTasks();
  }, [selectedRepository]);

  // Update student task progress
  const updateProgress = async (taskId, progressPercentage) => {
    try {
      const token = getToken();

      const progress = Number(progressPercentage);

      let status = "TODO";

      if (progress === 100) {
        status = "COMPLETED";
      } else if (progress > 0) {
        status = "IN_PROGRESS";
      }

      const response = await fetch(
        `/api/tasks/${taskId}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            progressPercentage: progress,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update progress.");
      }

      // Update UI without reloading the whole page
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                progress_percentage: progress,
                status,
              }
            : task
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";

      case "TODO":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700";

      case "HIGH":
        return "bg-orange-100 text-orange-700";

      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";

      case "LOW":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] p-6 text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* Top Navbar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="flex items-center gap-2 font-bold text-[#102A63]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B285F] text-white">
                <BookOpen size={16} />
              </span>
              <span>My Project Tasks</span>
            </div>
          </div>
          <NotificationBell />
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#102A63] mt-1">
            Research Tasks
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Track milestones progress, prioritize tasks, and keep deliverables updated.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Repository selector */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Select Repository
          </label>

          {loadingRepositories ? (
            <p className="text-slate-500">
              Loading repositories...
            </p>
          ) : repositories.length === 0 ? (
            <p className="text-slate-500">
              You don't have any repositories yet.
            </p>
          ) : (
            <select
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
              className="w-full md:w-96 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {repositories.map((repository) => (
                <option
                  key={repository.id}
                  value={repository.id}
                >
                  {repository.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tasks */}
        {loadingTasks ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <p className="text-slate-500">
              Loading tasks...
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              No Tasks Found
            </h2>

            <p className="text-slate-500 mt-2">
              There are no tasks available for this repository.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-slate-900">
                      {task.title}
                    </h2>

                    {task.description && (
                      <p className="text-slate-600 mt-2">
                        {task.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                      <div>
                        <span className="text-slate-400">
                          Milestone
                        </span>

                        <p className="font-medium text-slate-700">
                          {task.milestone_title || "N/A"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400">
                          Deadline
                        </span>

                        <p className="font-medium text-slate-700">
                          {task.deadline
                            ? new Date(task.deadline).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400">
                          Assigned To
                        </span>

                        <p className="font-medium text-slate-700">
                          {task.assignee_name || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="w-full md:w-64">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Progress
                      </span>

                      <span className="text-sm font-semibold text-blue-600">
                        {task.progress_percentage || 0}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={task.progress_percentage || 0}
                      onChange={(e) =>
                        updateProgress(
                          task.id,
                          e.target.value
                        )
                      }
                      className="w-full"
                    />

                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${task.progress_percentage || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;