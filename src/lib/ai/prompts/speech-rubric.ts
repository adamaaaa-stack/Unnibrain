type SpeechRubricPromptParams = {
  title?: string;
  transcript: string;
  durationSeconds?: number;
  courseTitle?: string;
  courseContext?: string;
  audioMetrics?: {
    avgRms: number;
    peakRms: number;
    silenceRatio: number;
    clippingRatio: number;
    speakingSegments: number;
    estimatedWpm: number;
  };
};

export function buildSpeechRubricEvaluationPrompt(params: SpeechRubricPromptParams): string {
  const durationLine =
    typeof params.durationSeconds === "number" && params.durationSeconds > 0
      ? `Estimated speaking duration (seconds): ${Math.round(params.durationSeconds)}`
      : "Estimated speaking duration (seconds): unavailable";
  const titleLine = params.title?.trim() || params.courseTitle?.trim() || "Untitled speech";
  const hasGrounding = Boolean(params.courseContext?.trim());
  const hasAudioMetrics = Boolean(params.audioMetrics);
  const audioMetricsBlock = hasAudioMetrics
    ? `AUDIO METRICS (from microphone signal):
- avgRms: ${params.audioMetrics!.avgRms.toFixed(4)} (overall loudness proxy, 0-1)
- peakRms: ${params.audioMetrics!.peakRms.toFixed(4)} (peak loudness proxy, 0-1)
- silenceRatio: ${params.audioMetrics!.silenceRatio.toFixed(4)} (fraction of silent frames, 0-1)
- clippingRatio: ${params.audioMetrics!.clippingRatio.toFixed(4)} (possible clipping fraction, 0-1)
- speakingSegments: ${params.audioMetrics!.speakingSegments} (start/stop speaking runs)
- estimatedWpm: ${params.audioMetrics!.estimatedWpm}`
    : "AUDIO METRICS: unavailable";

  return `
You evaluate a student's spoken presentation transcript using a communication rubric.

Rules:
- Be honest about uncertainty when only transcript text is available.
- When AUDIO METRICS are available, use them for volume control, pause balance, and pace consistency.
- Do not claim accent/pronunciation details because raw audio is not provided.
- Use transcript evidence for every score rationale.
- Keep suggestions concrete and actionable.
- Count filler words from transcript tokens (for example: "um", "uh", "like", "you know", "so", "basically") when used as fillers.
- Return JSON only.

${hasGrounding ? "Grounding rule: For content quality, compare the speech to COURSE MATERIAL and penalize unsupported or missing key concepts." : "Grounding rule: Evaluate content quality based on coherence, relevance to title/topic, and specificity."}

Output JSON shape:
{
  "content": {"score": number 0-100, "rationale": "string"},
  "clarity": {"score": number 0-100, "rationale": "string"},
  "structure": {"score": number 0-100, "rationale": "string"},
  "confidence": {"score": number 0-100, "rationale": "string"},
  "pacing": {"score": number 0-100, "rationale": "string"} optional,
  "fillerWordCount": number >= 0,
  "fillerWords": {"word": count},
  "positives": ["string", "..."],
  "improvements": ["string", "..."],
  "suggestedChanges": ["string", "..."],
  "confidenceNote": "string"
}

Speech title/topic: ${titleLine}
${durationLine}
${audioMetricsBlock}

${hasGrounding ? `COURSE MATERIAL:\n"""${params.courseContext}"""` : "COURSE MATERIAL: not provided"}

TRANSCRIPT:
"""${params.transcript}"""
`.trim();
}
