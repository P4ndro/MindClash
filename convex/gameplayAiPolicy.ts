export const MAX_OPEN_ENDED_REGRADES = 3;

export function isAiUnavailableErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("ai_unavailable") || normalized.includes("gemini request failed");
}

export function getOpenEndedRegradeDelayMs(attempt: number): number {
  const safeAttempt = Math.max(0, attempt);
  return 2_000 * 2 ** safeAttempt;
}

export function shouldQueueOpenEndedRegrade(errorMessage: string, attempt: number): boolean {
  if (!isAiUnavailableErrorMessage(errorMessage)) return false;
  return attempt < MAX_OPEN_ENDED_REGRADES;
}

export function shouldFinalizeMatchWithPendingOpenEnded(pendingOpenEndedAnswers: number): boolean {
  return pendingOpenEndedAnswers <= 0;
}
