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

// WAV file ki asli length (seconds me) nikalta hai.
// Isse video ki timeline audio ke barabar rakhi jaati hai, taaki aakhri awaaz na kate.
function getAudioDurationSeconds(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Gemini ka audio: 24kHz, mono, 16-bit PCM (header na mile to yehi maan lete hain)
  let sampleRate = 24000;
  let channels = 1;
  let bitsPerSample = 16;
  let dataBytes = null;

  if (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  ) {
    let offset = 12;

    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString("ascii", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      const bodyStart = offset + 8;

      if (chunkId === "fmt " && bodyStart + 16 <= buffer.length) {
        channels = buffer.readUInt16LE(bodyStart + 2) || 1;
        sampleRate = buffer.readUInt32LE(bodyStart + 4) || 24000;
        bitsPerSample = buffer.readUInt16LE(bodyStart + 14) || 16;
      }

      if (chunkId === "data") {
        const remaining = buffer.length - bodyStart;
        dataBytes =
          chunkSize > 0 && chunkSize <= remaining ? chunkSize : remaining;
        break;
      }

      offset = bodyStart + chunkSize + (chunkSize % 2);
    }
  }

  if (dataBytes === null) {
    dataBytes = buffer.length;
  }

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);

  return bytesPerSecond > 0 ? dataBytes / bytesPerSecond : 0;
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

module.exports = {
  generateLessonAudio,
  getAudioDurationSeconds,
  cleanScriptForSpeech,
};