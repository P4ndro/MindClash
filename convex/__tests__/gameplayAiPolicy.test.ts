import { describe, expect, it } from "vitest";
import {
  getOpenEndedRegradeDelayMs,
  isAiUnavailableErrorMessage,
  MAX_OPEN_ENDED_REGRADES,
  shouldFinalizeMatchWithPendingOpenEnded,
  shouldQueueOpenEndedRegrade,
} from "../gameplayAiPolicy";

describe("gameplay AI regrade policy", () => {
  it("detects ai_unavailable errors for queued retry", () => {
    expect(isAiUnavailableErrorMessage("ai_unavailable: Gemini request failed (503)")).toBe(true);
    expect(isAiUnavailableErrorMessage("validation_error: topic missing")).toBe(false);
  });

  it("queues regrade while attempts are below max for AI outages", () => {
    expect(shouldQueueOpenEndedRegrade("ai_unavailable: Gemini request failed (503)", 0)).toBe(true);
    expect(shouldQueueOpenEndedRegrade("ai_unavailable: Gemini request failed (503)", 1)).toBe(true);
  });

  it("stops queuing regrade after max attempts", () => {
    expect(
      shouldQueueOpenEndedRegrade(
        "ai_unavailable: Gemini request failed (503)",
        MAX_OPEN_ENDED_REGRADES,
      ),
    ).toBe(false);
  });

  it("uses exponential backoff for queued regrades", () => {
    expect(getOpenEndedRegradeDelayMs(0)).toBe(2_000);
    expect(getOpenEndedRegradeDelayMs(1)).toBe(4_000);
    expect(getOpenEndedRegradeDelayMs(2)).toBe(8_000);
  });

  it("blocks match finalize while open-ended grading is still pending", () => {
    expect(shouldFinalizeMatchWithPendingOpenEnded(2)).toBe(false);
    expect(shouldFinalizeMatchWithPendingOpenEnded(0)).toBe(true);
  });
});
