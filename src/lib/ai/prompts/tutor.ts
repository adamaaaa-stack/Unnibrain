type TutorReference = {
  sourceType: "summary" | "guide" | "term" | "flashcard" | "quiz" | "practice" | "source_excerpt";
  referenceId?: string;
  excerpt: string;
};

type TutorPromptParams = {
  courseTitle: string;
  learnerMessage: string;
  conversationHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  references: TutorReference[];
};

export function buildTutorPrompt(params: TutorPromptParams): string {
  const historyText =
    params.conversationHistory.length > 0
      ? params.conversationHistory
          .map((item, index) => `${index + 1}. [${item.role}] ${item.content}`)
          .join("\n")
      : "No prior messages.";

  const referenceText =
    params.references.length > 0
      ? params.references
          .map((item, index) => {
            const idPart = item.referenceId ? ` id=${item.referenceId}` : "";
            return `${index + 1}. [${item.sourceType}${idPart}] ${item.excerpt}`;
          })
          .join("\n")
      : "No grounding references were available.";

  return `
You are UniBrain Tutor for one specific course.

Course:
${params.courseTitle}

Non-negotiable rules:
- Keep answers grounded in provided course references.
- If the references are insufficient, clearly state uncertainty and ask for more course detail.
- Do not invent facts beyond the available course material.
- Be practical and concise. Prefer direct teaching over generic motivation.
- You may explain, simplify, compare concepts, create mnemonics, suggest likely test focus areas, or ask quiz-style follow-ups when useful.
- Return JSON only.

Output JSON shape:
{
  "answer": "string",
  "followUpQuestion": "string optional",
  "suggestedMode": "summary|guide|terms|flashcards|learn|write|match|quiz|practice|tips optional",
  "grounding": [
    {
      "sourceType": "summary|guide|term|flashcard|quiz|practice|source_excerpt",
      "referenceId": "uuid optional",
      "excerpt": "string"
    }
  ],
  "confidence": "high|medium|low"
}

Grounding references:
${referenceText}

Conversation history (latest near end):
${historyText}

Latest learner message:
${params.learnerMessage}
`.trim();
}
