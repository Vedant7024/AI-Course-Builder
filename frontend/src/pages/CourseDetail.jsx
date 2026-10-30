
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import VideoList from "../components/VideoList";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Video,
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

  const [course, setCourse] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");

  // Existing YouTube video states
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");

  // AI-generated video states
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [renderId, setRenderId] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [generatedVideoError, setGeneratedVideoError] = useState("");

  // Load course details
  useEffect(() => {
    let active = true;

    async function fetchCourse() {
      try {
        const response = await api.get(`/courses/${id}`);

        if (active) {
          setCourse(response.data.course);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load this course."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchCourse();

    return () => {
      active = false;
    };
  }, [id]);

  // Load YouTube videos for the selected lesson
  useEffect(() => {
    if (!course || !course.lessons[selectedIndex]) {
      return;
    }

    let active = true;

    async function fetchVideos() {
      setVideosLoading(true);
      setVideosError("");
      setVideos([]);

      try {
        const currentLesson = course.lessons[selectedIndex];

        const response = await api.get(
          `/courses/${course._id}/videos`,
          {
            params: {
              lessonId: currentLesson._id,
            },
          }
        );

        if (active) {
          setVideos(response.data.videos || []);
        }
      } catch (err) {
        if (active) {
          setVideosError(
            err.response?.data?.message ||
              "Could not load YouTube videos."
          );
        }
      } finally {
        if (active) {
          setVideosLoading(false);
        }
      }
    }

    fetchVideos();

    return () => {
      active = false;
    };
  }, [course, selectedIndex]);

  // Check lesson completion
  function isCompleted(lessonId) {
    return (course?.completedLessons || []).some(
      (completedId) =>
        String(completedId?._id || completedId) ===
        String(lessonId)
    );
  }

  // Update lesson completion
  async function toggleLessonProgress() {
    const lesson = course.lessons[selectedIndex];
    const completed = !isCompleted(lesson._id);

    setSaving(true);
    setProgressError("");

    try {
      const response = await api.patch(
        `/courses/${course._id}/lessons/${lesson._id}/progress`,
        { completed }
      );

      setCourse((previous) => ({
        ...previous,
        completedLessons: response.data.completedLessons,
      }));
    } catch (err) {
      setProgressError(
        err.response?.data?.message ||
          "Could not update lesson progress."
      );
    } finally {
      setSaving(false);
    }
  }

  // Start AI lesson video generation
  async function handleGenerateVideo() {
    if (!course || !course.lessons[selectedIndex]) {
      return;
    }

    const currentLesson = course.lessons[selectedIndex];

    setGeneratingVideo(true);
    setGeneratedVideoError("");
    setGeneratedVideoUrl("");
    setRenderId("");
    setVideoStatus("starting");

    try {
      const response = await api.post(
        `/courses/${course._id}/generate-video`,
        {
          lessonId: currentLesson._id,
        }
      );

      setRenderId(response.data.renderId);
      setVideoStatus("queued");
    } catch (err) {
      setVideoStatus("");
      setGeneratedVideoError(
        err.response?.data?.message ||
          "Could not start video generation."
      );
    } finally {
      setGeneratingVideo(false);
    }
  }

  // Poll Shotstack until the video is ready
  useEffect(() => {
    if (!renderId || !course?._id) {
      return;
    }

    let active = true;
    let timeoutId;

    async function checkVideoStatus() {
      try {
        const response = await api.get(
          `/courses/${course._id}/videos/status/${renderId}`
        );

        if (!active) {
          return;
        }

        const status = response.data.status;
        setVideoStatus(status);

        if (status === "done") {
          setGeneratedVideoUrl(response.data.videoUrl || "");
          return;
        }

        if (status === "failed") {
          setGeneratedVideoError(
            response.data.error ||
              "Video rendering failed."
          );
          return;
        }

        timeoutId = setTimeout(checkVideoStatus, 4000);
      } catch (err) {
        if (!active) {
          return;
        }

        setGeneratedVideoError(
          err.response?.data?.message ||
            "Could not check video rendering status."
        );
      }
    }

    checkVideoStatus();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [renderId, course?._id]);

  // Loading screen
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Loading course...
      </main>
    );
  }

  // Error screen
  if (error || !course) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-red-400">
          {error || "Course not found."}
        </p>

        <Link
          to="/dashboard"
          className="mt-5 inline-block text-violet-400"
        >
          Return to dashboard
        </Link>
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>

        {/* Course information */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="text-sm font-semibold text-violet-400">
            {course.level} COURSE
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {course.title}
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            {course.description}
          </p>

          <div className="mt-6 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">
              Course progress
            </span>

            <span className="font-semibold text-violet-400">
              {progress}%
            </span>
          </div>

          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Course progress"
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <BookOpen size={17} />
            {completedCount} of {totalLessons} lessons completed
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Lesson navigation */}
          <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-bold">
              Course lessons
            </h2>

            <div className="space-y-3">
              {course.lessons.map((item, index) => {
                const done = isCompleted(item._id);

                return (
                  <button
                    key={item._id || index}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedIndex === index
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs text-violet-400">
                        LESSON {index + 1}
                      </span>

                      {done && (
                        <CheckCircle2
                          size={18}
                          className="text-green-400"
                        />
                      )}
                    </span>

                    <span className="mt-2 block font-medium">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Selected lesson */}
          {lesson && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              <p className="text-sm font-semibold text-violet-400">
                LESSON {selectedIndex + 1}
              </p>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {lesson.title}
              </h2>

              <p className="mt-4 leading-7 text-slate-400">
                {lesson.summary}
              </p>

              {/* Learning objectives */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold">
                  What you'll learn
                </h3>

                <ul className="mt-4 space-y-3">
                  {(lesson.keyPoints || []).map(
                    (point, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-slate-300"
                      >
                        <CheckCircle2
                          size={19}
                          className="mt-1 shrink-0 text-violet-400"
                        />
                        <span>{point}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Lesson script */}
              <div className="mt-8 border-t border-slate-800 pt-7">
                <h3 className="text-lg font-semibold">
                  Lesson content
                </h3>

                <p className="mt-4 whitespace-pre-line leading-8 text-slate-300">
                  {lesson.script}
                </p>
              </div>

              {/* AI-generated lesson video */}
              <section className="mt-8 rounded-xl border border-violet-500/30 bg-slate-950 p-5">
                <div className="flex items-center gap-3">
                  <Video size={24} className="text-violet-400" />

                  <h2 className="text-xl font-bold">
                    AI Generated Lesson Video
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Generate a narrated video for{" "}
                  <span className="font-medium text-white">
                    {lesson.title}
                  </span>
                  . The video will appear here when rendering is complete.
                </p>

                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={generatingVideo || Boolean(renderId)}
                  className="mt-4 rounded-lg bg-violet-600 px-5 py-3 font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingVideo
                    ? "Starting generation..."
                    : renderId
                    ? "Video generation started"
                    : "Generate AI Lesson Video"}
                </button>

                {videoStatus &&
                  !generatedVideoUrl &&
                  !generatedVideoError && (
                    <p className="mt-4 text-sm text-violet-300">
                      Video status: {videoStatus}. Please wait...
                    </p>
                  )}

                {generatedVideoError && (
                  <div className="mt-4">
                    <p className="text-sm text-red-400">
                      {generatedVideoError}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setRenderId("");
                        setVideoStatus("");
                        setGeneratedVideoError("");
                      }}
                      className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {generatedVideoUrl && (
                  <div className="mt-5">
                    <h3 className="mb-3 font-semibold text-green-400">
                      Your AI lesson video is ready!
                    </h3>

                    <video
                      key={generatedVideoUrl}
                      controls
                      playsInline
                      className="w-full rounded-lg bg-black"
                      src={generatedVideoUrl}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
              </section>

              {/* Existing YouTube videos */}
              <section className="mt-8">
                <h2 className="mb-4 text-xl font-bold">
                  Learn with YouTube
                </h2>

                {videosLoading && (
                  <p className="text-slate-400">
                    Loading videos...
                  </p>
                )}

                {videosError && (
                  <p className="text-red-400">
                    {videosError}
                  </p>
                )}

                {!videosLoading &&
                  !videosError &&
                  videos.length === 0 && (
                    <p className="text-slate-400">
                      No videos found for this lesson.
                    </p>
                  )}

                <div className="space-y-6">
                  {videos.map((video) => {
                    const videoId = getYouTubeVideoId(video.url);

                    if (!videoId) {
                      return null;
                    }

                    return (
                      <div
                        key={videoId}
                        className="rounded-xl border border-slate-800 p-4"
                      >
                        <h3 className="mb-3 font-semibold">
                          {video.title}
                        </h3>

                        <div className="aspect-video w-full overflow-hidden rounded-lg">
                         <VideoList videos={videos} lessonId={currentLessonId} />
                        </div>

                        {video.description && (
                          <p className="mt-3 text-sm text-slate-500">
                            {video.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Lesson completion */}
              <div className="mt-8 border-t border-slate-800 pt-6">
                <button
                  type="button"
                  onClick={toggleLessonProgress}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCompleted(lesson._id)
                      ? "border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-violet-600 text-white hover:bg-violet-500"
                  }`}
                >
                  <CheckCircle2 size={18} />

                  {saving
                    ? "Saving..."
                    : isCompleted(lesson._id)
                    ? "Mark as incomplete"
                    : "Mark as completed"}
                </button>

                {progressError && (
                  <p className="mt-3 text-sm text-red-400">
                    {progressError}
                  </p>
                )}
              </div>

              {/* Previous and next lesson */}
              <div className="mt-8 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  onClick={() =>
                    setSelectedIndex((index) => index - 1)
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous lesson
                </button>

                <button
                  type="button"
                  disabled={selectedIndex === totalLessons - 1}
                  onClick={() =>
                    setSelectedIndex((index) => index + 1)
                  }
                  className="rounded-lg bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next lesson
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
