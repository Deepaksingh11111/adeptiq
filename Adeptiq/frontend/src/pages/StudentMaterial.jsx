import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  Globe,
  FileSpreadsheet,
  Image as ImageIcon,
  PlayCircle,
  Music,
} from "lucide-react";

import api from "../services/api";

function StudentMaterial() {
  const { materialId } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [csvRows, setCsvRows] = useState([]);

  const externalUrl =
    material?.external_url ||
    material?.resource_url ||
    material?.external_link ||
    material?.file_url ||
    material?.url ||
    "";

  const isExternalLink = (value) => {
    if (!value || typeof value !== "string") return false;

    try {
      const parsed = new URL(value.trim());
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const isExternal = isExternalLink(externalUrl);

  const getExtension = (item) => {
    const filename = String(
      item?.original_filename ||
        item?.file_name ||
        item?.filename ||
        ""
    );

    if (filename.includes(".")) {
      return filename.split("?")[0].split(".").pop().toLowerCase();
    }

    return String(item?.material_type || "").toLowerCase();
  };

  const getMimeType = (ext) => {
    const types = {
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
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
    };

    return types[ext] || "application/octet-stream";
  };

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

        if (row.some((value) => value.trim())) {
          rows.push(row);
        }

        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);

    if (row.some((value) => value.trim())) {
      rows.push(row);
    }

    return rows;
  };

  useEffect(() => {
    let cancelled = false;
    let createdUrl = "";

    const load = async () => {
      setLoading(true);
      setError("");
      setFileError("");
      setMaterial(null);
      setFileUrl("");
      setCsvRows([]);

      try {
        const response = await api.get(
          `/student/materials/${materialId}`
        );

        if (response.data?.success === false) {
          throw new Error(
            response.data?.message || "Unable to load material."
          );
        }

        const data = response.data?.material;

        if (!data) {
          throw new Error("Material information is unavailable.");
        }

        if (cancelled) return;

        setMaterial(data);

        const link =
          data.external_url ||
          data.resource_url ||
          data.external_link ||
          data.file_url ||
          data.url ||
          "";

        if (isExternalLink(link)) {
          return;
        }

        setFileLoading(true);

        try {
          const ext = getExtension(data);

          const fileResponse = await api.get(
            `/student/materials/${materialId}/file`,
            {
              responseType: ext === "csv" ? "text" : "blob",
            }
          );

          if (cancelled) return;

          if (ext === "csv") {
            const text =
              typeof fileResponse.data === "string"
                ? fileResponse.data
                : String(fileResponse.data ?? "");

            setCsvRows(parseCSV(text));
          } else {
            const blob = new Blob([fileResponse.data], {
              type:
                fileResponse.headers?.["content-type"] ||
                getMimeType(ext),
            });

            createdUrl = URL.createObjectURL(blob);
            setFileUrl(createdUrl);
          }
        } catch (fileErr) {
          if (!cancelled) {
            setFileError(
              fileErr.response?.data?.message ||
                "Unable to load the uploaded file. Please try again."
            );
          }
        } finally {
          if (!cancelled) setFileLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to open material."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;

      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [materialId]);

  const handleBack = () => navigate(-1);

  const handleOpenExternal = () => {
    if (isExternalLink(externalUrl)) {
      window.open(
        externalUrl.trim(),
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const handleOpenFile = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;

    const link = document.createElement("a");

    link.href = fileUrl;
    link.download =
      material?.original_filename ||
      material?.file_name ||
      material?.title ||
      "learning-material";

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="material-page">
        <div className="material-loading">
          <Loader2 size={34} className="loading-icon" />
          <h2>Loading material...</h2>
          <p>Please wait while we load your learning material.</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="material-page">
        <div className="material-error-card">
          <AlertCircle size={42} />
          <h2>Unable to open material</h2>
          <p>{error || "Material information is unavailable."}</p>

          <button
            className="material-back-button"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const ext = getExtension(material);
  const isPdf = ext === "pdf";
  const isImage = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "svg",
  ].includes(ext);
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);
  const isOffice = [
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
  ].includes(ext);

  // A local blob URL cannot be loaded by Microsoft's remote viewer.
  const officeSourceUrl = isExternalLink(material.file_url)
    ? material.file_url
    : "";

  const officeViewerUrl = officeSourceUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        officeSourceUrl
      )}`
    : "";

  return (
    <div className="material-page">
      <header className="material-header">
        <button
          className="material-back-button"
          onClick={handleBack}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="material-header-actions">
          {isExternal && (
            <button
              className="material-action-button primary"
              onClick={handleOpenExternal}
            >
              <ExternalLink size={17} />
              Open Resource
            </button>
          )}

          {fileUrl && (
            <>
              <button
                className="material-action-button"
                onClick={handleOpenFile}
              >
                <ExternalLink size={17} />
                Open in New Tab
              </button>

              <button
                className="material-action-button primary"
                onClick={handleDownload}
              >
                <Download size={17} />
                Download
              </button>
            </>
          )}
        </div>
      </header>

      <section className="material-info">
        <div className="material-type-icon">
          {isExternal ? (
            <Globe size={28} />
          ) : isImage ? (
            <ImageIcon size={28} />
          ) : isVideo ? (
            <PlayCircle size={28} />
          ) : isAudio ? (
            <Music size={28} />
          ) : isOffice && ["xls", "xlsx"].includes(ext) ? (
            <FileSpreadsheet size={28} />
          ) : (
            <FileText size={28} />
          )}
        </div>

        <div className="material-info-content">
          <p className="material-brand inline-brand"><img src="/logo.png" alt="" /> <span>Adeptiq</span></p>
          <h1>{material.title || "Learning Material"}</h1>

          {material.description && (
            <p className="material-description">
              {material.description}
            </p>
          )}

          <div className="material-meta">
            {material.material_type && (
              <span>
                Type: {material.material_type.toUpperCase()}
              </span>
            )}

            {material.original_filename && (
              <span>File: {material.original_filename}</span>
            )}
          </div>
        </div>
      </section>

      <section className="material-viewer-section">
        {isExternal && (
          <div className="material-other-file">
            <Globe size={50} />
            <h3>External Learning Resource</h3>
            <p>
              This resource is hosted on another website.
            </p>

            <button
              className="material-action-button primary"
              onClick={handleOpenExternal}
            >
              <ExternalLink size={17} />
              Open Resource
            </button>

            <p style={{ overflowWrap: "anywhere" }}>
              {externalUrl}
            </p>
          </div>
        )}

        {!isExternal && fileLoading && (
          <div className="material-viewer-loading">
            <Loader2 size={34} className="loading-icon" />
            <h3>Loading material...</h3>
            <p>Please wait while the file is being prepared.</p>
          </div>
        )}

        {!isExternal && !fileLoading && fileError && (
          <div className="material-viewer-error">
            <AlertCircle size={40} />
            <h3>Unable to load material file</h3>
            <p>{fileError}</p>

            <button
              className="material-retry-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          isPdf && (
            <iframe
              src={fileUrl}
              title={material.title || "PDF Preview"}
              className="material-pdf-viewer"
              style={{
                width: "100%",
                height: "700px",
                border: "1px solid #ddd",
                borderRadius: "12px",
              }}
            />
          )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          isImage && (
            <div className="material-other-file">
              <img
                src={fileUrl}
                alt={material.title || "Learning material"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "750px",
                  objectFit: "contain",
                }}
              />
            </div>
          )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          isVideo && (
            <video
              controls
              style={{ width: "100%", maxHeight: "700px" }}
            >
              <source src={fileUrl} type={getMimeType(ext)} />
              Your browser does not support this video.
            </video>
          )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          isAudio && (
            <audio controls style={{ width: "100%" }}>
              <source src={fileUrl} type={getMimeType(ext)} />
              Your browser does not support this audio.
            </audio>
          )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
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

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          isOffice && (
            <div className="material-other-file">
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
                <>
                  <FileText size={50} />
                  <h3>{material.title || "Office Document"}</h3>
                  <p>
                    Browser preview requires a publicly accessible file URL.
                    You can download the document and open it in the
                    appropriate application.
                  </p>

                  <button
                    className="material-action-button primary"
                    onClick={handleDownload}
                  >
                    <Download size={17} />
                    Download Document
                  </button>
                </>
              )}
            </div>
          )}

        {!isExternal &&
          !fileLoading &&
          !fileError &&
          fileUrl &&
          !isPdf &&
          !isImage &&
          !isVideo &&
          !isAudio &&
          !isOffice && (
            <div className="material-other-file">
              <FileText size={50} />
              <h3>{material.title || "Learning Material"}</h3>
              <p>
                This file type may not support browser preview.
                You can open or download the file.
              </p>

              <div className="material-other-actions">
                <button
                  className="material-action-button primary"
                  onClick={handleOpenFile}
                >
                  <ExternalLink size={17} />
                  Open File
                </button>

                <button
                  className="material-action-button"
                  onClick={handleDownload}
                >
                  <Download size={17} />
                  Download
                </button>
              </div>
            </div>
          )}
      </section>
    </div>
  );
}

export default StudentMaterial;