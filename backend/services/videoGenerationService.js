const Shotstack = require("shotstack-sdk");
const { cleanScriptForSpeech } = require("./ttsService");

function createShotstackClient() {
  const apiKey = process.env.SHOTSTACK_API_KEY;

  if (!apiKey) {
    throw new Error("SHOTSTACK_API_KEY is missing in backend/.env");
  }

  const defaultClient = Shotstack.ApiClient.instance;
  defaultClient.basePath = "https://api.shotstack.io/edit/stage";
  defaultClient.authentications["DeveloperKey"].apiKey = apiKey;

  return {
    editApi: new Shotstack.EditApi(),
  };
}

async function testVideoRender() {
  const { editApi } = createShotstackClient();

  const videoAsset = new Shotstack.VideoAsset()
    .setSrc(
      "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/footage/skater.hd.mp4"
    )
    .setTrim(3);

  const videoClip = new Shotstack.Clip()
    .setAsset(videoAsset)
    .setStart(0)
    .setLength(5);

  const track = new Shotstack.Track().setClips([videoClip]);
  const timeline = new Shotstack.Timeline().setTracks([track]);

  const output = new Shotstack.Output()
    .setFormat("mp4")
    .setResolution("sd");

  const edit = new Shotstack.Edit()
    .setTimeline(timeline)
    .setOutput(output);

  const result = await editApi.postRender(edit);
  return result.response.id;
}

// Split the complete lesson into short chunks without losing words.
function splitTextIntoSlides(script, maxCharacters = 100) {
  const sentences = (script || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const slides = [];
  let current = "";

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    let chunk = "";

    for (const word of words) {
      const candidate = chunk ? `${chunk} ${word}` : word;

      if (candidate.length > maxCharacters && chunk) {
        if (current) {
          slides.push(current);
          current = "";
        }

        slides.push(chunk);
        chunk = word;
      } else {
        chunk = candidate;
      }
    }

    if (chunk) {
      const candidate = current ? `${current} ${chunk}` : chunk;

      if (candidate.length > maxCharacters && current) {
        slides.push(current);
        current = chunk;
      } else {
        current = candidate;
      }
    }
  }

  if (current) {
    slides.push(current);
  }

  return slides.length
    ? slides
    : ["Learn the key concepts step by step."];
}

// Add explicit line breaks so text does not stay on one long line.
function wrapText(text, maxLineLength = 28) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (candidate.length > maxLineLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.join("\n");
}

function createTextAsset(text, isOpening = false) {
  const formattedText = wrapText(text, isOpening ? 22 : 28);

  return new Shotstack.TitleAsset()
    .setText(formattedText)
    .setStyle("minimal")
    .setColor("#ffffff")
    .setSize(isOpening ? "medium" : "small")
    .setPosition("center");
}

// Video ke end me itna extra time, taaki narration kabhi beech me na kate
const END_PADDING_SECONDS = 1.5;

// "duration" = narration audio ki asli length (seconds).
// Poori timeline isi ke hisaab se banti hai, aur slides ka time
// text ki length ke hisaab se baanta jaata hai (jitna zyada text, utna zyada time).
async function generateLessonVideo({
  title,
  script,
  audioUrl,
  duration = 60,
}) {
  if (!audioUrl) {
    throw new Error("audioUrl is required to generate the lesson video.");
  }

  if (!script || !script.trim()) {
    throw new Error("Lesson script is empty.");
  }

  const { editApi } = createShotstackClient();

  const audioDuration =
    Number(duration) > 0 ? Number(duration) : 60;

  const totalDuration = audioDuration + END_PADDING_SECONDS;

  // Slides wahi text dikhayen jo narration me bola jata hai
  // (markdown symbols hata kar)
  const slideTexts = splitTextIntoSlides(
    cleanScriptForSpeech(script),
    100
  );

  const openingText = title || "AI Learning Lesson";

  // Pehla item = title slide, baaki = lesson slides
  const allTexts = [openingText, ...slideTexts];

  // Title ke baad pause hota hai, isliye uska thoda extra weight
  const weights = allTexts.map((text, index) =>
    Math.max(text.length, 1) + (index === 0 ? 12 : 0)
  );

  const totalWeight = weights.reduce(
    (total, value) => total + value,
    0
  );

  const clips = [];
  let currentStart = 0;

  allTexts.forEach((text, index) => {
    const isLast = index === allTexts.length - 1;

    // Last slide ko bacha hua poora time do, taaki timeline exact audio + padding tak chale
    const slideDuration = isLast
      ? Math.max(totalDuration - currentStart, 1)
      : (weights[index] / totalWeight) * totalDuration;

    clips.push(
      new Shotstack.Clip()
        .setAsset(createTextAsset(text, index === 0))
        .setStart(currentStart)
        .setLength(slideDuration)
    );

    currentStart += slideDuration;
  });

  const titleTrack = new Shotstack.Track().setClips(clips);

  const timeline = new Shotstack.Timeline()
    .setBackground("#101827")
    .setSoundtrack(
      new Shotstack.Soundtrack()
        .setSrc(audioUrl)
        .setVolume(1)
    )
    .setTracks([titleTrack]);

  const output = new Shotstack.Output()
    .setFormat("mp4")
    .setResolution("sd");

  const edit = new Shotstack.Edit()
    .setTimeline(timeline)
    .setOutput(output);

  const result = await editApi.postRender(edit);

  return result.response.id;
}

module.exports = {
  createShotstackClient,
  testVideoRender,
  generateLessonVideo,
};