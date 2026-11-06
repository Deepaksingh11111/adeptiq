import os
import uuid

from urllib.parse import urlparse

from flask import (
    Blueprint,
    request,
    current_app,
    send_from_directory,
)
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.material import Material
from app.routes.auth import role_required


material_bp = Blueprint(
    "material",
    __name__,
    url_prefix="/api/teacher",
)


ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx",
    "ppt", "pptx",
    "xls", "xlsx",
    "png", "jpg", "jpeg", "gif", "webp",
    "mp4", "webm", "mov",
}


EXTENSION_TO_TYPE = {
    "pdf": "pdf",
    "doc": "doc",
    "docx": "docx",
    "ppt": "ppt",
    "pptx": "pptx",
    "xls": "xls",
    "xlsx": "xlsx",
    "png": "image",
    "jpg": "image",
    "jpeg": "image",
    "gif": "image",
    "webp": "image",
    "mp4": "video",
    "webm": "video",
    "mov": "video",
}


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def valid_external_url(value):
    """Allow only HTTP and HTTPS external resources."""
    try:
        parsed = urlparse(value.strip())

        return (
            parsed.scheme in ("http", "https")
            and bool(parsed.netloc)
        )
    except (AttributeError, ValueError):
        return False


def get_teacher_material(material_id, teacher_id):
    return (
        Material.query
        .join(Subject, Material.subject_id == Subject.id)
        .filter(
            Material.id == material_id,
            Subject.created_by == teacher_id,
        )
        .first()
    )


def get_teacher_topic(topic_id, teacher_id):
    return (
        Topic.query
        .join(Subject, Topic.subject_id == Subject.id)
        .filter(
            Topic.id == topic_id,
            Topic.created_by == teacher_id,
            Subject.is_active.is_(True),
            Topic.is_active.is_(True),
        )
        .first()
    )


def serialize_material(material):
    result = material.to_dict()

    # Include a usable original filename for the frontend.
    if material.file_url:
        result["original_filename"] = (
            material.file_url.rsplit("/", 1)[-1]
        )
    else:
        result["original_filename"] = None

    return result


# =========================================================
# UPLOAD A FILE TO A SUBJECT, OPTIONALLY LINKED TO A TOPIC
# =========================================================

@material_bp.post("/subjects/<int:subject_id>/materials/upload")
@role_required("teacher")
def upload_material(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        created_by=teacher_id,
        is_active=True,
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found",
        }, 404

    uploaded_file = request.files.get("file")

    if not uploaded_file or not uploaded_file.filename:
        return {
            "success": False,
            "message": "Please select a file",
        }, 400

    if not allowed_file(uploaded_file.filename):
        return {
            "success": False,
            "message": "This file type is not allowed",
        }, 400

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    topic_id = request.form.get("topic_id", "").strip()

    if not title:
        title = os.path.splitext(
            secure_filename(uploaded_file.filename)
        )[0].strip()

    if topic_id:
        try:
            topic_id = int(topic_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Topic ID must be an integer",
            }, 400

        topic = Topic.query.filter_by(
            id=topic_id,
            subject_id=subject_id,
            created_by=teacher_id,
            is_active=True,
        ).first()

        if not topic:
            return {
                "success": False,
                "message": "Topic not found in this subject",
            }, 404
    else:
        topic_id = None

    original_filename = secure_filename(
        uploaded_file.filename
    )

    extension = original_filename.rsplit(".", 1)[1].lower()
    material_type = EXTENSION_TO_TYPE[extension]

    unique_filename = (
        f"{uuid.uuid4().hex}_{original_filename}"
    )

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(
        upload_folder,
        unique_filename,
    )

    try:
        uploaded_file.save(file_path)

        material = Material(
            title=title,
            description=description or None,
            material_type=material_type,
            file_url=f"/api/teacher/uploads/{unique_filename}",
            external_url=None,
            class_id=subject.class_id,
            subject_id=subject_id,
            topic_id=topic_id,
            uploaded_by=teacher_id,
            is_published=True,
        )

        db.session.add(material)
        db.session.commit()

    except Exception:
        db.session.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        current_app.logger.exception(
            "Failed to upload learning material"
        )

        return {
            "success": False,
            "message": "Failed to save material",
        }, 500

    return {
        "success": True,
        "message": "File uploaded successfully",
        "material": serialize_material(material),
    }, 201


# =========================================================
# CREATE AN EXTERNAL LEARNING LINK
# =========================================================

@material_bp.post("/subjects/<int:subject_id>/materials/link")
@role_required("teacher")
def create_material_link(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        created_by=teacher_id,
        is_active=True,
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found",
        }, 404

    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    external_url = str(data.get("external_url", "")).strip()
    topic_id = data.get("topic_id")

    if not title:
        return {
            "success": False,
            "message": "Material title is required",
        }, 400

    if not valid_external_url(external_url):
        return {
            "success": False,
            "message": "Please provide a valid HTTP or HTTPS URL",
        }, 400

    if topic_id not in (None, ""):
        try:
            topic_id = int(topic_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Topic ID must be an integer",
            }, 400

        topic = Topic.query.filter_by(
            id=topic_id,
            subject_id=subject_id,
            created_by=teacher_id,
            is_active=True,
        ).first()

        if not topic:
            return {
                "success": False,
                "message": "Topic not found in this subject",
            }, 404
    else:
        topic_id = None

    material = Material(
        title=title,
        description=description or None,
        material_type="link",
        file_url=None,
        external_url=external_url,
        class_id=subject.class_id,
        subject_id=subject_id,
        topic_id=topic_id,
        uploaded_by=teacher_id,
        is_published=True,
    )

    try:
        db.session.add(material)
        db.session.commit()
    except Exception:
        db.session.rollback()

        current_app.logger.exception(
            "Failed to save external learning link"
        )

        return {
            "success": False,
            "message": "Failed to save learning link",
        }, 500

    return {
        "success": True,
        "message": "Learning link added successfully",
        "material": serialize_material(material),
    }, 201


# =========================================================
# LIST MATERIALS FOR A TOPIC
# =========================================================

@material_bp.get("/topics/<int:topic_id>/materials")
@role_required("teacher")
def get_topic_materials(topic_id):
    teacher_id = int(get_jwt_identity())

    topic = get_teacher_topic(topic_id, teacher_id)

    if not topic:
        return {
            "success": False,
            "message": "Topic not found",
        }, 404

    materials = (
        Material.query
        .filter_by(
            topic_id=topic_id,
            subject_id=topic.subject_id,
            is_published=True,
        )
        .order_by(Material.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "topic": topic.to_dict(),
        "count": len(materials),
        "materials": [
            serialize_material(material)
            for material in materials
        ],
    }, 200


# =========================================================
# SERVE UPLOADED FILES TO THE TEACHER WHO OWNS THEM
# =========================================================

@material_bp.get("/uploads/<path:filename>")
@role_required("teacher")
def serve_uploaded_file(filename):
    teacher_id = int(get_jwt_identity())

    material = (
        Material.query
        .join(Subject, Material.subject_id == Subject.id)
        .filter(
            Material.file_url.endswith("/" + filename),
            Subject.created_by == teacher_id,
        )
        .first()
    )

    if not material:
        return {
            "success": False,
            "message": "File not found",
        }, 404

    upload_folder = current_app.config["UPLOAD_FOLDER"]

    return send_from_directory(
        upload_folder,
        filename,
        as_attachment=False,
    )


# =========================================================
# LIST MATERIALS FOR A SUBJECT
# =========================================================

@material_bp.get("/subjects/<int:subject_id>/materials")
@role_required("teacher")
def get_subject_materials(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        created_by=teacher_id,
        is_active=True,
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found",
        }, 404

    materials = (
        Material.query
        .filter_by(
            subject_id=subject_id,
            is_published=True,
        )
        .order_by(Material.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "subject_id": subject_id,
        "count": len(materials),
        "materials": [
            serialize_material(material)
            for material in materials
        ],
    }, 200


# =========================================================
# GET ONE MATERIAL
# =========================================================

@material_bp.get("/materials/<int:material_id>")
@role_required("teacher")
def get_material(material_id):
    teacher_id = int(get_jwt_identity())

    material = get_teacher_material(
        material_id,
        teacher_id,
    )

    if not material:
        return {
            "success": False,
            "message": "Material not found",
        }, 404

    return {
        "success": True,
        "material": serialize_material(material),
    }, 200


# =========================================================
# UPDATE A MATERIAL
# =========================================================

@material_bp.put("/materials/<int:material_id>")
@role_required("teacher")
def update_material(material_id):
    teacher_id = int(get_jwt_identity())

    material = get_teacher_material(
        material_id,
        teacher_id,
    )

    if not material:
        return {
            "success": False,
            "message": "Material not found",
        }, 404

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required",
        }, 400

    if "title" in data:
        title = str(data.get("title", "")).strip()

        if not title:
            return {
                "success": False,
                "message": "Material title cannot be empty",
            }, 400

        material.title = title

    if "description" in data:
        description = str(data.get("description", "")).strip()
        material.description = description or None

    if "is_published" in data:
        value = data["is_published"]

        if not isinstance(value, bool):
            return {
                "success": False,
                "message": "is_published must be true or false",
            }, 400

        material.is_published = value

    db.session.commit()

    return {
        "success": True,
        "message": "Material updated successfully",
        "material": serialize_material(material),
    }, 200


# =========================================================
# UNPUBLISH A MATERIAL
# =========================================================

@material_bp.delete("/materials/<int:material_id>")
@role_required("teacher")
def delete_material(material_id):
    teacher_id = int(get_jwt_identity())

    material = get_teacher_material(
        material_id,
        teacher_id,
    )

    if not material:
        return {
            "success": False,
            "message": "Material not found",
        }, 404

    material.is_published = False
    db.session.commit()

    return {
        "success": True,
        "message": "Material unpublished successfully",
    }, 200