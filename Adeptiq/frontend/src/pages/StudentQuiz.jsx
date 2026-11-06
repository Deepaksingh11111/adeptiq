import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import api from "../services/api";

const DEFAULT_DURATION_SECONDS = 30 * 60;

function parseBackendDate(value) {
  if (!value) return new Date();

  // Backend datetime.utcnow() returns a timestamp without timezone.
  // Treat timezone-less backend timestamps as UTC.
  const normalized =
    typeof value === "string" &&
    !/(Z|[+-]\d{2}:\d{2})$/i.test(value)
      ? `${value}Z`
      : value;

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDurationSeconds(quiz) {
  const minutes = Number(quiz?.duration_minutes);

  return Number.isFinite(minutes) && minutes > 0
    ? Math.floor(minutes * 60)
    : DEFAULT_DURATION_SECONDS;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function normalizeQuestion(item) {
  const options =
    item?.options &&
    typeof item.options === "object"
      ? item.options
      : {};

  return {
    ...item,
    question_text:
      item?.question_text ??
      item?.question ??
      item?.text ??
      "",
    option_a: item?.option_a ?? options.A ?? options.a ?? "",
    option_b: item?.option_b ?? options.B ?? options.b ?? "",
    option_c: item?.option_c ?? options.C ?? options.c ?? "",
    option_d: item?.option_d ?? options.D ?? options.d ?? "",
    marks: item?.marks ?? item?.marks_allocated ?? 1,
  };
}

function StudentQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const answersRef = useRef({});
  const submitLockRef = useRef(false);
  const timerExpiredRef = useRef(false);
  const initializedQuizRef = useRef(null);
  const attemptIdRef = useRef(null);
  const loadGenerationRef = useRef(0);

  const questions = useMemo(() => {
    if (!Array.isArray(quiz?.questions)) return [];
    return quiz.questions.map(normalizeQuestion);
  }, [quiz]);

  const question = questions[currentQuestion];

  // ------------------------------------------------------
  // LOAD QUIZ AND START / RESUME ATTEMPT
  // ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    const generation = ++loadGenerationRef.current;

    async function loadQuiz() {
      setLoading(true);
      setStarting(false);
      setError("");
      setQuiz(null);
      setAttemptId(null);
      setAnswers({});
      setCurrentQuestion(0);
      setResult(null);
      setTimeLeft(null);
      setStartTime(null);

      answersRef.current = {};
      submitLockRef.current = false;
      timerExpiredRef.current = false;
      initializedQuizRef.current = null;
      attemptIdRef.current = null;

      try {
        const quizResponse = await api.get(
          `/student/quizzes/${quizId}`
        );

        if (cancelled) return;

        if (!quizResponse.data?.success) {
          throw new Error(
            quizResponse.data?.message || "Unable to load quiz."
          );
        }

        // The backend returns quiz and questions separately.
        const quizData = quizResponse.data.quiz;
        const questionList = quizResponse.data.questions;

        if (!quizData) {
          throw new Error("Quiz details were not returned by the server.");
        }

        if (!Array.isArray(questionList) || questionList.length === 0) {
          throw new Error(
            "This quiz has no questions. Please contact your teacher."
          );
        }

        setQuiz({
          ...quizData,
          questions: questionList,
        });

        setStarting(true);

        const startResponse = await api.post(
          `/student/quizzes/${quizId}/start`
        );

        if (cancelled) return;

        if (!startResponse.data?.success) {
          throw new Error(
            startResponse.data?.message || "Unable to start quiz."
          );
        }

        const attempt = startResponse.data.attempt;

        if (!attempt?.id) {
          throw new Error("The server did not return an attempt ID.");
        }

        const status = String(attempt.status || "").toLowerCase();

        if (["completed", "submitted", "finished"].includes(status)) {
          throw new Error(
            "This attempt is already completed. Return to the dashboard or contact your teacher."
          );
        }

        const parsedStartTime = parseBackendDate(attempt.started_at);
        const durationSeconds = getDurationSeconds(quizData);

        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - parsedStartTime.getTime()) / 1000)
        );

        const remainingSeconds = Math.max(
          0,
          durationSeconds - elapsedSeconds
        );

        if (cancelled) return;

        attemptIdRef.current = attempt.id;
        initializedQuizRef.current = String(quizId);

        setAttemptId(attempt.id);
        setStartTime(parsedStartTime);
        setTimeLeft(remainingSeconds);

        // If resuming an old attempt whose time has expired,
        // allow the timer effect to submit it once.
        timerExpiredRef.current = remainingSeconds === 0;
      } catch (err) {
        console.error("Student quiz load error:", err);

        if (!cancelled && generation === loadGenerationRef.current) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load quiz."
          );
        }
      } finally {
        if (!cancelled && generation === loadGenerationRef.current) {
          setLoading(false);
          setStarting(false);
        }
      }
    }

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  // ------------------------------------------------------
  // SUBMIT QUIZ
  // ------------------------------------------------------

  async function submitQuiz(automatic = false) {
    if (
      submitLockRef.current ||
      !attemptIdRef.current ||
      !quiz ||
      loading ||
      starting ||
      result
    ) {
      return;
    }

    // Manual submission should be confirmed.
    if (!automatic) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the quiz?"
      );

      if (!confirmed) return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      const submittedAt = Date.now();

      const timeTakenSeconds = startTime
        ? Math.max(
            0,
            Math.floor(
              (submittedAt - startTime.getTime()) / 1000
            )
          )
        : 0;

      // Include all questions; unanswered questions are null.
      const answerList = questions.map((item) => ({
        question_id: item.id,
        selected_answer: answersRef.current[item.id] ?? null,
      }));

      const response = await api.post(
        `/student/quizzes/${quizId}/submit`,
        {
          attempt_id: attemptIdRef.current,
          answers: answerList,
          time_taken_seconds: timeTakenSeconds,
        }
      );

      if (!response.data?.success || !response.data?.result) {
        throw new Error(
          response.data?.message ||
            "The server did not return a quiz result."
        );
      }

      setResult(response.data.result);
      setTimeLeft(0);
    } catch (err) {
      console.error("Student quiz submit error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to submit quiz. Please try again."
      );

      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------
  // TIMER
  // ------------------------------------------------------

  useEffect(() => {
    if (
      loading ||
      starting ||
      !attemptId ||
      !quiz ||
      !startTime ||
      timeLeft === null ||
      result ||
      submitting
    ) {
      return;
    }

    const durationSeconds = getDurationSeconds(quiz);

    function updateTimer() {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - startTime.getTime()) / 1000)
      );

      const remaining = Math.max(
        0,
        durationSeconds - elapsedSeconds
      );

      setTimeLeft(remaining);

      if (remaining === 0) {
        timerExpiredRef.current = true;
      }
    }

    // Calculate immediately and then every second.
    updateTimer();

    const timer = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timer);
  }, [
    loading,
    starting,
    attemptId,
    quiz,
    startTime,
    result,
    submitting,
  ]);

  // ------------------------------------------------------
  // AUTOMATIC SUBMISSION AFTER TIMER EXPIRES
  // ------------------------------------------------------

  useEffect(() => {
    if (
      loading ||
      starting ||
      !attemptId ||
      !quiz ||
      !startTime ||
      timeLeft !== 0 ||
      result ||
      submitting ||
      !timerExpiredRef.current ||
      initializedQuizRef.current !== String(quizId)
    ) {
      return;
    }

    submitQuiz(true);
  }, [
    loading,
    starting,
    attemptId,
    quiz,
    startTime,
    timeLeft,
    result,
    submitting,
    quizId,
  ]);

  // ------------------------------------------------------
  // ANSWER SELECTION
  // ------------------------------------------------------

  function handleAnswer(answer) {
    if (!question || result || submitting || timeLeft === 0) {
      return;
    }

    const updatedAnswers = {
      ...answersRef.current,
      [question.id]: answer,
    };

    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);
  }

  // ------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------

  function handleNext() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // ------------------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------------------

  if (loading || starting) {
    return (
      <div style={styles.page}>
        <div style={styles.centerState}>
          <Loader2 size={38} style={styles.spinner} />
          <h2>Loading Quiz...</h2>
          <p>Preparing your quiz. Please wait.</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------
  // ERROR SCREEN
  // ------------------------------------------------------

  if (error && !quiz) {
    return (
      <div style={styles.page}>
        <div style={styles.centerState}>
          <XCircle size={48} color="#dc2626" />
          <h2>Unable to Load Quiz</h2>
          <p>{error}</p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate("/student/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------
  // RESULT SCREEN
  // ------------------------------------------------------

  if (result) {
    return (
      <div style={styles.page}>
        <div style={styles.resultContainer}>
          <div style={styles.resultIcon}>
            <Trophy size={42} />
          </div>

          <h1 style={styles.resultTitle}>Quiz Completed!</h1>
          <p style={styles.resultSubtitle}>
            Great job! Here is your result.
          </p>

          <div style={styles.resultGrid}>
            <div style={styles.resultCard}>
              <span>Score</span>
              <strong>
                {result.score ?? 0} / {result.total_marks ?? 0}
              </strong>
            </div>

            <div style={styles.resultCard}>
              <span>Accuracy</span>
              <strong>{result.accuracy ?? 0}%</strong>
            </div>

            <div style={styles.resultCard}>
              <span>Correct</span>
              <strong>{result.correct_answers ?? 0}</strong>
            </div>

            <div style={styles.resultCard}>
              <span>Wrong</span>
              <strong>{result.wrong_answers ?? 0}</strong>
            </div>

            <div style={styles.resultCard}>
              <span>Skipped</span>
              <strong>{result.skipped_questions ?? 0}</strong>
            </div>

            <div style={styles.resultCard}>
              <span>Time Taken</span>
              <strong>{formatTime(result.time_taken_seconds ?? 0)}</strong>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate("/student/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------
  // NO QUESTIONS FALLBACK
  // ------------------------------------------------------

  if (!question) {
    return (
      <div style={styles.page}>
        <div style={styles.centerState}>
          <XCircle size={48} color="#dc2626" />
          <h2>No Questions Found</h2>
          <p>This quiz does not contain available questions.</p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate("/student/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const selectedAnswer = answers[question.id];

  const answeredCount = Object.values(answers).filter(Boolean).length;

  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;

  const options = [
    { key: "A", text: question.option_a },
    { key: "B", text: question.option_b },
    { key: "C", text: question.option_c },
    { key: "D", text: question.option_d },
  ];

  // ------------------------------------------------------
  // QUIZ UI
  // ------------------------------------------------------

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <button
            type="button"
            style={styles.backButton}
            onClick={() => {
              if (
                window.confirm(
                  "Exit this quiz? Your attempt may remain in progress."
                )
              ) {
                navigate("/student/dashboard");
              }
            }}
          >
            <ArrowLeft size={18} />
            Exit
          </button>

          <div style={styles.headerCenter}>
            <div className="quiz-header-brand">
              <img src="/logo.png" alt="" />
              <span>Adeptiq</span>
            </div>
            <h1>{quiz.title || "Student Quiz"}</h1>
            {quiz.description && <p>{quiz.description}</p>}
          </div>

          <div
            style={{
              ...styles.timer,
              ...(timeLeft !== null && timeLeft <= 60
                ? styles.timerDanger
                : {}),
            }}
          >
            <Clock3 size={18} />
            {formatTime(timeLeft)}
          </div>
        </header>

        <div style={styles.progressSection}>
          <div style={styles.progressInfo}>
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span>
              {answeredCount}/{questions.length} Answered
            </span>
          </div>

          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {timeLeft === 0 && (
          <div style={styles.errorBox}>
            Time is over. Your quiz is being submitted.
          </div>
        )}

        <main style={styles.questionContainer}>
          <div style={styles.questionNumber}>
            Question {currentQuestion + 1}
          </div>

          <h2 style={styles.questionText}>
            {question.question_text || "Question text unavailable"}
          </h2>

          <div style={styles.options}>
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={submitting || timeLeft === 0}
                  onClick={() => handleAnswer(option.key)}
                  style={{
                    ...styles.option,
                    ...(isSelected ? styles.optionSelected : {}),
                    ...(submitting || timeLeft === 0
                      ? styles.optionDisabled
                      : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.optionLetter,
                      ...(isSelected
                        ? styles.optionLetterSelected
                        : {}),
                    }}
                  >
                    {option.key}
                  </span>

                  <span style={styles.optionText}>
                    {option.text || `Option ${option.key} unavailable`}
                  </span>

                  {isSelected && (
                    <CheckCircle2
                      size={22}
                      style={styles.selectedIcon}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={styles.marks}>
            Marks: <strong>{question.marks}</strong>
          </div>
        </main>

        <footer style={styles.navigation}>
          <button
            type="button"
            style={{
              ...styles.secondaryButton,
              opacity: currentQuestion === 0 ? 0.5 : 1,
            }}
            disabled={currentQuestion === 0 || submitting}
            onClick={handlePrevious}
          >
            <ArrowLeft size={18} />
            Previous
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button
              type="button"
              style={styles.primaryButton}
              disabled={submitting || timeLeft === 0}
              onClick={handleNext}
            >
              Next
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              style={{
                ...styles.submitButton,
                opacity: submitting ? 0.7 : 1,
              }}
              disabled={submitting || !attemptId}
              onClick={() => submitQuiz(false)}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} style={styles.spinner} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Quiz
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// STYLES
// --------------------------------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    padding: "30px 20px",
    color: "#0f172a",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  header: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px 24px",
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 1fr) 130px",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },
  headerCenter: {
    textAlign: "center",
    minWidth: 0,
  },
  backButton: {
    border: "none",
    background: "#f1f5f9",
    color: "#334155",
    padding: "11px 16px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
    fontWeight: 600,
  },
  timer: {
    background: "#eef2ff",
    color: "#4338ca",
    padding: "11px 14px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  timerDanger: {
    background: "#fee2e2",
    color: "#dc2626",
  },
  progressSection: {
    background: "#ffffff",
    marginTop: "18px",
    padding: "18px 22px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
  },
  progressInfo: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "10px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
  },
  progressBar: {
    width: "100%",
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "20px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
    borderRadius: "20px",
    transition: "width 0.3s ease",
  },
  questionContainer: {
    background: "#ffffff",
    marginTop: "18px",
    padding: "35px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  questionNumber: {
    display: "inline-block",
    background: "#eef2ff",
    color: "#4f46e5",
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "18px",
  },
  questionText: {
    fontSize: "25px",
    lineHeight: 1.4,
    margin: "0 0 28px",
    color: "#0f172a",
    overflowWrap: "anywhere",
  },
  options: {
    display: "grid",
    gap: "14px",
  },
  option: {
    width: "100%",
    border: "2px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "17px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#334155",
    fontSize: "16px",
  },
  optionDisabled: {
    cursor: "not-allowed",
    opacity: 0.75,
  },
  optionSelected: {
    border: "2px solid #4f46e5",
    background: "#eef2ff",
    color: "#312e81",
  },
  optionLetter: {
    width: "36px",
    height: "36px",
    minWidth: "36px",
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#475569",
  },
  optionLetterSelected: {
    background: "#4f46e5",
    color: "#ffffff",
  },
  optionText: {
    flex: 1,
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
  selectedIcon: {
    color: "#4f46e5",
    flexShrink: 0,
  },
  marks: {
    marginTop: "22px",
    color: "#64748b",
    fontSize: "14px",
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "18px",
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#ffffff",
    padding: "13px 20px",
    borderRadius: "11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "13px 20px",
    borderRadius: "11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
  },
  submitButton: {
    border: "none",
    background: "linear-gradient(135deg, #059669, #047857)",
    color: "#ffffff",
    padding: "13px 22px",
    borderRadius: "11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "13px 16px",
    borderRadius: "10px",
    marginTop: "18px",
    fontWeight: 600,
  },
  centerState: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textAlign: "center",
  },
  spinner: {
    animation: "spin 1s linear infinite",
  },
  resultContainer: {
    maxWidth: "850px",
    margin: "40px auto",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "40px",
    textAlign: "center",
    boxShadow: "0 15px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },
  resultIcon: {
    width: "80px",
    height: "80px",
    margin: "0 auto 18px",
    borderRadius: "50%",
    background: "#fef3c7",
    color: "#d97706",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    margin: "0 0 8px",
    fontSize: "32px",
  },
  resultSubtitle: {
    margin: "0 0 28px",
    color: "#64748b",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "14px",
    marginBottom: "28px",
  },
  resultCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
};

export default StudentQuiz;