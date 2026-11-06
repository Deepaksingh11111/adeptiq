import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers3,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function StudentSubject() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubjectData = async () => {
    try {
      setLoading(true);
      setError("");

      const [subjectResponse, topicsResponse] =
        await Promise.all([
          api.get(`/student/subjects/${subjectId}`),
          api.get(`/student/subjects/${subjectId}/topics`),
        ]);

      setSubject(subjectResponse.data.subject);
      setTopics(topicsResponse.data.topics || []);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Unable to load subject topics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjectData();
  }, [subjectId]);

  const goBack = () => {
    if (subject?.class_id) {
      navigate(
        `/student/classes/${subject.class_id}`
      );
    } else {
      navigate("/student/dashboard");
    }
  };

  const openTopic = (topicId) => {
    navigate(`/student/topics/${topicId}`);
  };

  return (
    <div className="student-subject-page">

      <header className="subject-page-header">

        <button
          className="back-button"
          onClick={goBack}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {subject && (
          <div className="subject-header-card">

            <div className="subject-header-icon">
              <BookOpen size={32} />
            </div>

            <div>
              <p className="subject-header-label inline-brand">
                <img src="/logo.png" alt="" />
                <span>SUBJECT</span>
              </p>

              <h1>{subject.name}</h1>

              <p>
                {subject.description ||
                  "Explore topics and learning materials."}
              </p>
            </div>

          </div>
        )}

      </header>

      <main className="student-subject-content">

        {loading && (
          <div className="page-state">
            <Loader2
              size={30}
              className="loading-icon"
            />

            <p>
              Loading topics...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="page-state error-state">

            <h3>
              Unable to load subject
            </h3>

            <p>{error}</p>

            <button
              className="retry-button"
              onClick={loadSubjectData}
            >
              Try Again
            </button>

          </div>
        )}

        {!loading &&
          !error &&
          topics.length === 0 && (
            <div className="page-state">

              <Layers3 size={45} />

              <h3>
                No topics available
              </h3>

              <p>
                Your teacher has not added any
                topics to this subject yet.
              </p>

            </div>
          )}

        {!loading &&
          !error &&
          topics.length > 0 && (
            <section className="topics-section">

              <div className="topics-heading">

                <div>
                  <p className="section-label">
                    LEARNING TOPICS
                  </p>

                  <h2>
                    Topics
                  </h2>

                  <p>
                    Select a topic to access notes,
                    PDFs, videos and other learning
                    materials.
                  </p>
                </div>

                <div className="topic-count">
                  <Layers3 size={18} />
                  {topics.length} Topics
                </div>

              </div>

              <div className="topic-list">

                {topics.map((topic, index) => (
                  <div
                    className="topic-card"
                    key={topic.id}
                  >

                    <div className="topic-number">
                      {String(
                        topic.order_number || index + 1
                      ).padStart(2, "0")}
                    </div>

                    <div className="topic-icon">
                      <BookOpen size={23} />
                    </div>

                    <div className="topic-content">

                      <h3>
                        {topic.name}
                      </h3>

                      <p>
                        {topic.description ||
                          "Explore this learning topic."}
                      </p>

                    </div>

                    <button
                      className="open-topic-button"
                      onClick={() =>
                        openTopic(topic.id)
                      }
                    >
                      Open Topic
                      <ArrowRight size={17} />
                    </button>

                  </div>
                ))}

              </div>

            </section>
          )}

      </main>

    </div>
  );
}

export default StudentSubject;