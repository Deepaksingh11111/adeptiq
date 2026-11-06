import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  PlayCircle,
  Presentation,
  X,
  AlertCircle,
  Music,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function StudentTopic() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [subject, setSubject] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [viewMaterial, setViewMaterial] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState("");

  // --------------------------------------------------
  // URL HELPERS
  // --------------------------------------------------

  const getMaterialUrl = (material) =>
    material?.external_url ||
    material?.resource_url ||
    material?.external_link ||
    material?.file_url ||
    material?.url ||
    "";

  const isExternalUrl = (value) => {
    if (!value || typeof value !== "string") return false;

    try {
      const parsed = new URL(value.trim());
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const isLinkMaterial = (material) =>
    ["link", "url"].includes(
      String(material?.material_type || "").toLowerCase()
    );

  const getFileExtension = (material) => {
    const filename = String(
      material?.original_filename ||
        material?.file_name ||
        material?.filename ||
        ""
    );

    const cleanFilename = filename.split("?")[0];

    if (cleanFilename.includes(".")) {
      return cleanFilename.split(".").pop().toLowerCase();
    }

    return String(material?.material_type || "").toLowerCase();
  };

  const isImageFile = (ext) =>
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);

  const isVideoFile = (ext) =>
    ["mp4", "webm", "ogg", "mov"].includes(ext);

  const isAudioFile = (ext) =>
    ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);

  const isSpreadsheet = (ext) =>
    ["csv", "xls", "xlsx"].includes(ext);

  const isOfficeFile = (ext) =>
    ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext);

  const isPdfFile = (material) => {
    const ext = getFileExtension(material);
    return ext === "pdf";
  };

  // --------------------------------------------------
  // LOAD MATERIALS
  // --------------------------------------------------

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await api.get(
        `/student/topics/${topicId}/materials`
      );

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data.message || "Unable to load learning materials."
        );
      }

      setTopic(data.topic || null);
      setSubject(data.subject || null);
      setMaterials(
        Array.isArray(data.materials) ? data.materials : []
      );
    } catch (error) {
      console.error("LOAD MATERIALS ERROR:", error);

      setPageError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load learning materials."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [topicId]);

  // --------------------------------------------------
  // CLOSE AND CLEAN PREVIEW
  // --------------------------------------------------

  const closePreview = () => {
    setViewMaterial(null);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(false);
    setCsvRows([]);
    setCsvError("");
  };

  // --------------------------------------------------
  // LOAD A MATERIAL
  // --------------------------------------------------

  const handleViewMaterial = async (material) => {
    closePreview();

    setViewMaterial(material);
    setPreviewError("");

    const url = getMaterialUrl(material);
    const ext = getFileExtension(material);

    // External website
    if (isLinkMaterial(material)) {
      if (!isExternalUrl(url)) {
        setPreviewError(
          "External URL missing or invalid. Ask your teacher to update this material."
        );
        return;
      }

      setPreviewUrl(url.trim());
      return;
    }

    // CSV can be displayed as a table
    if (ext === "csv") {
      try {
        setPreviewLoading(true);

        const response = await api.get(
          `/student/materials/${material.id}/file`,
          { responseType: "text" }
        );

        const text =
          typeof response.data === "string"
            ? response.data
            : String(response.data ?? "");

        const rows = parseCSV(text);

        setCsvRows(rows);

        if (!rows.length) {
          setCsvError("This CSV file is empty.");
        }
      } catch (error) {
        console.error("CSV PREVIEW ERROR:", error);

        setPreviewError(
          error.response?.data?.message ||
            "Unable to preview the CSV file."
        );
      } finally {
        setPreviewLoading(false);
      }

      return;
    }

    // All uploaded files use the authenticated file endpoint.
    try {
      setPreviewLoading(true);

      const response = await api.get(
        `/student/materials/${material.id}/file`,
        { responseType: "blob" }
      );

      const contentType =
        response.headers?.["content-type"] ||
        getMimeType(ext);

      const blob = new Blob([response.data], {
        type: contentType,
      });

      const objectUrl = URL.createObjectURL(blob);

      setPreviewUrl(objectUrl);
    } catch (error) {
      console.error("MATERIAL PREVIEW ERROR:", error);

      setPreviewError(
        error.response?.data?.message ||
          "Unable to load this file. Please try opening the material page or downloading it."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // --------------------------------------------------
  // CSV PARSER
  // --------------------------------------------------

  const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if (
        (char === "\n" || char === "\r") &&
        !inQuotes
      ) {
        if (char === "\r" && next === "\n") i++;

        row.push(cell);

        if (row.some((value) => value.trim() !== "")) {
          rows.push(row);
        }

        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }

    return rows;
  };

  // --------------------------------------------------
  // MIME TYPES
  // --------------------------------------------------

  const getMimeType = (ext) => {
    const mimeTypes = {
      pdf: "application/pdf",

      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",

      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac",

      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      csv: "text/csv",
    };

    return mimeTypes[ext] || "application/octet-stream";
  };

  // --------------------------------------------------
  // OPEN EXTERNAL LINK
  // --------------------------------------------------

  const handleOpenExternal = () => {
    if (!viewMaterial) return;

    const url = getMaterialUrl(viewMaterial);

    if (!isExternalUrl(url)) {
      setPreviewError("This external link is invalid or missing.");
      return;
    }

    window.open(url.trim(), "_blank", "noopener,noreferrer");
  };

  // --------------------------------------------------
  // MATERIAL PAGE
  // --------------------------------------------------

  const handleOpenMaterialPage = (material) => {
    navigate(`/student/materials/${material.id}`);
  };

  // --------------------------------------------------
  // DOWNLOAD
  // --------------------------------------------------

  const handleDownload = async (material) => {
    try {
      const response = await api.get(
        `/student/materials/${material.id}/file`,
        { responseType: "blob" }
      );

      const ext = getFileExtension(material);

      const blob = new Blob([response.data], {
        type:
          response.headers?.["content-type"] ||
          getMimeType(ext),
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download =
        material.original_filename ||
        material.file_name ||
        material.title ||
        "learning-material";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
    } catch (error) {
      console.error("DOWNLOAD ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Unable to download this material."
      );
    }
  };

  // --------------------------------------------------
  // ICONS
  // --------------------------------------------------

  const getMaterialIcon = (type) => {
    const value = String(type || "").toLowerCase();

    if (value === "pdf") return <FileText size={25} />;

    if (["ppt", "pptx"].includes(value)) {
      return <Presentation size={25} />;
    }

    if (["xls", "xlsx", "csv"].includes(value)) {
      return <FileSpreadsheet size={25} />;
    }

    if (
      ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(
        value
      )
    ) {
      return <ImageIcon size={25} />;
    }

    if (["mp4", "webm", "mov"].includes(value)) {
      return <PlayCircle size={25} />;
    }

    if (["mp3", "wav", "m4a", "aac"].includes(value)) {
      return <Music size={25} />;
    }

    if (["link", "url"].includes(value)) {
      return <LinkIcon size={25} />;
    }

    return <File size={25} />;
  };

  // --------------------------------------------------
  // BACK
  // --------------------------------------------------

  const goBack = () => {
    if (subject?.id) {
      navigate(`/student/subjects/${subject.id}`);
    } else {
      navigate("/student/dashboard");
    }
  };

  // --------------------------------------------------
  // OFFICE VIEWER URL
  // --------------------------------------------------

  const getOfficeViewerUrl = () => {
    if (!previewUrl || !isOfficeFile(getFileExtension(viewMaterial))) {
      return "";
    }

    // The Office viewer must be able to access the file URL.
    // A local blob URL is not accessible to Microsoft's servers.
    const fileUrl = getMaterialUrl(viewMaterial);

    if (!isExternalUrl(fileUrl)) {
      return "";
    }

    return (
      "https://view.officeapps.live.com/op/embed.aspx?src=" +
      encodeURIComponent(fileUrl)
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  const ext = viewMaterial
    ? getFileExtension(viewMaterial)
    : "";

  const officeViewerUrl = getOfficeViewerUrl();

  return (
    <div className="student-topic-page">
      <header className="topic-page-header">
        <button
          type="button"
          className="back-button"
          onClick={goBack}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {topic && (
          <div className="topic-header-card">
            <div className="topic-header-icon">
              <BookOpen size={32} />
            </div>

            <div>
              <p className="topic-header-label inline-brand">
                <img src="/logo.png" alt="" />
                <span>{subject?.name || "SUBJECT"}</span>
              </p>

              <h1>{topic.name}</h1>

              <p>
                {topic.description ||
                  "Study this topic using the available learning materials."}
              </p>
            </div>
          </div>
        )}
      </header>

      <main className="student-topic-content">
        {loading && (
          <div className="page-state">
            <Loader2 size={30} className="loading-icon" />
            <p>Loading learning materials...</p>
          </div>
        )}

        {!loading && pageError && (
          <div className="page-state error-state">
            <AlertCircle size={30} />
            <h3>Unable to load materials</h3>
            <p>{pageError}</p>

            <button
              type="button"
              className="retry-button"
              onClick={loadMaterials}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !pageError && materials.length === 0 && (
          <div className="page-state">
            <FileText size={45} />
            <h3>No learning materials yet</h3>
            <p>
              Your teacher has not published any material for this topic yet.
            </p>
          </div>
        )}

        {!loading && !pageError && materials.length > 0 && (
          <section className="materials-section">
            <div className="materials-heading">
              <div>
                <p className="section-label">STUDY MATERIALS</p>
                <h2>Learn this topic</h2>
                <p>
                  Preview your resources directly on this page.
                </p>
              </div>

              <div className="material-count">
                <FileText size={18} />
                {materials.length}{" "}
                {materials.length === 1 ? "Material" : "Materials"}
              </div>
            </div>

            <div className="materials-list">
              {materials.map((material) => (
                <div className="material-card" key={material.id}>
                  <div className="material-icon">
                    {getMaterialIcon(
                      material.material_type ||
                        getFileExtension(material)
                    )}
                  </div>

                  <div className="material-info">
                    <h3>{material.title}</h3>

                    <p>
                      {material.description ||
                        "Learning material for this topic."}
                    </p>

                    <span className="material-type">
                      {String(
                        material.material_type || "file"
                      ).toUpperCase()}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="open-material-button"
                    onClick={() => handleViewMaterial(material)}
                  >
                    <Eye size={17} />
                    View
                  </button>
                </div>
              ))}
            </div>

            {viewMaterial && (
              <section className="material-preview-section">
                <div className="material-preview-header">
                  <div>
                    <p className="section-label">MATERIAL PREVIEW</p>

                    <h2>
                      {viewMaterial.title || "Learning Material"}
                    </h2>

                    {viewMaterial.description && (
                      <p>{viewMaterial.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="material-action-button"
                    onClick={closePreview}
                  >
                    <X size={17} />
                    Hide
                  </button>
                </div>

                <div className="material-preview-content">
                  {previewLoading && (
                    <div className="page-state">
                      <Loader2
                        size={30}
                        className="loading-icon"
                      />
                      <p>Preparing material preview...</p>
                    </div>
                  )}

                  {!previewLoading && previewError && (
                    <div className="page-state error-state">
                      <AlertCircle size={30} />
                      <p>{previewError}</p>

                      <button
                        type="button"
                        className="retry-button"
                        onClick={() =>
                          handleViewMaterial(viewMaterial)
                        }
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    isLinkMaterial(viewMaterial) && (
                      <div>
                        <iframe
                          src={previewUrl}
                          title={viewMaterial.title || "External Resource"}
                          style={{
                            width: "100%",
                            height: "650px",
                            border: "1px solid #ddd",
                            borderRadius: "12px",
                          }}
                          referrerPolicy="no-referrer"
                          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                        />

                        <p>
                          Some websites block embedded previews.
                          Use the button below if the page does not load.
                        </p>

                        <button
                          type="button"
                          className="open-material-button"
                          onClick={handleOpenExternal}
                        >
                          <ExternalLink size={17} />
                          Open Link in New Tab
                        </button>
                      </div>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    !isLinkMaterial(viewMaterial) &&
                    isPdfFile(viewMaterial) && (
                      <iframe
                        src={previewUrl}
                        title={viewMaterial.title || "PDF Preview"}
                        style={{
                          width: "100%",
                          height: "700px",
                          border: "1px solid #ddd",
                          borderRadius: "12px",
                        }}
                      />
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    isImageFile(ext) && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={previewUrl}
                          alt={viewMaterial.title || "Learning material"}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "750px",
                            objectFit: "contain",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    isVideoFile(ext) && (
                      <video
                        controls
                        style={{
                          width: "100%",
                          maxHeight: "700px",
                          borderRadius: "12px",
                        }}
                      >
                        <source src={previewUrl} type={getMimeType(ext)} />
                        Your browser does not support this video.
                      </video>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    isAudioFile(ext) && (
                      <audio
                        controls
                        style={{ width: "100%" }}
                      >
                        <source src={previewUrl} type={getMimeType(ext)} />
                        Your browser does not support this audio.
                      </audio>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    csvRows.length > 0 && (
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <tbody>
                            {csvRows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => {
                                  const Tag = rowIndex === 0 ? "th" : "td";

                                  return (
                                    <Tag
                                      key={cellIndex}
                                      style={{
                                        border: "1px solid #ddd",
                                        padding: "10px",
                                        textAlign: "left",
                                      }}
                                    >
                                      {cell}
                                    </Tag>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    isOfficeFile(ext) && (
                      <div>
                        {officeViewerUrl ? (
                          <iframe
                            src={officeViewerUrl}
                            title="Office Document Preview"
                            style={{
                              width: "100%",
                              height: "700px",
                              border: "1px solid #ddd",
                              borderRadius: "12px",
                            }}
                          />
                        ) : (
                          <div className="page-state">
                            <FileText size={40} />
                            <h3>Office document</h3>
                            <p>
                              This file is not publicly accessible for the
                              online Office viewer. Download it or open the
                              material page.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  {!previewLoading &&
                    !previewError &&
                    previewUrl &&
                    !isLinkMaterial(viewMaterial) &&
                    !isPdfFile(viewMaterial) &&
                    !isImageFile(ext) &&
                    !isVideoFile(ext) &&
                    !isAudioFile(ext) &&
                    !isOfficeFile(ext) &&
                    ext !== "csv" && (
                      <div className="page-state">
                        <File size={40} />
                        <h3>File ready</h3>
                        <p>
                          This file type may not support browser preview.
                          You can download it or open the material page.
                        </p>
                      </div>
                    )}

                  {csvError && (
                    <div className="page-state">
                      <p>{csvError}</p>
                    </div>
                  )}
                </div>

                <div className="material-preview-actions">
                  <button
                    type="button"
                    className="material-action-button"
                    onClick={() =>
                      handleOpenMaterialPage(viewMaterial)
                    }
                  >
                    <ExternalLink size={17} />
                    Open Material Page
                  </button>

                  {!isLinkMaterial(viewMaterial) && (
                    <button
                      type="button"
                      className="material-action-button primary"
                      onClick={() => handleDownload(viewMaterial)}
                    >
                      <Download size={17} />
                      Download
                    </button>
                  )}
                </div>
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default StudentTopic;