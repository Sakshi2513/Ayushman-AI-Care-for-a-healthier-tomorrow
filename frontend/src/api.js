const BASE_URL = "http://127.0.0.1:8020";
export async function analyzeData({ role, iot, useRealGeminiApi = false }) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      iot,
      use_real_gemini_api: useRealGeminiApi
    })
  });
  if (!response.ok) throw new Error(`Analyze failed: ${response.status}`);
  return response.json();
}

export async function sendFeedback({ analysisId, approve, comment, reviewerRole }) {
  const response = await fetch(`${BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis_id: analysisId,
      approve,
      comment,
      reviewer_role: reviewerRole
    })
  });
  if (!response.ok) throw new Error(`Feedback failed: ${response.status}`);
  return response.json();
}

export function audioSrc(audioUrl) {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("http")) return audioUrl;
  return `${BASE_URL}${audioUrl}`;
}