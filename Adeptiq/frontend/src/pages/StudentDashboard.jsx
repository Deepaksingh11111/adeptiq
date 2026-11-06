import { useEffect, useState } from "react";

import {
  BookOpen,
  LogOut,
  Users,
  ArrowRight,
  FileQuestion,
  RefreshCw,
  Trophy,
  ChartNoAxesCombined,
  ClipboardList,
  Target,
  ChevronRight,
  Home,
  UserPlus,
  Plus,
  X,
  Search,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import api from "../services/api";

function StudentDashboard() {
  const [classes, setClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joiningClassId, setJoiningClassId] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [joinSearch, setJoinSearch] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [attempts, setAttempts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] =
    useState(true);

  const [message, setMessage] = useState("");
  const [quizMessage, setQuizMessage] = useState("");
  const [performanceMessage, setPerformanceMessage] =
    useState("");

  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("learnadapt_user") || "{}"
  );

  const loadClasses = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get(
        "/student/classes/joined"
      );

      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("Load classes error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load your classes."
      );
    } finally {
      setLoading(false);
    }
  };

  const openJoinClass = async () => {
    setShowJoinModal(true);
    setJoinError("");
    setJoinSearch("");

    try {
      setJoinLoading(true);
      const response = await api.get("/student/classes");
      const joinedIds = new Set(classes.map((item) => item.id));
      setAvailableClasses(
        (response.data.classes || []).filter(
          (item) => !joinedIds.has(item.id)
        )
      );
    } catch (error) {
      setJoinError(
        error.response?.data?.message ||
          "Available classes could not be loaded. Please try again."
      );
    } finally {
      setJoinLoading(false);
    }
  };

  const joinClass = async (classItem) => {
    try {
      setJoiningClassId(classItem.id);
      setJoinError("");
      await api.post(`/student/classes/${classItem.id}/join`);
      setAvailableClasses((previous) =>
        previous.filter((item) => item.id !== classItem.id)
      );
      await loadClasses();
    } catch (error) {
      setJoinError(
        error.response?.data?.message ||
          "Could not join this class. Please try again."
      );
    } finally {
      setJoiningClassId(null);
    }
  };

  const loadQuizzes = async () => {
    try {
      setQuizLoading(true);
      setQuizMessage("");

      const response = await api.get(
        "/student/quizzes"
      );

      setQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error("Load quizzes error:", error);

      setQuizMessage(
        error.response?.data?.message ||
          "Unable to load quizzes. Please try again."
      );
    } finally {
      setQuizLoading(false);
    }
  };

  const loadPerformance = async () => {
    try {
      setPerformanceLoading(true);
      setPerformanceMessage("");

      const [
        performanceResponse,
        attemptsResponse,
      ] = await Promise.all([
        api.get("/student/results/performance"),
        api.get("/student/results/attempts"),
      ]);

      setPerformance(performanceResponse.data);
      setAttempts(
        attemptsResponse.data.attempts || []
      );
    } catch (error) {
      console.error(
        "Load student performance error:",
        error
      );

      setPerformanceMessage(
        error.response?.data?.message ||
          "Unable to load performance data."
      );
    } finally {
      setPerformanceLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
    loadQuizzes();
    loadPerformance();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("learnadapt_token");
    localStorage.removeItem("learnadapt_user");

    navigate("/login", { replace: true });
  };

  const openQuiz = (quizId) => {
    navigate(`/student/quizzes/${quizId}`);
  };

  const openResult = (attemptId) => {
    navigate(`/student/results/${attemptId}`);
  };

  const formatNumber = (value) => {
    const number = Number(value ?? 0);

    return Number.isFinite(number)
      ? number.toFixed(1)
      : "0.0";
  };

  const summary = performance?.summary || {};

  const completedAttempts = attempts.filter(
    (attempt) => attempt.status === "completed"
  );

  const averageScore =
    completedAttempts.length > 0
      ? completedAttempts.reduce(
          (total, attempt) =>
            total + Number(attempt.score || 0),
          0
        ) / completedAttempts.length
      : 0;

  return (
    <div className="student-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <p className="dashboard-label dashboard-brand">
            <img src="/logo.png" alt="" />
            <span>Adeptiq</span>
          </p>

          <h1>
            Welcome, {user.name || "Student"} 👋
          </h1>

          <p className="dashboard-subtitle">
            Continue your personalized learning journey.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="join-class-button"
            onClick={openJoinClass}
          >
            <UserPlus size={18} />
            Join Class
          </button>

          <button
            type="button"
            className="landing-page-button"
            onClick={() => navigate("/")}
          >
            <Home size={18} />
            Home Page
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {showJoinModal && (
        <div
          className="join-class-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowJoinModal(false);
            }
          }}
        >
          <section
            className="join-class-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-class-title"
          >
            <header className="join-class-modal-header">
              <div>
                <p className="dashboard-label">CLASSROOM</p>
                <h2 id="join-class-title">Join a class</h2>
                <p>Choose a class shared by your teacher or college.</p>
              </div>
              <button
                type="button"
                className="join-modal-close"
                onClick={() => setShowJoinModal(false)}
                aria-label="Close join class dialog"
              >
                <X size={20} />
              </button>
            </header>

            <div className="join-class-search">
              <Search size={18} />
              <input
                type="search"
                value={joinSearch}
                onChange={(event) => setJoinSearch(event.target.value)}
                placeholder="Search by class name or description"
                aria-label="Search available classes"
              />
            </div>

            {joinError && (
              <div className="join-class-error" role="alert">
                {joinError}
              </div>
            )}

            <div className="join-class-list">
              {joinLoading ? (
                <div className="join-class-state">Loading available classes…</div>
              ) : availableClasses.filter((item) =>
                  `${item.name || ""} ${item.description || ""}`
                    .toLowerCase()
                    .includes(joinSearch.toLowerCase().trim())
                ).length === 0 ? (
                <div className="join-class-state">
                  <BookOpen size={30} />
                  <strong>No classes available</strong>
                  <span>
                    {joinSearch
                      ? "Try a different search."
                      : "When a teacher creates an active class, it will appear here."}
                  </span>
                </div>
              ) : (
                availableClasses
                  .filter((item) =>
                    `${item.name || ""} ${item.description || ""}`
                      .toLowerCase()
                      .includes(joinSearch.toLowerCase().trim())
                  )
                  .map((classItem) => (
                    <article className="join-class-item" key={classItem.id}>
                      <div className="join-class-item-icon">
                        <BookOpen size={21} />
                      </div>
                      <div className="join-class-item-info">
                        <h3>{classItem.name}</h3>
                        <p>{classItem.description || "No class description provided."}</p>
                      </div>
                      <button
                        type="button"
                        className="join-class-action"
                        onClick={() => joinClass(classItem)}
                        disabled={joiningClassId !== null}
                      >
                        {joiningClassId === classItem.id ? "Joining…" : "Join"}
                      </button>
                    </article>
                  ))
              )}
            </div>

            <footer className="join-class-modal-footer">
              <span>Classes you join will appear under My Classes.</span>
              <button
                type="button"
                className="join-modal-done"
                onClick={() => setShowJoinModal(false)}
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      )}

      <main className="dashboard-content">
        {/* MY PERFORMANCE */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>My Performance</h2>
              <p>
                Track your learning progress and quiz results.
              </p>
            </div>

            <button
              type="button"
              className="open-class-button"
              onClick={loadPerformance}
              disabled={performanceLoading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {performanceLoading && (
            <div className="dashboard-state">
              Loading your performance...
            </div>
          )}

          {!performanceLoading &&
            performanceMessage && (
              <div className="dashboard-state error">
                {performanceMessage}
              </div>
            )}

          {!performanceLoading &&
            !performanceMessage && (
              <>
                <div className="class-grid">
                  <div className="class-card">
                    <div className="class-icon">
                      <ClipboardList size={26} />
                    </div>

                    <div className="class-card-content">
                      <p>Total Attempts</p>
                      <h3>
                        {summary.total_attempts ?? 0}
                      </h3>
                      <p>Recorded quiz attempts</p>
                    </div>
                  </div>

                  <div className="class-card">
                    <div className="class-icon">
                      <Target size={26} />
                    </div>

                    <div className="class-card-content">
                      <p>Overall Accuracy</p>
                      <h3>
                        {formatNumber(
                          summary.overall_accuracy
                        )}
                        %
                      </h3>
                      <p>
                        {summary.correct_answers ?? 0} correct
                        answers
                      </p>
                    </div>
                  </div>

                  <div className="class-card">
                    <div className="class-icon">
                      <ChartNoAxesCombined size={26} />
                    </div>

                    <div className="class-card-content">
                      <p>Overall Mastery</p>
                      <h3>
                        {formatNumber(
                          summary.overall_mastery_score
                        )}
                        %
                      </h3>
                      <p>
                        Based on recorded topic performance
                      </p>
                    </div>
                  </div>

                  <div className="class-card">
                    <div className="class-icon">
                      <Trophy size={26} />
                    </div>

                    <div className="class-card-content">
                      <p>Average Quiz Score</p>
                      <h3>
                        {formatNumber(averageScore)}
                      </h3>
                      <p>Across completed attempts</p>
                    </div>
                  </div>
                </div>

                <div className="section-heading">
                  <div>
                    <h2>Topic-wise Progress</h2>
                    <p>
                      See your mastery score for each topic.
                    </p>
                  </div>
                </div>

                {performance?.topics?.length > 0 ? (
                  <div className="class-grid">
                    {performance.topics.map(
                      (topic, index) => {
                        const mastery = Math.max(
                          0,
                          Math.min(
                            100,
                            Number(topic.mastery_score || 0)
                          )
                        );

                        return (
                          <div
                            className="class-card"
                            key={topic.id ?? index}
                          >
                            <div className="class-card-content">
                              <h3>
                                {topic.topic?.name ||
                                  topic.topic_name ||
                                  `Topic ${index + 1}`}
                              </h3>

                              <p>
                                {topic.subject?.name ||
                                  "Subject not available"}
                              </p>

                              <p>
                                Mastery:{" "}
                                {formatNumber(mastery)}%
                              </p>

                              <div className="mastery-track">
                                <div
                                  className="mastery-fill"
                                  style={{
                                    width: `${mastery}%`,
                                  }}
                                />
                              </div>

                              <p>
                                Attempts:{" "}
                                {topic.total_attempts ?? 0}
                              </p>

                              <p>
                                Correct:{" "}
                                {topic.correct_answers ?? 0}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <ChartNoAxesCombined size={36} />
                    <h3>No topic performance yet</h3>
                    <p>
                      Complete a quiz to start tracking your
                      progress.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  className="open-class-button"
                  onClick={() =>
                    navigate("/student/results")
                  }
                >
                  View All Results
                  <ArrowRight size={17} />
                </button>
              </>
            )}
        </section>

        {/* RECENT QUIZ HISTORY */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Recent Quiz Attempts</h2>
              <p>
                Review your latest attempts and completed
                results.
              </p>
            </div>

            <button
              type="button"
              className="open-class-button"
              onClick={() =>
                navigate("/student/results")
              }
            >
              Quiz History
              <ChevronRight size={17} />
            </button>
          </div>

          {performanceLoading && (
            <div className="dashboard-state">
              Loading quiz history...
            </div>
          )}

          {!performanceLoading &&
            !performanceMessage &&
            attempts.length === 0 && (
              <div className="empty-state">
                <FileQuestion size={36} />
                <h3>No quiz attempts yet</h3>
                <p>
                  Start a quiz to see your results here.
                </p>
              </div>
            )}

          {!performanceLoading &&
            !performanceMessage &&
            attempts.length > 0 && (
              <div className="class-grid">
                {attempts.slice(0, 3).map((attempt) => (
                  <div
                    className="class-card"
                    key={attempt.id}
                  >
                    <div className="class-icon">
                      <FileQuestion size={26} />
                    </div>

                    <div className="class-card-content">
                      <h3>
                        {attempt.quiz?.title ||
                          `Quiz #${attempt.quiz_id}`}
                      </h3>

                      <p>
                        Status: {attempt.status || "Unknown"}
                      </p>

                      <p>
                        Score:{" "}
                        {attempt.status === "completed"
                          ? formatNumber(attempt.score)
                          : "Not completed"}
                      </p>

                      <p>
                        Accuracy:{" "}
                        {attempt.status === "completed"
                          ? `${formatNumber(
                              attempt.accuracy
                            )}%`
                          : "—"}
                      </p>

                      {attempt.status === "completed" && (
                        <button
                          type="button"
                          className="open-class-button"
                          onClick={() =>
                            openResult(attempt.id)
                          }
                        >
                          View Result
                          <ArrowRight size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>

        {/* QUIZZES */}
        <section className="student-quiz-section">
          <div className="section-heading">
            <div>
              <h2>Quizzes & Practice</h2>
              <p>
                Attempt published quizzes and test your
                knowledge.
              </p>
            </div>

            <button
              type="button"
              className="open-class-button"
              onClick={loadQuizzes}
              disabled={quizLoading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {quizLoading && (
            <div className="dashboard-state">
              Loading available quizzes...
            </div>
          )}

          {!quizLoading && quizMessage && (
            <div className="dashboard-state error">
              {quizMessage}
            </div>
          )}

          {!quizLoading &&
            !quizMessage &&
            quizzes.length === 0 && (
              <div className="empty-state">
                <FileQuestion size={42} />
                <h3>No published quizzes available</h3>
                <p>
                  Your teacher's published quizzes will appear
                  here when available.
                </p>
              </div>
            )}

          {!quizLoading &&
            !quizMessage &&
            quizzes.length > 0 && (
              <div className="class-grid">
                {quizzes.map((quiz) => (
                  <div
                    className="class-card"
                    key={quiz.id}
                  >
                    <div className="class-icon">
                      <FileQuestion size={26} />
                    </div>

                    <div className="class-card-content">
                      <h3>{quiz.title}</h3>

                      <p>
                        {quiz.description ||
                          "Test your knowledge with this quiz."}
                      </p>

                      <p>
                        Questions: {quiz.question_count ?? 0}
                      </p>

                      <p>
                        Difficulty:{" "}
                        {quiz.difficulty || "Not specified"}
                      </p>

                      <button
                        type="button"
                        className="open-class-button"
                        onClick={() => openQuiz(quiz.id)}
                      >
                        Start Quiz
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>

        {/* CLASSES */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>My Classes</h2>
              <p>
                Access your university and teacher-provided
                content.
              </p>
            </div>

            <div className="my-classes-actions">
              <div className="class-count">
                <Users size={18} />
                {classes.length} Classes
              </div>
              <button
                type="button"
                className="join-class-button"
                onClick={openJoinClass}
              >
                <Plus size={17} />
                Join a class
              </button>
            </div>
          </div>

          {loading && (
            <div className="dashboard-state">
              Loading your classes...
            </div>
          )}

          {!loading && message && (
            <div className="dashboard-state error">
              {message}
            </div>
          )}

          {!loading &&
            !message &&
            classes.length === 0 && (
              <div className="empty-state">
                <BookOpen size={42} />
                <h3>No classes joined yet</h3>
                <p>
                  Join a class to access subjects, topics and
                  study materials.
                </p>
              </div>
            )}

          {!loading &&
            !message &&
            classes.length > 0 && (
              <div className="class-grid">
                {classes.map((classItem) => (
                  <div
                    className="class-card"
                    key={classItem.id}
                  >
                    <div className="class-icon">
                      <BookOpen size={26} />
                    </div>

                    <div className="class-card-content">
                      <h3>{classItem.name}</h3>

                      <p>
                        {classItem.description ||
                          "No description available."}
                      </p>

                      <button
                        type="button"
                        className="open-class-button"
                        onClick={() =>
                          navigate(
                            `/student/classes/${classItem.id}`
                          )
                        }
                      >
                        Open Class
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

export default StudentDashboard;