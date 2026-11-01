
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlusCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  GraduationCap,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Trash2,
  LogOut,
  Palette,
  Rocket,
  Clock3,
  ArrowRight,
  BookMarked,
  WandSparkles,
} from "lucide-react";

import api from "../services/api";

const levelColors = {
  Beginner: "bg-[#C8E8D0] text-[#356447]",
  Intermediate: "bg-[#FFE6A7] text-[#79571E]",
  Advanced: "bg-[#B8A0E8]/40 text-[#62489A]",
};

const courseAccents = [
  "bg-[#FFE6A7]",
  "bg-[#C8E8D0]",
  "bg-[#B8A0E8]/40",
  "bg-[#FFD8D2]",
  "bg-[#D6E8FF]",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");

  const [courses, setCourses] = useState([]);
  const [generatedCourse, setGeneratedCourse] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [courseToDelete, setCourseToDelete] = useState(null);

  async function fetchCourses() {
    try {
      setFetchingCourses(true);
      const response = await api.get("/courses/my-courses");
      setCourses(response.data.courses || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load saved courses."
      );
    } finally {
      setFetchingCourses(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setError("");
      await api.post("/auth/logout");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleGenerateCourse(event) {
    event.preventDefault();

    if (!topic.trim()) {
      setError("Please enter a course topic.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setGeneratedCourse(null);

      const response = await api.post("/courses/generate", {
        topic: topic.trim(),
        level,
      });

      const newCourse = response.data.course;

      setGeneratedCourse(newCourse);
      setSuccess("Course generated successfully!");
      setTopic("");

      await fetchCourses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate the course. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function getProgress(course) {
    const total = course.lessons?.length || 0;
    const completed = course.completedLessons?.length || 0;

    if (!total) return 0;

    return Math.min(100, Math.round((completed / total) * 100));
  }

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = courses.filter((course) => {
      const matchesSearch =
        !query ||
        course.title?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.topic?.toLowerCase().includes(query);

      const matchesLevel =
        filterLevel === "All" ||
        course.level?.toLowerCase() === filterLevel.toLowerCase();

      return matchesSearch && matchesLevel;
    });

    result.sort((a, b) => {
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }

      if (sortBy === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return result;
  }, [courses, searchTerm, filterLevel, sortBy]);

  function clearFilters() {
    setSearchTerm("");
    setFilterLevel("All");
    setSortBy("newest");
  }

  async function handleDeleteCourse() {
    if (!courseToDelete) return;

    const courseId = courseToDelete._id;

    try {
      setDeletingId(courseId);
      setError("");
      setSuccess("");

      await api.delete(`/courses/${courseId}`);

      setCourses((previousCourses) =>
        previousCourses.filter((course) => course._id !== courseId)
      );

      setGeneratedCourse((previousCourse) =>
        previousCourse?._id === courseId ? null : previousCourse
      );

      setCourseToDelete(null);
      setSuccess("Course deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete the course. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const totalLessons = courses.reduce(
    (total, course) => total + (course.lessons?.length || 0),
    0
  );

  const completedLessons = courses.reduce(
    (total, course) => total + (course.completedLessons?.length || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-5 text-[#352D2A] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0E4D8] pb-5">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF786B] text-white shadow-sm">
              <GraduationCap size={27} />
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                LearnBloom
              </span>
              <span className="block text-xs text-[#82756F]">
                Your personal AI classroom
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-[#82756F] sm:inline-flex sm:items-center sm:gap-2">
              <Sparkles size={16} className="text-[#FF786B]" />
              Learn at your own pace
            </span>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F0E4D8] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#FF786B] hover:text-[#D95D52] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <LogOut size={17} />
              )}
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* Welcome Illustration Section */}
        <section className="relative mt-8 overflow-hidden rounded-[2rem] bg-[#FFE6A7] p-6 sm:p-10 lg:p-12">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#79571E]">
              <Sparkles size={15} />
              Your learning space
            </span>

            <h1 className="mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Big ideas start with{" "}
              <span className="text-[#D95D52]">one little lesson.</span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[#69583E] sm:text-base">
              Turn your curiosity into a personalized learning journey.
              Create an AI course, explore new topics, and celebrate every
              step forward.
            </p>

            <button
              type="button"
              onClick={() =>
                document.getElementById("course-topic")?.focus()
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#352D2A] px-5 py-3 font-bold text-white transition hover:bg-[#51443F]"
            >
              Create a course
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="pointer-events-none absolute -bottom-10 right-0 hidden h-64 w-64 items-center justify-center sm:flex lg:right-12 lg:h-80 lg:w-80">
            <div className="absolute h-52 w-52 rounded-full bg-[#FFAA66] lg:h-64 lg:w-64" />
            <div className="absolute right-8 top-5 h-16 w-16 rotate-12 rounded-3xl bg-[#B8A0E8] lg:right-10 lg:top-8 lg:h-20 lg:w-20" />
            <div className="absolute bottom-8 left-2 h-14 w-14 rounded-full bg-[#C8E8D0] lg:bottom-10 lg:left-5 lg:h-20 lg:w-20" />

            <div className="relative flex h-40 w-36 -rotate-6 flex-col items-center justify-center rounded-[2rem] border-4 border-[#352D2A] bg-white shadow-xl lg:h-48 lg:w-40">
              <BookOpen size={55} strokeWidth={1.7} className="text-[#FF786B] lg:h-16 lg:w-16" />
              <span className="mt-3 rounded-full bg-[#C8E8D0] px-3 py-1 text-xs font-bold text-[#356447]">
                Keep growing!
              </span>
            </div>

            <Sparkles className="absolute right-2 top-20 h-8 w-8 text-[#D95D52] lg:right-3 lg:top-24 lg:h-10 lg:w-10" />
            <span className="absolute bottom-3 right-14 text-3xl text-[#D95D52] lg:bottom-4 lg:right-16 lg:text-4xl">
              ✳
            </span>
          </div>
        </section>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-[#C8E8D0]/50 p-4 text-sm font-medium text-[#356447]"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Learning Stats */}
        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-[#F0E4D8] bg-white p-5 shadow-[0_4px_20px_rgba(86,61,43,0.04)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE6A7] text-[#79571E]">
              <BookMarked size={23} />
            </span>
            <span>
              <span className="block text-2xl font-extrabold">
                {courses.length}
              </span>
              <span className="text-sm text-[#82756F]">Courses created</span>
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-[#F0E4D8] bg-white p-5 shadow-[0_4px_20px_rgba(86,61,43,0.04)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8E8D0] text-[#356447]">
              <CheckCircle2 size={23} />
            </span>
            <span>
              <span className="block text-2xl font-extrabold">
                {completedLessons}
              </span>
              <span className="text-sm text-[#82756F]">Lessons completed</span>
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-[#F0E4D8] bg-white p-5 shadow-[0_4px_20px_rgba(86,61,43,0.04)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B8A0E8]/40 text-[#62489A]">
              <GraduationCap size={23} />
            </span>
            <span>
              <span className="block text-2xl font-extrabold">
                {totalLessons}
              </span>
              <span className="text-sm text-[#82756F]">Lessons available</span>
            </span>
          </div>
        </section>

        {/* Course Builder */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border border-[#F0E4D8] bg-white p-6 shadow-[0_8px_28px_rgba(86,61,43,0.05)] sm:p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD8D2] text-[#D95D52]">
              <WandSparkles size={24} />
            </span>

            <h2 className="mt-5 text-2xl font-extrabold">
              What would you like to learn?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#82756F]">
              Pick a topic and let AI build a learning path just for you.
            </p>

            <form onSubmit={handleGenerateCourse} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="course-topic"
                  className="mb-2 block text-sm font-bold"
                >
                  Course topic
                </label>
                <input
                  id="course-topic"
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. MERN Stack for Beginners"
                  className="w-full rounded-xl border border-[#E8DCD1] bg-[#FFFCF8] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#A79A91] focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="course-level"
                  className="mb-2 block text-sm font-bold"
                >
                  Difficulty level
                </label>
                <select
                  id="course-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="w-full rounded-xl border border-[#E8DCD1] bg-[#FFFCF8] px-4 py-3.5 text-sm outline-none transition focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF786B] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#ED6A5F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <PlusCircle size={19} />
                )}
                {loading ? "Creating your course..." : "Generate my course"}
              </button>
            </form>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#FFF8F0] p-4">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-[#D95D52]" />
              <p className="text-xs leading-5 text-[#82756F]">
                Your course will be created from your chosen topic and
                difficulty level.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-[#E3D8F7] bg-[#EEE7FA] p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-[#62489A]">
                <Palette size={15} />
                A little inspiration
              </span>

              <h2 className="mt-5 max-w-md text-3xl font-extrabold leading-tight">
                Every expert was once a beginner.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-7 text-[#6D5C86]">
                Small steps every day can lead to amazing things. Choose
                something you are curious about and begin today.
              </p>
            </div>

            <div className="relative mt-8 flex min-h-48 items-center justify-center">
              <div className="absolute h-40 w-40 rounded-full bg-[#B8A0E8]/60" />
              <div className="absolute left-[18%] top-8 h-12 w-12 rotate-12 rounded-2xl bg-[#FFE6A7]" />
              <div className="absolute right-[18%] top-4 h-8 w-8 rounded-full bg-[#FFAA66]" />

              <div className="relative flex h-36 w-48 -rotate-3 flex-col justify-center rounded-2xl border-2 border-[#352D2A] bg-white p-5 shadow-lg">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#FF786B]" />
                  <span className="h-3 w-3 rounded-full bg-[#FFAA66]" />
                  <span className="h-3 w-3 rounded-full bg-[#C8E8D0]" />
                </div>
                <div className="h-2 w-24 rounded-full bg-[#E8DDF8]" />
                <div className="mt-2 h-2 w-32 rounded-full bg-[#FFE6A7]" />
                <div className="mt-2 h-2 w-20 rounded-full bg-[#C8E8D0]" />
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#62489A]">
                  <Rocket size={16} />
                  Your next chapter
                </div>
              </div>

              <Sparkles className="absolute right-[15%] top-14 h-7 w-7 text-[#8C70C2]" />
              <span className="absolute bottom-3 left-[20%] text-3xl text-[#D95D52]">✳</span>
            </div>
          </div>
        </section>

        {/* Newly Generated Course */}
        {generatedCourse && (
          <section className="mt-7 rounded-[1.75rem] border border-[#C8E8D0] bg-[#C8E8D0]/35 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#356447]">
                <CheckCircle2 size={25} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#356447]">Your course is ready!</p>
                <h3 className="mt-2 text-2xl font-extrabold">
                  {generatedCourse.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#64766A]">
                  {generatedCourse.description}
                </p>
                <p className="mt-3 text-sm text-[#64766A]">
                  {generatedCourse.lessons?.length || 0} lessons · {generatedCourse.level}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${generatedCourse._id}`)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#356447] px-5 py-3 font-bold text-white transition hover:bg-[#284E37]"
                >
                  Start learning <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* My Courses */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#D95D52]">
                Your learning library
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                My Courses
              </h2>
              <p className="mt-2 text-sm text-[#82756F]">
                Pick up where you left off or discover something new.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#F0E4D8] bg-white px-4 py-2 text-sm font-semibold text-[#82756F]">
              <BookOpen size={17} className="text-[#FF786B]" />
              {courses.length} courses
            </span>
          </div>

          {/* Search and Filters */}
          {!fetchingCourses && courses.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#F0E4D8] bg-white p-4 shadow-[0_4px_20px_rgba(86,61,43,0.04)] sm:p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_190px_190px]">
                <div>
                  <label
                    htmlFor="course-search"
                    className="mb-2 flex items-center gap-2 text-sm font-bold"
                  >
                    <Search size={16} className="text-[#D95D52]" />
                    Search courses
                  </label>
                  <input
                    id="course-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search title, topic, description..."
                    className="w-full rounded-xl border border-[#E8DCD1] bg-[#FFFCF8] px-4 py-3 text-sm outline-none transition placeholder:text-[#A79A91] focus:border-[#FF786B] focus:ring-4 focus:ring-[#FF786B]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="course-level-filter"
                    className="mb-2 flex items-center gap-2 text-sm font-bold"
                  >
                    <SlidersHorizontal size={16} className="text-[#D95D52]" />
                    Difficulty
                  </label>
                  <select
                    id="course-level-filter"
                    value={filterLevel}
                    onChange={(event) => setFilterLevel(event.target.value)}
                    className="w-full rounded-xl border border-[#E8DCD1] bg-[#FFFCF8] px-4 py-3 text-sm outline-none focus:border-[#FF786B]"
                  >
                    <option value="All">All levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="course-sort"
                    className="mb-2 flex items-center gap-2 text-sm font-bold"
                  >
                    <ArrowUpDown size={16} className="text-[#D95D52]" />
                    Sort by
                  </label>
                  <select
                    id="course-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="w-full rounded-xl border border-[#E8DCD1] bg-[#FFFCF8] px-4 py-3 text-sm outline-none focus:border-[#FF786B]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title-asc">Title: A to Z</option>
                    <option value="title-desc">Title: Z to A</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E4D8] pt-4">
                <p className="text-sm text-[#82756F]">
                  Showing{" "}
                  <strong className="text-[#352D2A]">
                    {filteredCourses.length}
                  </strong>{" "}
                  of {courses.length} courses
                </p>

                {(searchTerm || filterLevel !== "All" || sortBy !== "newest") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#D95D52] hover:text-[#B84B42]"
                  >
                    <X size={15} />
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Course List */}
          {fetchingCourses ? (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-white py-16 text-[#82756F]">
              <Loader2 size={22} className="animate-spin text-[#FF786B]" />
              Loading your courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-[#E8DCD1] bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFE6A7] text-[#79571E]">
                <BookOpen size={30} />
              </div>
              <h3 className="mt-5 text-xl font-extrabold">Your learning journey starts here</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82756F]">
                You haven't created a course yet. Choose a topic above and
                let AI prepare your first learning path.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("course-topic")?.focus()}
                className="mt-5 rounded-xl bg-[#FF786B] px-5 py-3 font-bold text-white transition hover:bg-[#ED6A5F]"
              >
                Create your first course
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-[#E8DCD1] bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#B8A0E8]/30 text-[#62489A]">
                <Search size={28} />
              </div>
              <h3 className="mt-5 text-xl font-extrabold">No matching courses</h3>
              <p className="mt-2 text-sm text-[#82756F]">
                Try another search term or change your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-[#352D2A] px-5 py-3 font-bold text-white transition hover:bg-[#51443F]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course, index) => {
                const progress = getProgress(course);
                const completedCount = course.completedLessons?.length || 0;
                const lessonCount = course.lessons?.length || 0;
                const accent = courseAccents[index % courseAccents.length];

                return (
                  <article
                    key={course._id}
                    className="group overflow-hidden rounded-[1.6rem] border border-[#F0E4D8] bg-white shadow-[0_5px_24px_rgba(86,61,43,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(86,61,43,0.09)]"
                  >
                    <div className={`relative flex h-32 items-center justify-center overflow-hidden ${accent}`}>
                      <div className="absolute -right-4 -top-8 h-28 w-28 rounded-full border-[14px] border-white/30" />
                      <div className="absolute -bottom-8 -left-3 h-24 w-24 rounded-full bg-white/25" />

                      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#352D2A]/10 bg-white/80 text-[#352D2A] shadow-sm transition group-hover:rotate-3">
                        <BookOpen size={31} strokeWidth={1.7} />
                      </span>

                      <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#51443F]">
                        {course.level || "Beginner"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCourseToDelete(course)}
                        disabled={Boolean(deletingId)}
                        aria-label={`Delete ${course.title || "course"}`}
                        title="Delete course"
                        className="absolute right-3 top-3 rounded-xl bg-white/90 p-2 text-[#B84B42] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#82756F]">
                        <Clock3 size={14} />
                        {lessonCount} lessons
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/courses/${course._id}`)}
                        className="mt-3 block w-full text-left"
                      >
                        <h3 className="text-lg font-extrabold leading-snug transition group-hover:text-[#D95D52]">
                          {course.title || course.topic || "Untitled Course"}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#82756F]">
                          {course.description || "Explore this personalized learning course."}
                        </p>
                      </button>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#82756F]">
                            Learning progress
                          </span>
                          <span className="font-extrabold text-[#352D2A]">
                            {progress}%
                          </span>
                        </div>

                        <div
                          className="h-2 overflow-hidden rounded-full bg-[#F2EAE2]"
                          role="progressbar"
                          aria-label={`${course.title || "Course"} progress`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-[#FF786B] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-[#82756F]">
                          {completedCount} of {lessonCount} lessons completed
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/courses/${course._id}`)}
                        className="mt-5 flex w-full items-center justify-between border-t border-[#F0E4D8] pt-4 text-sm font-extrabold text-[#D95D52] transition hover:text-[#B84B42]"
                      >
                        <span>Continue learning</span>
                        <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      {courseToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#352D2A]/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setCourseToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            className="w-full max-w-md rounded-[1.75rem] border border-[#F0E4D8] bg-[#FFFDF9] p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD8D2] text-[#B84B42]">
              <Trash2 size={25} />
            </div>

            <h2 id="delete-course-title" className="text-xl font-extrabold">
              Delete this course?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#82756F]">
              Are you sure you want to delete{" "}
              <strong className="text-[#352D2A]">
                {courseToDelete.title || "this course"}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setCourseToDelete(null)}
                className="rounded-xl border border-[#E8DCD1] px-4 py-3 font-bold text-[#82756F] transition hover:bg-[#FFF8F0] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteCourse}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#D95D52] px-4 py-3 font-bold text-white transition hover:bg-[#B84B42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
