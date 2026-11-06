import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  BookOpen,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  File,
  Upload,
  Plus,
  Trash2,
  Download,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const ACCEPTED_TYPES = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp4",
  ".webm",
  ".mov",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getMaterialIcon(material) {
  const type = (
    material?.material_type ||
    material?.original_filename ||
    material?.file_url ||
    ""
  ).toLowerCase();

  if (
    type === "video" ||
    /\.(mp4|webm|mov)(?:$|\?)/i.test(type)
  ) {
    return FileVideo;
  }

  if (
    type === "image" ||
    /\.(png|jpg|jpeg|gif|webp)(?:$|\?)/i.test(type)
  ) {
    return FileImage;
  }

  if (
    /\.(xls|xlsx)(?:$|\?)/i.test(type)
  ) {
    return FileSpreadsheet;
  }

  if (
    /\.(pdf|ppt|pptx|doc|docx)(?:$|\?)/i.test(type)
  ) {
    return FileText;
  }

  if (type === "link") {
    return ExternalLink;
  }

  return File;
}

function formatFileSize(bytes) {
  if (!bytes) return "";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TeacherMaterial() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const fileInputRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [topic, setTopic] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    material_type: "file",
    external_url: "",
    file: null,
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      material_type: "file",
      external_url: "",
      file: null,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError("");

      const topicResponse = await api.get(
        `/teacher/topics/${topicId}`
      );

      const loadedTopic = topicResponse.data.topic;

      if (!loadedTopic) {
        throw new Error("Topic details were not returned.");
      }

      setTopic(loadedTopic);

      const materialResponse = await api.get(
        `/teacher/topics/${topicId}/materials`
      );

      setMaterials(materialResponse.data.materials || []);
    } catch (err) {
      console.error("LOAD MATERIALS ERROR:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load topic materials."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (topicId) {
      loadMaterials();
    }
  }, [topicId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const extension = `.${selectedFile.name
      .split(".")
      .pop()
      .toLowerCase()}`;

    if (!ACCEPTED_TYPES.includes(extension)) {
      setError(
        "Unsupported file type. Select PDF, PPT, Word, Excel, image or video."
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        "File size exceeds 50 MB. Please select a smaller file."
      );

      event.target.value = "";
      return;
    }

    setError("");

    setForm((previous) => ({
      ...previous,
      file: selectedFile,
      title:
        previous.title ||
        selectedFile.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!topic) {
      setError("Topic details are unavailable.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter a material title.");
      return;
    }

    if (form.material_type === "file" && !form.file) {
      setError("Please select a file to upload.");
      return;
    }

    if (form.material_type === "link") {
      try {
        const url = new URL(form.external_url.trim());

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid URL protocol");
        }
      } catch {
        setError("Please enter a valid HTTP or HTTPS URL.");
        return;
      }
    }

    try {
      setSaving(true);

      if (form.material_type === "file") {
        const payload = new FormData();

        payload.append("title", form.title.trim());
        payload.append("description", form.description.trim());
        payload.append("topic_id", topicId);
        payload.append("file", form.file);

        await api.post(
          `/teacher/subjects/${topic.subject_id}/materials/upload`,
          payload,
          {
            headers: {
              "Content-Type": undefined,
            },
          }
        );
      } else {
        await api.post(
          `/teacher/subjects/${topic.subject_id}/materials/link`,
          {
            title: form.title.trim(),
            description: form.description.trim(),
            topic_id: Number(topicId),
            external_url: form.external_url.trim(),
          }
        );
      }

      setSuccess("Material added successfully.");

      resetForm();
      setShowForm(false);

      await loadMaterials();
    } catch (err) {
      console.error("SAVE MATERIAL ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save the material."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (material) => {
    const confirmed = window.confirm(
      `Unpublish "${material.title}"? Students will no longer see it.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/teacher/materials/${material.id}`
      );

      setSuccess("Material unpublished successfully.");

      await loadMaterials();
    } catch (err) {
      console.error("DELETE MATERIAL ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to unpublish material."
      );
    }
  };

  const getResourceUrl = (material) => {
    if (material.external_url) {
      return material.external_url;
    }

    if (material.file_url) {
      return `http://127.0.0.1:5000${material.file_url}`;
    }

    return "";
  };

  const handleLogout = () => {
    localStorage.removeItem("learnadapt_token");
    localStorage.removeItem("learnadapt_user");

    navigate("/login", { replace: true });
  };

  return (
    <div className="teacher-quiz-page">
      <header className="teacher-quiz-header">
        <button
          type="button"
          className="quiz-back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div>
          <h1>Learning Materials</h1>
          <p className="inline-brand"><img src="/logo.png" alt="" /> <span>Adeptiq · Teacher Workspace</span></p>
        </div>

        <button
          type="button"
          className="teacher-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <main className="teacher-quiz-content">
        <section className="quiz-editor-card">
          <div className="material-page-heading">
            <div>
              <p className="material-eyebrow">
                TOPIC CONTENT
              </p>

              <h2>
                {topic?.name || `Topic #${topicId}`}
              </h2>

              <p>
                Upload notes, presentations, documents, images,
                videos or external learning links.
              </p>
            </div>

            <button
              type="button"
              className="teacher-create-class-button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm((previous) => !previous);
              }}
            >
              {showForm ? (
                <X size={18} />
              ) : (
                <Plus size={18} />
              )}

              {showForm ? "Close Form" : "Add Material"}
            </button>
          </div>

          {error && (
            <div className="teacher-alert teacher-alert-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="teacher-alert teacher-alert-success">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          {showForm && (
            <form
              className="material-upload-form"
              onSubmit={handleSubmit}
            >
              <h3>Add Learning Material</h3>

              <div className="form-group">
                <label htmlFor="material-title">
                  Material Title *
                </label>

                <input
                  id="material-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. MANET Complete Notes"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="material-description">
                  Description
                </label>

                <textarea
                  id="material-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Explain what students will learn..."
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="material-type">
                  Material Type
                </label>

                <select
                  id="material-type"
                  name="material_type"
                  value={form.material_type}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      material_type: event.target.value,
                      file: null,
                      external_url: "",
                    }));

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={saving}
                >
                  <option value="file">Upload a File</option>
                  <option value="link">
                    External Video / URL
                  </option>
                </select>
              </div>

              {form.material_type === "file" ? (
                <div className="form-group">
                  <label htmlFor="material-file">
                    Choose File *
                  </label>

                  <div className="material-file-picker">
                    <Upload size={25} />

                    <input
                      ref={fileInputRef}
                      id="material-file"
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={handleFileChange}
                      disabled={saving}
                    />

                    <p>
                      PDF, PPT, Word, Excel, images and videos
                    </p>

                    <span>Maximum file size: 50 MB</span>

                    {form.file && (
                      <strong>
                        {form.file.name} ·{" "}
                        {formatFileSize(form.file.size)}
                      </strong>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="material-url">
                    Video or Resource URL *
                  </label>

                  <input
                    id="material-url"
                    type="url"
                    name="external_url"
                    value={form.external_url}
                    onChange={handleChange}
                    placeholder="https://example.com/lesson"
                    required
                    disabled={saving}
                  />
                </div>
              )}

              <div className="material-form-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={() => {
                    if (saving) return;

                    setShowForm(false);
                    resetForm();
                    setError("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-save-button"
                  disabled={saving || loading || !topic}
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
                    <>
                      <Upload size={17} />
                      Save Material
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="quiz-editor-card">
          <div className="material-list-heading">
            <div>
              <h2>Topic Materials</h2>

              <p>
                {materials.length}{" "}
                {materials.length === 1
                  ? "material"
                  : "materials"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="teacher-page-state">
              <Loader2
                size={30}
                className="loading-icon"
              />

              <p>Loading materials...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="teacher-empty-state">
              <BookOpen size={45} />

              <h3>No materials added yet</h3>

              <p>
                Add notes, presentations, videos or other
                resources for students studying this topic.
              </p>

              <button
                type="button"
                className="teacher-create-class-button"
                onClick={() => setShowForm(true)}
              >
                <Plus size={18} />
                Add First Material
              </button>
            </div>
          ) : (
            <div className="material-list">
              {materials.map((material) => {
                const MaterialIcon = getMaterialIcon(material);
                const resourceUrl = getResourceUrl(material);

                return (
                  <article
                    className="material-item"
                    key={material.id}
                  >
                    <div className="material-item-icon">
                      <MaterialIcon size={24} />
                    </div>

                    <div className="material-item-info">
                      <h3>{material.title}</h3>

                      <p>
                        {material.description ||
                          "No description available."}
                      </p>

                      <span>
                        {material.material_type ||
                          "Learning resource"}
                      </span>
                    </div>

                    <div className="material-item-actions">
                      {resourceUrl && (
                        <a
                          className="material-icon-button"
                          href={resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open material"
                          title="Open material"
                        >
                          {material.external_url ? (
                            <ExternalLink size={18} />
                          ) : (
                            <Download size={18} />
                          )}
                        </a>
                      )}

                      <button
                        type="button"
                        className="material-icon-button danger"
                        onClick={() => handleDelete(material)}
                        aria-label="Unpublish material"
                        title="Unpublish material"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TeacherMaterial;