
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import VideoList from "../components/VideoList";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Video,
  Sparkles,
  GraduationCap,
  PlayCircle,
  Clock3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";

function getYouTubeVideoId(url) {
  try {
    const videoUrl = new URL(url);

    if (videoUrl.hostname.includes("youtube.com")) {
      return videoUrl.searchParams.get("v");
    }

    if (videoUrl.hostname === "youtu.be") {
      return videoUrl.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
}

export default function CourseDetail() {
  const { id } = useParams();

  useEffect(() => {
  window.scrollTo(0, 0);
}, [selectedIndex]);
  

  const [course, setCourse] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");

  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");
  const [activeVideoId, setActiveVideoId] = useState(null);

  const [lessonVideos, setLessonVideos] = useState({});
  const lessonVideosRef = useRef({});
  lessonVideosRef.current = lessonVideos;
  const pollingRef = useRef(false);
  const generatedVideoRef = useRef(null);

  const courseId = course?._id;
  const currentLessonId = course?.lessons?.[selectedIndex]?._id;

  function updateLessonVideo(lessonId, patch) {
    setLessonVideos((previous) => ({
      ...previous,
      [lessonId]: { ...(previous[lessonId] || {}), ...patch },
    }));
  }

  useEffect(() => {
    let active = true;

    async function fetchCourse() {
      try {
        const response = await api.get(`/courses/${id}`);

        if (active) {
          setCourse(response.data.course);
          setLessonVideos({});
          setSelectedIndex(0);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Could not load this course."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCourse();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!courseId || !currentLessonId) return;

    let active = true;

    async function fetchVideos() {
      setVideosLoading(true);
      setVideosError("");
      setVideos([]);
      setActiveVideoId(null);

      try {
        const response = await api.get(`/courses/${courseId}/videos`, {
          params: { lessonId: currentLessonId },
        });

        if (active) setVideos(response.data.videos || []);
      } catch (err) {
        if (active) {
          setVideosError(
            err.response?.data?.message || "Could not load YouTube videos."
          );
        }
      } finally {
        if (active) setVideosLoading(false);
      }
    }

    fetchVideos();

    return () => {
      active = false;
    };
  }, [courseId, currentLessonId]);

  const hasPending = Object.values(lessonVideos).some(
    (item) => item.renderId && !item.url && !item.error
  );

  useEffect(() => {
    if (!hasPending || !courseId) return;

    let stopped = false;

    async function saveVideo(lessonId, videoUrl) {
      try {
        await api.patch(
          `/courses/${courseId}/lessons/${lessonId}/video`,
          { videoUrl }
        );

        setCourse((previous) =>
          previous
            ? {
                ...previous,
                lessons: previous.lessons.map((item) =>
                  String(item._id) === String(lessonId)
                    ? { ...item, videoUrl }
                    : item
                ),
              }
            : previous
        );
      } catch (err) {
        console.error("Could not save lesson video:", err);
      }
    }

    async function poll() {
      if (pollingRef.current) return;

      pollingRef.current = true;

      try {
        const pending = Object.entries(lessonVideosRef.current).filter(
          ([, item]) => item.renderId && !item.url && !item.error
        );

        await Promise.all(
          pending.map(async ([lessonId, item]) => {
            try {
              const response = await api.get(
                `/courses/${courseId}/videos/status/${item.renderId}`
              );

              if (stopped) return;

              const status = response.data.status;

              if (status === "done") {
                const url = response.data.videoUrl || "";

                if (url) {
                  updateLessonVideo(lessonId, { status, url });
                  saveVideo(lessonId, url);
                } else {
                  updateLessonVideo(lessonId, {
                    status,
                    error: "Video finished but no URL was returned.",
                  });
                }
              } else if (status === "failed") {
                updateLessonVideo(lessonId, {
                  status,
                  error: response.data.error || "Video rendering failed.",
                });
              } else {
                updateLessonVideo(lessonId, { status });
              }
            } catch (err) {
              if (stopped) return;

              updateLessonVideo(lessonId, {
                error:
                  err.response?.data?.message ||
                  "Could not check video rendering status.",
              });
            }
          })
        );
      } finally {
        pollingRef.current = false;
      }
    }

    poll();
    const intervalId = setInterval(poll, 4000);

    return () => {
      stopped = true;
      clearInterval(intervalId);
      pollingRef.current = false;
    };
  }, [hasPending, courseId]);

  function isCompleted(lessonId) {
    return (course?.completedLessons || []).some(
      (completedId) =>
        String(completedId?._id || completedId) === String(lessonId)
    );
  }

  async function toggleLessonProgress() {
    const currentLesson = course.lessons[selectedIndex];
    const completed = !isCompleted(currentLesson._id);

    setSaving(true);
    setProgressError("");

    try {
      const response = await api.patch(
        `/courses/${course._id}/lessons/${currentLesson._id}/progress`,
        { completed }
      );

      setCourse((previous) => ({
        ...previous,
        completedLessons: response.data.completedLessons,
      }));
    } catch (err) {
      setProgressError(
        err.response?.data?.message || "Could not update lesson progress."
      );
    } finally {
      setSaving(false);
    }
  }

  function handlePlayYouTube(videoId) {
    generatedVideoRef.current?.pause();
    setActiveVideoId(videoId);
  }

  async function handleGenerateVideo() {
    if (!course || !course.lessons[selectedIndex]) return;

    const lessonId = course.lessons[selectedIndex]._id;

    updateLessonVideo(lessonId, {
      starting: true,
      status: "starting",
      renderId: "",
      url: "",
      error: "",
    });

    try {
      const response = await api.post(
        `/courses/${course._id}/generate-video`,
        { lessonId }
      );

      updateLessonVideo(lessonId, {
        starting: false,
        renderId: response.data.renderId,
        status: "queued",
      });
    } catch (err) {
      updateLessonVideo(lessonId, {
        starting: false,
        status: "",
        error:
          err.response?.data?.message || "Could not start video generation.",
      });
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] px-5 py-10 text-[#352D2A]">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-5 w-40 rounded-full bg-[#F0E4D8]" />
          <div className="h-48 rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="h-80 rounded-[28px] bg-white" />
            <div className="h-96 rounded-[28px] bg-white" />
          </div>
          <p className="text-sm text-[#82756F]">Preparing your learning space...</p>
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-5 py-10 text-[#352D2A]">
        <div className="w-full max-w-lg rounded-[28px] border border-[#F0E4D8] bg-white p-8 text-center shadow-[0_8px_28px_rgba(86,61,43,0.07)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE6A7]">
            <BookOpen size={30} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Course unavailable</h1>
          <p className="mt-3 text-[#82756F]">
            {error || "Course not found."}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF786B] px-5 py-3 font-semibold text-white transition hover:bg-[#f36558]"
          >
            <ArrowLeft size={18} />
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const lesson = course.lessons[selectedIndex];
  const totalLessons = course.lessons.length;

  const completedCount = course.lessons.filter((item) =>
    isCompleted(item._id)
  ).length;

  const progress =
    totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

  const playableVideos = videos
    .map((video) => ({
      ...video,
      videoId: getYouTubeVideoId(video.url) || video.videoId,
    }))
    .filter((video) => video.videoId);

  const lessonVideo = lesson ? lessonVideos[lesson._id] || {} : {};

  const isBusy =
    Boolean(lessonVideo.starting) ||
    Boolean(
      lessonVideo.renderId && !lessonVideo.url && !lessonVideo.error
    );

  const lessonVideoUrl = isBusy
    ? ""
    : lessonVideo.url || lesson?.videoUrl || "";

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-7 text-[#352D2A] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/dashboard"
          className="group inline-flex items-center gap-2 rounded-full border border-[#F0E4D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#82756F] shadow-sm transition hover:border-[#FF786B] hover:text-[#352D2A]"
        >
          <ArrowLeft size={17} className="transition group-hover:-translate-x-1" />
          Back to dashboard
        </Link>

        {/* Course information */}
        <section className="relative mt-7 overflow-hidden rounded-[30px] border border-[#F0E4D8] bg-white p-6 shadow-[0_8px_28px_rgba(86,61,43,0.07)] sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#FFE6A7]/60 blur-2xl" />
          <div className="pointer-events-none absolute right-36 top-28 h-24 w-24 rounded-full bg-[#C8E8D0]/60 blur-xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFE6A7] px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-[#6E5134]">
                <GraduationCap size={15} />
                {course.level} course
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8E8D0] px-3.5 py-2 text-xs font-bold text-[#356548]">
                <BookOpen size={14} />
                {totalLessons} lessons
              </span>
            </div>

            <div className="mt-5 grid items-center gap-7 md:grid-cols-[1fr_auto]">
              <div>
                <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {course.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#82756F] sm:text-lg">
                  {course.description}
                </p>
              </div>

              <div className="hidden h-32 w-32 items-center justify-center rounded-[32px] bg-[#F2EAFB] md:flex">
                <div className="relative">
                  <BookOpen size={58} strokeWidth={1.5} className="text-[#9275CB]" />
                  <Sparkles size={25} className="absolute -right-5 -top-4 text-[#FFAA66]" />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-[#FFF8F0] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">Your learning journey</p>
                  <p className="mt-1 text-sm text-[#82756F]">
                    Keep going, you're making progress!
                  </p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-lg font-extrabold text-[#FF786B] shadow-sm">
                  {progress}%
                </span>
              </div>

              <div
                className="mt-5 h-3 overflow-hidden rounded-full bg-[#F0E4D8]"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Course progress"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF786B] via-[#FFAA66] to-[#B8A0E8] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#82756F]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-[#65A77A]" />
                  <strong className="text-[#352D2A]">{completedCount}</strong> of {totalLessons} completed
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 size={17} className="text-[#B8A0E8]" />
                  {Math.max(totalLessons - completedCount, 0)} lessons to go
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Lesson navigation */}
          <aside className="rounded-[28px] border border-[#F0E4D8] bg-white p-5 shadow-[0_8px_28px_rgba(86,61,43,0.05)] lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#FF786B]">
                  Your roadmap
                </p>
                <h2 className="mt-1 text-xl font-extrabold">Course lessons</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFE6A7]">
                <BookOpen size={21} className="text-[#795B36]" />
              </div>
            </div>

            <p className="mt-3 text-sm text-[#82756F]">
              Choose a lesson and learn at your own pace.
            </p>

            <div className="mt-5 space-y-3">
              {course.lessons.map((item, index) => {
                const done = isCompleted(item._id);
                const hasAiVideo = Boolean(
                  lessonVideos[item._id]?.url || item.videoUrl
                );
                const selected = selectedIndex === index;

                return (
                  <button
                    key={item._id || index}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    aria-current={selected ? "step" : undefined}
                    className={`w-full rounded-2xl border p-4 text-left transition duration-200 ${
                      selected
                        ? "border-[#FF786B] bg-[#FFF0E9] shadow-[0_5px_16px_rgba(255,120,107,0.12)]"
                        : "border-[#F0E4D8] bg-white hover:border-[#FFAA66] hover:bg-[#FFFAF4]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                          selected
                            ? "bg-[#FF786B] text-white"
                            : "bg-[#F5EDE5] text-[#82756F]"
                        }`}
                      >
                        Lesson {index + 1}
                      </span>

                      <span className="flex items-center gap-2">
                        {hasAiVideo && (
                          <Video size={16} className="text-[#9275CB]" />
                        )}
                        {done && (
                          <CheckCircle2 size={18} className="text-[#65A77A]" />
                        )}
                      </span>
                    </span>

                    <span className="mt-3 block font-bold leading-5 text-[#352D2A]">
                      {item.title}
                    </span>

                    {selected && (
                      <span className="mt-2 block text-xs font-semibold text-[#C75E53]">
                        Currently learning
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#EAF5EC] p-4">
              <Sparkles size={19} className="mt-0.5 shrink-0 text-[#548B66]" />
              <p className="text-xs leading-5 text-[#52715B]">
                Small steps every day lead to big achievements. Keep learning!
              </p>
            </div>
          </aside>

          {/* Selected lesson */}
          {lesson && (
            <section className="min-w-0 rounded-[28px] border border-[#F0E4D8] bg-white p-5 shadow-[0_8px_28px_rgba(86,61,43,0.05)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F2EAFB] px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-[#795EAD]">
                  <GraduationCap size={15} />
                  Lesson {selectedIndex + 1}
                </span>

                {isCompleted(lesson._id) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5EC] px-3.5 py-2 text-xs font-bold text-[#427451]">
                    <CheckCircle2 size={15} />
                    Completed
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-2xl font-extrabold leading-tight sm:text-3xl">
                {lesson.title}
              </h2>

              <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#82756F]">
                {lesson.summary}
              </p>

              {/* Learning objectives */}
              <div className="mt-8 rounded-[24px] bg-[#FFF8F0] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFE6A7]">
                    <Sparkles size={22} className="text-[#795B36]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">What you'll learn</h3>
                    <p className="mt-1 text-sm text-[#82756F]">
                      Key takeaways from this lesson
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3">
                  {(lesson.keyPoints || []).map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-[#F0E4D8] bg-white p-3.5 text-sm leading-6 text-[#5F514A] sm:text-base"
                    >
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-[#65A77A]"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lesson script */}
              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2EAFB]">
                    <BookOpen size={22} className="text-[#9275CB]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Lesson content</h3>
                    <p className="mt-1 text-sm text-[#82756F]">
                      Read through the lesson at your own pace
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#F0E4D8] bg-white p-5 sm:p-6">
                  <p className="whitespace-pre-line text-base leading-8 text-[#5F514A]">
                    {lesson.script}
                  </p>
                </div>
              </div>

              {/* AI-generated lesson video */}
              <section className="mt-8 overflow-hidden rounded-[26px] border border-[#E2D6F7] bg-[#FBF8FF] p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#B8A0E8] text-white shadow-sm">
                    <Video size={27} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#9275CB]">
                      Personalized learning
                    </span>
                    <h2 className="mt-1 text-xl font-extrabold">
                      AI Generated Lesson Video
                    </h2>
                  </div>
                  <Sparkles size={24} className="hidden text-[#FFAA66] sm:block" />
                </div>

                <p className="mt-4 text-sm leading-7 text-[#82756F]">
                  Generate a narrated video for{" "}
                  <span className="font-bold text-[#352D2A]">
                    {lesson.title}
                  </span>
                  . Your video will be saved to this lesson when rendering is complete.
                </p>

                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isBusy}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#9275CB] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#8062BA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <PlayCircle size={19} />
                  )}
                  {lessonVideo.starting
                    ? "Starting generation..."
                    : isBusy
                    ? "Rendering video..."
                    : lessonVideoUrl
                    ? "Regenerate video"
                    : "Generate AI Lesson Video"}
                </button>

                {isBusy && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#E2D6F7] bg-white p-4">
                    <RefreshCw size={18} className="mt-0.5 shrink-0 animate-spin text-[#9275CB]" />
                    <div>
                      <p className="font-bold text-[#5E4988]">Creating your video</p>
                      <p className="mt-1 text-sm text-[#82756F]">
                        Status: {lessonVideo.status || "queued"}. Please wait while your lesson video is being prepared.
                      </p>
                    </div>
                  </div>
                )}

                {lessonVideo.error && (
                  <div className="mt-4 rounded-xl border border-[#F5C8C1] bg-[#FFF0ED] p-4">
                    <p className="text-sm font-medium text-[#B64D43]">
                      {lessonVideo.error}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setLessonVideos((previous) => ({
                          ...previous,
                          [lesson._id]: {},
                        }))
                      }
                      className="mt-3 rounded-lg border border-[#F0B8AF] bg-white px-4 py-2 text-sm font-bold text-[#B64D43] transition hover:bg-[#FFF8F0]"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {lessonVideoUrl && (
                  <div className="mt-5 rounded-2xl border border-[#D8EBDD] bg-white p-4 sm:p-5">
                    <h3 className="mb-4 flex items-center gap-2 font-extrabold text-[#427451]">
                      <CheckCircle2 size={19} />
                      Your AI lesson video is ready!
                    </h3>
                    <video
                      key={lessonVideoUrl}
                      ref={generatedVideoRef}
                      controls
                      playsInline
                      className="w-full rounded-xl bg-black"
                      src={lessonVideoUrl}
                      onPlay={() => setActiveVideoId(null)}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
              </section>

              {/* Existing YouTube videos */}
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFE6A7]">
                    <PlayCircle size={22} className="text-[#795B36]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold">Learn with YouTube</h2>
                    <p className="mt-1 text-sm text-[#82756F]">
                      Explore more videos for this lesson
                    </p>
                  </div>
                </div>

                {videosLoading && (
                  <div className="flex items-center gap-3 rounded-xl bg-[#FFF8F0] p-4 text-sm text-[#82756F]">
                    <RefreshCw size={17} className="animate-spin text-[#FF786B]" />
                    Loading videos...
                  </div>
                )}

                {videosError && (
                  <p className="rounded-xl border border-[#F5C8C1] bg-[#FFF0ED] p-4 text-sm text-[#B64D43]">
                    {videosError}
                  </p>
                )}

                {!videosLoading &&
                  !videosError &&
                  playableVideos.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#E5D4C5] bg-[#FFFCF8] px-5 py-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE6A7]">
                        <Video size={23} className="text-[#795B36]" />
                      </div>
                      <p className="mt-3 font-bold">No videos found for this lesson.</p>
                      <p className="mt-1 text-sm text-[#82756F]">
                        Try again later or use the AI-generated lesson video.
                      </p>
                    </div>
                  )}

                <VideoList
                  videos={playableVideos}
                  activeId={activeVideoId}
                  onSelect={handlePlayYouTube}
                />
              </section>

              {/* Lesson completion */}
              <div className="mt-8 border-t border-[#F0E4D8] pt-6">
                <button
                  type="button"
                  onClick={toggleLessonProgress}
                  disabled={saving}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCompleted(lesson._id)
                      ? "border border-[#B7DCC0] bg-[#EAF5EC] text-[#427451] hover:bg-[#DDEFE1]"
                      : "bg-[#FF786B] text-white shadow-sm hover:bg-[#f36558]"
                  }`}
                >
                  {saving ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}

                  {saving
                    ? "Saving..."
                    : isCompleted(lesson._id)
                    ? "Mark as incomplete"
                    : "Mark as completed"}
                </button>

                {progressError && (
                  <p className="mt-3 rounded-xl bg-[#FFF0ED] p-3 text-sm text-[#B64D43]">
                    {progressError}
                  </p>
                )}
              </div>

              {/* Previous and next lesson */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E4D8] pt-6">
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  onClick={() => setSelectedIndex((index) => index - 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E5D4C5] bg-white px-4 py-3 font-bold text-[#5F514A] transition hover:border-[#FFAA66] hover:bg-[#FFFAF4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                  Previous lesson
                </button>

                <span className="text-sm font-semibold text-[#82756F]">
                  {selectedIndex + 1} of {totalLessons}
                </span>

                <button
                  type="button"
                  disabled={selectedIndex === totalLessons - 1}
                  onClick={() => setSelectedIndex((index) => index + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF786B] px-5 py-3 font-bold text-white transition hover:bg-[#f36558] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next lesson
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="py-8 text-center text-sm text-[#A09187]">
          Keep learning, one lesson at a time.
        </footer>
      </div>
    </main>
  );
}
