import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Plus,
  Trash2,
  Edit3,
  Save,
  Send,
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Sparkles,
  LoaderCircle,
  ClipboardList,
  Eye,
} from "lucide-react";

import api from "../services/api";

const EMPTY_QUIZ_FORM = {
  title: "",
  description: "",
  quiz_type: "teacher",
  difficulty: "medium",
  class_id: 1,
  subject_id: 1,
  topic_id: 1,
  time_limit_minutes: 30,
};

const EMPTY_QUESTION_FORM = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  explanation: "",
  marks: 1,
};

const EMPTY_AI_FORM = {
  title: "",
  description: "",
  difficulty: "medium",
  class_id: 1,
  subject_id: 1,
  topic_id: 1,
  question_count: 5,
  time_limit_minutes: 30,
};

const validateTimeLimit = (value) => {
  const minutes = Number(value);

  return (
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 180
  );
};

function TeacherQuiz() {
  const location = useLocation();
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [quizForm, setQuizForm] = useState({
    ...EMPTY_QUIZ_FORM,
  });

  const [aiForm, setAiForm] = useState({
    ...EMPTY_AI_FORM,
  });

  const [questionForm, setQuestionForm] = useState({
    ...EMPTY_QUESTION_FORM,
  });

  const [editingQuestionId, setEditingQuestionId] =
    useState(null);

  // =====================================================
  // LOAD QUIZZES
  // =====================================================

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/teacher/quizzes");

      setQuizzes(response.data.quizzes || []);
    } catch (err) {
      console.error("LOAD QUIZZES ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load quizzes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // =====================================================
  // DASHBOARD NAVIGATION
  // =====================================================

  useEffect(() => {
    if (location.state?.openCreate) {
      setSelectedQuiz(null);
      setShowCreate(true);
    }

    if (location.state?.openAI) {
      setSelectedQuiz(null);

      window.setTimeout(() => {
        document
          .getElementById("ai-quiz-generator")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    }

    if (location.state?.openCreate || location.state?.openAI) {
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state, location.pathname, navigate]);

  // =====================================================
  // FORM HANDLERS
  // =====================================================

  const handleQuizChange = (event) => {
    const { name, value } = event.target;

    setQuizForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAIChange = (event) => {
    const { name, value } = event.target;

    setAiForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleQuestionChange = (event) => {
    const { name, value } = event.target;

    setQuestionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE MANUAL QUIZ
  // =====================================================

  const createQuiz = async (event) => {
    event.preventDefault();

    if (!validateTimeLimit(quizForm.time_limit_minutes)) {
      setError("Time limit must be between 1 and 180 minutes.");
      return;
    }

    try {
      setCreatingQuiz(true);
      setError("");
      setMessage("");

      const payload = {
        ...quizForm,
        title: quizForm.title.trim(),
        description: quizForm.description.trim(),
        class_id: Number(quizForm.class_id),
        subject_id: Number(quizForm.subject_id),
        topic_id: Number(quizForm.topic_id),
        time_limit_minutes: Number(
          quizForm.time_limit_minutes
        ),
      };

      const response = await api.post(
        "/teacher/quizzes",
        payload
      );

      const createdQuiz = response.data.quiz;

      setMessage("Manual quiz created successfully.");
      setShowCreate(false);
      setQuizForm({ ...EMPTY_QUIZ_FORM });

      await loadQuizzes();

      if (createdQuiz?.id) {
        await openQuiz(createdQuiz.id);
      }
    } catch (err) {
      console.error("CREATE QUIZ ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to create quiz."
      );
    } finally {
      setCreatingQuiz(false);
    }
  };

  // =====================================================
  // GENERATE AI QUIZ
  // =====================================================

  const generateAIQuiz = async (event) => {
    event.preventDefault();

    if (!validateTimeLimit(aiForm.time_limit_minutes)) {
      setError("Time limit must be between 1 and 180 minutes.");
      return;
    }

    const questionCount = Number(aiForm.question_count);

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 20
    ) {
      setError("Question count must be between 1 and 20.");
      return;
    }

    try {
      setGeneratingAI(true);
      setError("");
      setMessage("");

      const payload = {
        title: aiForm.title.trim(),
        description: aiForm.description.trim(),
        difficulty: aiForm.difficulty,
        class_id: Number(aiForm.class_id),
        subject_id: Number(aiForm.subject_id),
        topic_id: Number(aiForm.topic_id),
        question_count: questionCount,
        time_limit_minutes: Number(
          aiForm.time_limit_minutes
        ),
      };

      const response = await api.post(
        "/teacher/quizzes/generate-ai",
        payload
      );

      const generatedQuiz = response.data.quiz;

      if (!generatedQuiz?.id) {
        throw new Error(
          "The server did not return a generated quiz ID."
        );
      }

      const generatedCount =
        response.data.questions?.length ||
        generatedQuiz.questions?.length ||
        payload.question_count;

      setMessage(
        `AI generated ${generatedCount} questions. Review them before publishing.`
      );

      setAiForm({ ...EMPTY_AI_FORM });

      await loadQuizzes();
      await openQuiz(generatedQuiz.id);
    } catch (err) {
      console.error("AI GENERATION ERROR:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "AI quiz generation failed. Check the backend."
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  // =====================================================
  // OPEN QUIZ
  // =====================================================

  const openQuiz = async (quizId) => {
    try {
      setError("");
      setMessage("");

      const response = await api.get(
        `/teacher/quizzes/${quizId}`
      );

      setSelectedQuiz(response.data.quiz);
      setEditingQuestionId(null);
      setQuestionForm({ ...EMPTY_QUESTION_FORM });
    } catch (err) {
      console.error("OPEN QUIZ ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to open quiz."
      );
    }
  };

  // =====================================================
  // QUESTION FORM RESET
  // =====================================================

  const resetQuestionForm = () => {
    setQuestionForm({ ...EMPTY_QUESTION_FORM });
    setEditingQuestionId(null);
  };

  // =====================================================
  // ADD QUESTION
  // =====================================================

  const addQuestion = async (event) => {
    event.preventDefault();

    if (!selectedQuiz) return;

    try {
      setSavingQuestion(true);
      setError("");
      setMessage("");

      await api.post(
        `/teacher/quizzes/${selectedQuiz.id}/questions`,
        {
          ...questionForm,
          marks: Number(questionForm.marks),
        }
      );

      setMessage("Question added successfully.");

      resetQuestionForm();

      await openQuiz(selectedQuiz.id);
    } catch (err) {
      console.error("ADD QUESTION ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to add question."
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  // =====================================================
  // EDIT QUESTION
  // =====================================================

  const startEditQuestion = (question) => {
    setEditingQuestionId(question.id);

    setQuestionForm({
      question_text: question.question_text || "",
      option_a: question.options?.A || "",
      option_b: question.options?.B || "",
      option_c: question.options?.C || "",
      option_d: question.options?.D || "",
      correct_answer: question.correct_answer || "A",
      explanation: question.explanation || "",
      marks: question.marks || 1,
    });

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  // =====================================================
  // UPDATE QUESTION
  // =====================================================

  const updateQuestion = async (event) => {
    event.preventDefault();

    if (!selectedQuiz || !editingQuestionId) return;

    try {
      setSavingQuestion(true);
      setError("");
      setMessage("");

      await api.put(
        `/teacher/quizzes/${selectedQuiz.id}/questions/${editingQuestionId}`,
        {
          ...questionForm,
          marks: Number(questionForm.marks),
        }
      );

      setMessage("Question updated successfully.");

      resetQuestionForm();

      await openQuiz(selectedQuiz.id);
    } catch (err) {
      console.error("UPDATE QUESTION ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to update question."
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  // =====================================================
  // DELETE QUESTION
  // =====================================================

  const deleteQuestion = async (questionId) => {
    if (!selectedQuiz) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.delete(
        `/teacher/quizzes/${selectedQuiz.id}/questions/${questionId}`
      );

      setMessage("Question deleted successfully.");

      await openQuiz(selectedQuiz.id);
    } catch (err) {
      console.error("DELETE QUESTION ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to delete question."
      );
    }
  };

  // =====================================================
  // PUBLISH QUIZ
  // =====================================================

  const publishQuiz = async () => {
    if (!selectedQuiz) return;

    const questions = selectedQuiz.questions || [];

    if (questions.length === 0) {
      setError(
        "Add at least one question before publishing."
      );
      return;
    }

    const confirmed = window.confirm(
      "Publish this quiz? Review all questions and answers before continuing."
    );

    if (!confirmed) return;

    try {
      setPublishing(true);
      setError("");
      setMessage("");

      await api.post(
        `/teacher/quizzes/${selectedQuiz.id}/publish`
      );

      setMessage("Quiz published successfully!");

      await openQuiz(selectedQuiz.id);
      await loadQuizzes();
    } catch (err) {
      console.error("PUBLISH QUIZ ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to publish quiz."
      );
    } finally {
      setPublishing(false);
    }
  };

  // =====================================================
  // BACK TO QUIZ LIST
  // =====================================================

  const backToQuizList = () => {
    setSelectedQuiz(null);
    setMessage("");
    setError("");
    resetQuestionForm();
    loadQuizzes();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="teacher-quiz-page">
      {/* HEADER */}

      <header className="teacher-quiz-header">
        <div>
          <p className="dashboard-label inline-brand"><img src="/logo.png" alt="" /> <span>Adeptiq</span></p>

          <h1>Teacher Quiz Management</h1>

          <p className="dashboard-subtitle">
            Create quizzes manually or generate them with AI.
          </p>
        </div>

        <div className="quiz-header-actions">
          {!selectedQuiz && (
            <>
              <button
                type="button"
                className="quiz-secondary-button"
                onClick={() =>
                  document
                    .getElementById("ai-quiz-generator")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                }
              >
                <Sparkles size={18} />
                AI Quiz
              </button>

              <button
                type="button"
                className="quiz-primary-button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setShowCreate(true);
                }}
              >
                <Plus size={18} />
                Create Manual Quiz
              </button>
            </>
          )}
        </div>
      </header>

      {/* ALERTS */}

      {message && (
        <div
          className="quiz-message success"
          role="status"
        >
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div
          className="quiz-message error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* QUIZ LIST AND AI GENERATOR */}

      {!selectedQuiz && (
        <main className="teacher-quiz-content">
          {/* AI GENERATOR */}

          <section
            id="ai-quiz-generator"
            className="quiz-editor-card ai-generator-card"
          >
            <div className="quiz-editor-header">
              <div>
                <h2>
                  <Sparkles
                    size={22}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 8,
                    }}
                  />
                  Generate Quiz with AI
                </h2>

                <p>
                  Generate multiple-choice questions using
                  Adeptiq .
                </p>
              </div>
            </div>

            <form onSubmit={generateAIQuiz}>
              <div className="form-group">
                <label htmlFor="ai-title">Quiz Title</label>

                <input
                  id="ai-title"
                  name="title"
                  value={aiForm.title}
                  onChange={handleAIChange}
                  placeholder="Example: Computer Networks Test"
                  required
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ai-description">
                  Description
                </label>

                <textarea
                  id="ai-description"
                  name="description"
                  value={aiForm.description}
                  onChange={handleAIChange}
                  placeholder="What should students learn?"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ai-difficulty">
                    Difficulty
                  </label>

                  <select
                    id="ai-difficulty"
                    name="difficulty"
                    value={aiForm.difficulty}
                    onChange={handleAIChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="ai-count">
                    Number of Questions
                  </label>

                  <input
                    id="ai-count"
                    type="number"
                    name="question_count"
                    min="1"
                    max="20"
                    step="1"
                    value={aiForm.question_count}
                    onChange={handleAIChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ai-time-limit">
                    Time Limit (Minutes)
                  </label>

                  <input
                    id="ai-time-limit"
                    type="number"
                    name="time_limit_minutes"
                    min="1"
                    max="180"
                    step="1"
                    value={aiForm.time_limit_minutes}
                    onChange={handleAIChange}
                    required
                  />

                  <small>
                    Choose between 1 and 180 minutes.
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ai-class-id">Class ID</label>

                  <input
                    id="ai-class-id"
                    type="number"
                    name="class_id"
                    min="1"
                    value={aiForm.class_id}
                    onChange={handleAIChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ai-subject-id">
                    Subject ID
                  </label>

                  <input
                    id="ai-subject-id"
                    type="number"
                    name="subject_id"
                    min="1"
                    value={aiForm.subject_id}
                    onChange={handleAIChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ai-topic-id">Topic ID</label>

                  <input
                    id="ai-topic-id"
                    type="number"
                    name="topic_id"
                    min="1"
                    value={aiForm.topic_id}
                    onChange={handleAIChange}
                    required
                  />
                </div>
              </div>

              <p className="dashboard-subtitle">
                Enter IDs that exist in your database and
                belong to your class.
              </p>

              <button
                type="submit"
                className="quiz-primary-button"
                disabled={generatingAI}
              >
                {generatingAI ? (
                  <>
                    <LoaderCircle size={18} />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Quiz with AI
                  </>
                )}
              </button>

              {generatingAI && (
                <p role="status">
                  Groq AI is preparing your questions.
                  Please wait.
                </p>
              )}
            </form>
          </section>

          {/* QUIZ LIST */}

          <section className="quiz-list-section">
            <div className="quiz-list-heading">
              <div>
                <p className="dashboard-label">
                  QUIZ LIBRARY
                </p>

                <h2>Your Quizzes</h2>
              </div>

              <button
                type="button"
                className="quiz-secondary-button"
                onClick={loadQuizzes}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle size={17} />
                ) : (
                  <ClipboardList size={17} />
                )}
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="quiz-empty-state">
                <LoaderCircle size={35} />
                <p>Loading quizzes...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="quiz-empty-state">
                <BookOpen size={45} />

                <h2>No quizzes yet</h2>

                <p>
                  Generate an AI quiz or create one manually.
                </p>

                <button
                  type="button"
                  className="quiz-primary-button"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={18} />
                  Create Your First Quiz
                </button>
              </div>
            ) : (
              <div className="quiz-grid">
                {quizzes.map((quiz) => (
                  <div
                    className="teacher-quiz-card"
                    key={quiz.id}
                  >
                    <div className="quiz-card-top">
                      <div className="quiz-icon">
                        <BookOpen size={24} />
                      </div>

                      <span
                        className={
                          quiz.is_published
                            ? "quiz-status published"
                            : "quiz-status draft"
                        }
                      >
                        {quiz.is_published
                          ? "Published"
                          : "Draft"}
                      </span>
                    </div>

                    <h3>{quiz.title}</h3>

                    <p>
                      {quiz.description ||
                        "No description available."}
                    </p>

                    <div className="quiz-card-info">
                      <span>
                        Difficulty: {quiz.difficulty}
                      </span>

                      <span>
                        Questions: {quiz.question_count ?? 0}
                      </span>

                      <span>
                        Time Limit:{" "}
                        {quiz.time_limit_minutes ?? 30} minutes
                      </span>
                    </div>

                    {quiz.is_ai_generated && (
                      <p className="quiz-ai-badge">
                        <Sparkles
                          size={15}
                          style={{
                            display: "inline",
                            verticalAlign: "middle",
                            marginRight: 5,
                          }}
                        />
                        AI Generated
                      </p>
                    )}

                    <button
                      type="button"
                      className="quiz-secondary-button"
                      onClick={() => openQuiz(quiz.id)}
                    >
                      <Eye size={17} />
                      Review Quiz
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* SELECTED QUIZ EDITOR */}

      {selectedQuiz && (
        <main className="teacher-quiz-content">
          <button
            type="button"
            className="back-button"
            onClick={backToQuizList}
          >
            <ArrowLeft size={18} />
            Back to Quizzes
          </button>

          <section className="quiz-editor-card">
            <div className="quiz-editor-header">
              <div>
                <p className="dashboard-label">
                  {selectedQuiz.is_ai_generated
                    ? "AI GENERATED QUIZ"
                    : "MANUAL QUIZ"}
                </p>

                <h2>{selectedQuiz.title}</h2>

                <p>
                  {selectedQuiz.description ||
                    "No description available."}
                </p>

                {selectedQuiz.is_ai_generated && (
                  <p>
                    <Sparkles
                      size={16}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: 5,
                      }}
                    />
                    Review every AI-generated question and
                    answer before publishing.
                  </p>
                )}
              </div>

              <div className="quiz-publish-area">
                {selectedQuiz.is_published ? (
                  <span className="quiz-status published">
                    <CheckCircle size={16} />
                    Published
                  </span>
                ) : (
                  <button
                    type="button"
                    className="publish-button"
                    onClick={publishQuiz}
                    disabled={publishing}
                  >
                    {publishing ? (
                      <>
                        <LoaderCircle size={17} />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Publish Quiz
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="quiz-meta">
              <span>
                Difficulty:{" "}
                <strong>{selectedQuiz.difficulty}</strong>
              </span>

              <span>
                Questions:{" "}
                <strong>
                  {selectedQuiz.questions?.length || 0}
                </strong>
              </span>

              <span>
                Time Limit:{" "}
                <strong>
                  {selectedQuiz.time_limit_minutes ?? 30} minutes
                </strong>
              </span>

              <span>
                Status:{" "}
                <strong>
                  {selectedQuiz.is_published
                    ? "Published"
                    : "Draft"}
                </strong>
              </span>
            </div>

            {/* QUESTIONS */}

            <div className="questions-section">
              <h3>Quiz Questions</h3>

              {!selectedQuiz.questions?.length ? (
                <div className="no-question">
                  No questions added yet. Add at least one
                  question before publishing.
                </div>
              ) : (
                selectedQuiz.questions.map(
                  (question, index) => (
                    <div
                      className="question-card"
                      key={question.id}
                    >
                      <div className="question-header">
                        <div>
                          <strong>Q{index + 1}.</strong>{" "}
                          {question.question_text}
                        </div>

                        {!selectedQuiz.is_published && (
                          <div className="question-actions">
                            <button
                              type="button"
                              onClick={() =>
                                startEditQuestion(question)
                              }
                              title="Edit question"
                              aria-label="Edit question"
                            >
                              <Edit3 size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteQuestion(question.id)
                              }
                              title="Delete question"
                              aria-label="Delete question"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="question-options">
                        {["A", "B", "C", "D"].map(
                          (option) => (
                            <div
                              key={option}
                              className={
                                question.correct_answer === option
                                  ? "correct-option"
                                  : ""
                              }
                            >
                              {option}.{" "}
                              {question.options?.[option] || ""}
                            </div>
                          )
                        )}
                      </div>

                      {question.explanation && (
                        <div className="question-explanation">
                          <strong>Explanation:</strong>{" "}
                          {question.explanation}
                        </div>
                      )}

                      <div className="question-marks">
                        Marks: {question.marks}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* ADD / EDIT QUESTION */}

            {!selectedQuiz.is_published && (
              <section className="question-form-section">
                <h3>
                  {editingQuestionId
                    ? "Edit Question"
                    : "Add New Question"}
                </h3>

                <form
                  onSubmit={
                    editingQuestionId
                      ? updateQuestion
                      : addQuestion
                  }
                >
                  <div className="form-group">
                    <label htmlFor="question-text">
                      Question
                    </label>

                    <textarea
                      id="question-text"
                      name="question_text"
                      value={questionForm.question_text}
                      onChange={handleQuestionChange}
                      placeholder="Enter your question"
                      required
                    />
                  </div>

                  <div className="options-grid">
                    {["a", "b", "c", "d"].map((option) => (
                      <div
                        className="form-group"
                        key={option}
                      >
                        <label htmlFor={`option-${option}`}>
                          Option {option.toUpperCase()}
                        </label>

                        <input
                          id={`option-${option}`}
                          type="text"
                          name={`option_${option}`}
                          value={
                            questionForm[`option_${option}`]
                          }
                          onChange={handleQuestionChange}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="correct-answer">
                        Correct Answer
                      </label>

                      <select
                        id="correct-answer"
                        name="correct_answer"
                        value={questionForm.correct_answer}
                        onChange={handleQuestionChange}
                      >
                        {["A", "B", "C", "D"].map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              Option {option}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="question-marks">
                        Marks
                      </label>

                      <input
                        id="question-marks"
                        type="number"
                        name="marks"
                        min="1"
                        value={questionForm.marks}
                        onChange={handleQuestionChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="question-explanation">
                      Explanation
                    </label>

                    <textarea
                      id="question-explanation"
                      name="explanation"
                      value={questionForm.explanation}
                      onChange={handleQuestionChange}
                      placeholder="Explain the correct answer"
                    />
                  </div>

                  <div className="question-form-actions">
                    {editingQuestionId && (
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={resetQuestionForm}
                        disabled={savingQuestion}
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      type="submit"
                      className="quiz-primary-button"
                      disabled={savingQuestion}
                    >
                      {savingQuestion ? (
                        <>
                          <LoaderCircle size={17} />
                          Saving...
                        </>
                      ) : editingQuestionId ? (
                        <>
                          <Save size={17} />
                          Update Question
                        </>
                      ) : (
                        <>
                          <Plus size={17} />
                          Add Question
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </section>
        </main>
      )}

      {/* CREATE MANUAL QUIZ MODAL */}

      {showCreate && (
        <div
          className="quiz-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              if (!creatingQuiz) {
                setShowCreate(false);
              }
            }
          }}
        >
          <div
            className="quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-quiz-title"
          >
            <div className="quiz-modal-header">
              <div>
                <h2 id="manual-quiz-title">
                  Create Manual Quiz
                </h2>

                <p>
                  Create a draft, then add questions and
                  publish it when ready.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCreate(false)}
                disabled={creatingQuiz}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={createQuiz}>
              <div className="form-group">
                <label htmlFor="manual-title">
                  Quiz Title
                </label>

                <input
                  id="manual-title"
                  type="text"
                  name="title"
                  value={quizForm.title}
                  onChange={handleQuizChange}
                  placeholder="Example: OSI Model Test"
                  required
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manual-description">
                  Description
                </label>

                <textarea
                  id="manual-description"
                  name="description"
                  value={quizForm.description}
                  onChange={handleQuizChange}
                  placeholder="Describe this quiz"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="manual-difficulty">
                    Difficulty
                  </label>

                  <select
                    id="manual-difficulty"
                    name="difficulty"
                    value={quizForm.difficulty}
                    onChange={handleQuizChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="manual-class">
                    Class ID
                  </label>

                  <input
                    id="manual-class"
                    type="number"
                    name="class_id"
                    value={quizForm.class_id}
                    onChange={handleQuizChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="manual-time-limit">
                    Time Limit (Minutes)
                  </label>

                  <input
                    id="manual-time-limit"
                    type="number"
                    name="time_limit_minutes"
                    value={quizForm.time_limit_minutes}
                    onChange={handleQuizChange}
                    min="1"
                    max="180"
                    step="1"
                    required
                  />

                  <small>
                    Choose between 1 and 180 minutes.
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="manual-subject">
                    Subject ID
                  </label>

                  <input
                    id="manual-subject"
                    type="number"
                    name="subject_id"
                    value={quizForm.subject_id}
                    onChange={handleQuizChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="manual-topic">
                    Topic ID
                  </label>

                  <input
                    id="manual-topic"
                    type="number"
                    name="topic_id"
                    value={quizForm.topic_id}
                    onChange={handleQuizChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreate(false)}
                  disabled={creatingQuiz}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="quiz-primary-button"
                  disabled={creatingQuiz}
                >
                  {creatingQuiz ? (
                    <>
                      <LoaderCircle size={18} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Draft Quiz
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherQuiz;