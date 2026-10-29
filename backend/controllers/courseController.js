
const Course = require("../models/Course");
const { generateCourse } = require("../services/groqService");
const { searchResearch } = require("../services/researchService");
const Course = require("../models/Course");
const { generateCourse } = require("../services/groqService");

const createCourse = async (req, res) => {
  try {
    const { topic, level, lessonCount } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: "Topic is required.",
      });
    }

    const safeLevel = ["Beginner", "Intermediate", "Advanced"].includes(level)
      ? level
      : "Beginner";

    const count = Math.min(Math.max(parseInt(lessonCount) || 3, 1), 8);

    const generated = await generateCourse(topic.trim(), safeLevel, count);

    const course = await Course.create({
      title: generated.title,
      description: generated.description,
      topic: topic.trim(),
      level: safeLevel,
      lessons: generated.lessons,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, course });
  } catch (error) {
    console.error("createCourse error:", error);
    return res.status(502).json({
      success: false,
      message: "AI course generation failed. Please try again.",
    });
  }
};

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
