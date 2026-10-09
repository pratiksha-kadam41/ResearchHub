import React, { useState } from "react";
import {
  useForm,
} from "react-hook-form";
import {
  z
} from "zod";
import {
  zodResolver
} from "@hookform/resolvers/zod";
import {
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  useAuth,
} from "../context/AuthContext";

import {
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Users,
  FileText,
  Target,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from "lucide-react";


/* ============================================
   VALIDATION
============================================ */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});


/* ============================================
   LOGIN PAGE
============================================ */

export const Login = () => {

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: location.state?.invitedEmail || "",
    },
  });


  /* ============================================
     SUBMIT
  ============================================ */

  const onSubmit = async (data) => {

    setLoginError("");
    setVerificationEmail("");
    setLoading(true);

    try {

      // Send login credentials to the backend
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        }
      );

      // Convert backend response to JavaScript object
      const text = await response.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        console.error("Invalid JSON from server:", text);
        throw new Error("The server returned an invalid response. Please make sure the backend is running.");
      }

      // Handle backend errors
      if (!response.ok) {
        if (result.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(result.email || data.email);
          setLoginError(result.message || "Verify your email address before signing in.");
          return;
        }
        throw new Error(result.message || "Unable to sign in");
      }

      // Validate response structure
      if (!result.token || !result.user) {
        throw new Error("Login response is missing authentication data. Please try again.");
      }

      // Make sure the selected role matches the registered user's role
      if (result.user.role !== selectedRole) {
        throw new Error(
          `This account is registered as ${result.user.role}. Please select ${result.user.role} to continue.`
        );
      }

      

      // Save authenticated user in AuthContext
      login(result.user, result.token);

      const returnTo = location.state?.returnTo;
      const invitationPath =
        typeof returnTo === "string" &&
        /^\/invitations\/(?:accept\/[a-f\d]{64}|respond\/[a-f\d]{64}\/(?:accept|reject))$/i.test(returnTo)
          ? returnTo
          : null;

      // Return invitees to the invitation link after signing in.
      if (invitationPath) {
        navigate(invitationPath, { replace: true });
      } else if (result.user.role === "faculty") {
        navigate("/dashboard/faculty");
      } else {
        navigate("/dashboard/student");
      }

    } catch (error) {

      setLoginError(
        error.message ||
        "Unable to sign in. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };

  const resendVerification = async () => {
    setResendingVerification(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send a verification code.");
      navigate("/verify-email", {
        state: {
          email: verificationEmail,
          notice: result.message,
          verificationEmailSent: true,
          returnTo: location.state?.returnTo,
        },
      });
    } catch (error) {
      setLoginError(error.message || "Unable to send a verification code.");
    } finally {
      setResendingVerification(false);
    }
  };

  return (

    <div className="min-h-screen w-full flex bg-white">


      {/* =====================================================
          LEFT SIDE — RESEARCHHUB VISUAL
      ===================================================== */}

      <section
        className="
          hidden lg:flex
          relative
          w-[57%]
          min-h-screen
          overflow-hidden
          text-white
          bg-gradient-to-br
          from-[#071A46]
          via-[#0B2B72]
          to-[#174DA5]
        "
      >

        {/* Background glow */}

        <div
          className="
            absolute
            -top-40
            -right-32
            w-[500px]
            h-[500px]
            rounded-full
            bg-blue-400/20
            blur-[100px]
          "
        />

        <div
          className="
            absolute
            -bottom-52
            -left-40
            w-[500px]
            h-[500px]
            rounded-full
            bg-indigo-500/20
            blur-[100px]
          "
        />


        {/* Dot pattern */}

        <div
          className="
            absolute
            inset-0
            opacity-[0.08]
            bg-[radial-gradient(circle,_white_1px,_transparent_1px)]
            [background-size:24px_24px]
          "
        />


        {/* Decorative circles */}

        <div
          className="
            absolute
            top-24
            right-20
            w-32
            h-32
            border
            border-blue-300/10
            rounded-full
          "
        />

        <div
          className="
            absolute
            top-32
            right-28
            w-16
            h-16
            border
            border-blue-300/10
            rounded-full
          "
        />


        {/* =====================================================
            LEFT CONTENT
        ===================================================== */}

        <div className="relative z-10 w-full px-12 xl:px-16 py-10 flex flex-col">


          {/* BRAND */}

          <div className="flex items-center gap-3">

            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-white/10
                border
                border-white/20
                flex
                items-center
                justify-center
                backdrop-blur-sm
              "
            >
              <BookOpen
                size={25}
                strokeWidth={1.8}
              />
            </div>

            <div>

              <h1 className="text-2xl font-bold tracking-tight">
                Research<span className="text-blue-300">
                  Hub
                </span>
              </h1>

              <p className="text-[10px] text-blue-200 tracking-[0.2em] uppercase">
                Research Lifecycle Platform
              </p>

            </div>

          </div>


          {/* =====================================================
              HERO TEXT
          ===================================================== */}

          <div className="mt-14">

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-1.5
                rounded-full
                bg-white/[0.07]
                border
                border-white/10
                text-blue-200
                text-xs
              "
            >

              <Sparkles size={13} />

              Research Today • A Better Tomorrow

            </div>


            <h2
              className="
                mt-6
                text-5xl
                xl:text-6xl
                font-bold
                leading-[1.05]
                tracking-tight
                max-w-[650px]
              "
            >

              Where Ideas

              <br />

              Become{" "}

              <span className="text-blue-300">
                Research.
              </span>

            </h2>


            <p
              className="
                mt-6
                max-w-[580px]
                text-base
                xl:text-lg
                leading-7
                text-blue-100/80
              "
            >
              Collaborate with researchers, connect with
              experts, manage your research journey, and
              turn ideas into meaningful outcomes.
            </p>

          </div>


          {/* =====================================================
              RESEARCH ECOSYSTEM
          ===================================================== */}

          <div className="relative flex-1 min-h-[430px] mt-4">


            {/* Connection lines */}

            <div
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                w-[300px]
                h-[300px]
                rounded-full
                border
                border-blue-300/20
              "
            />

            <div
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                w-[410px]
                h-[410px]
                rounded-full
                border
                border-dashed
                border-blue-300/15
              "
            />


            {/* =================================================
                CENTER DOCUMENT
            ================================================= */}

            <div
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                w-32
                h-32
                rounded-[30px]
                bg-blue-400/10
                border
                border-blue-200/20
                backdrop-blur-xl
                flex
                items-center
                justify-center
                shadow-[0_0_70px_rgba(96,165,250,0.2)]
              "
            >

              <div
                className="
                  w-20
                  h-24
                  rounded-xl
                  bg-white/90
                  rotate-[-5deg]
                  shadow-2xl
                  p-4
                "
              >

                <div className="w-10 h-2 bg-blue-500 rounded mb-3" />

                <div className="w-full h-1.5 bg-blue-100 rounded mb-2" />

                <div className="w-4/5 h-1.5 bg-blue-100 rounded mb-2" />

                <div className="w-full h-1.5 bg-blue-100 rounded mb-4" />

                <div className="flex gap-1 items-end">

                  <div className="w-2 h-5 bg-blue-300 rounded" />

                  <div className="w-2 h-8 bg-blue-400 rounded" />

                  <div className="w-2 h-6 bg-blue-500 rounded" />

                  <div className="w-2 h-10 bg-blue-600 rounded" />

                </div>

              </div>

            </div>


            {/* =================================================
                STUDENT NODE
            ================================================= */}

            <div
              className="
                absolute
                left-1/2
                -translate-x-1/2
                top-2
                flex
                flex-col
                items-center
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-blue-500/20
                  border
                  border-blue-300/30
                  flex
                  items-center
                  justify-center
                  shadow-lg
                "
              >

                <GraduationCap size={25} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Students
              </p>

              <p className="text-[10px] text-blue-200">
                Explore • Learn • Research
              </p>

            </div>


            {/* =================================================
                FACULTY NODE
            ================================================= */}

            <div
              className="
                absolute
                right-0
                top-32
                flex
                flex-col
                items-center
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-blue-500/20
                  border
                  border-blue-300/30
                  flex
                  items-center
                  justify-center
                "
              >

                <Users size={24} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Faculty / Mentors
              </p>

              <p className="text-[10px] text-blue-200">
                Guide • Support • Inspire
              </p>

            </div>


            {/* =================================================
                RESEARCH GROUP
            ================================================= */}

            <div
              className="
                absolute
                left-0
                top-44
                flex
                flex-col
                items-center
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-blue-500/20
                  border
                  border-blue-300/30
                  flex
                  items-center
                  justify-center
                "
              >

                <Users size={23} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Research Groups
              </p>

              <p className="text-[10px] text-blue-200">
                Collaborate • Achieve
              </p>

            </div>


            {/* =================================================
                PROJECT NODE
            ================================================= */}

            <div
              className="
                absolute
                right-12
                bottom-3
                flex
                flex-col
                items-center
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-blue-500/20
                  border
                  border-blue-300/30
                  flex
                  items-center
                  justify-center
                "
              >

                <Target size={23} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Projects & Milestones
              </p>

              <p className="text-[10px] text-blue-200">
                Plan • Track • Complete
              </p>

            </div>


            {/* =================================================
                PROGRESS CARD
            ================================================= */}

            <div
              className="
                absolute
                left-0
                top-8
                w-44
                p-4
                rounded-2xl
                bg-white/[0.08]
                border
                border-white/10
                backdrop-blur-xl
                shadow-xl
              "
            >

              <div className="flex items-center gap-2">

                <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center">
                  <Target size={15} />
                </div>

                <span className="text-xs text-blue-100">
                  Research Progress
                </span>

              </div>

              <div className="mt-2 text-2xl font-bold">
                78%
              </div>

              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">

                <div
                  className="
                    h-full
                    w-[78%]
                    rounded-full
                    bg-gradient-to-r
                    from-cyan-400
                    to-blue-400
                  "
                />

              </div>

              <p className="mt-1 text-[10px] text-blue-200">
                On Track
              </p>

            </div>


            {/* =================================================
                MILESTONE CARD
            ================================================= */}

            <div
              className="
                absolute
                right-2
                top-4
                flex
                items-center
                gap-3
                p-3
                rounded-2xl
                bg-white/[0.08]
                border
                border-white/10
                backdrop-blur-xl
              "
            >

              <div className="w-9 h-9 rounded-lg bg-blue-400/20 flex items-center justify-center">
                <CheckCircle2 size={17} />
              </div>

              <div>

                <p className="text-xs font-semibold">
                  3 Milestones
                </p>

                <p className="text-[10px] text-blue-200">
                  Completed
                </p>

              </div>

            </div>


            {/* =================================================
                EXPERT CARD
            ================================================= */}

            <div
              className="
                absolute
                left-2
                bottom-10
                flex
                items-center
                gap-3
                p-3
                rounded-2xl
                bg-white/[0.08]
                border
                border-white/10
                backdrop-blur-xl
              "
            >

              <div className="w-9 h-9 rounded-lg bg-cyan-400/20 flex items-center justify-center">

                <Users size={17} />

              </div>

              <div>

                <p className="text-xs font-semibold">
                  Expert Guidance
                </p>

                <p className="text-[10px] text-blue-200">
                  Connected
                </p>

              </div>

            </div>


            {/* =================================================
                REVIEW CARD
            ================================================= */}

            <div
              className="
                absolute
                right-0
                bottom-20
                flex
                items-center
                gap-3
                p-3
                rounded-2xl
                bg-white/[0.08]
                border
                border-white/10
                backdrop-blur-xl
              "
            >

              <div className="w-9 h-9 rounded-lg bg-indigo-400/20 flex items-center justify-center">

                <MessageSquare size={17} />

              </div>

              <div>

                <p className="text-xs font-semibold">
                  Research Review
                </p>

                <p className="text-[10px] text-blue-200">
                  Feedback received
                </p>

              </div>

            </div>

          </div>


          {/* =====================================================
              FOOTER KEYWORDS
          ===================================================== */}

          <div className="flex items-center justify-between max-w-[650px] pb-3">

            {[
              ["Ideas", "Transform"],
              ["Collaboration", "Build"],
              ["Innovation", "Create"],
              ["Impact", "Deliver"],
            ].map(([title, subtitle]) => (

              <div
                key={title}
                className="flex items-center gap-2"
              >

                <span className="w-2 h-2 rounded-full bg-blue-300 shadow-[0_0_10px_rgba(147,197,253,0.8)]" />

                <div>

                  <p className="text-xs font-medium">
                    {title}
                  </p>

                  <p className="text-[9px] text-blue-200">
                    {subtitle}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* =====================================================
          RIGHT SIDE — LOGIN
      ===================================================== */}

      <section
        className="
          relative
          flex
          w-full
          lg:w-[43%]
          min-h-screen
          items-center
          justify-center
          bg-white
        "
      >

        {/* Register link */}

        <div
          className="
            absolute
            top-7
            right-8
            flex
            items-center
            gap-2
            text-xs
            text-slate-400
          "
        >

          <span>
            New to ResearchHub?
          </span>

          <Link
            to="/register"
            className="
              font-semibold
              text-blue-600
              hover:text-blue-700
              transition-colors
            "
          >
            Create an account
          </Link>

        </div>


        {/* Login container */}

        <div
          className="
            w-full
            max-w-[440px]
            px-7
            sm:px-10
            py-20
            lg:py-10
          "
        >


          {/* =================================================
              BRAND
          ================================================= */}

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-blue-50
                text-blue-700
                flex
                items-center
                justify-center
              "
            >

              <BookOpen
                size={24}
                strokeWidth={1.8}
              />

            </div>

            <div>

              <h2
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#17358C]
                "
              >
                Research<span className="text-blue-500">
                  Hub
                </span>
              </h2>

            </div>

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <div className="mt-10">

            <h3
              className="
                text-3xl
                sm:text-4xl
                font-bold
                tracking-tight
                text-slate-900
              "
            >
              Welcome back{" "}
              <span className="text-2xl">
                👋
              </span>
            </h3>

            <h4
              className="
                mt-3
                text-xl
                font-semibold
                text-[#172554]
              "
            >
              Sign in to ResearchHub
            </h4>

            <p className="mt-1 text-sm text-slate-400">
              Continue your research journey.
            </p>

          </div>


          {/* =================================================
              ROLE SELECTOR
          ================================================= */}

          <div
            className="
              grid
              grid-cols-2
              gap-3
              mt-8
            "
          >

            {/* Student */}

            <button
              type="button"
              onClick={() => setSelectedRole("student")}
              className={`
                h-14
                rounded-xl
                border
                flex
                items-center
                justify-center
                gap-2
                text-sm
                font-semibold
                transition-all
                ${
                  selectedRole === "student"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200"
                }
              `}
            >

              <GraduationCap size={19} />

              Student

            </button>


            {/* Faculty */}

            <button
              type="button"
              onClick={() => setSelectedRole("faculty")}
              className={`
                h-14
                rounded-xl
                border
                flex
                items-center
                justify-center
                gap-2
                text-sm
                font-semibold
                transition-all
                ${
                  selectedRole === "faculty"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200"
                }
              `}
            >

              <Users size={19} />

              Faculty

            </button>

          </div>


          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-7 space-y-5"
          >


            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="
                  block
                  mb-2
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={19}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  className={`
                    w-full
                    h-14
                    pl-12
                    pr-4
                    rounded-xl
                    border
                    bg-white
                    text-sm
                    text-slate-900
                    outline-none
                    transition-all
                    placeholder:text-slate-300
                    ${
                      errors.email
                        ? "border-red-300 focus:ring-4 focus:ring-red-50"
                        : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    }
                  `}
                />

              </div>

              {errors.email && (

                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.email.message}
                </p>

              )}

            </div>


            {/* PASSWORD */}

            <div>

              <div className="flex items-center justify-between mb-2">

                <label
                  htmlFor="password"
                  className="
                    text-sm
                    font-semibold
                    text-slate-800
                  "
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="
                    text-xs
                    font-semibold
                    text-blue-600
                    hover:text-blue-700
                  "
                >
                  Forgot Password?
                </Link>

              </div>


              <div className="relative">

                <Lock
                  size={19}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  {...register("password")}
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`
                    w-full
                    h-14
                    pl-12
                    pr-12
                    rounded-xl
                    border
                    bg-white
                    text-sm
                    text-slate-900
                    outline-none
                    transition-all
                    placeholder:text-slate-300
                    ${
                      errors.password
                        ? "border-red-300 focus:ring-4 focus:ring-red-50"
                        : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    }
                  `}
                />


                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    w-9
                    h-9
                    flex
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    hover:text-blue-600
                    hover:bg-blue-50
                    transition
                  "
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}

                </button>

              </div>


              {errors.password && (

                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.password.message}
                </p>

              )}

            </div>


            {/* ERROR */}

            {loginError && (

              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-2.5
                  text-xs
                  font-medium
                  text-red-600
                "
              >

                <span
                  className="
                    flex
                    h-5
                    w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    text-white
                    font-bold
                  "
                >
                  !
                </span>

                {loginError}

              </div>

            )}

            {verificationEmail && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendingVerification}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              >
                {resendingVerification
                  ? "Sending verification code…"
                  : `Send verification code to ${verificationEmail}`}
              </button>
            )}

            {/* REMEMBER ME */}

            <div className="flex items-center justify-between">

              <label
                className="
                  flex
                  items-center
                  gap-2
                  cursor-pointer
                  text-xs
                  text-slate-500
                "
              >

                <input
                  type="checkbox"
                  className="
                    w-4
                    h-4
                    rounded
                    border-slate-300
                    text-blue-600
                    focus:ring-blue-500
                  "
                />

                Remember me

              </label>

            </div>


            {/* =================================================
                SIGN IN BUTTON
            ================================================= */}

            <button
              type="submit"
              disabled={loading}
              className="
                group
                w-full
                h-14
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                bg-gradient-to-r
                from-blue-500
                to-indigo-600
                text-white
                text-sm
                font-bold
                shadow-lg
                shadow-blue-500/20
                hover:shadow-xl
                hover:shadow-blue-500/25
                hover:-translate-y-0.5
                disabled:opacity-70
                disabled:cursor-not-allowed
                disabled:hover:translate-y-0
                transition-all
              "
            >

              {loading ? (

                <>
                  <span
                    className="
                      w-5
                      h-5
                      border-2
                      border-white/40
                      border-t-white
                      rounded-full
                      animate-spin
                    "
                  />

                  Signing in...

                </>

              ) : (

                <>
                  Sign In

                  <ArrowRight
                    size={19}
                    className="
                      transition-transform
                      group-hover:translate-x-1
                    "
                  />

                </>

              )}

            </button>

          </form>


          {/* =================================================
              REGISTER
          ================================================= */}

          <p
            className="
              mt-7
              text-center
              text-xs
              text-slate-400
            "
          >

            Don't have an account?

            <Link
              to="/register"
              className="
                ml-1
                font-semibold
                text-blue-600
                hover:text-blue-700
              "
            >
              Create an account
            </Link>

          </p>


          {/* =================================================
              SMALL FOOTER
          ================================================= */}

          <div
            className="
              mt-8
              flex
              items-center
              justify-center
              gap-2
              text-[10px]
              text-slate-300
            "
          >

            <FileText size={12} />

            Secure research collaboration platform

          </div>

        </div>

      </section>

    </div>
  );
};
