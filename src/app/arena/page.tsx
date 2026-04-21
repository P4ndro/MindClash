"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ParsedServerError = {
  code?: string;
  message: string;
};

function parseServerError(error: unknown): ParsedServerError {
  const fallback = "Unexpected error. Please try again.";
  if (!(error instanceof Error)) {
    return { message: fallback };
  }

  const raw = error.message ?? fallback;
  const splitIndex = raw.indexOf(":");
  if (splitIndex <= 0) {
    return { message: raw };
  }

  const code = raw.slice(0, splitIndex).trim();
  const message = raw.slice(splitIndex + 1).trim();
  if (!code) {
    return { message: raw };
  }
  return { code, message: message || raw };
}

const AUTH_SYNC_ERROR_CODES = new Set(["unauthenticated", "unknown_user"]);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withRetryOnAuthSync<T>(action: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const parsed = parseServerError(error);
      if (!parsed.code || !AUTH_SYNC_ERROR_CODES.has(parsed.code) || attempt === retries) {
        throw error;
      }
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastError;
}

export default function ArenaPage() {
  return (
    <Suspense fallback={<ArenaPageFallback />}>
      <ArenaPageContent />
    </Suspense>
  );
}

function ArenaPageFallback() {
  return (
    <main className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary/30">
      <section className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl bg-surface-container-low border border-outline-variant/30 p-6">
          <p className="text-sm text-on-surface-variant">Loading arena...</p>
        </div>
      </section>
    </main>
  );
}

function ArenaPageContent() {
  const router = useRouter();
  const { user, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const rawMatchId = searchParams.get("matchId");
  const matchId = rawMatchId as Id<"matches"> | null;

  const [answerDraft, setAnswerDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [questionLocalStartMs, setQuestionLocalStartMs] = useState<number | null>(null);
  const autoAdvancedQuestionRef = useRef<string | null>(null);

  const match = useQuery(api.matches.getMatchById, matchId ? { matchId } : "skip");
  const matchState = useQuery(api.gameplay.getMatchState, matchId ? { matchId } : "skip");
  const currentQuestion = useQuery(
    api.gameplay.getCurrentQuestionForMatch,
    matchId ? { matchId } : "skip",
  );
  const myAnswer = useQuery(
    api.gameplay.getMyAnswerForCurrentQuestion,
    matchId ? { matchId } : "skip",
  );
  const answersCount = useQuery(
    api.gameplay.getAnswersCountForCurrentQuestion,
    matchId ? { matchId } : "skip",
  );
  const matchResult = useQuery(
    api.gameplay.getMatchResult,
    matchId && match?.status === "finished" ? { matchId } : "skip",
  );

  const submitAnswer = useMutation(api.gameplay.submitAnswer);
  const advanceQuestion = useMutation(api.gameplay.advanceQuestion);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentQuestion?.matchQuestionId) return;
    setAnswerDraft("");
    setActionError(null);
    setQuestionLocalStartMs(Date.now());
  }, [currentQuestion?.matchQuestionId]);

  const remainingMs = useMemo(() => {
    if (!matchState?.questionEndsAt) return 0;
    return Math.max(0, matchState.questionEndsAt - nowMs);
  }, [matchState?.questionEndsAt, nowMs]);

  const totalForProgress = 30_000;
  const timerProgress = Math.max(0, Math.min(100, (remainingMs / totalForProgress) * 100));
  const timerSeconds = (remainingMs / 1000).toFixed(1);
  const hasAnswered = myAnswer?.hasAnswered === true;
  const isArenaAuthReady =
    isClerkLoaded && Boolean(isSignedIn) && !isConvexAuthLoading && Boolean(isConvexAuthenticated);
  const waitingForOpponentInDuel =
    Boolean(match && match.mode === "duel" && match.status === "active" && hasAnswered) &&
    (answersCount?.count ?? 0) < 2 &&
    remainingMs > 0;
  const isCurrentQuestionMsq = currentQuestion?.question.questionType === "msq";

  async function handleSubmitAnswer() {
    if (!isArenaAuthReady) {
      setActionError("Session is still syncing. Please wait a moment and try again.");
      return;
    }
    if (!matchId || !currentQuestion) return;
    const submittedAnswer = answerDraft.trim();
    if (!submittedAnswer) {
      setActionError("Enter an answer before submitting.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const responseTime = Math.max(0, Date.now() - (questionLocalStartMs ?? Date.now()));
      await withRetryOnAuthSync(() =>
        submitAnswer({
          matchId,
          matchQuestionId: currentQuestion.matchQuestionId,
          submittedAnswer,
          responseTime,
        }),
      );
    } catch (error) {
      const parsed = parseServerError(error);

      if (parsed.code === "unauthenticated" || parsed.code === "unknown_user") {
        setActionError("Session is still syncing with game server. Try again in a moment.");
        return;
      }
      if (parsed.code === "forbidden_participant") {
        router.replace("/matchmaking");
        return;
      }
      if (parsed.code === "duplicate_submit") {
        setActionError(null);
        return;
      }
      if (parsed.code === "deadline_passed") {
        setActionError(null);
        if (!isAdvancing) {
          void handleAdvanceQuestion();
        }
        return;
      }
      if (parsed.code === "stale_phase" || parsed.message.includes("alreadyFinished")) {
        setActionError(null);
        return;
      }
      setActionError(parsed.message || "Failed to submit answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAdvanceQuestion = useCallback(async () => {
    if (!isArenaAuthReady) {
      setActionError("Session is still syncing. Please wait a moment and try again.");
      return;
    }
    if (!matchId) return;
    setIsAdvancing(true);
    setActionError(null);
    try {
      await withRetryOnAuthSync(() => advanceQuestion({ matchId }));
    } catch (error) {
      const parsed = parseServerError(error);

      if (parsed.code === "unauthenticated" || parsed.code === "unknown_user") {
        setActionError("Session is still syncing with game server. Try again in a moment.");
        return;
      }
      if (parsed.code === "forbidden_participant") {
        router.replace("/matchmaking");
        return;
      }
      if (parsed.code === "cannot_advance_yet" || parsed.code === "stale_phase") {
        setActionError(null);
        if (parsed.code === "cannot_advance_yet" && remainingMs <= 0) {
          autoAdvancedQuestionRef.current = null;
        }
        return;
      }
      setActionError(parsed.message || "Failed to advance question.");
    } finally {
      setIsAdvancing(false);
    }
  }, [isArenaAuthReady, matchId, advanceQuestion, router, remainingMs]);

  useEffect(() => {
    if (!matchId || !match || match.status !== "active" || match.mode !== "duel") return;
    if (!currentQuestion?.matchQuestionId) return;
    if (!isArenaAuthReady || isAdvancing) return;
    if ((answersCount?.count ?? 0) < 2) return;
    if (autoAdvancedQuestionRef.current === currentQuestion.matchQuestionId) return;

    autoAdvancedQuestionRef.current = currentQuestion.matchQuestionId;
    void handleAdvanceQuestion();
  }, [
    matchId,
    match,
    currentQuestion?.matchQuestionId,
    answersCount?.count,
    isArenaAuthReady,
    isAdvancing,
    handleAdvanceQuestion,
  ]);

  useEffect(() => {
    if (!matchId || !match || match.status !== "active" || match.mode !== "duel") return;
    if (!currentQuestion?.matchQuestionId) return;
    if (!isArenaAuthReady || isAdvancing) return;
    if (remainingMs > 0) return;
    if (autoAdvancedQuestionRef.current === currentQuestion.matchQuestionId) return;

    autoAdvancedQuestionRef.current = currentQuestion.matchQuestionId;
    void handleAdvanceQuestion();
  }, [
    matchId,
    match,
    currentQuestion?.matchQuestionId,
    remainingMs,
    nowMs,
    isArenaAuthReady,
    isAdvancing,
    handleAdvanceQuestion,
  ]);

  return (
    <main className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary/30">
      <nav className="flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto fixed top-0 z-50 bg-[#051426] shadow-[0_0_32px_rgba(5,20,38,0.06)]">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#adc6ff] to-[#4d8eff]"
          >
            MindClash
          </Link>
          <div className="hidden md:flex items-center gap-6 font-medium text-sm tracking-tight">
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <Link className="text-[#adc6ff] font-bold border-b-2 border-[#adc6ff] pb-1" href="/arena">
              Arena
            </Link>
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">
            notifications
          </button>
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">
            inbox
          </button>
          <UserButton />
        </div>
      </nav>

      <section className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-8">
          {!matchId && (
            <div className="bg-surface-container-low border border-outline-variant/30 p-6">
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  No active match selected. Choose a topic and grade before joining a duel.
                </p>
                <Link
                  href="/matchmaking"
                  className="inline-block px-5 py-2.5 bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container text-sm font-black uppercase tracking-widest"
                >
                  Open Matchmaking
                </Link>
              </div>
            </div>
          )}

          {matchId && (match === undefined || matchState === undefined || currentQuestion === undefined) && (
            <div className="bg-surface-container-low border border-outline-variant/30 p-6">
              <p className="text-sm text-on-surface-variant">Loading live match state...</p>
            </div>
          )}

          {matchId && match && (
            <>
              <div className="w-full max-w-6xl flex justify-between items-center">
                <div className="flex items-center gap-4 text-left">
                  <div className="relative">
                    <div className="w-16 h-16 bg-surface-container border-2 border-primary overflow-hidden flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-primary">person</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                      YOU
                    </div>
                  </div>
                  <div>
                    <h3 className="uppercase tracking-widest text-on-surface-variant mb-1 text-xs">You</h3>
                    <p className="font-bold text-lg text-primary">
                      {user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Signed-in user"}
                    </p>
                    <p className="text-xs text-on-surface-variant">Match: {rawMatchId}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-3xl font-black italic tracking-tighter text-outline-variant opacity-20">VS</div>
                  <div className="w-48 h-1.5 bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#adc6ff] to-[#4d8eff]" style={{ width: `${timerProgress}%` }} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    {match.status}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right flex-row-reverse">
                  <div className="relative">
                    <div className="w-16 h-16 bg-surface-container border-2 border-error-container overflow-hidden flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-error">person_4</span>
                    </div>
                    <div className="absolute -bottom-2 -left-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                      OPP
                    </div>
                  </div>
                  <div>
                    <h3 className="uppercase tracking-widest text-on-surface-variant mb-1 text-xs">Opponent</h3>
                    <p className="font-bold text-lg text-error">
                      {match.player2Id ? "Connected" : "Waiting"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {match.topic ?? "General"} • {match.grade ?? "Any"}
                      {match.faculty ? ` • ${match.faculty}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {match.status === "waiting" && (
                <div className="w-full max-w-6xl bg-surface-container-low border border-outline-variant/20 p-6">
                  <p className="text-sm text-on-surface-variant">
                    Waiting for opponent to join. This page updates automatically.
                  </p>
                </div>
              )}

              {match.status === "active" && currentQuestion && (
                <div className="w-full max-w-6xl grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="bg-surface-container-low p-6 border-l-2 border-primary">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">science</span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                            Subject
                          </h4>
                          <p className="text-lg font-bold">{currentQuestion.question.category}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span>Round Progress</span>
                            <span>{currentQuestion.order + 1} / 10</span>
                          </div>
                          <div className="h-1 bg-surface-container-highest">
                            <div className="h-full bg-secondary" style={{ width: `${((currentQuestion.order + 1) / 10) * 100}%` }} />
                          </div>
                        </div>
                        <div className="pt-4 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                          <p>
                            Difficulty: <span className="text-on-surface font-bold">{currentQuestion.question.difficulty}</span>
                          </p>
                          <p className="mt-1">
                            Type:{" "}
                            <span className="text-on-surface font-bold">
                              {isCurrentQuestionMsq ? "MSQ" : "Open Ended"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container p-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">
                        Live Feed
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-on-surface-variant">
                            {remainingMs > 0 ? "Round in progress..." : "Timer ended. Advancing..."}
                          </span>
                        </div>
                        {waitingForOpponentInDuel && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="w-2 h-2 rounded-full bg-tertiary" />
                            <span className="text-on-surface-variant">Waiting for opponent answer.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-6">
                    <div className="glass-panel p-10 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-highest">
                        <div className="h-full bg-gradient-to-r from-[#adc6ff] to-[#4d8eff]" style={{ width: `${timerProgress}%` }} />
                      </div>
                      <div className="flex justify-between items-start mb-8">
                        <div className="bg-surface-container-highest px-4 py-2 text-primary font-black text-2xl tracking-tighter">
                          {timerSeconds}s
                        </div>
                        <button className="material-symbols-outlined text-on-surface-variant hover:text-white">
                          help_outline
                        </button>
                      </div>

                      <div className="mb-12 space-y-4">
                        <div className="text-xs uppercase tracking-widest text-on-surface-variant">
                          Question {currentQuestion.order + 1} • {currentQuestion.question.category}
                          {currentQuestion.question.faculty ? ` • ${currentQuestion.question.faculty}` : ""}
                        </div>
                        <h2 className="text-3xl font-black tracking-tight leading-tight">
                          {currentQuestion.question.text}
                        </h2>
                      </div>

                      <div className="space-y-4">
                        {isCurrentQuestionMsq && (currentQuestion.question.options?.length ?? 0) > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.question.options.map((option, index) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setAnswerDraft(option)}
                                disabled={hasAnswered || isSubmitting}
                                className={`group flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-high transition-all text-left border-l-2 ${
                                  answerDraft === option ? "border-primary" : "border-transparent"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div>
                                  <span className="text-[10px] font-black text-primary uppercase block mb-1">
                                    Option {String.fromCharCode(65 + index)}
                                  </span>
                                  <span className="font-bold">{option}</span>
                                </div>
                                <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  chevron_right
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <input
                          id="answer"
                          value={answerDraft}
                          onChange={(event) => setAnswerDraft(event.target.value)}
                          disabled={hasAnswered || isSubmitting}
                          className="w-full bg-surface-container-low border border-outline-variant/30 px-4 py-3 outline-none focus:border-primary"
                          placeholder={
                            hasAnswered
                              ? "Answer submitted"
                              : isCurrentQuestionMsq
                                ? "Choose option above or type answer..."
                                : "Type your answer..."
                          }
                        />

                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            onClick={handleSubmitAnswer}
                            disabled={!isArenaAuthReady || hasAnswered || isSubmitting || !matchState || remainingMs <= 0}
                            className="px-6 py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8eff] text-on-primary-container text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {hasAnswered ? "Submitted" : isSubmitting ? "Submitting..." : "Submit Answer"}
                          </button>
                          <button
                            onClick={handleAdvanceQuestion}
                            disabled={!isArenaAuthReady || isAdvancing}
                            className="px-6 py-3 bg-surface-container-highest text-on-surface text-xs font-black uppercase tracking-widest border border-outline-variant/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAdvancing ? "Advancing..." : "Advance Question"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-3 space-y-8">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary" />
                        Match Intel
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-surface-container-low p-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-on-surface-variant">ROUND ANSWERS</span>
                            <span className="text-xs font-black text-primary">{answersCount?.count ?? 0}</span>
                          </div>
                          <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(((answersCount?.count ?? 0) / 2) * 100, 100)}%` }} />
                          </div>
                        </div>
                        <div className="bg-surface-container-low p-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-on-surface-variant">YOUR STATUS</span>
                            <span className={`text-xs font-black ${hasAnswered ? "text-tertiary" : "text-on-surface-variant"}`}>
                              {hasAnswered ? "SUBMITTED" : "PENDING"}
                            </span>
                          </div>
                          <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className={`h-full ${hasAnswered ? "bg-tertiary" : "bg-outline-variant"}`} style={{ width: hasAnswered ? "100%" : "25%" }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest border border-outline-variant/10 p-6">
                      <div className="text-center mb-4">
                        <span className="material-symbols-outlined text-secondary text-4xl mb-2">military_tech</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                          Current Reward Pool
                        </p>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-left">
                          <p className="text-3xl font-black tracking-tighter text-on-surface">
                            {matchResult?.result?.player1Score ?? 0}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant">Your Score</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black tracking-tighter text-tertiary">
                            {matchResult?.result?.player2Score ?? 0}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant">Opp Score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="w-full max-w-6xl">
                  <p className="text-sm text-error font-medium">{actionError}</p>
                </div>
              )}

              {match.status === "active" && !currentQuestion && (
                <div className="bg-surface-container-low border border-outline-variant/20 p-6">
                  <p className="text-sm text-on-surface-variant">
                    Active match has no current question yet. Ensure questions are assigned.
                  </p>
                </div>
              )}

              {match.status === "finished" && (
                <div className="w-full max-w-6xl glass-panel p-8 space-y-4">
                  <h2 className="text-2xl font-black tracking-tight">Match Finished</h2>
                  <p className="text-sm text-on-surface-variant">
                    Final score: {matchResult?.result?.player1Score ?? 0} - {matchResult?.result?.player2Score ?? 0}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Winner: {match.winnerUserId ? match.winnerUserId : "Tie"}
                  </p>
                  <Link href="/dashboard" className="inline-block text-primary font-bold">
                    Back to dashboard
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
