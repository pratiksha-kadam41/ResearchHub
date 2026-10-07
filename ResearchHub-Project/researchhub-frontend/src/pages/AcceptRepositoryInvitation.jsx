import React from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AcceptRepositoryInvitation() {
  const { token: invitationToken } = useParams();
  const { token: authToken, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  const acceptInvitation = async () => {
    if (!authToken) {
      setError("Sign in with the invited student account, then reopen this email link.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/repositories/invitations/${invitationToken}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to accept this invitation.");
      }

      setAccepted(true);
      navigate(`/repository/${result.repositoryId}`, {
        replace: true,
        state: { notice: result.message },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F8FC] px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          ResearchHub
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {accepted ? <CheckCircle2 size={23} /> : <Users size={23} />}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Join a research group
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Accept this invitation to join the shared repository. You must be
          signed in to the student account that received the email.
        </p>

        {!authToken ? (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex gap-2">
              <Mail size={17} className="mt-0.5 shrink-0" />
              <p>
                Sign in or create a student account using the invited email,
                then reopen this invitation link.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg border border-blue-200 px-4 py-2 font-semibold text-blue-700 hover:bg-white"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : user?.role !== "student" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Group invitations can only be accepted by a student account.
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={acceptInvitation}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading && <LoaderCircle size={17} className="animate-spin" />}
            Accept invitation
          </button>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
