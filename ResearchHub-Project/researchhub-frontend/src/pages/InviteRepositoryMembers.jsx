import React from "react";
import {
  ArrowLeft,
  BookOpen,
  LoaderCircle,
  Mail,
  Users,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRepository } from "../utils/repositories";

export default function InviteRepositoryMembers() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const repositoryData = location.state?.repositoryData;
  const [emails, setEmails] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  if (!repositoryData || repositoryData.type !== "group") {
    return <Navigate to="/repository/create" replace />;
  }

  const handleInvite = async (event) => {
    event.preventDefault();
    const memberEmails = emails
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (memberEmails.length === 0) {
      setError("Enter at least one group member email address.");
      return;
    }

    if (!token) {
      setError("Your session has expired. Sign in again before inviting members.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createRepository(token, repositoryData, memberEmails);
      navigate("/dashboard/student", {
        replace: true,
        state: {
          repositoryCreated: true,
        },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to create this group repository.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F8FC] px-5 py-8 text-slate-800 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() =>
              navigate("/repository/create", {
                state: { repositoryData },
              })
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back
          </button>
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <BookOpen size={19} className="text-blue-600" />
            ResearchHub
          </div>
          <span className="text-xs font-semibold text-slate-400">Step 2 of 2</span>
        </header>

        <form
          onSubmit={handleInvite}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Users size={23} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Group repository
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Invite your research group
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add student email addresses for <strong>{repositoryData.name}</strong>.
            Each person will receive an in-app invitation on their dashboard.
            They join the group only after signing in and accepting the invitation.
          </p>

          <label
            htmlFor="group-member-emails"
            className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <Mail size={17} className="text-blue-600" />
            Group member email addresses
          </label>
          <textarea
            id="group-member-emails"
            rows="5"
            autoFocus
            value={emails}
            onChange={(event) => {
              setEmails(event.target.value);
              setError("");
            }}
            placeholder={"student1@example.com\nstudent2@example.com"}
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
          <p className="mt-2 text-xs text-slate-500">
            Separate addresses with commas or new lines. Invite 3–4 people; with you, the group will have 4–5 members. Each person must already have a ResearchHub account to receive the in-app invitation.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() =>
                navigate("/repository/create", {
                  state: { repositoryData },
                })
              }
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Creating group...
                </>
              ) : (
                "Create group & send invitations"
              )}            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
