
const Course = require("../models/Course");
const { generateCourse } = require("../services/groqService");
const { searchResearch } = require("../services/researchService");

async function createCourse(req, res, next) {
  try {
    const { topic, level = "Beginner", lessonCount = 3 } = req.body;

    if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: "Topic is required and must be under 200 characters.",
      });
    }

    if (!["Beginner", "Intermediate", "Advanced"].includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid difficulty level.",
      });
    }

    if (![2, 3].includes(Number(lessonCount))) {
      return res.status(400).json({
        success: false,
        message: "Lesson count must be 2 or 3.",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Groq API key is not configured.",
      });
    }

    
    const researchSources = await searchResearch(topic);

    const generated = await generateCourse(
      topic.trim(),
      level,
      Number(lessonCount),
      researchSources,
    );

    const course = await Course.create({
      title: generated.title,
      description: generated.description,
      topic: topic.trim(),
      level,
      lessons: generated.lessons,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Course generated successfully.",
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyCourses(req, res, next) {
  try {
    const courses = await Course.find({
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    next(error);
  }
}


async function getCourseById(req, res, next) {
  try {
    if (!require("mongoose").isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function updateLessonProgress(req, res, next) {
  try {
    const mongoose = require("mongoose");

    const { id, lessonId } = req.params;
    const { completed } = req.body;

    if (!mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or lesson ID.",
      });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Completed must be true or false.",
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

    const lessonExists = course.lessons.some(
      (lesson) => lesson._id.toString() === lessonId
    );

    if (!lessonExists) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course.",
      });
    }

    const alreadyCompleted = course.completedLessons.some(
      (completedId) => completedId.toString() === lessonId
    );

    if (completed && !alreadyCompleted) {
      course.completedLessons.push(lessonId);
    }

    if (!completed && alreadyCompleted) {
      course.completedLessons = course.completedLessons.filter(
        (completedId) => completedId.toString() !== lessonId
      );
    }

    await course.save();

    return res.json({
      success: true,
      message: completed
        ? "Lesson marked as completed."
        : "Lesson marked as incomplete.",
      completedLessons: course.completedLessons,
      totalLessons: course.lessons.length,
      completedCount: course.completedLessons.length,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const mongoose = require("mongoose");
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findOneAndDelete({
      _id: id,
      createdBy: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
  createCourse,
  getMyCourses,
  getCourseById,
  updateLessonProgress,
  deleteCourse,
};
