import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Loader2,
  Plus,
  Power,
  X,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";


function TeacherSubjects() {

  const {
    classId,
  } = useParams();

  const navigate =
    useNavigate();


  const [classInfo, setClassInfo] =
    useState(null);

  const [subjects, setSubjects] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingSubject, setEditingSubject] =
    useState(null);

  const [saving, setSaving] =
    useState(false);


  const [form, setForm] = useState({
    name: "",
    description: "",
  });


  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  const loadSubjects = async () => {

    try {

      setLoading(true);

      setError("");

      const response =
        await api.get(
          `/teacher/classes/${classId}/subjects`
        );


      setSubjects(
        response.data.subjects || []
      );


      setClassInfo(
        response.data.class || {
          id: Number(classId),
          name: "Class",
          description: "",
        }
      );


    } catch (error) {

      console.error(
        "LOAD SUBJECTS ERROR:",
        error
      );


      if (
        error.response?.status === 401
      ) {

        localStorage.removeItem(
          "learnadapt_token"
        );

        localStorage.removeItem(
          "learnadapt_user"
        );

        navigate(
          "/login",
          {
            replace: true,
          }
        );

        return;

      }


      setError(
        error.response?.data?.message ||
          "Unable to load subjects."
      );


    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadSubjects();

  }, [classId]);


  // =====================================================
  // CREATE MODAL
  // =====================================================

  const openCreateModal = () => {

    setEditingSubject(null);

    setForm({
      name: "",
      description: "",
    });

    setError("");

    setSuccess("");

    setShowModal(true);

  };


  // =====================================================
  // EDIT MODAL
  // =====================================================

  const openEditModal = (
    subject
  ) => {

    setEditingSubject(
      subject
    );

    setForm({
      name:
        subject.name || "",

      description:
        subject.description || "",
    });

    setError("");

    setSuccess("");

    setShowModal(true);

  };


  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {

    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingSubject(null);

    setForm({
      name: "",
      description: "",
    });

  };


  // =====================================================
  // FORM
  // =====================================================

  const handleChange = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;


    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

  };


  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();

    setError("");

    setSuccess("");


    if (!form.name.trim()) {

      setError(
        "Subject name is required."
      );

      return;

    }


    try {

      setSaving(true);


      if (editingSubject) {

        await api.put(
          `/teacher/subjects/${editingSubject.id}`,
          {
            name:
              form.name.trim(),

            description:
              form.description.trim(),
          }
        );


        setSuccess(
          "Subject updated successfully."
        );

      } else {

        await api.post(
          `/teacher/classes/${classId}/subjects`,
          {
            name:
              form.name.trim(),

            description:
              form.description.trim(),
          }
        );


        setSuccess(
          "Subject created successfully."
        );

      }


      setShowModal(false);

      setEditingSubject(null);

      setForm({
        name: "",
        description: "",
      });


      await loadSubjects();


    } catch (error) {

      console.error(
        "SAVE SUBJECT ERROR:",
        error
      );


      if (
        error.response?.status === 401
      ) {

        localStorage.removeItem(
          "learnadapt_token"
        );

        localStorage.removeItem(
          "learnadapt_user"
        );

        navigate(
          "/login",
          {
            replace: true,
          }
        );

        return;

      }


      setError(
        error.response?.data?.message ||
          "Unable to save subject."
      );


    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // DEACTIVATE
  // =====================================================

  const handleDeactivate = async (
    subject
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to deactivate "${subject.name}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setError("");

      setSuccess("");


      await api.delete(
        `/teacher/subjects/${subject.id}`
      );


      setSuccess(
        "Subject deactivated successfully."
      );


      await loadSubjects();


    } catch (error) {

      console.error(
        "DEACTIVATE SUBJECT ERROR:",
        error
      );


      setError(
        error.response?.data?.message ||
          "Unable to deactivate subject."
      );

    }

  };


  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {

    navigate(
      "/teacher/dashboard"
    );

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="teacher-subjects-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="teacher-subjects-header">


        <button
          className="teacher-back-button"
          onClick={handleBack}
        >

          <ArrowLeft
            size={18}
          />

          Back

        </button>


        <div className="teacher-subjects-title">

          <p className="inline-brand">
            <img src="/logo.png" alt="" />
            <span>CLASS MANAGEMENT</span>
          </p>

          <h1>
            {classInfo?.name ||
              "Class Subjects"}
          </h1>

          <span>
            {classInfo?.description ||
              "Manage subjects for this class."}
          </span>

        </div>


        <button
          className="teacher-create-subject-button"
          onClick={openCreateModal}
        >

          <Plus
            size={18}
          />

          Add Subject

        </button>

      </header>


      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="teacher-subjects-content">


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


        {loading && (

          <div className="teacher-page-state">

            <Loader2
              size={32}
              className="loading-icon"
            />

            <p>
              Loading subjects...
            </p>

          </div>

        )}


        {!loading &&
          subjects.length === 0 && (

            <div className="teacher-empty-state">

              <BookOpen
                size={50}
              />

              <h3>
                No subjects yet
              </h3>

              <p>
                Add a subject to this
                class before creating
                topics and materials.
              </p>


              <button
                className="teacher-create-subject-button"
                onClick={
                  openCreateModal
                }
              >

                <Plus
                  size={18}
                />

                Add Subject

              </button>

            </div>

          )}


        {!loading &&
          subjects.length > 0 && (

            <section>


              <div className="teacher-subjects-section-heading">

                <div>

                  <p>
                    SUBJECTS
                  </p>

                  <h2>
                    Class Subjects
                  </h2>

                </div>


                <span>
                  {subjects.length}{" "}
                  {subjects.length === 1
                    ? "Subject"
                    : "Subjects"}
                </span>

              </div>


              <div className="teacher-subject-grid">

                {subjects.map(
                  (subject) => (

                    <div
                      className="teacher-subject-card"
                      key={subject.id}
                    >


                      <div className="teacher-subject-icon">

                        <BookOpen
                          size={26}
                        />

                      </div>


                      <div className="teacher-subject-info">


                        <div className="teacher-subject-top">

                          <h3>
                            {subject.name}
                          </h3>


                          <span
                            className={
                              subject.is_active
                                ? "class-status active"
                                : "class-status inactive"
                            }
                          >

                            {subject.is_active
                              ? "Active"
                              : "Inactive"}

                          </span>

                        </div>


                        <p>

                          {subject.description ||
                            "No description available."}

                        </p>


                        <div className="teacher-subject-actions">


                          <button
                            className="subject-action-button manage"
                            onClick={() =>
                              navigate(
                                `/teacher/subjects/${subject.id}/topics`
                              )
                            }
                          >

                            <BookOpen
                              size={15}
                            />

                            Manage Topics

                          </button>


                          <button
                            className="subject-action-button edit"
                            onClick={() =>
                              openEditModal(
                                subject
                              )
                            }
                          >

                            <Edit3
                              size={15}
                            />

                            Edit

                          </button>


                          {subject.is_active && (

                            <button
                              className="subject-action-button deactivate"
                              onClick={() =>
                                handleDeactivate(
                                  subject
                                )
                              }
                            >

                              <Power
                                size={15}
                              />

                              Deactivate

                            </button>

                          )}

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

          )}

      </main>


      {/* =================================================
          MODAL
      ================================================= */}

      {showModal && (

        <div
          className="teacher-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeModal();

            }

          }}
        >

          <div className="teacher-modal">


            <div className="teacher-modal-header">

              <div>

                <p>
                  {editingSubject
                    ? "EDIT SUBJECT"
                    : "NEW SUBJECT"}
                </p>

                <h2>

                  {editingSubject
                    ? "Edit Subject"
                    : "Add Subject"}

                </h2>

              </div>


              <button
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
              >

                <X
                  size={20}
                />

              </button>

            </div>


            <form
              onSubmit={handleSubmit}
            >


              <div className="teacher-form-group">

                <label htmlFor="subject-name">

                  Subject Name

                </label>


                <input
                  id="subject-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Computer Networks"
                  disabled={saving}
                />

              </div>


              <div className="teacher-form-group">

                <label htmlFor="subject-description">

                  Description

                </label>


                <textarea
                  id="subject-description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Computer Networks and MANET"
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
                  onClick={
                    closeModal
                  }
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

                  ) : (

                    editingSubject
                      ? "Update Subject"
                      : "Create Subject"

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


export default TeacherSubjects;