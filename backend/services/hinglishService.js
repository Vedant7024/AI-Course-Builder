const Groq = require("groq-sdk");

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_ATTEMPTS = 3;

let groqClient;

// Lazy client: GROQ_API_KEY missing ho to bhi app start par crash na ho
function getClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
}

// .env me NARRATION_LANGUAGE=english likhoge to purani English voice hi chalegi
function isHinglishEnabled() {
  return (
    (process.env.NARRATION_LANGUAGE || "hinglish").toLowerCase() !==
    "english"
  );
}

const SYSTEM_PROMPT = `You convert a teacher's English lesson narration into natural spoken Hinglish, the way Indian teachers mix Hindi and English in class.

Return ONLY a valid JSON object, nothing else:
{
  "narration": string,
  "captions": string
}

Rules:
- "narration": Hindi written in Devanagari script. Keep technical and common English words (for example operating system, process, thread, server, database, code, browser) in English using Latin letters, exactly as people say them in Hinglish. End sentences with the Hindi full stop "।".
- "captions": the exact same content and the same sentence order as "narration", but written in Roman letters (Hinglish), for example: Operating system hardware ko manage karta hai. End sentences with a normal full stop.
- Keep every fact and idea of the original. Do not add or remove information. Keep the same number of sentences.
- Friendly teacher tone.
- Plain text only: no markdown, no line breaks, no emojis, and no double quotes inside the strings (use single quotes if needed).`;

function validate(result) {
  const narration = String(result?.narration || "").trim();
  const captions = String(result?.captions || "").trim();

  if (narration.length < 20 || captions.length < 20) {
    throw new Error("Hinglish conversion returned empty text");
  }

  return { narration, captions };
}

// Returns { narration, captions, language }
// narration = jo voice bolegi, captions = jo video ki slides me dikhega.
// Conversion fail ho jaye to original English script use hota hai (video band nahi hota).
async function prepareNarrationText({ title, script }) {
  const original = String(script || "").trim();

  if (!isHinglishEnabled()) {
    return { narration: original, captions: original, language: "english" };
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await getClient().chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Lesson title: ${title || "Lesson"}\n\nEnglish narration:\n${original}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      const { narration, captions } = validate(JSON.parse(raw));

      console.log("Hinglish narration ready");

      return { narration, captions, language: "hinglish" };
    } catch (error) {
      lastError = error;

      console.warn(
        `Hinglish conversion attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
        error.code || error.message
      );

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error(
    "Hinglish conversion failed, using English script:",
    lastError?.message
  );

  return { narration: original, captions: original, language: "english" };
}

module.exports = { prepareNarrationText };