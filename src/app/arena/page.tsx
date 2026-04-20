"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
      await submitAnswer({
        matchId,
        matchQuestionId: currentQuestion.matchQuestionId,
        submittedAnswer,
        responseTime,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        setActionError("Session is still syncing with game server. Try again in a moment.");
        return;
      }
      setActionError(error instanceof Error ? error.message : "Failed to submit answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvanceQuestion() {
    if (!isArenaAuthReady) {
      setActionError("Session is still syncing. Please wait a moment and try again.");
      return;
    }
    if (!matchId) return;
    setIsAdvancing(true);
    setActionError(null);
    try {
      await advanceQuestion({ matchId });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        setActionError("Session is still syncing with game server. Try again in a moment.");
        return;
      }
      setActionError(error instanceof Error ? error.message : "Failed to advance question.");
    } finally {
      setIsAdvancing(false);
    }
  }

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
  ]);

  return (
    <main className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary/30">
      <nav className="flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto fixed top-0 z-50 bg-[#051426] shadow-[0_0_32px_rgba(5,20,38,0.06)]">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-primary to-[#4d8eff]"
          >
            MindClash
          </Link>
          <div className="hidden md:flex items-center gap-6 font-medium text-sm tracking-tight">
            <Link className="text-[#94a3b8] hover:text-primary transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <Link className="text-primary font-bold border-b-2 border-primary pb-1" href="/arena">
              Arena
            </Link>
            <Link className="text-[#94a3b8] hover:text-primary transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </nav>

      <section className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">
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
              <div className="bg-surface-container-low border border-outline-variant/20 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-2xl font-black tracking-tight">Live Duel Arena</h1>
                  <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                    {match.status}
                  </span>
                </div>
                <div className="text-sm text-on-surface-variant">
                  Match: <span className="font-mono">{rawMatchId}</span>
                </div>
                <div className="text-sm text-on-surface-variant">
                  Queue: {match.topic ?? "General"} • {match.grade ?? "Any"}
                  {match.faculty ? ` • ${match.faculty}` : ""}
                </div>
                <div className="text-sm text-on-surface-variant">
                  Player: {user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Signed-in user"}
                </div>
              </div>

              {match.status === "waiting" && (
                <div className="bg-surface-container-low border border-outline-variant/20 p-6">
                  <p className="text-sm text-on-surface-variant">
                    Waiting for opponent to join. This page updates automatically.
                  </p>
                </div>
              )}

              {match.status === "active" && currentQuestion && (
                <div className="glass-panel p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-on-surface-variant">
                        Question {currentQuestion.order + 1}
                      </span>
                      <span className="text-lg font-black text-primary">{timerSeconds}s</span>
                    </div>
                    <div className="h-1 bg-surface-container-highest">
                      <div
                        className="h-full bg-linear-to-br from-primary to-[#4d8eff]"
                        style={{ width: `${timerProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {currentQuestion.question.category} • {currentQuestion.question.difficulty}
                      {currentQuestion.question.faculty ? ` • ${currentQuestion.question.faculty}` : ""}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{currentQuestion.question.text}</h2>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="answer" className="text-xs uppercase tracking-widest text-on-surface-variant">
                      Your Answer
                    </label>
                    <input
                      id="answer"
                      value={answerDraft}
                      onChange={(event) => setAnswerDraft(event.target.value)}
                      disabled={hasAnswered || isSubmitting}
                      className="w-full bg-surface-container-low border border-outline-variant/30 px-4 py-3 outline-none focus:border-primary"
                      placeholder={hasAnswered ? "Answer submitted" : "Type your answer..."}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={
                        !isArenaAuthReady || hasAnswered || isSubmitting || !matchState || remainingMs <= 0
                      }
                      className="px-5 py-2.5 bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container text-sm font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hasAnswered ? "Submitted" : isSubmitting ? "Submitting..." : "Submit Answer"}
                    </button>
                    <button
                      onClick={handleAdvanceQuestion}
                      disabled={!isArenaAuthReady || isAdvancing}
                      className="px-5 py-2.5 bg-surface-container-high text-on-surface text-sm font-black uppercase tracking-widest border border-outline-variant/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdvancing ? "Advancing..." : "Advance Question"}
                    </button>
                  </div>

                  <div className="text-sm text-on-surface-variant space-y-1">
                    <p>Answers submitted this round: {answersCount?.count ?? 0}</p>
                    <p>{remainingMs > 0 ? "Question in progress." : "Timer ended. Waiting for advance."}</p>
                    {!isArenaAuthReady && <p>Syncing session with arena actions...</p>}
                    {waitingForOpponentInDuel && (
                      <p>Answer submitted. Waiting for opponent to answer...</p>
                    )}
                    {hasAnswered && (
                      <p className="text-tertiary">
                        You already submitted{myAnswer?.submittedAnswer ? `: "${myAnswer.submittedAnswer}"` : "."}
                      </p>
                    )}
                  </div>

                  {actionError && <p className="text-sm text-error font-medium">{actionError}</p>}
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
                <div className="glass-panel p-8 space-y-4">
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
