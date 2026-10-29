
const Shotstack = require("shotstack-sdk");

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

  // Include all script content instead of limiting it to five slides.
  const slideTexts = splitTextIntoSlides(script, 100);

  const openingDuration = 4;

  // Estimate how long each slide needs to be readable.
  const contentDurations = slideTexts.map((text) =>
    Math.max(5, Math.ceil(text.length / 15))
  );

  const estimatedDuration =
    openingDuration +
    contentDurations.reduce((total, value) => total + value, 0);

  // Keep the timeline long enough for the complete slide sequence.
  const finalDuration = Math.max(duration, estimatedDuration);

  const baseContentDuration = contentDurations.reduce(
    (total, value) => total + value,
    0
  );

  const extraTime = finalDuration - estimatedDuration;

  const clips = [];

  // Opening title slide.
  clips.push(
    new Shotstack.Clip()
      .setAsset(
        createTextAsset(title || "AI Learning Lesson", true)
      )
      .setStart(0)
      .setLength(openingDuration)
  );

  // Educational slides.
  let currentStart = openingDuration;

  slideTexts.forEach((text, index) => {
    const baseDuration = contentDurations[index];

    const extraShare =
      baseContentDuration > 0
        ? (baseDuration / baseContentDuration) * extraTime
        : 0;

    const slideDuration = baseDuration + extraShare;

    clips.push(
      new Shotstack.Clip()
        .setAsset(createTextAsset(text))
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
