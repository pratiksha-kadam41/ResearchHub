import React from "react";
import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AcceptRepositoryInvitation() {
  const { token: invitationToken, decision: requestedDecision } = useParams();
  const decision = requestedDecision || "accept";
  const { token: authToken, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [invitationLoading, setInvitationLoading] = React.useState(true);
  const [invitation, setInvitation] = React.useState(null);
  const [responseStatus, setResponseStatus] = React.useState(null);
  const responseStarted = React.useRef(false);

  React.useEffect(() => {
    let active = true;

    fetch(`/api/repositories/invitations/${invitationToken}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Unable to load this invitation.");
        }
        return result;
      })
      .then((result) => {
        if (active) {
          setInvitation(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setInvitationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [invitationToken]);

  const respondToInvitation = React.useCallback(async () => {
    if (!authToken) {
      setError("Sign in with the invited student account to respond to this invitation.");
      return;
    }

    if (user?.role !== "student") {
      setError("Only the invited student account can respond to this invitation.");
      return;
    }

    if (responseStarted.current) {
      return;
    }

    responseStarted.current = true;
    setLoading(true);
    setError("");

    try {
      const headers = authToken
        ? { Authorization: `Bearer ${authToken}` }
        : {};
      const response = await fetch(
        `/api/repositories/invitations/${invitationToken}/${decision}`,
        { method: "POST", headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to respond to this invitation.",
        );
      }

      setResponseStatus(result.status);
      if (decision === "accept") {
        navigate(`/repository/${result.repositoryId}`, {
          replace: true,
          state: { notice: result.message },
        });
      } else {
        setInvitation((current) =>
          current ? { ...current, status: result.status } : current,
        );
      }
    } catch (requestError) {
      responseStarted.current = false;
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [authToken, decision, invitationToken, navigate, user?.role]);

  const returnTo =
    decision === "accept"
      ? `/invitations/respond/${invitationToken}/accept`
      : location.pathname;
  const validDecision = decision === "accept" || decision === "reject";

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
          {loading || invitationLoading ? (
            <LoaderCircle size={23} className="animate-spin" />
          ) : (
            <Users size={23} />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          {loading
            ? decision === "accept"
              ? "Accepting invitation..."
              : "Rejecting invitation..."
            : responseStatus
              ? `Invitation ${responseStatus}`
              : decision === "reject"
                ? "Decline this invitation?"
                : "Join a research group"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {decision === "reject"
            ? "Confirm below to decline this invitation. This will notify the repository owner."
            : "Confirm below to join the repository. You must use the student account that received this invitation."}
        </p>

        {!validDecision ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            This invitation action is invalid.
          </p>
        ) : invitationLoading ? (
          <div
            role="status"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
          >
            <LoaderCircle size={17} className="animate-spin" />
            Loading invitation details...
          </div>
        ) : !invitation ? null : responseStatus ? (
          <div
            role="status"
            className={`mt-6 rounded-xl border p-4 text-sm font-semibold ${
              responseStatus === "accepted"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {responseStatus === "accepted"
              ? "You joined the repository."
              : "You declined this invitation."}
          </div>
        ) : invitation.status !== "pending" ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            This invitation has already been {invitation.status}.
          </div>
        ) : !authToken ? (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex gap-2">
              <Mail size={17} className="mt-0.5 shrink-0" />
              <p>
                To {decision === "accept" ? "accept" : "reject"}, first sign in or create a student account using{" "}
                <strong>{invitation.email}</strong>.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                to="/login"
                state={{
                  returnTo,
                  invitedEmail: invitation.email,
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                state={{
                  returnTo,
                  invitedEmail: invitation.email,
                }}
                className="rounded-lg border border-blue-200 px-4 py-2 font-semibold text-blue-700 hover:bg-white"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : user?.role !== "student" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Group invitations can only be handled by a student account.
          </div>
        ) : loading ? (
          <div
            role="status"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
          >
            <LoaderCircle size={17} className="animate-spin" />
            {decision === "accept"
              ? "Adding you to the repository..."
              : "Updating invitation status..."}
          </div>
        ) : (
          <button
            type="button"
            onClick={respondToInvitation}
            className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${
              decision === "accept"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {error
              ? "Try again"
              : decision === "accept"
                ? "Accept invitation"
                : "Reject invitation"}
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
        {invitation && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <p className="font-semibold text-slate-800">Research Project Invitation</p>
            <p className="mt-2"><strong>Project:</strong> {invitation.repositoryName}</p>
            <p><strong>Owner:</strong> {invitation.ownerName || "ResearchHub student"}</p>
            <p><strong>Research domain:</strong> {invitation.domain || "Not specified"}</p>
            <p className="mt-1"><strong>Description:</strong> {invitation.description || "No description provided."}</p>
            <p className="mt-2"><strong>Invited account:</strong> {invitation.email}</p>
            {!authToken && " Sign in or create a student account with this email before responding."}
          </div>
        )}
      </section>
    </main>
  );
}
