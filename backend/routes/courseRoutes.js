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
  saveLessonVideo,
} = require("../controllers/courseController");

const router = express.Router();

// Neeche ke saare routes ke liye login zaroori hai
router.use(requireAuth);

router.post("/generate", createCourse);
router.get("/my-courses", getMyCourses);

router.patch(
  "/:id/lessons/:lessonId/progress",
  updateLessonProgress
);

// AI generated video ka URL lesson me save karo
router.patch(
  "/:id/lessons/:lessonId/video",
  saveLessonVideo
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

module.exports = router;