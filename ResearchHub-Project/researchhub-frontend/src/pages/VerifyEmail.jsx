import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  KeyRound,
  LoaderCircle,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function VerifyEmail() {
  const location = useLocation();
  const registrationPending = Boolean(location.state?.registrationPending);
  const [email, setEmail] = React.useState(
    location.state?.email || location.state?.invitedEmail || "",
  );
  const [code, setCode] = React.useState("");
  const [codeRequested, setCodeRequested] = React.useState(
    Boolean(location.state?.verificationEmailSent),
  );
  const [message, setMessage] = React.useState(location.state?.notice || "");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const sendCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to send a verification code.");
      }
      setCodeRequested(true);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to send a verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to verify your email.");
      }
      setVerified(true);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to verify your email.");
    } finally {
      setLoading(false);
    }
  };

  const loginState = {
    invitedEmail: location.state?.invitedEmail || email,
    returnTo: location.state?.returnTo,
  };

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#071A46] via-[#0B2B72] to-[#1D4ED8] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -left-16 top-[30%] h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-[-8rem] right-[-7rem] h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-lg backdrop-blur">
            <GraduationCap size={24} />
          </div>
          <p className="text-xl font-bold tracking-tight">
            Research<span className="text-blue-300">Hub</span>
          </p>
        </div>

        <div className="relative z-10 max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-200/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
            <Sparkles size={14} />
            One quick step to get started
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Great research
            <br />
            starts with a
            <br />
            <span className="text-blue-300">trusted community.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">
            Verify your email to protect your account and unlock your ResearchHub workspace.
          </p>

          <div className="mt-10 flex max-w-md items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.08] p-5 shadow-xl backdrop-blur-md">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-400/20 text-blue-100">
              <MailCheck size={27} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[#08245D] ring-4 ring-[#12377D]">
                <Check size={12} strokeWidth={3} />
              </span>
            </div>
            <div>
              <p className="font-semibold">Your inbox is the key</p>
              <p className="mt-1 text-sm leading-5 text-blue-100/70">
                Enter the secure six-digit code we send to your email.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-blue-100/70">
          <ShieldCheck size={15} />
          Secure research collaboration platform
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFF] via-white to-blue-50/70 px-5 py-8 sm:px-8">
        <div className="w-full max-w-[480px]">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition group-hover:border-blue-200 group-hover:bg-blue-50">
              <ArrowLeft size={15} />
            </span>
            Back to sign in
          </Link>

          <div className="mt-7 rounded-[28px] border border-blue-100/80 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(30,64,175,0.28)] sm:p-9">
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
                {verified ? <CheckCircle2 size={26} /> : loading ? <LoaderCircle size={25} className="animate-spin" /> : <MailCheck size={26} />}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                <ShieldCheck size={14} />
                Email security
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                {registrationPending ? "Account setup · Step 2 of 2" : "Secure your account"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#102A63] sm:text-[30px]">
                {verified
                  ? "You're all verified!"
                  : registrationPending
                    ? "Complete your registration"
                    : "Verify your email"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {verified
                  ? "Your email is confirmed. You can now sign in to ResearchHub."
                  : registrationPending
                    ? "Your details are saved. Confirm your email to finish creating your account."
                    : "Enter the six-digit code sent to your email to confirm it belongs to you."}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <KeyRound size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">One-time verification code</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock3 size={12} />
                  Expires 10 minutes after sending
                </p>
              </div>
            </div>

            {message && (
              <p
                role="status"
                className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm leading-5 ${
                  verified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
                }`}
              >
                {verified ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <Mail size={17} className="mt-0.5 shrink-0" />}
                <span>{message}</span>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {error}
              </p>
            )}

            {!verified && (
              <form onSubmit={verifyCode} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="verification-email" className="mb-1.5 block text-xs font-bold text-slate-700">
                    Account email
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="verification-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                {codeRequested && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor="verification-code" className="block text-xs font-bold text-slate-700">
                        Six-digit code
                      </label>
                      <span className="text-[11px] text-slate-400">Check your inbox</span>
                    </div>
                    <input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.65em] text-blue-800 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                )}

                {codeRequested ? (
                  <div className="space-y-3 pt-1">
                    <button
                      type="submit"
                      disabled={loading || code.length !== 6}
                      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                    >
                      {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
                      {loading ? "Verifying code…" : "Verify email"}
                      {!loading && <ArrowRight size={17} className="transition group-hover:translate-x-1" />}
                    </button>
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={loading}
                      className="w-full rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {loading ? "Please wait…" : "Send a new code"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={loading || !email}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                  >
                    {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Mail size={17} />}
                    {loading ? "Sending your code…" : "Send verification code"}
                    {!loading && <ArrowRight size={17} className="transition group-hover:translate-x-1" />}
                  </button>
                )}
              </form>
            )}

            {verified && (
              <Link
                to="/login"
                state={loginState}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {registrationPending ? "Finish registration and sign in" : "Continue to sign in"}
                <ArrowRight size={17} className="transition group-hover:translate-x-1" />
              </Link>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              Your verification code is private and can only be used once.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
