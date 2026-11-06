import { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  FileText,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function TeacherTopics() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingTopicId, setEditingTopicId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    order_number: 0,
  });

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/teacher/subjects/${subjectId}/topics`
      );

      setTopics(response.data.topics || []);

      try {
        const subjectResponse = await api.get(
          `/teacher/subjects/${subjectId}`
        );

        setSubject(subjectResponse.data.subject || null);
      } catch {
        setSubject(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Topics load nahi ho paaye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [subjectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      order_number: topics.length + 1,
    });

    setEditingTopicId(null);
  };

  const saveTopic = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        order_number: Number(form.order_number),
      };

      if (editingTopicId) {
        await api.put(
          `/teacher/topics/${editingTopicId}`,
          payload
        );

        setMessage("Topic successfully update ho gaya.");
      } else {
        await api.post(
          `/teacher/subjects/${subjectId}/topics`,
          payload
        );

        setMessage("Naya topic successfully create ho gaya.");
      }

      await loadTopics();
      resetForm();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Topic save nahi ho paaya."
      );
    } finally {
      setSaving(false);
    }
  };

  const editTopic = (topic) => {
    setEditingTopicId(topic.id);

    setForm({
      name: topic.name || "",
      description: topic.description || "",
      order_number: topic.order_number ?? 0,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deactivateTopic = async (topic) => {
    const confirmed = window.confirm(
      `Kya aap "${topic.name}" ko deactivate karna chahte hain?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/teacher/topics/${topic.id}`);

      setMessage("Topic deactivate ho gaya.");

      if (editingTopicId === topic.id) {
        resetForm();
      }

      await loadTopics();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Topic deactivate nahi ho paaya."
      );
    }
  };

  return (
    <div className="teacher-quiz-page">
      <header className="teacher-quiz-header">
        <div>
          <p className="dashboard-label inline-brand"><img src="/logo.png" alt="" /> <span>Adeptiq</span></p>

          <h1>Manage Topics</h1>

          <p className="dashboard-subtitle">
            Apne subject ke topics create aur manage karo.
          </p>

          <p>
            Subject ID: <strong>{subjectId}</strong>
            {subject?.name ? ` — ${subject.name}` : ""}
          </p>
        </div>

        <button
          type="button"
          className="quiz-secondary-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </header>

      {message && (
        <div className="quiz-message success">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="quiz-message error">
          {error}
        </div>
      )}

      <main className="teacher-quiz-content">
        <section className="quiz-editor-card">
          <h2>
            {editingTopicId ? "Edit Topic" : "Create Topic"}
          </h2>

          <form onSubmit={saveTopic}>
            <div className="form-group">
              <label htmlFor="topic-name">Topic Name</label>

              <input
                id="topic-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Introduction to Computer Networks"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="topic-description">
                Description
              </label>

              <textarea
                id="topic-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Topic ke baare mein likho"
              />
            </div>

            <div className="form-group">
              <label htmlFor="topic-order">Display Order</label>

              <input
                id="topic-order"
                type="number"
                name="order_number"
                value={form.order_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="question-form-actions">
              {editingTopicId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="quiz-primary-button"
                disabled={saving}
              >
                {editingTopicId ? (
                  <>
                    <Save size={17} />
                    {saving ? "Updating..." : "Update Topic"}
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    {saving ? "Creating..." : "Create Topic"}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="quiz-editor-card">
          <h2>
            <BookOpen
              size={22}
              style={{ verticalAlign: "middle" }}
            />{" "}
            Existing Topics
          </h2>

          {loading ? (
            <p>Topics load ho rahe hain...</p>
          ) : topics.length === 0 ? (
            <p>Abhi is subject mein koi topic nahi hai.</p>
          ) : (
            <div className="quiz-grid">
              {topics.map((topic) => (
                <article
                  className="teacher-quiz-card"
                  key={topic.id}
                >
                  <div className="quiz-card-top">
                    <div className="quiz-icon">
                      <BookOpen size={22} />
                    </div>

                    <span className="quiz-status published">
                      Order: {topic.order_number ?? 0}
                    </span>
                  </div>

                  <h3>{topic.name}</h3>

                  <p>
                    {topic.description ||
                      "No description available."}
                  </p>

                  <div className="question-form-actions">
                    <button
                      type="button"
                      className="quiz-secondary-button"
                      onClick={() =>
                        navigate(
                          `/teacher/topics/${topic.id}/materials`
                        )
                      }
                    >
                      <FileText size={16} />
                      Manage Materials
                    </button>

                    <button
                      type="button"
                      className="quiz-secondary-button"
                      onClick={() => editTopic(topic)}
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => deactivateTopic(topic)}
                    >
                      <Trash2 size={16} />
                      Deactivate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TeacherTopics;