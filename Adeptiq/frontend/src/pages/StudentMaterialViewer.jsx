import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";


function StudentMaterialViewer() {

  const { materialId } = useParams();

  const navigate = useNavigate();


  // =====================================================
  // STATE
  // =====================================================

  const [material, setMaterial] =
    useState(null);

  const [fileUrl, setFileUrl] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =====================================================
  // LOAD MATERIAL
  // =====================================================

  const loadMaterial = async () => {

    let temporaryUrl = null;

    try {

      setLoading(true);

      setError("");


      // -------------------------------------------------
      // Get material information
      // -------------------------------------------------

      const materialResponse =
        await api.get(
          `/student/materials/${materialId}`
        );


      const materialData =
        materialResponse.data.material;


      setMaterial(
        materialData
      );


      // -------------------------------------------------
      // Get actual protected file
      // -------------------------------------------------

      const fileResponse =
        await api.get(
          `/student/materials/${materialId}/file`,
          {
            responseType: "blob",
          }
        );


      const contentType =
        fileResponse.headers[
          "content-type"
        ] ||
        "application/pdf";


      const blob =
        new Blob(
          [fileResponse.data],
          {
            type: contentType,
          }
        );


      temporaryUrl =
        window.URL.createObjectURL(
          blob
        );


      setFileUrl(
        temporaryUrl
      );


    } catch (error) {

      console.error(
        "MATERIAL VIEWER ERROR:",
        error
      );


      const status =
        error.response?.status;


      let message =
        error.response?.data?.message;


      /*
       * When responseType is blob,
       * backend error can also arrive as Blob.
       */

      if (
        !message &&
        error.response?.data instanceof Blob
      ) {

        try {

          const text =
            await error.response.data.text();


          if (text) {

            const parsed =
              JSON.parse(text);


            message =
              parsed.message;

          }

        } catch {

          // Ignore parsing errors.

        }

      }


      setError(
        message ||
          `Unable to open this material${
            status
              ? ` (HTTP ${status})`
              : ""
          }.`
      );


    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // LOAD ON PAGE OPEN
  // =====================================================

  useEffect(() => {

    loadMaterial();


    return () => {

      /*
       * Release the browser's temporary
       * Blob URL when leaving the page.
       */

      if (fileUrl) {

        window.URL.revokeObjectURL(
          fileUrl
        );

      }

    };

  }, [materialId]);


  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {

    navigate(-1);

  };


  // =====================================================
  // OPEN NEW TAB
  // =====================================================

  const openNewTab = () => {

    if (!fileUrl) {
      return;
    }


    window.open(
      fileUrl,
      "_blank",
      "noopener,noreferrer"
    );

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="student-material-viewer">


      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="material-viewer-header">


        <button
          className="viewer-back-button"
          onClick={handleBack}
        >

          <ArrowLeft
            size={18}
          />

          Back

        </button>


        <div className="viewer-title">

          <FileText
            size={20}
          />

          <div>

            <p className="inline-brand">
              <img src="/logo.png" alt="" /> <span>Adeptiq</span>
            </p>

            <h1>
              {material?.title ||
                "Learning Material"}
            </h1>

          </div>

        </div>


        {fileUrl && (

          <button
            className="viewer-new-tab-button"
            onClick={openNewTab}
          >

            <ExternalLink
              size={17}
            />

            Open in New Tab

          </button>

        )}


      </header>


      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="material-viewer-content">


        {/* ===============================================
            LOADING
        =============================================== */}

        {loading && (

          <div className="viewer-state">

            <Loader2
              size={36}
              className="loading-icon"
            />

            <h2>
              Opening material...
            </h2>

            <p>
              Please wait while the learning
              material is loaded.
            </p>

          </div>

        )}


        {/* ===============================================
            ERROR
        =============================================== */}

        {!loading && error && (

          <div className="viewer-state viewer-error">

            <AlertCircle
              size={42}
            />

            <h2>
              Unable to open material
            </h2>

            <p>
              {error}
            </p>

            <button
              className="viewer-retry-button"
              onClick={loadMaterial}
            >
              Try Again
            </button>

          </div>

        )}


        {/* ===============================================
            PDF VIEWER
        =============================================== */}

        {!loading &&
          !error &&
          fileUrl && (

            <div className="pdf-viewer-wrapper">

              <iframe
                src={fileUrl}
                title={
                  material?.title ||
                  "Learning Material"
                }
                className="pdf-viewer"
              />

            </div>

          )}


      </main>

    </div>

  );

}


export default StudentMaterialViewer;