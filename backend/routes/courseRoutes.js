
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const {
  getYouTubeVideos,
  generateLessonVideoController,
  getLessonVideoStatus,
} = require("../controllers/videoController");

const {
  createCourse,
  getMyCourses,
  getCourseById,
  updateLessonProgress,
  deleteCourse,
} = require("../controllers/courseController");

const router = express.Router();

router.use(requireAuth);

router.post("/generate", createCourse);
router.get("/my-courses", getMyCourses);
router.patch(
  "/:id/lessons/:lessonId/progress",
  updateLessonProgress
);
router.delete("/:id", deleteCourse);
router.get("/:id/videos", getYouTubeVideos);
router.get(
  "/:id/videos/status/:renderId",
  getLessonVideoStatus
);
router.post(
  "/:id/generate-video",
  generateLessonVideoController
);
router.get("/:id", getCourseById);



async function searchYouTubeVideos(topic) {
  const baseUrl = process.env.SEARXNG_URL;

  if (!baseUrl) {
    throw new Error("SEARXNG_URL is missing from backend .env");
  }

  const url = new URL("/search", baseUrl);

  url.searchParams.set("q", `site:youtube.com/watch ${topic} tutorial`);
  url.searchParams.set("format", "json");
  url.searchParams.set("safesearch", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.results)) {
    throw new Error("Invalid YouTube search response.");
  }

  return data.results
    .filter((item) => {
      return (
        item.title &&
        item.url &&
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/.test(item.url)
      );
    })
    .slice(0, 5)
    .map((item) => ({
      title: String(item.title).slice(0, 250),
      url: item.url,
      description: String(item.content || "").slice(0, 500),
    }));
}   

module.exports = router;
