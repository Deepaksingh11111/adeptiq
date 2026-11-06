from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.class_model import Class
from app.models.subject import Subject
from app.routes.auth import role_required


subject_bp = Blueprint(
    "subject",
    __name__,
    url_prefix="/api/teacher"
)


# =========================================================
# CREATE SUBJECT
# =========================================================

@subject_bp.post("/classes/<int:class_id>/subjects")
@role_required("teacher")
def create_subject(class_id):
    teacher_id = int(get_jwt_identity())

    # Check that class belongs to logged-in teacher
    class_item = Class.query.filter_by(
        id=class_id,
        teacher_id=teacher_id,
        is_active=True
    ).first()

    if not class_item:
        return {
            "success": False,
            "message": "Class not found"
        }, 404

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    name = str(
        data.get("name", "")
    ).strip()

    description = str(
        data.get("description", "")
    ).strip()

    if not name:
        return {
            "success": False,
            "message": "Subject name is required"
        }, 400

    # Prevent duplicate subject in same class
    existing_subject = Subject.query.filter_by(
        class_id=class_id,
        name=name
    ).first()

    if existing_subject:
        return {
            "success": False,
            "message": "Subject already exists in this class"
        }, 409

    subject = Subject(
        name=name,
        description=description or None,
        class_id=class_id,
        created_by=teacher_id
    )

    db.session.add(subject)
    db.session.commit()

    return {
        "success": True,
        "message": "Subject created successfully",
        "subject": subject.to_dict()
    }, 201


# =========================================================
# GET SUBJECTS OF A CLASS
# =========================================================

@subject_bp.get("/classes/<int:class_id>/subjects")
@role_required("teacher")
def get_class_subjects(class_id):
    teacher_id = int(get_jwt_identity())

    class_item = Class.query.filter_by(
        id=class_id,
        teacher_id=teacher_id
    ).first()

    if not class_item:
        return {
            "success": False,
            "message": "Class not found"
        }, 404

    subjects = Subject.query.filter_by(
        class_id=class_id,
        is_active=True
    ).order_by(
        Subject.name.asc()
    ).all()

    return {
        "success": True,
        "class_id": class_id,
        "count": len(subjects),
        "subjects": [
            subject.to_dict()
            for subject in subjects
        ]
    }, 200


# =========================================================
# GET SINGLE SUBJECT
# =========================================================

@subject_bp.get("/subjects/<int:subject_id>")
@role_required("teacher")
def get_subject(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.join(
        Class,
        Subject.class_id == Class.id
    ).filter(
        Subject.id == subject_id,
        Class.teacher_id == teacher_id
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    return {
        "success": True,
        "subject": subject.to_dict()
    }, 200


# =========================================================
# UPDATE SUBJECT
# =========================================================

@subject_bp.put("/subjects/<int:subject_id>")
@role_required("teacher")
def update_subject(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.join(
        Class,
        Subject.class_id == Class.id
    ).filter(
        Subject.id == subject_id,
        Class.teacher_id == teacher_id
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    if "name" in data:
        name = str(
            data.get("name", "")
        ).strip()

        if not name:
            return {
                "success": False,
                "message": "Subject name cannot be empty"
            }, 400

        duplicate = Subject.query.filter(
            Subject.class_id == subject.class_id,
            Subject.name == name,
            Subject.id != subject.id
        ).first()

        if duplicate:
            return {
                "success": False,
                "message": "Another subject with this name already exists"
            }, 409

        subject.name = name

    if "description" in data:
        description = str(
            data.get("description", "")
        ).strip()

        subject.description = (
            description or None
        )

    if "is_active" in data:
        subject.is_active = bool(
            data.get("is_active")
        )

    db.session.commit()

    return {
        "success": True,
        "message": "Subject updated successfully",
        "subject": subject.to_dict()
    }, 200


# =========================================================
# DEACTIVATE SUBJECT
# =========================================================

@subject_bp.delete("/subjects/<int:subject_id>")
@role_required("teacher")
def delete_subject(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.join(
        Class,
        Subject.class_id == Class.id
    ).filter(
        Subject.id == subject_id,
        Class.teacher_id == teacher_id
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    subject.is_active = False

    db.session.commit()

    return {
        "success": True,
        "message": "Subject deactivated successfully"
    }, 200