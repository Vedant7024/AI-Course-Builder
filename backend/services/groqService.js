const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_ATTEMPTS = 3;

// Optional: SearXNG se thoda web context lao. Fail ho jaye to course phir bhi banega.
async function getSearchContext(topic) {
  const base = process.env.SEARXNG_URL;
  if (!base) return "";

  try {
    const url = `${base}/search?q=${encodeURIComponent(topic)}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return "";

    const data = await res.json();
    return (data.results || [])
      .slice(0, 5)
      .map((r) => `- ${r.title}: ${(r.content || "").slice(0, 200)}`)
      .join("\n");
  } catch (err) {
    console.warn("SearXNG failed, continuing without it:", err.message);
    return "";
  }
}

function buildMessages(topic, level, lessonCount, context) {
  const system = `You are a course creator. Return ONLY a valid JSON object, nothing else.

Schema:
{
  "title": string,
  "description": string,
  "lessons": [
    {
      "title": string,
      "summary": string,
      "keyPoints": [string, string, string],
      "script": string
    }
  ]
}

Strict rules:
- Exactly ${lessonCount} lessons.
- "keyPoints" has 3 to 5 short strings.
- "script" is a plain paragraph of 4 to 6 sentences, like a teacher's narration.
- In "script": no numbered lists, no code, no line breaks, no double quotes. Use single quotes if needed.
- Do not use newline characters inside any string.
- Every string must be closed before the next key or object starts.`;

  const user = `Create a ${level} level course on: ${topic}
${context ? `\nUseful reference info:\n${context}` : ""}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function validateCourse(course, lessonCount) {
  if (!course || typeof course !== "object") throw new Error("Empty AI response");
  if (!course.title || !course.description) throw new Error("Missing title/description");
  if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
    throw new Error("No lessons returned");
  }

  course.lessons = course.lessons.slice(0, lessonCount).map((l, i) => {
    if (!l.title || !l.summary || !l.script) {
      throw new Error(`Lesson ${i + 1} is incomplete`);
    }
    return {
      title: String(l.title),
      summary: String(l.summary),
      keyPoints: Array.isArray(l.keyPoints) ? l.keyPoints.map(String) : [],
      script: String(l.script),
    };
  });

  return course;
}

async function generateCourse(topic, level = "Beginner", lessonCount = 3) {
  const context = await getSearchContext(topic);
  const messages = buildMessages(topic, level, lessonCount, context);

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages,
      });

      const raw = completion.choices[0]?.message?.content;
      return validateCourse(JSON.parse(raw), lessonCount);
    } catch (err) {
      lastError = err;
      console.warn(
        `Course generation attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
        err.code || err.message
      );

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

module.exports = { generateCourse };