
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Sparkles, GraduationCap, UserPlus } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF8F0] px-4 py-10 text-[#352D2A]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#C8E8D0]/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#B8A0E8]/40 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#F0E4D8] bg-white shadow-[0_20px_70px_rgba(86,61,43,0.10)] md:grid-cols-2">
        <section className="relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden bg-[#C8E8D0] p-8 text-center md:min-h-[650px] md:p-12">
          <div className="absolute left-8 top-8 flex h-12 w-12 rotate-[-10deg] items-center justify-center rounded-2xl bg-white text-[#FF786B] shadow-sm">
            <Sparkles size={24} />
          </div>

          <div className="absolute right-10 top-12 h-5 w-5 rounded-full bg-[#FFAA66]" />
          <div className="absolute bottom-16 left-10 h-8 w-8 rounded-full bg-[#B8A0E8]" />

          <div className="relative mb-7 flex h-40 w-40 items-center justify-center rounded-[36px] bg-white shadow-[0_12px_30px_rgba(86,61,43,0.10)] md:h-52 md:w-52">
            <div className="absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE6A7] text-[#352D2A]">
              <GraduationCap size={27} />
            </div>

            <div className="flex h-28 w-28 rotate-[6deg] items-center justify-center rounded-[28px] bg-[#B8A0E8] text-white md:h-36 md:w-36">
              <BookOpen size={68} strokeWidth={1.6} />
            </div>

            <div className="absolute -bottom-3 -left-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF786B] text-white">
              <UserPlus size={24} />
            </div>
          </div>

          <h2 className="max-w-sm text-3xl font-extrabold leading-tight md:text-4xl">
            Make learning your superpower.
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-6 text-[#4D6253] md:text-base">
            Create your account and turn your curiosity into personalized
            learning experiences with AI.
          </p>

          <div className="mt-7 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            <span className="h-2.5 w-8 rounded-full bg-[#FF786B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 md:p-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
            <Link to="/" className="mb-7 inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF786B] text-white">
                <BookOpen size={22} />
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                AI Course Builder
              </span>
            </Link>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#FF786B]">
                GET STARTED
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Create your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#82756F]">
                Start building your personalized AI courses.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={80}
                autoComplete="name"
                className="w-full rounded-2xl border border-[#F0E4D8] bg-[#FFFCF8] px-4 py-3.5 text-sm outline-none transition focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-[#F0E4D8] bg-[#FFFCF8] px-4 py-3.5 text-sm outline-none transition focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[#F0E4D8] bg-[#FFFCF8] px-4 py-3.5 text-sm outline-none transition focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF786B] px-5 py-3.5 font-bold text-white shadow-[0_6px_16px_rgba(255,120,107,0.25)] transition hover:-translate-y-0.5 hover:bg-[#F2675A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={19} />
              {submitting ? "Creating account..." : "Create my account"}
            </button>

            <p className="text-center text-sm text-[#82756F]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-[#E96458] hover:underline"
              >
                Login
              </Link>
            </p>

            <p className="text-center text-xs text-[#A39790]">
              Your learning journey starts with one step.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
