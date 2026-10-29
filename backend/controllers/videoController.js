
const Course = require("../models/Course");
const { searchYouTubeVideos } = require("../services/researchService");
const { generateLessonAudio } = require("../services/ttsService");
const { uploadAudio } = require("../services/cloudinaryService");
const {
  generateLessonVideo,
} = require("../services/videoGenerationService");

// Existing YouTube functionality
async function getYouTubeVideos(req, res, next) {
  try {
    const { id } = req.params;
    const { lessonId } = req.query;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Lesson ID is required.",
      });
    }

    const course = await Course.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lesson = course.lessons.id(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    const videos = await searchYouTubeVideos(
      `${course.topic} ${lesson.title}`
    );

    return res.json({
      success: true,
      videos,
    });
  } catch (error) {
    next(error);
  }
}

// New AI lesson-video generation endpoint

async function generateLessonVideoController(req, res, next) {
  let audioPath;

  try {
    const { id } = req.params;
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Lesson ID is required.",
      });
    }

    const course = await Course.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lesson = course.lessons.id(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    if (!lesson.script || !lesson.script.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lesson script is empty.",
      });
    }

    // Step 1: Generate lesson narration
    audioPath = await generateLessonAudio(
      lesson.script,
      lesson.title
    );

    // Step 2: Upload narration to Cloudinary
    const audioUrl = await uploadAudio(audioPath);

    // Step 3: Start Shotstack rendering
    const renderId = await generateLessonVideo({
      title: lesson.title,
      script: lesson.script,
      audioUrl,
      duration: 60,
    });

    return res.status(202).json({
      success: true,
      message: "Lesson video rendering has started.",
      renderId,
      lessonId: lesson._id,
    });
  } catch (error) {
    next(error);
  }
}



async function getLessonVideoStatus(req, res, next) {
  try {
    const { id, renderId } = req.params;

    const course = await Course.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const apiKey = process.env.SHOTSTACK_API_KEY;

    if (!apiKey) {
      throw new Error("SHOTSTACK_API_KEY is missing in backend/.env");
    }

    const response = await fetch(
      `https://api.shotstack.io/edit/stage/render/${encodeURIComponent(renderId)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || "Unable to check video render status.",
      });
    }

    const render = data.response;

    return res.json({
      success: true,
      status: render.status,
      videoUrl: render.status === "done" ? render.url : null,
      error: render.status === "failed" ? render.error : null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getYouTubeVideos,
  generateLessonVideoController,
  getLessonVideoStatus,
};
