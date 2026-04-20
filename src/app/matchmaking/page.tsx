"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";

const gradeOptions = [
  { value: "middle", label: "Middle School" },
  { value: "high", label: "High School" },
  { value: "college", label: "College" },
] as const;

type GradeValue = (typeof gradeOptions)[number]["value"];

export default function MatchmakingPage() {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<GradeValue>("high");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsFaculty = selectedGrade === "college";

  const currentUser = useQuery(api.users.getUserOptional);
  const userByClerkId = useQuery(
    api.users.getUserByClerkIdOptional,
    isClerkLoaded && isSignedIn && clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );
  const courseRatings = useQuery(
    api.users.getMyCourseRatings,
    currentUser === undefined || currentUser === null ? "skip" : {},
  );
  const options = useQuery(api.questions.getMatchmakingOptions, {
    grade: selectedGrade,
    faculty: needsFaculty ? selectedFaculty || undefined : undefined,
  });
  const waitingDuels = useQuery(api.matches.getWaitingMatchesByMode, {
    mode: "duel",
    topic: selectedTopic || undefined,
    grade: selectedGrade,
    faculty: needsFaculty ? selectedFaculty || undefined : undefined,
  });
  const questionIds = useQuery(api.questions.getQuestionsForQuickPlay, {
    category: selectedTopic || undefined,
    grade: selectedGrade,
    faculty: needsFaculty ? selectedFaculty || undefined : undefined,
    limit: 10,
  });

  const findOrCreateDuelMatch = useMutation(api.matches.findOrCreateDuelMatch);

  const selectedTopicRating = useMemo(() => {
    if (!selectedTopic || !courseRatings) return 1000;
    return courseRatings.find((entry) => entry.course === selectedTopic)?.rating ?? 1000;
  }, [courseRatings, selectedTopic]);
  const availableTopics = options?.topics ?? [];
  const canChooseTopic = !needsFaculty || Boolean(selectedFaculty);
  const resolvedUser = currentUser ?? userByClerkId ?? null;
  const isProfileSyncing = isClerkLoaded && isSignedIn && resolvedUser === null;

  useEffect(() => {
    if (!needsFaculty) {
      setSelectedFaculty("");
    }
  }, [needsFaculty]);

  useEffect(() => {
    const availableTopics = options?.topics ?? [];
    if (selectedTopic && !availableTopics.includes(selectedTopic)) {
      setSelectedTopic("");
    }
  }, [options, selectedTopic]);

  useEffect(() => {
    setError(null);
  }, [selectedGrade, selectedFaculty, selectedTopic]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H1_H2_H3",
        location: "src/app/matchmaking/page.tsx:48",
        message: "matchmaking state snapshot",
        data: {
          selectedTopic,
          selectedGrade,
          selectedFaculty,
          hasCurrentUser: Boolean(currentUser),
          optionsCount: options?.topics?.length ?? -1,
          waitingCount: waitingDuels?.length ?? -1,
          questionCount: questionIds?.length ?? -1,
          ratingsStatus:
            courseRatings === undefined ? "loading" : courseRatings === null ? "null" : "loaded",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [selectedTopic, selectedGrade, selectedFaculty, currentUser, options, waitingDuels, questionIds, courseRatings]);

  async function handleFindMatch() {
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H1_H2_H3",
        location: "src/app/matchmaking/page.tsx:70",
        message: "start matchmaking clicked",
        data: {
          selectedTopic,
          selectedGrade,
          selectedFaculty,
          hasCurrentUser: Boolean(currentUser),
          waitingCount: waitingDuels?.length ?? -1,
          questionCount: questionIds?.length ?? -1,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!selectedTopic) {
      setError("Choose a topic before starting matchmaking.");
      return;
    }
    if (!resolvedUser) {
      setError("Your profile is still syncing. Please wait a moment and try again.");
      return;
    }
    if (needsFaculty && !selectedFaculty) {
      setError("Choose a faculty for college matchmaking.");
      return;
    }
    if (!questionIds || questionIds.length === 0) {
      setError("No questions exist for this topic and grade yet.");
      return;
    }

    setIsFindingMatch(true);
    setError(null);
    try {
      const result = await findOrCreateDuelMatch({
        playerId: resolvedUser._id,
        topic: selectedTopic,
        grade: selectedGrade,
        faculty: needsFaculty ? selectedFaculty : undefined,
        questionIds,
      });
      // #region agent log
      fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
        body: JSON.stringify({
          sessionId: "86b558",
          runId: "pre-fix",
          hypothesisId: "H4",
          location: "src/app/matchmaking/page.tsx:105",
          message: "server matchmaking result snapshot",
          data: {
            joinedExisting: result.joinedExisting,
            waitingCount: waitingDuels?.length ?? -1,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      // #region agent log
      fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
        body: JSON.stringify({
          sessionId: "86b558",
          runId: "pre-fix",
          hypothesisId: "H4",
          location: "src/app/matchmaking/page.tsx:160",
          message: "findOrCreateDuelMatch resolved",
          data: { matchId: String(result.matchId), joinedExisting: result.joinedExisting },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      router.replace(`/arena?matchId=${result.matchId}`);
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
        body: JSON.stringify({
          sessionId: "86b558",
          runId: "pre-fix",
          hypothesisId: "H1_H2_H3_H4",
          location: "src/app/matchmaking/page.tsx:175",
          message: "matchmaking flow threw error",
          data: { errorMessage: err instanceof Error ? err.message : "unknown" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setError(err instanceof Error ? err.message : "Failed to start matchmaking.");
    } finally {
      setIsFindingMatch(false);
    }
  }

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
            <Link className="text-primary font-bold border-b-2 border-primary pb-1" href="/matchmaking">
              Matchmaking
            </Link>
            <Link className="text-[#94a3b8] hover:text-primary transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
          </div>
        </div>
        <UserButton />
      </nav>

      <section className="min-h-screen pt-24 pb-12 px-6 flex items-start justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <div className="glass-panel border border-outline-variant/20 p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Arena Setup</p>
              <h1 className="text-4xl font-black tracking-tight">Build Your Queue</h1>
              <p className="text-sm text-on-surface-variant mt-2">
                Choose school level, then faculty (for college), then topic.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Step 1 - School Level</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {gradeOptions.map((grade) => (
                  <button
                    key={grade.value}
                    type="button"
                    onClick={() => setSelectedGrade(grade.value)}
                    className={`px-4 py-3 border text-sm font-bold transition-colors ${
                      selectedGrade === grade.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
            </div>

            {needsFaculty && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Step 2 - Faculty</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(options?.faculties ?? ["Management", "Computer Science", "Law"]).map((faculty) => (
                    <button
                      key={faculty}
                      type="button"
                      onClick={() => setSelectedFaculty(faculty)}
                      className={`px-4 py-3 border text-sm font-bold transition-colors ${
                        selectedFaculty === faculty
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {faculty}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                Step {needsFaculty ? "3" : "2"} - Topic
              </p>
              <select
                value={selectedTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                disabled={!canChooseTopic}
                className="w-full bg-surface-container-low border border-outline-variant/30 px-4 py-3 outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!canChooseTopic ? "Choose faculty first" : availableTopics.length ? "Select topic" : "No topics available"}
                </option>
                {availableTopics.map((topic) => (
                  <option value={topic} key={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-surface-container-low border border-outline-variant/20">
                Grade: {gradeOptions.find((g) => g.value === selectedGrade)?.label}
              </span>
              {needsFaculty && selectedFaculty && (
                <span className="px-2 py-1 bg-surface-container-low border border-outline-variant/20">
                  Faculty: {selectedFaculty}
                </span>
              )}
              {selectedTopic && (
                <span className="px-2 py-1 bg-surface-container-low border border-outline-variant/20">
                  Topic: {selectedTopic}
                </span>
              )}
            </div>

            <div className="bg-surface-container-low p-4 border border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">Course Rating</p>
                <p className="text-2xl font-black text-primary">{selectedTopicRating}</p>
              </div>
              <div className="text-xs text-on-surface-variant">
                Open queue for selection: <span className="font-bold text-on-surface">{waitingDuels?.length ?? 0}</span>
              </div>
            </div>

            <button
              onClick={handleFindMatch}
              disabled={
                isFindingMatch ||
                !isClerkLoaded ||
                !isSignedIn ||
                currentUser === undefined ||
                (currentUser === null && userByClerkId === undefined) ||
                options === undefined ||
                waitingDuels === undefined ||
                questionIds === undefined
              }
              className="w-full md:w-auto px-8 py-3 bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container text-sm font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFindingMatch ? "Finding Match..." : "Start Matchmaking"}
            </button>
            {isProfileSyncing && (
              <p className="text-xs text-on-surface-variant">
                Syncing your profile with the arena. Start Matchmaking will unlock automatically.
              </p>
            )}

            {error && <p className="text-sm text-error font-medium">{error}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
