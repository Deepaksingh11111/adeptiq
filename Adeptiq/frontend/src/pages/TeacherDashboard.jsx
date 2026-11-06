import { useEffect, useState } from "react";

import {
  BookOpen,
  Edit3,
  GraduationCap,
  LogOut,
  Plus,
  Power,
  Users,
  X,
  Loader2,
  Sparkles,
  ClipboardList,
  Home,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";

function TeacherDashboard() {
  const navigate = useNavigate();

  // USER
  const user = JSON.parse(
    localStorage.getItem("learnadapt_user") || "{}"
  );

  // STATE
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // LOAD CLASSES
  const loadClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/teacher/classes");

      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("LOAD CLASSES ERROR:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("learnadapt_token");
        localStorage.removeItem("learnadapt_user");

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load classes."
      );
    } finally {
      setLoading(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    loadClasses();
  }, []);

  // OPEN AI QUIZ GENERATOR
  const openAIQuizGenerator = () => {
    navigate("/teacher/quizzes", {
      state: {
        openAI: true,
      },
    });
  };

  // OPEN MANUAL QUIZ CREATOR
  const openManualQuizCreator = () => {
    navigate("/teacher/quizzes", {
      state: {
        openCreate: true,
      },
    });
  };

  // OPEN QUIZ MANAGEMENT
  const openQuizManagement = () => {
    navigate("/teacher/quizzes");
  };

  // OPEN CREATE CLASS MODAL
  const openCreateModal = () => {
    setEditingClass(null);

    setForm({
      name: "",
      description: "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // OPEN EDIT CLASS MODAL
  const openEditModal = (classItem) => {
    setEditingClass(classItem);

    setForm({
      name: classItem.name || "",
      description: classItem.description || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // CLOSE MODAL
  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingClass(null);

    setForm({
      name: "",
      description: "",
    });
  };

  // FORM CHANGE
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CREATE / UPDATE CLASS
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Class name is required.");
      return;
    }

    try {
      setSaving(true);

      if (editingClass) {
        await api.put(
          `/teacher/classes/${editingClass.id}`,
          {
            name: form.name.trim(),
            description: form.description.trim(),
          }
        );

        setSuccess("Class updated successfully.");
      } else {
        await api.post("/teacher/classes", {
          name: form.name.trim(),
          description: form.description.trim(),
        });

        setSuccess("Class created successfully.");
      }

      setShowModal(false);
      setEditingClass(null);

      setForm({
        name: "",
        description: "",
      });

      await loadClasses();
    } catch (error) {
      console.error("SAVE CLASS ERROR:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("learnadapt_token");
        localStorage.removeItem("learnadapt_user");

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to save class."
      );
    } finally {
      setSaving(false);
    }
  };

  // DEACTIVATE CLASS
  const handleDeactivate = async (classItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${classItem.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/teacher/classes/${classItem.id}`
      );

      setSuccess("Class deactivated successfully.");

      await loadClasses();
    } catch (error) {
      console.error("DEACTIVATE CLASS ERROR:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("learnadapt_token");
        localStorage.removeItem("learnadapt_user");

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to deactivate class."
      );
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("learnadapt_token");
    localStorage.removeItem("learnadapt_user");

    navigate("/login", {
      replace: true,
    });
  };

  // RENDER
  return (
    <div className="teacher-dashboard">
      {/* HEADER */}
      <header className="teacher-dashboard-header">
        <div className="teacher-header-left">
          <div className="teacher-brand-icon">
            <img src="/logo.png" alt="Adeptiq" className="teacher-brand-logo" />
          </div>

          <div>
            <p className="teacher-brand">
              Adeptiq
            </p>

            <h1>Teacher Dashboard</h1>
          </div>
        </div>

        <div className="teacher-header-right">
          <div className="teacher-profile">
            <div className="teacher-avatar">
              {(user.name || "T")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user.name || "Teacher"}
              </strong>

              <span>Teacher</span>
            </div>
          </div>

          {/* LANDING PAGE BUTTON */}
          <button
            type="button"
            className="teacher-home-button"
            onClick={() => navigate("/")}
            title="Go to Adeptiq landing page"
          >
            <Home size={17} />
            <span>Home Page</span>
          </button>

          {/* LOGOUT BUTTON */}
          <button
            type="button"
            className="teacher-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="teacher-dashboard-content">
        {/* WELCOME SECTION */}
        <section className="teacher-welcome-section">
          <div>
            <p>CLASS MANAGEMENT</p>

            <h2>
              Welcome, {user.name || "Teacher"} 👋
            </h2>

            <span>
              Create classes and manage your subjects,
              topics and learning materials.
            </span>
          </div>

          <button
            type="button"
            className="teacher-create-class-button"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Create Class
          </button>
        </section>

        {/* ALERTS */}
        {error && (
          <div className="teacher-alert teacher-alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="teacher-alert teacher-alert-success">
            {success}
          </div>
        )}

        {/* QUIZ MANAGEMENT */}
        <section className="teacher-classes-section">
          <div className="teacher-section-heading">
            <div>
              <p>AI-POWERED ASSESSMENT</p>
              <h2>Quiz Center</h2>
            </div>

            <span>AI + Manual</span>
          </div>

          <div className="teacher-class-grid">
            {/* AI QUIZ */}
            <div className="teacher-class-card">
              <div className="teacher-class-icon">
                <Sparkles size={26} />
              </div>

              <div className="teacher-class-info">
                <div className="teacher-class-title-row">
                  <h3>Generate Quiz with AI</h3>
                </div>

                <p>
                  Generate questions automatically using
                  AI. Choose the subject, topic, difficulty
                  and number of questions.
                </p>

                <div className="teacher-class-actions">
                  <button
                    type="button"
                    className="class-action-button manage"
                    onClick={openAIQuizGenerator}
                  >
                    <Sparkles size={16} />
                    Generate with AI
                  </button>
                </div>
              </div>
            </div>

            {/* MANUAL QUIZ */}
            <div className="teacher-class-card">
              <div className="teacher-class-icon">
                <Edit3 size={26} />
              </div>

              <div className="teacher-class-info">
                <div className="teacher-class-title-row">
                  <h3>Create Manual Quiz</h3>
                </div>

                <p>
                  Create your own quiz by entering questions,
                  four options, correct answers, explanations
                  and marks manually.
                </p>

                <div className="teacher-class-actions">
                  <button
                    type="button"
                    className="class-action-button edit"
                    onClick={openManualQuizCreator}
                  >
                    <Plus size={16} />
                    Create Manually
                  </button>
                </div>
              </div>
            </div>

            {/* QUIZ MANAGEMENT */}
            <div className="teacher-class-card">
              <div className="teacher-class-icon">
                <ClipboardList size={26} />
              </div>

              <div className="teacher-class-info">
                <div className="teacher-class-title-row">
                  <h3>Manage Quizzes</h3>
                </div>

                <p>
                  View your existing quizzes, edit questions,
                  manage answers and publish quizzes for
                  students.
                </p>

                <div className="teacher-class-actions">
                  <button
                    type="button"
                    className="class-action-button manage"
                    onClick={openQuizManagement}
                  >
                    <BookOpen size={16} />
                    View All Quizzes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="teacher-stat-grid">
          <div className="teacher-stat-card">
            <div className="teacher-stat-icon">
              <BookOpen size={22} />
            </div>

            <div>
              <span>Total Classes</span>
              <strong>{classes.length}</strong>
            </div>
          </div>

          <div className="teacher-stat-card">
            <div className="teacher-stat-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Teaching Platform</span>
              <strong>Adeptiq</strong>
            </div>
          </div>
        </section>

        {/* CLASSES */}
        <section className="teacher-classes-section">
          <div className="teacher-section-heading">
            <div>
              <p>YOUR CLASSES</p>
              <h2>Manage Classes</h2>
            </div>

            <span>
              {classes.length}{" "}
              {classes.length === 1 ? "Class" : "Classes"}
            </span>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="teacher-page-state">
              <Loader2
                size={32}
                className="loading-icon"
              />

              <p>Loading your classes...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && classes.length === 0 && (
            <div className="teacher-empty-state">
              <BookOpen size={50} />

              <h3>No classes created yet</h3>

              <p>
                Create your first class to start adding
                subjects, topics and learning materials.
              </p>

              <button
                type="button"
                className="teacher-create-class-button"
                onClick={openCreateModal}
              >
                <Plus size={18} />
                Create First Class
              </button>
            </div>
          )}

          {/* CLASS GRID */}
          {!loading && classes.length > 0 && (
            <div className="teacher-class-grid">
              {classes.map((classItem) => (
                <div
                  className="teacher-class-card"
                  key={classItem.id}
                >
                  <div className="teacher-class-icon">
                    <BookOpen size={26} />
                  </div>

                  <div className="teacher-class-info">
                    <div className="teacher-class-title-row">
                      <h3>{classItem.name}</h3>

                      <span
                        className={
                          classItem.is_active
                            ? "class-status active"
                            : "class-status inactive"
                        }
                      >
                        {classItem.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <p>
                      {classItem.description ||
                        "No class description available."}
                    </p>

                    <div className="teacher-class-actions">
                      <button
                        type="button"
                        className="class-action-button manage"
                        onClick={() =>
                          navigate(
                            `/teacher/classes/${classItem.id}/subjects`
                          )
                        }
                      >
                        <BookOpen size={16} />
                        Manage Subjects
                      </button>

                      <button
                        type="button"
                        className="class-action-button edit"
                        onClick={() =>
                          openEditModal(classItem)
                        }
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      {classItem.is_active && (
                        <button
                          type="button"
                          className="class-action-button deactivate"
                          onClick={() =>
                            handleDeactivate(classItem)
                          }
                        >
                          <Power size={16} />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* CREATE / EDIT CLASS MODAL */}
      {showModal && (
        <div
          className="teacher-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="teacher-modal">
            <div className="teacher-modal-header">
              <div>
                <p>
                  {editingClass ? "EDIT CLASS" : "NEW CLASS"}
                </p>

                <h2>
                  {editingClass ? "Edit Class" : "Create Class"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="teacher-form-group">
                <label htmlFor="class-name">
                  Class Name
                </label>

                <input
                  id="class-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. BCA 5th Semester"
                  disabled={saving}
                />
              </div>

              <div className="teacher-form-group">
                <label htmlFor="class-description">
                  Description
                </label>

                <textarea
                  id="class-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter class description"
                  rows="4"
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="teacher-alert teacher-alert-error">
                  {error}
                </div>
              )}

              <div className="teacher-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="loading-icon"
                      />
                      Saving...
                    </>
                  ) : editingClass ? (
                    "Update Class"
                  ) : (
                    "Create Class"
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

export default TeacherDashboard;