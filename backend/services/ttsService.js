const fs = require("fs");
const path = require("path");

// TTS model jo text milta hai wo sab bol deta hai.
// Isliye yahan koi instruction/prompt nahi bhejna, sirf wahi text jo bolna hai.
// Markdown symbols hata dete hain taaki "asterisk", "hash" jaise shabd na bole jaye.
function cleanScriptForSpeech(script) {
  return String(script || "")
    .replace(/```[\s\S]*?```/g, " ") // code blocks
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/^\s{0,3}#{1,6}\s*/gm, "") // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/^\s*[-*+]\s+/gm, "") // bullet points
    .replace(/^\s*\d+[.)]\s+/gm, "") // numbered list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generateLessonAudio(script, lessonTitle = "Lesson") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env");
  }

  if (!script || !script.trim()) {
    throw new Error("Lesson script is empty.");
  }

  const scriptText = cleanScriptForSpeech(script);

  if (!scriptText) {
    throw new Error("Lesson script has no speakable text.");
  }

  // Narration title se shuru hogi, phir lesson script. Koi prompt/instruction nahi.
  const spokenTitle = cleanScriptForSpeech(lessonTitle).replace(/[.!?:\s]+$/, "");

  const text = spokenTitle
    ? `${spokenTitle}.\n\n${scriptText}`
    : scriptText;

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