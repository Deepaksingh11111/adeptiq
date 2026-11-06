import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleHelp,
  Clock3,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  BarChart3,
  BookOpen,
  Activity,
  AlertCircle,
} from "lucide-react";
import "./StudentResults.css";

const API_URL = "http://127.0.0.1:5000/api/student/results";

function getToken() {
  return (
    localStorage.getItem("learnadapt_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

/**
 * Safely extracts readable text from API values.
 * Prevents React error:
 * "Objects are not valid as a React child (keys {id, name})"
 */
function displayText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => displayText(item, ""))
      .filter(Boolean)
      .join(", ") || fallback;
  }

  if (typeof value === "object") {
    const readable =
      value.name ??
      value.title ??
      value.topic_name ??
      value.quiz_name ??
      value.subject_name ??
      value.label;

    if (readable !== undefined && readable !== null) {
      return displayText(readable, fallback);
    }

    return fallback;
  }

  return fallback;
}

function toNumber(value, fallback = 0) {
  if (typeof value === "object" && value !== null) {
    value =
      value.value ??
      value.score ??
      value.percentage ??
      value.accuracy ??
      value.total;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getAttemptQuiz(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return {};
  }

  return attempt.quiz && typeof attempt.quiz === "object"
    ? attempt.quiz
    : {};
}

function getQuizName(attempt) {
  const quiz = getAttemptQuiz(attempt);

  return displayText(
    quiz.title ??
      quiz.name ??
      quiz.quiz_name ??
      attempt.quiz_title ??
      attempt.quiz_name ??
      attempt.title,
    "Untitled Quiz"
  );
}

function getAttemptScore(attempt) {
  return toNumber(
    attempt?.score ??
      attempt?.obtained_score ??
      attempt?.marks_obtained ??
      attempt?.total_score,
    0
  );
}

function getAttemptAccuracy(attempt) {
  const directAccuracy =
    attempt?.accuracy ??
    attempt?.accuracy_percentage ??
    attempt?.percentage;

  if (directAccuracy !== undefined && directAccuracy !== null) {
    return Math.max(0, Math.min(100, toNumber(directAccuracy)));
  }

  const correct = toNumber(
    attempt?.correct_answers ?? attempt?.correct_count,
    0
  );

  const total = toNumber(
    attempt?.total_questions ?? attempt?.question_count,
    0
  );

  if (total > 0) {
    return Math.round((correct / total) * 100);
  }

  return 0;
}

function getAttemptStatus(attempt) {
  const raw = displayText(
    attempt?.status ?? attempt?.state,
    ""
  ).toLowerCase();

  if (
    raw.includes("progress") ||
    raw.includes("started") ||
    raw.includes("ongoing")
  ) {
    return "In Progress";
  }

  if (
    raw.includes("complete") ||
    raw.includes("submitted") ||
    raw.includes("finished")
  ) {
    return "Completed";
  }

  if (attempt?.completed_at || attempt?.submitted_at) {
    return "Completed";
  }

  return "Attempt Recorded";
}

function getAttemptDate(attempt) {
  const value =
    attempt?.completed_at ??
    attempt?.submitted_at ??
    attempt?.created_at ??
    attempt?.started_at ??
    attempt?.date;

  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return displayText(value, "Date unavailable");
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTopic(topic, index) {
  const item =
    topic && typeof topic === "object" ? topic : {};

  const name = displayText(
    item.topic_name ??
      item.topic ??
      item.name ??
      item.subject ??
      item.title,
    `Topic ${index + 1}`
  );

  const mastery = Math.max(
    0,
    Math.min(
      100,
      toNumber(
        item.mastery_score ??
          item.mastery ??
          item.accuracy ??
          item.accuracy_percentage ??
          item.score ??
          item.percentage,
        0
      )
    )
  );

  return {
    id: displayText(item.id, `topic-${index}`),
    name,
    mastery,
    attempts: toNumber(
      item.total_attempts ?? item.attempts ?? item.attempt_count,
      0
    ),
  };
}

function normalizePerformance(data) {
  const performance =
    data && typeof data === "object" ? data : {};

  const summary =
    performance.summary && typeof performance.summary === "object"
      ? performance.summary
      : performance;

  const rawTopics = Array.isArray(performance.topics)
    ? performance.topics
    : Array.isArray(performance.topic_performance)
      ? performance.topic_performance
      : Array.isArray(summary.topics)
        ? summary.topics
        : [];

  return {
    totalAttempts: toNumber(
      summary.total_attempts ??
        summary.completed_attempts ??
        summary.quiz_attempts,
      0
    ),
    totalQuestions: toNumber(
      summary.total_questions ??
        summary.questions_answered,
      0
    ),
    correctAnswers: toNumber(
      summary.correct_answers ??
        summary.correct_count,
      0
    ),
    wrongAnswers: toNumber(
      summary.wrong_answers ??
        summary.wrong_count,
      0
    ),
    accuracy: Math.max(
      0,
      Math.min(
        100,
        toNumber(
          summary.overall_accuracy ??
            summary.accuracy ??
            summary.accuracy_percentage,
          0
        )
      )
    ),
    mastery: Math.max(
      0,
      Math.min(
        100,
        toNumber(
          summary.overall_mastery_score ??
            summary.mastery_score ??
            summary.mastery,
          0
        )
      )
    ),
    topics: rawTopics.map(normalizeTopic),
  };
}

async function requestJSON(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Invalid server response." };
  }

  if (!response.ok) {
    throw new Error(
      displayText(
        data.message ?? data.error ?? data.msg,
        `Request failed (${response.status})`
      )
    );
  }

  return data;
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  className = "",
  delay = 0,
}) {
  return (
    <article
      className={`sr-stat-card ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="sr-stat-top">
        <span className="sr-stat-icon">
          <Icon size={21} strokeWidth={2} />
        </span>

        <span className="sr-stat-decoration">
          <TrendingUp size={17} />
        </span>
      </div>

      <p className="sr-stat-label">{label}</p>

      <div className="sr-stat-value">{value}</div>

      <p className="sr-stat-description">{description}</p>
    </article>
  );
}

function MasteryRing({ value }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="sr-mastery-ring"
      style={{
        "--mastery": `${safeValue * 3.6}deg`,
      }}
      role="img"
      aria-label={`Overall mastery ${Math.round(safeValue)} percent`}
    >
      <div className="sr-mastery-inner">
        <strong>{Math.round(safeValue)}%</strong>
        <span>Mastery</span>
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <div className="sr-empty">
      <div className="sr-empty-icon">
        <BookOpen size={31} />
      </div>

      <h3>Your learning journey starts here</h3>

      <p>
        Complete your first quiz to see your scores, accuracy
        and learning progress here.
      </p>

      <button
        className="sr-primary-button"
        type="button"
        onClick={onRefresh}
      >
        <RefreshCw size={17} />
        Refresh results
      </button>
    </div>
  );
}

export default function StudentResults() {
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [performance, setPerformance] = useState(
    normalizePerformance({})
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token = getToken();

      const [attemptResult, performanceResult] =
        await Promise.allSettled([
          requestJSON(`${API_URL}/attempts`, token),
          requestJSON(`${API_URL}/performance`, token),
        ]);

      if (attemptResult.status === "rejected") {
        throw attemptResult.reason;
      }

      const attemptData = attemptResult.value;

      const attemptList = Array.isArray(attemptData)
        ? attemptData
        : Array.isArray(attemptData.attempts)
          ? attemptData.attempts
          : Array.isArray(attemptData.results)
            ? attemptData.results
            : Array.isArray(attemptData.data)
              ? attemptData.data
              : [];

      setAttempts(attemptList);

      if (performanceResult.status === "fulfilled") {
        setPerformance(
          normalizePerformance(performanceResult.value)
        );
      } else {
        // Derive useful summary data from attempts if the
        // performance endpoint is temporarily unavailable.
        const completed = attemptList.filter(
          (attempt) => getAttemptStatus(attempt) === "Completed"
        );

        const questionCount = completed.reduce(
          (sum, attempt) =>
            sum +
            toNumber(
              attempt.total_questions ??
                attempt.question_count,
              0
            ),
          0
        );

        const correctCount = completed.reduce(
          (sum, attempt) =>
            sum +
            toNumber(
              attempt.correct_answers ??
                attempt.correct_count,
              0
            ),
          0
        );

        setPerformance(
          normalizePerformance({
            total_attempts: completed.length,
            total_questions: questionCount,
            correct_answers: correctCount,
            wrong_answers: Math.max(
              0,
              questionCount - correctCount
            ),
            overall_accuracy:
              questionCount > 0
                ? (correctCount / questionCount) * 100
                : 0,
          })
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load results. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const completedAttempts = attempts.filter(
    (attempt) => getAttemptStatus(attempt) === "Completed"
  );

  const averageScore =
    completedAttempts.length > 0
      ? completedAttempts.reduce(
          (sum, attempt) => sum + getAttemptScore(attempt),
          0
        ) / completedAttempts.length
      : 0;

  const recentAttempts = [...attempts]
    .sort((a, b) => {
      const dateA = new Date(
        a.completed_at ??
          a.submitted_at ??
          a.created_at ??
          a.started_at ??
          0
      ).getTime();

      const dateB = new Date(
        b.completed_at ??
          b.submitted_at ??
          b.created_at ??
          b.started_at ??
          0
      ).getTime();

      return (
        (Number.isFinite(dateB) ? dateB : 0) -
        (Number.isFinite(dateA) ? dateA : 0)
      );
    })
    .slice(0, 10);

  const openAttempt = (attempt) => {
    const id = attempt?.id ?? attempt?.attempt_id;

    if (id === undefined || id === null) {
      setError("This attempt does not have a valid result ID.");
      return;
    }

    navigate(`/student/results/${encodeURIComponent(String(id))}`);
  };

  return (
    <main className="sr-page">
      <div className="sr-background-orb sr-orb-one" />
      <div className="sr-background-orb sr-orb-two" />

      <div className="sr-container">
        <header className="sr-topbar">
          <button
            className="sr-back-button"
            type="button"
            onClick={() => navigate("/student/dashboard")}
          >
            <ArrowLeft size={17} />
            <span>Back to Dashboard</span>
          </button>

          <button
            className="sr-refresh-button"
            type="button"
            onClick={() => loadResults(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "sr-spin" : ""
              }
            />
            <span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </header>

        <section className="sr-hero">
          <div className="sr-hero-copy">
            <div className="sr-brand">
              <span className="sr-brand-icon">
                <img src="/logo.png" alt="" />
              </span>
              <span>Adeptiq</span>
            </div>

            <div className="sr-eyebrow">
              <Sparkles size={14} />
              YOUR LEARNING JOURNEY
            </div>

            <h1>
              My Results &amp;
              <span> Performance</span>
            </h1>

            <p>
              Track your quiz attempts, understand your strengths,
              and discover how far you have come.
            </p>

            <div className="sr-hero-pills">
              <span>
                <Activity size={15} />
                Learning analytics
              </span>
              <span>
                <Target size={15} />
                Personal progress
              </span>
            </div>
          </div>

          <div className="sr-hero-visual">
            <div className="sr-hero-glow" />

            <div className="sr-hero-badge sr-badge-top">
              <TrendingUp size={17} />
              <span>Keep improving</span>
            </div>

            <div className="sr-hero-center">
              <div className="sr-hero-circle">
                <GraduationCap size={56} strokeWidth={1.5} />
              </div>
              <div className="sr-hero-spark sr-spark-one">
                ✦
              </div>
              <div className="sr-hero-spark sr-spark-two">
                ✧
              </div>
            </div>

            <div className="sr-hero-badge sr-badge-bottom">
              <Trophy size={17} />
              <span>Every quiz counts</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="sr-error" role="alert">
            <AlertCircle size={20} />

            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => loadResults(true)}
            >
              Try again
            </button>
          </div>
        )}

        <section className="sr-section">
          <div className="sr-section-heading">
            <div>
              <span className="sr-section-kicker">
                YOUR OVERVIEW
              </span>
              <h2>Performance at a glance</h2>
              <p>Your learning activity, all in one place.</p>
            </div>

            <div className="sr-live-indicator">
              <span />
              Learning insights
            </div>
          </div>

          {loading ? (
            <div className="sr-loading-grid">
              {[1, 2, 3, 4].map((item) => (
                <div
                  className="sr-skeleton-card"
                  key={item}
                >
                  <div />
                  <div />
                  <div />
                </div>
              ))}
            </div>
          ) : (
            <div className="sr-stats-grid">
              <StatCard
                icon={BookOpen}
                label="QUIZ ATTEMPTS"
                value={performance.totalAttempts || attempts.length}
                description="Recorded learning attempts"
                className="sr-stat-purple"
                delay={0}
              />

              <StatCard
                icon={CheckCircle2}
                label="CORRECT ANSWERS"
                value={performance.correctAnswers}
                description={`${performance.wrongAnswers} incorrect answers`}
                className="sr-stat-green"
                delay={80}
              />

              <StatCard
                icon={Target}
                label="OVERALL ACCURACY"
                value={`${performance.accuracy.toFixed(1)}%`}
                description="Across recorded performance"
                className="sr-stat-blue"
                delay={160}
              />

              <StatCard
                icon={Trophy}
                label="AVERAGE SCORE"
                value={averageScore.toFixed(1)}
                description="Average completed quiz score"
                className="sr-stat-orange"
                delay={240}
              />
            </div>
          )}
        </section>

        <section className="sr-insights-grid">
          <article className="sr-panel sr-mastery-panel">
            <div className="sr-panel-heading">
              <div>
                <span className="sr-section-kicker">
                  OVERALL PROGRESS
                </span>
                <h2>Your learning mastery</h2>
              </div>

              <span className="sr-heading-icon">
                <BarChart3 size={20} />
              </span>
            </div>

            {loading ? (
              <div className="sr-mastery-loading">
                <div />
                <div />
              </div>
            ) : (
              <div className="sr-mastery-content">
                <MasteryRing value={performance.mastery} />

                <div className="sr-mastery-copy">
                  <h3>
                    {performance.mastery >= 80
                      ? "Excellent progress!"
                      : performance.mastery >= 60
                        ? "You're making progress!"
                        : performance.mastery >= 35
                          ? "Keep building momentum!"
                          : "Your journey starts here!"}
                  </h3>

                  <p>
                    Your mastery score represents your recorded
                    learning progress. Keep practising to improve
                    your understanding.
                  </p>

                  <div className="sr-mastery-track">
                    <span
                      style={{
                        width: `${performance.mastery}%`,
                      }}
                    />
                  </div>

                  <div className="sr-mastery-footer">
                    <span>Current mastery</span>
                    <strong>
                      {Math.round(performance.mastery)}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </article>

          <article className="sr-panel sr-answer-panel">
            <div className="sr-panel-heading">
              <div>
                <span className="sr-section-kicker">
                  ANSWER BREAKDOWN
                </span>
                <h2>Accuracy overview</h2>
              </div>

              <span className="sr-heading-icon sr-heading-green">
                <Target size={20} />
              </span>
            </div>

            <div className="sr-answer-total">
              <span>Total questions</span>
              <strong>{performance.totalQuestions}</strong>
            </div>

            <div className="sr-answer-row">
              <div className="sr-answer-label">
                <span className="sr-answer-dot sr-dot-green" />
                <span>Correct answers</span>
              </div>

              <strong>{performance.correctAnswers}</strong>
            </div>

            <div className="sr-answer-track">
              <span
                className="sr-answer-fill sr-fill-green"
                style={{
                  width: `${
                    performance.totalQuestions > 0
                      ? Math.min(
                          100,
                          (performance.correctAnswers /
                            performance.totalQuestions) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="sr-answer-row">
              <div className="sr-answer-label">
                <span className="sr-answer-dot sr-dot-red" />
                <span>Incorrect answers</span>
              </div>

              <strong>{performance.wrongAnswers}</strong>
            </div>

            <div className="sr-answer-track">
              <span
                className="sr-answer-fill sr-fill-red"
                style={{
                  width: `${
                    performance.totalQuestions > 0
                      ? Math.min(
                          100,
                          (performance.wrongAnswers /
                            performance.totalQuestions) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="sr-answer-note">
              <CircleHelp size={16} />
              Review incorrect answers and practise those topics.
            </div>
          </article>
        </section>

        <section className="sr-panel sr-topics-panel">
          <div className="sr-section-heading">
            <div>
              <span className="sr-section-kicker">
                PERSONALIZED INSIGHTS
              </span>
              <h2>Topic mastery</h2>
              <p>
                See how you're performing across different topics.
              </p>
            </div>

            <span className="sr-heading-icon">
              <Brain size={21} />
            </span>
          </div>

          {loading ? (
            <div className="sr-topic-skeletons">
              <div />
              <div />
              <div />
            </div>
          ) : performance.topics.length === 0 ? (
            <div className="sr-topic-empty">
              <div className="sr-topic-empty-icon">
                <BarChart3 size={25} />
              </div>

              <h3>Topic insights will appear here</h3>

              <p>
                Complete quizzes with topic information to see
                your mastery breakdown.
              </p>
            </div>
          ) : (
            <div className="sr-topics-grid">
              {performance.topics.map((topic, index) => (
                <article
                  className="sr-topic-card"
                  key={`${topic.id}-${index}`}
                  style={{
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  <div className="sr-topic-card-top">
                    <span className="sr-topic-icon">
                      <BookOpen size={19} />
                    </span>

                    <span
                      className={`sr-topic-level ${
                        topic.mastery >= 75
                          ? "sr-level-strong"
                          : topic.mastery >= 45
                            ? "sr-level-medium"
                            : "sr-level-growing"
                      }`}
                    >
                      {topic.mastery >= 75
                        ? "Strong"
                        : topic.mastery >= 45
                          ? "Growing"
                          : "Needs practice"}
                    </span>
                  </div>

                  <h3>{topic.name}</h3>

                  <p>
                    {topic.attempts} recorded attempts
                  </p>

                  <div className="sr-topic-progress">
                    <span
                      style={{
                        width: `${topic.mastery}%`,
                      }}
                    />
                  </div>

                  <div className="sr-topic-progress-footer">
                    <span>Mastery</span>
                    <strong>
                      {Math.round(topic.mastery)}%
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="sr-panel sr-history-panel">
          <div className="sr-history-heading">
            <div>
              <span className="sr-section-kicker">
                YOUR ACTIVITY
              </span>
              <h2>Recent quiz attempts</h2>
              <p>
                Review your latest attempts and completed results.
              </p>
            </div>

            <div className="sr-history-count">
              <Clock3 size={16} />
              {attempts.length} attempts
            </div>
          </div>

          {loading ? (
            <div className="sr-history-loading">
              <div />
              <div />
              <div />
            </div>
          ) : attempts.length === 0 ? (
            <EmptyState
              onRefresh={() => loadResults(true)}
            />
          ) : (
            <div className="sr-table-wrapper">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th>QUIZ</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>SCORE</th>
                    <th>ACCURACY</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {recentAttempts.map((attempt, index) => {
                    const status = getAttemptStatus(attempt);
                    const accuracy = getAttemptAccuracy(attempt);
                    const id =
                      attempt.id ??
                      attempt.attempt_id ??
                      `attempt-${index}`;

                    return (
                      <tr key={String(id)}>
                        <td>
                          <div className="sr-table-quiz">
                            <span className="sr-table-quiz-icon">
                              <GraduationCap size={18} />
                            </span>

                            <div>
                              <strong>
                                {getQuizName(attempt)}
                              </strong>
                              <span>
                                Attempt #{index + 1}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="sr-date-cell">
                          {getAttemptDate(attempt)}
                        </td>

                        <td>
                          <span
                            className={`sr-status ${
                              status === "Completed"
                                ? "sr-status-completed"
                                : status === "In Progress"
                                  ? "sr-status-progress"
                                  : "sr-status-neutral"
                            }`}
                          >
                            <span />
                            {status}
                          </span>
                        </td>

                        <td className="sr-score-cell">
                          {getAttemptScore(attempt).toFixed(1)}
                        </td>

                        <td>
                          {status === "In Progress"
                            ? "—"
                            : `${accuracy.toFixed(1)}%`}
                        </td>

                        <td>
                          <button
                            className="sr-view-button"
                            type="button"
                            onClick={() => openAttempt(attempt)}
                            disabled={
                              attempt.id == null &&
                              attempt.attempt_id == null
                            }
                          >
                            View Result
                            <ArrowRight size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && attempts.length > 0 && (
            <div className="sr-history-footer">
              <span>
                Showing {recentAttempts.length} of{" "}
                {attempts.length} attempts
              </span>

              <button
                type="button"
                onClick={() => navigate("/student/dashboard")}
              >
                Back to Dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>

        <footer className="sr-footer">
          <div className="sr-footer-brand">
            <img src="/logo.png" alt="" />
            <span>Adeptiq</span>
          </div>

          <p>
            Learn smarter. Grow continuously.
          </p>

          <span className="sr-footer-status">
            <span />
            Your progress matters
          </span>
        </footer>
      </div>
    </main>
  );
}