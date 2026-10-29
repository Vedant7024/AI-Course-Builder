const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadAudio(filePath) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "ai-course-builder/audio",
      public_id: path.parse(filePath).name,
      overwrite: true,
    });

    console.log("Audio uploaded successfully!");
    console.log("Audio URL:", result.secure_url);

    return result.secure_url;
  } catch (error) {
    console.error("Audio upload failed:", error.message);
    throw error;
  }
}

module.exports = { uploadAudio };