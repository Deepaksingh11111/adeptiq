from flask import Blueprint

from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.class_model import Class
from app.models.class_student import ClassStudent
from app.models.subject import Subject
from app.routes.auth import role_required


student_subject_bp = Blueprint(
    "student_subject",
    __name__,
    url_prefix="/api/student"
)


# =========================================================
# CHECK STUDENT ENROLLMENT
# =========================================================

def is_student_enrolled(student_id, class_id):

    enrollment = ClassStudent.query.filter_by(
        student_id=student_id,
        class_id=class_id
    ).first()

    return enrollment is not None


# =========================================================
# GET SUBJECTS OF JOINED CLASS
# =========================================================

@student_subject_bp.get("/classes/<int:class_id>/subjects")
@role_required("student")
def get_class_subjects(class_id):

    student_id = int(
        get_jwt_identity()
    )

    # Check class
    class_item = Class.query.filter_by(
        id=class_id,
        is_active=True
    ).first()

    if not class_item:
        return {
            "success": False,
            "message": "Class not found"
        }, 404

    # Check enrollment
    if not is_student_enrolled(
        student_id,
        class_id
    ):
        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 403

    subjects = Subject.query.filter_by(
        class_id=class_id,
        is_active=True
    ).order_by(
        Subject.created_at.asc()
    ).all()

    return {
        "success": True,
        "class": {
            "id": class_item.id,
            "name": class_item.name,
            "description": class_item.description
        },
        "count": len(subjects),
        "subjects": [
            subject.to_dict()
            for subject in subjects
        ]
    }, 200


# =========================================================
# GET SINGLE SUBJECT
# =========================================================

@student_subject_bp.get("/subjects/<int:subject_id>")
@role_required("student")
def get_student_subject(subject_id):

    student_id = int(
        get_jwt_identity()
    )

    subject = Subject.query.filter_by(
        id=subject_id,
        is_active=True
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    # Student must be enrolled in subject's class
    if not is_student_enrolled(
        student_id,
        subject.class_id
    ):
        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 403

    return {
        "success": True,
        "subject": subject.to_dict()
    }, 200