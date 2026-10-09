
import { useAuth } from "../context/AuthContext";


import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    User,
    Phone,
    Calendar,
    GraduationCap,
    MapPin,
    BookOpen,
    Save,
    ArrowRight,
    CheckCircle2,
    Loader2,
    LayoutDashboard,
    FolderGit2,
    Plus,
    UserRound,
    Menu,
    LogOut,
    X,
} from "lucide-react";

export default function CompleteProfile() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { token, logout } = useAuth();
    const isEditMode = searchParams.get("edit") === "true";
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [form, setForm] = useState({
        phone: "",
        date_of_birth: "",
        gender: "",

        enrollment_number: "",
        specialization: "",
        year: "",
        semester: "",

        address: "",
        city: "",
        state: "",
        pincode: "",

        research_interests: "",
        skills: "",
        bio: ""
    });

    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    const navigateTo = (path) => {
        setSidebarOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    React.useEffect(() => {
        const loadProfile = async () => {
            if (!token) {
                setCheckingProfile(false);
                return;
            }

            try {
                const response = await fetch(
                    "/api/student/profile",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const result = await response.json();

                if (isEditMode) {
                    if (response.ok && result.profileCompleted && result.profile) {
                        const profile = result.profile;

                        setForm({
                            phone: profile.phone || "",
                            date_of_birth: profile.date_of_birth
                                ? String(profile.date_of_birth).slice(0, 10)
                                : "",
                            gender: profile.gender || "",
                            enrollment_number: profile.enrollment_number || "",
                            specialization: profile.specialization || "",
                            year: profile.year ? String(profile.year) : "",
                            semester: profile.semester ? String(profile.semester) : "",
                            address: profile.address || "",
                            city: profile.city || "",
                            state: profile.state || "",
                            pincode: profile.pincode || "",
                            research_interests: profile.research_interests || "",
                            skills: profile.skills || "",
                            bio: profile.bio || ""
                        });
                    } else if (response.status === 404) {
                        navigate("/complete-profile", { replace: true });
                    } else if (!response.ok) {
                        setError(result.message || "Unable to load your profile.");
                    }
                } else {
                    if (response.ok && result.profileCompleted) {
                        navigate("/dashboard/student", { replace: true });
                        return;
                    }
                }
            } catch (checkError) {
                console.error("Profile load error:", checkError);
                if (isEditMode) {
                    setError("Unable to load your profile. Please try again.");
                }
            } finally {
                setCheckingProfile(false);
            }
        };

        loadProfile();
    }, [token, navigate, isEditMode]);

    const handleChange = (field, value) => {
        if (field === "phone" || field === "pincode") {
            value = value.replace(/\D/g, "");
        }

        setForm((prev) => ({
            ...prev,
            [field]: value
        }));

        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const phone = form.phone.trim();
        const enrollmentNumber = form.enrollment_number.trim();
        const pincode = form.pincode.trim();

        if (!phone) {
            setError("Please enter your phone number.");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            setError("Please enter a valid 10-digit phone number.");
            return;
        }

        if (!form.date_of_birth) {
            setError("Please select your date of birth.");
            return;
        }

        const selectedDate = new Date(form.date_of_birth + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            setError("Date of birth cannot be in the future.");
            return;
        }

        if (!form.gender) {
            setError("Please select your gender.");
            return;
        }

        if (!enrollmentNumber) {
            setError("Please enter your enrollment number.");
            return;
        }

        // Enrollment number is required, but allow common formats such as
        // MCA/24/001, 2024-MCA-101, MCA_001, etc.
        if (!/^[A-Za-z0-9][A-Za-z0-9 ./_-]{1,49}$/.test(enrollmentNumber)) {
            setError("Please enter a valid enrollment number.");
            return;
        }

        // Pincode is optional. Validate it only when the user enters it.
        if (pincode && !/^\d{6}$/.test(pincode)) {
            setError("Pincode must contain exactly 6 digits.");
            return;
        }

        // Year and semester are optional, so do not force a relationship
        // between them. This avoids rejecting otherwise valid profile data.

        if (!token) {
            setError("Authentication token not found. Please login again.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(
                "/api/student/profile",
                {
                    method: isEditMode ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        ...form,
                        phone,
                        enrollment_number: enrollmentNumber,
                        pincode: pincode || null,
                        specialization: form.specialization.trim() || null,
                        address: form.address.trim() || null,
                        city: form.city.trim() || null,
                        state: form.state.trim() || null,
                        research_interests:
                            form.research_interests.trim() || null,
                        skills: form.skills.trim() || null,
                        bio: form.bio.trim() || null,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to save your profile."
                );
            }

            navigate("/dashboard/student", { replace: true });
        } catch (saveError) {
            console.error("Save profile error:", saveError);

            if (saveError.message.includes("already exists")) {
                navigate("/dashboard/student", { replace: true });
                return;
            }

            setError(
                saveError.message ||
                    "Unable to save your profile. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    if (checkingProfile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B285F] text-white shadow-lg">
                        <Loader2 size={22} className="animate-spin" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                        Checking your profile...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F8FC] text-slate-900">
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-gradient-to-b from-[#071A46] via-[#0B2B72] to-[#123C83] text-white transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className="flex items-center gap-3 px-6 py-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <BookOpen size={23} />
                    </span>
                    <h1 className="text-xl font-bold">
                        Research<span className="text-blue-300">Hub</span>
                    </h1>
                </div>
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                    className="absolute right-4 top-5 text-blue-200 lg:hidden"
                >
                    <X size={20} />
                </button>
                <nav className="student-sidebar-nav flex-1 space-y-1 overflow-y-auto px-3" aria-label="Student navigation">
                    {[
                        ["Dashboard", LayoutDashboard, "/dashboard/student", false],
                        ["Create Project", Plus, "/repository/create", false],
                        ["My Project", FolderGit2, "/dashboard/student#repositories", false],
                        ["Joined Project", FolderGit2, "/dashboard/student?filter=joined#repositories", false],
                        ["Find Mentor", UserRound, "/find-mentor", false],
                    ].map(([label, Icon, path, active]) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => navigateTo(path)}
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${active ? "bg-white/15 text-white" : "text-blue-100/70 hover:bg-white/10 hover:text-white"}`}
                        >
                            <Icon size={18} />
                            <span className="flex-1 text-left">{label}</span>
                        </button>
                    ))}
                </nav>
                <div className="border-t border-white/10 px-3 py-4">
                    <button
                        type="button"
                        aria-current="page"
                        onClick={() => setSidebarOpen(false)}
                        className="flex w-full items-center gap-3 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white"
                    >
                        <UserRound size={18} />
                        Profile
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-blue-100/70 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            <main className="min-h-screen lg:ml-[250px]">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-white px-5 shadow-sm lg:px-8">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        type="button"
                        aria-label="Open navigation"
                        onClick={() => setSidebarOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 lg:hidden"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-[#102A63] lg:text-lg">
                            {isEditMode ? "Edit your profile" : "Complete your profile"}
                        </h2>
                        <p className="hidden text-xs text-slate-400 sm:block">Your academic and research information</p>
                    </div>
                </div>
            </header>


            {/* =====================================================
                MAIN
            ===================================================== */}

            <section className="
                mx-auto
                max-w-4xl
                px-6
                py-10
            ">

                {/* PAGE INTRO */}
                <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B285F] via-[#17358C] to-[#2453A6] p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
                    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-blue-300/10 blur-2xl" />

                    <div className="relative">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-blue-100">
                                <CheckCircle2 size={14} />
                                Profile Setup
                            </div>

                            <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-200/80">
                                Step 1 of 1
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {isEditMode ? "Edit your profile" : "Complete your profile"}
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
                            {isEditMode
                                ? "Update your academic and research information. Your changes will be saved to your ResearchHub account."
                                : "Add your academic and research information once. It will be securely linked to your ResearchHub account and used throughout your research workspace."}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-medium text-blue-100">
                            <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                                Personal
                            </span>
                            <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                                Academic
                            </span>
                            <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                                Research
                            </span>
                        </div>
                    </div>
                </div>


                {/* ERROR */}

                {error && (
                    <div className="
                        mb-6
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-red-200
                        bg-red-50/90 shadow-sm
                        px-4
                        py-3
                        text-sm
                        font-medium
                        text-red-600
                    ">

                        <span className="
                            flex
                            h-6
                            w-6
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-red-500
                            text-xs
                            font-bold
                            text-white
                        ">
                            !
                        </span>

                        {error}

                    </div>
                )}


                <form onSubmit={handleSubmit}>

                    {/* =================================================
                        PERSONAL INFORMATION
                    ================================================= */}

                    <section className="
                        rounded-2xl
                        border
                        border-slate-200/80
                        bg-white
                        p-6
                        shadow-sm shadow-slate-200/50
                        transition-shadow hover:shadow-md
                    ">

                        <div className="mb-6 flex items-center gap-3">

                            <div className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-600
                            ">
                                <User size={20} />
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-slate-900
                                ">
                                    Personal Information
                                </h3>

                                <p className="
                                    text-xs
                                    text-slate-400
                                ">
                                    Basic information about you
                                </p>
                            </div>

                        </div>


                        <div className="
                            grid
                            gap-5
                            md:grid-cols-2
                        ">

                            {/* PHONE */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Phone Number
                                    <span className="text-red-500">
                                        {" "}*
                                    </span>
                                </label>

                                <div className="relative">

                                    <Phone
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
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={form.phone}
                                        onChange={(e) =>
                                            handleChange(
                                                "phone",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter phone number"
                                        className="
                                            h-12
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            pl-11
                                            pr-4
                                            text-sm
                                            outline-none
                                            transition
                                            focus:border-blue-400
                                            focus:ring-4
                                            focus:ring-blue-50
                                        "
                                    />

                                </div>

                            </div>


                            {/* DOB */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Date of Birth
                                    <span className="text-red-500">
                                        {" "}*
                                    </span>
                                </label>

                                <div className="relative">

                                    <Calendar
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
                                        type="date"
                                        max={new Date().toISOString().split("T")[0]}
                                        value={form.date_of_birth}
                                        onChange={(e) =>
                                            handleChange(
                                                "date_of_birth",
                                                e.target.value
                                            )
                                        }
                                        className="
                                            h-12
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            pl-11
                                            pr-4
                                            text-sm
                                            outline-none
                                            transition
                                            focus:border-blue-400
                                            focus:ring-4
                                            focus:ring-blue-50
                                        "
                                    />

                                </div>

                            </div>


                            {/* GENDER */}

                            <div className="md:col-span-2">

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Gender
                                    <span className="text-red-500">
                                        {" "}*
                                    </span>
                                </label>

                                <select
                                    value={form.gender}
                                    onChange={(e) =>
                                        handleChange(
                                            "gender",
                                            e.target.value
                                        )
                                    }
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        text-sm
                                        text-slate-700
                                        outline-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                >
                                    <option value="">
                                        Select gender
                                    </option>

                                    <option value="male">
                                        Male
                                    </option>

                                    <option value="female">
                                        Female
                                    </option>

                                    <option value="other">
                                        Other
                                    </option>

                                </select>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        ACADEMIC INFORMATION
                    ================================================= */}

                    <section className="
                        mt-6
                        rounded-2xl
                        border
                        border-slate-200/80
                        bg-white
                        p-6
                        shadow-sm shadow-slate-200/50
                        transition-shadow hover:shadow-md
                    ">

                        <div className="mb-6 flex items-center gap-3">

                            <div className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-700
                            ">
                                <GraduationCap size={20} />
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-slate-900
                                ">
                                    Academic Information
                                </h3>

                                <p className="
                                    text-xs
                                    text-slate-400
                                ">
                                    Your academic details
                                </p>
                            </div>

                        </div>


                        <div className="
                            grid
                            gap-5
                            md:grid-cols-2
                        ">

                            {/* ENROLLMENT */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Enrollment Number
                                    <span className="text-red-500">
                                        {" "}*
                                    </span>
                                </label>

                                <input
                                    type="text"
                                    value={form.enrollment_number}
                                    onChange={(e) =>
                                        handleChange(
                                            "enrollment_number",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter enrollment number"
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        text-sm
                                        outline-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>


                            {/* SPECIALIZATION */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Specialization
                                </label>

                                <input
                                    type="text"
                                    value={form.specialization}
                                    onChange={(e) =>
                                        handleChange(
                                            "specialization",
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g. Data Science"
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        text-sm
                                        outline-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>


                            {/* YEAR */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Year
                                </label>

                                <select
                                    value={form.year}
                                    onChange={(e) =>
                                        handleChange(
                                            "year",
                                            e.target.value
                                        )
                                    }
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        text-sm
                                        outline-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                >
                                    <option value="">
                                        Select year
                                    </option>

                                    <option value="1">
                                        First Year
                                    </option>

                                    <option value="2">
                                        Second Year
                                    </option>

                                </select>

                            </div>


                            {/* SEMESTER */}

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Semester
                                </label>

                                <select
                                    value={form.semester}
                                    onChange={(e) =>
                                        handleChange(
                                            "semester",
                                            e.target.value
                                        )
                                    }
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        text-sm
                                        outline-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                >
                                    <option value="">
                                        Select semester
                                    </option>

                                    <option value="1">
                                        Semester 1
                                    </option>

                                    <option value="2">
                                        Semester 2
                                    </option>

                                    <option value="3">
                                        Semester 3
                                    </option>

                                    <option value="4">
                                        Semester 4
                                    </option>

                                </select>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        ADDRESS
                    ================================================= */}

                    <section className="
                        mt-6
                        rounded-2xl
                        border
                        border-slate-200/80
                        bg-white
                        p-6
                        shadow-sm shadow-slate-200/50
                        transition-shadow hover:shadow-md
                    ">

                        <div className="mb-6 flex items-center gap-3">

                            <div className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-700
                            ">
                                <MapPin size={20} />
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-slate-900
                                ">
                                    Address
                                </h3>

                                <p className="
                                    text-xs
                                    text-slate-400
                                ">
                                    Your current address
                                </p>
                            </div>

                        </div>


                        <div className="space-y-5">

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Address
                                </label>

                                <textarea
                                    maxLength={255}
                                    value={form.address}
                                    onChange={(e) =>
                                        handleChange(
                                            "address",
                                            e.target.value
                                        )
                                    }
                                    rows="3"
                                    placeholder="Enter your address"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        resize-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>


                            <div className="
                                grid
                                gap-5
                                md:grid-cols-3
                            ">

                                <div>

                                    <label className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    ">
                                        City
                                    </label>

                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) =>
                                            handleChange(
                                                "city",
                                                e.target.value
                                            )
                                        }
                                        placeholder="City"
                                        className="
                                            h-12
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            px-4
                                            text-sm
                                            outline-none
                                            focus:border-blue-400
                                            focus:ring-4
                                            focus:ring-blue-50
                                        "
                                    />

                                </div>


                                <div>

                                    <label className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    ">
                                        State
                                    </label>

                                    <input
                                        type="text"
                                        value={form.state}
                                        onChange={(e) =>
                                            handleChange(
                                                "state",
                                                e.target.value
                                            )
                                        }
                                        placeholder="State"
                                        className="
                                            h-12
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            px-4
                                            text-sm
                                            outline-none
                                            focus:border-blue-400
                                            focus:ring-4
                                            focus:ring-blue-50
                                        "
                                    />

                                </div>


                                <div>

                                    <label className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    ">
                                        Pincode
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={form.pincode}
                                        onChange={(e) =>
                                            handleChange(
                                                "pincode",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Pincode"
                                        className="
                                            h-12
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            px-4
                                            text-sm
                                            outline-none
                                            focus:border-blue-400
                                            focus:ring-4
                                            focus:ring-blue-50
                                        "
                                    />

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        RESEARCH INFORMATION
                    ================================================= */}

                    <section className="
                        mt-6
                        rounded-2xl
                        border
                        border-slate-200/80
                        bg-white
                        p-6
                        shadow-sm shadow-slate-200/50
                        transition-shadow hover:shadow-md
                    ">

                        <div className="mb-6 flex items-center gap-3">

                            <div className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-700
                            ">
                                <BookOpen size={20} />
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-slate-900
                                ">
                                    Research Information
                                </h3>

                                <p className="
                                    text-xs
                                    text-slate-400
                                ">
                                    Help us understand your research
                                    interests
                                </p>
                            </div>

                        </div>


                        <div className="space-y-5">

                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Research Interests
                                </label>

                                <textarea
                                    maxLength={1000}
                                    value={form.research_interests}
                                    onChange={(e) =>
                                        handleChange(
                                            "research_interests",
                                            e.target.value
                                        )
                                    }
                                    rows="3"
                                    placeholder="e.g. Artificial Intelligence, Machine Learning, Data Science"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        resize-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>


                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    Skills
                                </label>

                                <textarea
                                    maxLength={1000}
                                    value={form.skills}
                                    onChange={(e) =>
                                        handleChange(
                                            "skills",
                                            e.target.value
                                        )
                                    }
                                    rows="3"
                                    placeholder="e.g. Java, React, Python, MySQL"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        resize-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>


                            <div>

                                <label className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                ">
                                    About Me
                                </label>

                                <textarea
                                    maxLength={500}
                                    value={form.bio}
                                    onChange={(e) =>
                                        handleChange(
                                            "bio",
                                            e.target.value
                                        )
                                    }
                                    rows="4"
                                    placeholder="Write a short introduction about yourself..."
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        resize-none
                                        focus:border-blue-400
                                        focus:ring-4
                                        focus:ring-blue-50
                                    "
                                />

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        SUBMIT
                    ================================================= */}

                    <div className="
                        mt-6
                        flex
                        justify-end
                    ">

                        <button
                            type="submit"
                            disabled={saving || checkingProfile}
                            className="
                                group
                                flex
                                items-center
                                gap-3
                                rounded-xl
                                bg-gradient-to-r
                                from-blue-500
                                to-indigo-600
                                px-7
                                py-3.5
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                shadow-blue-500/20
                                transition-all
                                hover:-translate-y-0.5
                                hover:shadow-xl
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >

                            {saving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving Profile...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    {isEditMode ? "Save Changes" : "Save & Continue"}
                                    {!isEditMode && <ArrowRight
                                        size={18}
                                        className="transition-transform group-hover:translate-x-1"
                                    />}
                                </>
                            )}

                        </button>

                    </div>

                </form>

            </section>

            </main>
        </div>
    );
}
