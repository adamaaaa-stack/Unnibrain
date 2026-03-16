type BrainDumpPromptParams = {
  courseTitle: string;
  sourceContext: string;
  transcript: string;
};

export function buildBrainDumpEvaluationPrompt(params: BrainDumpPromptParams): string {
  return `
You evaluate a student's spoken brain dump against their course material.

Requirements:
- Ground every judgment in SOURCE MATERIAL.
- Do not invent concepts not present in source.
- Be strict but educationally useful.
- Transcript may contain speech-to-text errors; infer carefully.
- Return JSON only.

Output JSON shape:
{
  "score": number 0-100,
  "covered": [{"concept":"string","rationale":"string","evidenceQuote":"string optional"}],
  "partial": [{"concept":"string","rationale":"string","evidenceQuote":"string optional"}],
  "missed": [{"concept":"string","rationale":"string","evidenceQuote":"string optional"}],
  "feedback": "string",
  "nextRevisionTargets": ["string", "..."],
  "transcriptQuality": "high|medium|low"
}

Course title: ${params.courseTitle}

SOURCE MATERIAL:
"""${params.sourceContext}"""

BRAIN DUMP TRANSCRIPT:
"""${params.transcript}"""
`.trim();
}
