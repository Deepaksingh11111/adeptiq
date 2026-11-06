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

function StudentClass() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/student/classes/${classId}/subjects`
      );

      setClassInfo(response.data.class);
      setSubjects(response.data.subjects || []);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Unable to load class subjects."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const goBack = () => {
    navigate("/student/dashboard");
  };

  const openSubject = (subjectId) => {
    navigate(`/student/subjects/${subjectId}`);
  };

  return (
    <div className="student-class-page">

      <header className="class-page-header">

        <button
          className="back-button"
          onClick={goBack}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {classInfo && (
          <div className="class-header-content">

            <div className="class-header-icon">
              <BookOpen size={32} />
            </div>

            <div>
              <p className="class-header-label inline-brand">
                <img src="/logo.png" alt="" /> <span>Adeptiq</span>
              </p>

              <h1>{classInfo.name}</h1>

              <p>
                {classInfo.description ||
                  "Access your class learning content."}
              </p>
            </div>

          </div>
        )}

      </header>

      <main className="student-class-content">

        {loading && (
          <div className="page-state">
            <Loader2
              size={30}
              className="loading-icon"
            />

            <p>
              Loading subjects...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="page-state error-state">
            <h3>Unable to load class</h3>

            <p>{error}</p>

            <button
              onClick={loadClassData}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          subjects.length === 0 && (
            <div className="page-state">

              <Layers3 size={45} />

              <h3>
                No subjects available
              </h3>

              <p>
                Your teacher has not added any
                subjects to this class yet.
              </p>

            </div>
          )}

        {!loading &&
          !error &&
          subjects.length > 0 && (
            <section className="subjects-section">

              <div className="subjects-heading">

                <div>
                  <p className="section-label">
                    CLASS CONTENT
                  </p>

                  <h2>
                    Your Subjects
                  </h2>

                  <p>
                    Select a subject to access
                    topics and teacher-provided
                    learning materials.
                  </p>
                </div>

                <div className="subject-count">
                  <Layers3 size={18} />
                  {subjects.length} Subjects
                </div>

              </div>

              <div className="subject-grid">

                {subjects.map((subject) => (
                  <div
                    className="subject-card"
                    key={subject.id}
                  >

                    <div className="subject-card-top">

                      <div className="subject-icon">
                        <BookOpen size={25} />
                      </div>

                      <span className="subject-status">
                        Active
                      </span>

                    </div>

                    <h3>
                      {subject.name}
                    </h3>

                    <p>
                      {subject.description ||
                        "No description available."}
                    </p>

                    <button
                      className="open-subject-button"
                      onClick={() =>
                        openSubject(subject.id)
                      }
                    >
                      Open Subject
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

export default StudentClass;