import React, { useState } from "react";
import {
  useForm,
} from "react-hook-form";
import {
  z,
} from "zod";
import {
  zodResolver,
} from "@hookform/resolvers/zod";
import {
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Users,
  Building2,
  BookMarked,
  Target,
  Sparkles,
  CheckCircle2,
  UserRound,
  FileText,
} from "lucide-react";


/* =========================================================
   DATA
========================================================= */

const institutions = [
  "University of Technology",
  "National Science Institute",
  "Global Business School",
  "State Research University",
];

const courses = [
  "MCA",
  "MBA",
  "M.Tech Research Thesis",
  "Ph.D Scholar",
];


/* =========================================================
   VALIDATION
========================================================= */

const baseSchema = {
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters",
    }),

  email: z
    .string()
    .min(1, {
      message: "Email address is required",
    })
    .email({
      message: "Please enter a valid email address",
    }),

  password: z
    .string()
    .min(8, {
      message:
        "Password must be at least 8 characters",
    }),

  institution: z
    .string()
    .min(1, {
      message: "Please select an institution",
    }),
};


const studentSchema = z.object({
  ...baseSchema,

  course: z
    .string()
    .min(1, {
      message: "Please select a course",
    }),
});


const facultySchema = z.object({
  ...baseSchema,
});


/* =========================================================
   REGISTER PAGE
========================================================= */

export const Register = () => {

  const [role, setRole] = useState("student");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [registerError, setRegisterError] =
    useState("");

  const navigate = useNavigate();
  const location = useLocation();


  const schema =
    role === "student"
      ? studentSchema
      : facultySchema;


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: location.state?.invitedEmail || "",
    },
  });


  /* =========================================================
     ROLE CHANGE
  ========================================================= */

  const handleRoleChange = (newRole) => {

    setRole(newRole);

    setRegisterError("");

    setShowPassword(false);

    reset();

  };


  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data) => {

    setRegisterError("");

    setLoading(true);

    try {

      // Send registration data to the backend
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            role: role,
            institution: data.institution,
            course:
              role === "student"
                ? data.course
                : null,
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
        throw new Error(
          result.message || "Registration failed"
        );
      }

      // Redirect to login so the user signs in with the new account.
      navigate("/login", {
        state: {
          returnTo: location.state?.returnTo,
          invitedEmail: location.state?.invitedEmail,
        },
      });

    } catch (error) {

      setRegisterError(
        error.message ||
        "Unable to create your account. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="min-h-screen w-full flex bg-white">


      {/* =====================================================
          LEFT SIDE
      ===================================================== */}

      <section
        className="
          hidden
          lg:flex
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


        <div
          className="
            relative
            z-10
            w-full
            px-12
            xl:px-16
            py-10
            flex
            flex-col
          "
        >


          {/* =================================================
              BRAND
          ================================================= */}

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

              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                "
              >

                Research
                <span className="text-blue-300">
                  Hub
                </span>

              </h1>

              <p
                className="
                  text-[10px]
                  text-blue-200
                  tracking-[0.2em]
                  uppercase
                "
              >
                Research Lifecycle Platform
              </p>

            </div>

          </div>


          {/* =================================================
              HERO
          ================================================= */}

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

              Start Your Research Journey

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

              Your Ideas.

              <br />

              Your{" "}

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

              Join ResearchHub to collaborate with
              researchers, connect with expert mentors,
              manage projects, and transform your ideas
              into meaningful research.

            </p>

          </div>


          {/* =================================================
              RESEARCH JOURNEY VISUAL
          ================================================= */}

          <div
            className="
              relative
              flex-1
              min-h-[410px]
              mt-5
            "
          >


            {/* Outer orbit */}

            <div
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                w-[400px]
                h-[400px]
                rounded-full
                border
                border-dashed
                border-blue-300/15
              "
            />


            {/* Inner orbit */}

            <div
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                w-[275px]
                h-[275px]
                rounded-full
                border
                border-blue-300/20
              "
            />


            {/* =================================================
                CENTER
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

                <div
                  className="
                    w-10
                    h-2
                    bg-blue-500
                    rounded
                    mb-3
                  "
                />

                <div
                  className="
                    w-full
                    h-1.5
                    bg-blue-100
                    rounded
                    mb-2
                  "
                />

                <div
                  className="
                    w-4/5
                    h-1.5
                    bg-blue-100
                    rounded
                    mb-2
                  "
                />

                <div
                  className="
                    w-full
                    h-1.5
                    bg-blue-100
                    rounded
                    mb-4
                  "
                />

                <div className="flex gap-1 items-end">

                  <div className="w-2 h-5 bg-blue-300 rounded" />

                  <div className="w-2 h-8 bg-blue-400 rounded" />

                  <div className="w-2 h-6 bg-blue-500 rounded" />

                  <div className="w-2 h-10 bg-blue-600 rounded" />

                </div>

              </div>

            </div>


            {/* =================================================
                STUDENT
            ================================================= */}

            <div
              className="
                absolute
                left-1/2
                -translate-x-1/2
                top-0
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

                <GraduationCap size={25} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Student / Researcher
              </p>

              <p className="text-[10px] text-blue-200">
                Explore • Learn • Research
              </p>

            </div>


            {/* =================================================
                FACULTY
            ================================================= */}

            <div
              className="
                absolute
                right-1
                top-28
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
                Expert Mentors
              </p>

              <p className="text-[10px] text-blue-200">
                Guide • Support • Inspire
              </p>

            </div>


            {/* =================================================
                INSTITUTION
            ================================================= */}

            <div
              className="
                absolute
                left-0
                top-40
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

                <Building2 size={23} />

              </div>

              <p className="mt-2 text-sm font-semibold">
                Institutions
              </p>

              <p className="text-[10px] text-blue-200">
                Connect • Collaborate
              </p>

            </div>


            {/* =================================================
                PROJECT
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
                Research Projects
              </p>

              <p className="text-[10px] text-blue-200">
                Plan • Track • Complete
              </p>

            </div>


            {/* =================================================
                FLOATING CARD 1
            ================================================= */}

            <div
              className="
                absolute
                left-0
                top-3
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

                <div
                  className="
                    w-8
                    h-8
                    rounded-lg
                    bg-blue-400/20
                    flex
                    items-center
                    justify-center
                  "
                >

                  <BookMarked size={15} />

                </div>

                <span className="text-xs text-blue-100">
                  Research Workspace
                </span>

              </div>

              <p className="mt-3 text-sm font-semibold">
                Everything in one place
              </p>

              <p className="mt-1 text-[10px] text-blue-200">
                Projects • Documents • Tasks
              </p>

            </div>


            {/* =================================================
                FLOATING CARD 2
            ================================================= */}

            <div
              className="
                absolute
                right-0
                top-3
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

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-cyan-400/20
                  flex
                  items-center
                  justify-center
                "
              >

                <CheckCircle2 size={17} />

              </div>

              <div>

                <p className="text-xs font-semibold">
                  Expert Guidance
                </p>

                <p className="text-[10px] text-blue-200">
                  Find your mentor
                </p>

              </div>

            </div>


            {/* =================================================
                FLOATING CARD 3
            ================================================= */}

            <div
              className="
                absolute
                left-3
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

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-indigo-400/20
                  flex
                  items-center
                  justify-center
                "
              >

                <FileText size={17} />

              </div>

              <div>

                <p className="text-xs font-semibold">
                  Research Resources
                </p>

                <p className="text-[10px] text-blue-200">
                  Share • Discover • Learn
                </p>

              </div>

            </div>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-between
              max-w-[650px]
              pb-3
            "
          >

            {[
              ["Connect", "Researchers"],
              ["Discover", "Experts"],
              ["Collaborate", "Together"],
              ["Create", "Impact"],
            ].map(([title, subtitle]) => (

              <div
                key={title}
                className="flex items-center gap-2"
              >

                <span
                  className="
                    w-2
                    h-2
                    rounded-full
                    bg-blue-300
                    shadow-[0_0_10px_rgba(147,197,253,0.8)]
                  "
                />

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
          RIGHT SIDE — REGISTER FORM
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


        {/* =================================================
            TOP LOGIN LINK
        ================================================= */}

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
            Already have an account?
          </span>

          <Link
            to="/login"
            className="
              font-semibold
              text-blue-600
              hover:text-blue-700
              transition-colors
            "
          >
            Sign in
          </Link>

        </div>


        {/* =================================================
            FORM CONTAINER
        ================================================= */}

        <div
          className="
            w-full
            max-w-[460px]
            px-7
            sm:px-10
            py-20
            lg:py-10
          "
        >


          {/* =================================================
              LOGO
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


            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-[#17358C]
              "
            >

              Research
              <span className="text-blue-500">
                Hub
              </span>

            </h1>

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <div className="mt-8">

            <h2
              className="
                text-3xl
                sm:text-4xl
                font-bold
                tracking-tight
                text-slate-900
              "
            >
              Create your account
            </h2>

            <p
              className="
                mt-2
                text-sm
                text-slate-400
              "
            >
              Join ResearchHub and start your research journey.
            </p>

          </div>


          {/* =================================================
              ROLE SELECTOR
          ================================================= */}

          <div
            className={`mt-7 grid gap-3 ${
              location.state?.invitedEmail ? "grid-cols-1" : "grid-cols-2"
            }`}
          >

            {/* STUDENT */}

            <button
              type="button"
              onClick={() =>
                handleRoleChange("student")
              }
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
                  role === "student"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200"
                }
              `}
            >

              <GraduationCap size={19} />

              Student

            </button>


            {!location.state?.invitedEmail && (
              <button
              type="button"
              onClick={() =>
                handleRoleChange("faculty")
              }
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
                  role === "faculty"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200"
                }
              `}
            >

              <Users size={19} />

              Faculty

              </button>
            )}

          </div>


          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
          >


            {/* =================================================
                FULL NAME
            ================================================= */}

            <div>

              <label
                htmlFor="name"
                className="
                  block
                  mb-2
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                Full Name
              </label>


              <div className="relative">

                <UserRound
                  size={18}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  {...register("name")}
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={
                    role === "faculty"
                      ? "Dr. Jane Doe"
                      : "Jane Doe"
                  }
                  className={`
                    w-full
                    h-13
                    min-h-[52px]
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
                      errors.name
                        ? "border-red-300 focus:ring-4 focus:ring-red-50"
                        : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    }
                  `}
                />

              </div>


              {errors.name && (

                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-red-500
                  "
                >
                  {errors.name.message}
                </p>

              )}

            </div>


            {/* =================================================
                EMAIL
            ================================================= */}

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
                  size={18}
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
                  placeholder="name@institution.edu"
                  readOnly={Boolean(location.state?.invitedEmail)}
                  className={`
                    w-full
                    h-13
                    min-h-[52px]
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

                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-red-500
                  "
                >
                  {errors.email.message}
                </p>

              )}

            </div>


            {/* =================================================
                PASSWORD
            ================================================= */}

            <div>

              <label
                htmlFor="password"
                className="
                  block
                  mb-2
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                Password
              </label>


              <div className="relative">

                <Lock
                  size={18}
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
                  autoComplete="new-password"
                  placeholder="Create a password"
                  className={`
                    w-full
                    h-13
                    min-h-[52px]
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
                >

                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}

                </button>

              </div>


              {errors.password && (

                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-red-500
                  "
                >
                  {errors.password.message}
                </p>

              )}

            </div>


            {/* =================================================
                INSTITUTION
            ================================================= */}

            <div>

              <label
                htmlFor="institution"
                className="
                  block
                  mb-2
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                Institution
              </label>


              <div className="relative">

                <Building2
                  size={18}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                    pointer-events-none
                  "
                />


                <select
                  {...register("institution")}
                  id="institution"
                  className={`
                    w-full
                    h-13
                    min-h-[52px]
                    pl-12
                    pr-10
                    rounded-xl
                    border
                    bg-white
                    text-sm
                    text-slate-700
                    outline-none
                    appearance-none
                    transition-all
                    ${
                      errors.institution
                        ? "border-red-300 focus:ring-4 focus:ring-red-50"
                        : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    }
                  `}
                >

                  <option value="">
                    Select your institution
                  </option>

                  {institutions.map(
                    (institution) => (

                      <option
                        key={institution}
                        value={institution}
                      >
                        {institution}
                      </option>

                    )
                  )}

                </select>


                {/* Dropdown arrow */}

                <span
                  className="
                    pointer-events-none
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                    text-xs
                  "
                >
                  ▼
                </span>

              </div>


              {errors.institution && (

                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-red-500
                  "
                >
                  {errors.institution.message}
                </p>

              )}

            </div>


            {/* =================================================
                COURSE — STUDENT ONLY
            ================================================= */}

            {role === "student" && (

              <div
                className="
                  animate-in
                  fade-in
                  slide-in-from-top-2
                  duration-300
                "
              >

                <label
                  htmlFor="course"
                  className="
                    block
                    mb-2
                    text-sm
                    font-semibold
                    text-slate-800
                  "
                >
                  Course / Program
                </label>


                <div className="relative">

                  <BookMarked
                    size={18}
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      pointer-events-none
                    "
                  />


                  <select
                    {...register("course")}
                    id="course"
                    className={`
                      w-full
                      h-13
                      min-h-[52px]
                      pl-12
                      pr-10
                      rounded-xl
                      border
                      bg-white
                      text-sm
                      text-slate-700
                      outline-none
                      appearance-none
                      transition-all
                      ${
                        errors.course
                          ? "border-red-300 focus:ring-4 focus:ring-red-50"
                          : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      }
                    `}
                  >

                    <option value="">
                      Select your course
                    </option>

                    {courses.map(
                      (course) => (

                        <option
                          key={course}
                          value={course}
                        >
                          {course}
                        </option>

                      )
                    )}

                  </select>


                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      text-xs
                    "
                  >
                    ▼
                  </span>

                </div>


                {errors.course && (

                  <p
                    className="
                      mt-1.5
                      text-xs
                      font-medium
                      text-red-500
                    "
                  >
                    {errors.course.message}
                  </p>

                )}

              </div>

            )}


            {/* =================================================
                ERROR
            ================================================= */}

            {registerError && (

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

                {registerError}

              </div>

            )}


            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              disabled={loading}
              className="
                group
                w-full
                h-14
                mt-2
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

                  Creating account...

                </>

              ) : (

                <>

                  Create{" "}
                  {role === "student"
                    ? "Student"
                    : "Faculty"}{" "}
                  Account

                  <ArrowRight
                    size={18}
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
              LOGIN LINK
          ================================================= */}

          <p
            className="
              mt-6
              text-center
              text-xs
              text-slate-400
            "
          >

            Already have an account?

            <Link
              to="/login"
              className="
                ml-1
                font-semibold
                text-blue-600
                hover:text-blue-700
              "
            >
              Sign in
            </Link>

          </p>


          {/* =================================================
              SECURITY TEXT
          ================================================= */}

          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              gap-2
              text-[10px]
              text-slate-300
            "
          >

            <CheckCircle2 size={12} />

            Your research journey starts here

          </div>

        </div>

      </section>

    </div>
  );
};
