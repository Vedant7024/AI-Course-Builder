
const fs = require("fs");
const path = require("path");

async function generateLessonAudio(script, lessonTitle = "Lesson") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env");
  }

  if (!script || !script.trim()) {
    throw new Error("Lesson script is empty.");
  }

  const text = `Speak clearly and naturally as a friendly teacher. 
Lesson title: ${lessonTitle}.
Explain the following lesson:
${script}`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore",
              },
            },
          },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      JSON.stringify(data.error || data, null, 2)
    );
  }

  const audioData =
    data.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data
    )?.inlineData?.data;

  if (!audioData) {
    throw new Error("No audio data returned by Gemini.");
  }

  const audioDirectory = path.join(__dirname, "..", "generated-audio");

  fs.mkdirSync(audioDirectory, { recursive: true });

  const safeTitle = lessonTitle
    .replace(/[^a-z0-9]/gi, "-")
    .slice(0, 40);

  const outputPath = path.join(
    audioDirectory,
    `${safeTitle}-${Date.now()}.wav`
  );

  fs.writeFileSync(outputPath, Buffer.from(audioData, "base64"));

  console.log("Lesson narration generated:", outputPath);

  return outputPath;
}

module.exports = { generateLessonAudio };
