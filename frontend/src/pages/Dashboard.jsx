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
} from "lucide-react";

import api from "../services/api";

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

  // Search, filter, and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Delete confirmation dialog
  const [courseToDelete, setCourseToDelete] = useState(null);

  // Fetch saved courses
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

  // Logout
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

  // Generate a new course
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

  // Calculate course progress
  function getProgress(course) {
    const total = course.lessons?.length || 0;
    const completed = course.completedLessons?.length || 0;

    if (total === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((completed / total) * 100)
    );
  }

  // Search, filter, and sort courses
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

  // Reset search and filters
  function clearFilters() {
    setSearchTerm("");
    setFilterLevel("All");
    setSortBy("newest");
  }

  // Delete a course
  async function handleDeleteCourse() {
    if (!courseToDelete) {
      return;
    }

    const courseId = courseToDelete._id;

    try {
      setDeletingId(courseId);
      setError("");
      setSuccess("");

      await api.delete(`/courses/${courseId}`);

      setCourses((previousCourses) =>
        previousCourses.filter(
          (course) => course._id !== courseId
        )
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-3">
              <GraduationCap size={27} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                AI Course Builder
              </h1>

              <p className="text-sm text-slate-400">
                Learn something new every day.
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 font-medium text-slate-200 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} />
            )}

            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        {/* Welcome Section */}
        <section className="mt-10">
          <p className="font-medium text-violet-400">
            YOUR LEARNING SPACE
          </p>

          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Create your next course
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Generate personalized courses with AI, explore
            lessons, and track your learning progress.
          </p>
        </section>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
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

        {/* Success Message */}
        {success && (
          <div
            role="status"
            className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300"
          >
            <span>{success}</span>

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

        {/* Generate Course Form */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-violet-400" size={24} />

            <div>
              <h3 className="text-xl font-bold">
                Generate a new course
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Tell AI what you want to learn.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleGenerateCourse}
            className="mt-6 grid gap-5 md:grid-cols-[1fr_200px_auto]"
          >
            <div>
              <label
                htmlFor="topic"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Course topic
              </label>

              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. MERN Stack for Beginners"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="level"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Difficulty level
              </label>

              <select
                id="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {loading ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <PlusCircle size={19} />
                )}

                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </section>

        {/* Newly Generated Course */}
        {generatedCourse && (
          <section className="mt-8 rounded-2xl border border-violet-500/40 bg-violet-500/5 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={24}
                className="mt-1 shrink-0 text-green-400"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-400">
                  Course ready
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {generatedCourse.title}
                </h3>

                <p className="mt-2 leading-7 text-slate-400">
                  {generatedCourse.description}
                </p>

                <p className="mt-3 text-sm text-slate-400">
                  {generatedCourse.lessons?.length || 0} lessons
                  {" · "}
                  {generatedCourse.level}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/courses/${generatedCourse._id}`)
                  }
                  className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500"
                >
                  Start learning
                </button>
              </div>
            </div>
          </section>
        )}

        {/* My Courses */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">
                My Courses
              </h3>

              <p className="mt-2 text-slate-400">
                Search, organize, and continue learning.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <BookOpen size={18} />
              {courses.length} total courses
            </div>
          </div>

          {/* Search and Filters */}
          {!fetchingCourses && courses.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_200px_200px]">

                {/* Search */}
                <div>
                  <label
                    htmlFor="course-search"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <Search size={16} />
                    Search courses
                  </label>

                  <input
                    id="course-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search by title, topic, description..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
                  />
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label
                    htmlFor="course-level-filter"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <SlidersHorizontal size={16} />
                    Difficulty
                  </label>

                  <select
                    id="course-level-filter"
                    value={filterLevel}
                    onChange={(event) =>
                      setFilterLevel(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="All">All levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Sorting */}
                <div>
                  <label
                    htmlFor="course-sort"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <ArrowUpDown size={16} />
                    Sort by
                  </label>

                  <select
                    id="course-sort"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title-asc">Title: A to Z</option>
                    <option value="title-desc">Title: Z to A</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <p className="text-sm text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {filteredCourses.length}
                  </span>{" "}
                  of {courses.length} courses
                </p>

                {(searchTerm ||
                  filterLevel !== "All" ||
                  sortBy !== "newest") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"
                  >
                    <X size={15} />
                    Reset search and filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Course List */}
          {fetchingCourses ? (
            <div className="mt-8 flex items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
              Loading your courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
              <BookOpen
                size={36}
                className="mx-auto text-slate-500"
              />

              <h4 className="mt-4 text-lg font-semibold">
                No courses yet
              </h4>

              <p className="mt-2 text-slate-400">
                Generate your first course to get started.
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
              <Search
                size={36}
                className="mx-auto text-slate-500"
              />

              <h4 className="mt-4 text-lg font-semibold">
                No matching courses
              </h4>

              <p className="mt-2 text-slate-400">
                Try another search term or change your filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => {
                const progress = getProgress(course);
                const completedCount =
                  course.completedLessons?.length || 0;
                const totalLessons =
                  course.lessons?.length || 0;

                return (
                  <article
                    key={course._id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-violet-500 hover:bg-slate-900/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm text-violet-400">
                        <BookOpen size={17} />
                        {course.level || "Beginner"}
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {totalLessons} lessons
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setCourseToDelete(course)}
                          disabled={Boolean(deletingId)}
                          aria-label={`Delete ${course.title}`}
                          title="Delete course"
                          className="rounded-lg border border-red-500/30 p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/courses/${course._id}`)
                      }
                      className="mt-4 block w-full text-left"
                    >
                      <h4 className="text-lg font-bold">
                        {course.title || course.topic || "Untitled Course"}
                      </h4>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                        {course.description}
                      </p>
                    </button>

                    {/* Course Progress */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-400">
                          Course progress
                        </span>

                        <span className="font-semibold text-violet-400">
                          {progress}%
                        </span>
                      </div>

                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-800"
                        role="progressbar"
                        aria-label="Course progress"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {completedCount} of {totalLessons} lessons completed
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/courses/${course._id}`)
                      }
                      className="mt-5 flex w-full items-center justify-between border-t border-slate-800 pt-4 text-left text-sm font-medium text-violet-400 hover:text-violet-300"
                    >
                      <span>Continue learning</span>
                      <span>→</span>
                    </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingId
            ) {
              setCourseToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 size={24} />
            </div>

            <h2
              id="delete-course-title"
              className="text-xl font-bold text-white"
            >
              Delete this course?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Are you sure you want to delete{" "}
              <strong className="text-white">
                {courseToDelete.title || "this course"}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setCourseToDelete(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteCourse}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Course
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