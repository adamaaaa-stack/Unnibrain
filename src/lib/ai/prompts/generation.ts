type PromptParams = {
  courseTitle: string;
  sourceContext: string;
};

const CORE_RULES = `
You are generating study materials for a student.
Hard requirements:
- Use only information grounded in SOURCE MATERIAL.
- If something is unclear, omit it rather than inventing.
- Keep language clear, concise, and study-friendly.
- Avoid repetition.
- Return valid JSON only.
`;

function withSource({ courseTitle, sourceContext }: PromptParams, task: string): string {
  return `
${CORE_RULES}

Course title: ${courseTitle}

TASK:
${task}

SOURCE MATERIAL:
"""${sourceContext}"""
`.trim();
}

export function buildSummaryPrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create a concise summary with key takeaways.
JSON shape:
{
  "title": "string",
  "summary": "string",
  "keyTakeaways": ["string", "..."]
}`
  );
}

export function buildGuidePrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create a structured study guide divided into sections.
Hard output constraints:
- Provide 4 to 10 sections (never fewer than 2).
- Each section summary must be at least 60 characters.
- Each section must include 3 to 6 bullets (never fewer than 2).
- Bullets should be concise but specific.
JSON shape:
{
  "sections": [
    {
      "title": "string",
      "summary": "string",
      "bullets": ["string", "..."]
    }
  ]
}`
  );
}

export function buildTermsPrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create a glossary of terms from the source.
JSON shape:
{
  "terms": [
    {
      "term": "string",
      "definition": "string",
      "example": "string",
      "sectionTitle": "string (optional)"
    }
  ]
}`
  );
}

export function buildFlashcardsPrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create practical flashcards for active recall.
JSON shape:
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "hint": "string (optional)",
      "difficulty": "easy|medium|hard (optional)",
      "sectionTitle": "string (optional)"
    }
  ]
}`
  );
}

export function buildQuizPrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create multiple-choice quiz questions with explanations.
JSON shape:
{
  "questions": [
    {
      "question": "string",
      "optionA": "string",
      "optionB": "string",
      "optionC": "string",
      "optionD": "string",
      "correctOption": "A|B|C|D",
      "explanation": "string",
      "sectionTitle": "string (optional)"
    }
  ]
}`
  );
}

export function buildPracticePrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create open-ended practice questions with hints and sample answers.
JSON shape:
{
  "questions": [
    {
      "question": "string",
      "hint": "string",
      "sampleAnswer": "string",
      "sectionTitle": "string (optional)"
    }
  ]
}`
  );
}

export function buildTipsPrompt(params: PromptParams): string {
  return withSource(
    params,
    `Create specific study tips tailored to this course material.
JSON shape:
{
  "tips": [
    {
      "tip": "string",
      "reason": "string (optional)"
    }
  ]
}`
  );
}
