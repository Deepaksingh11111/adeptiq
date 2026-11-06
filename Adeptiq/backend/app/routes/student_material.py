import os

from flask import Blueprint, current_app, send_from_directory
from flask_jwt_extended import get_jwt_identity

from app.models.class_student import ClassStudent
from app.models.material import Material
from app.models.subject import Subject
from app.models.topic import Topic
from app.routes.auth import role_required


student_material_bp = Blueprint(
    "student_material",
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
# GET MATERIALS OF A TOPIC
# =========================================================

@student_material_bp.get(
    "/topics/<int:topic_id>/materials"
)
@role_required("student")
def get_topic_materials(topic_id):

    student_id = int(
        get_jwt_identity()
    )

    # -----------------------------------------------------
    # Find topic
    # -----------------------------------------------------

    topic = Topic.query.filter_by(
        id=topic_id,
        is_active=True
    ).first()

    if not topic:

        return {
            "success": False,
            "message": "Topic not found"
        }, 404

    # -----------------------------------------------------
    # Find subject
    # -----------------------------------------------------

    subject = Subject.query.filter_by(
        id=topic.subject_id,
        is_active=True
    ).first()

    if not subject:

        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    # -----------------------------------------------------
    # Check enrollment
    # -----------------------------------------------------

    if not is_student_enrolled(
        student_id,
        subject.class_id
    ):

        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 403

    # -----------------------------------------------------
    # Get published materials
    # -----------------------------------------------------

    materials = Material.query.filter_by(
        topic_id=topic_id,
        is_published=True
    ).order_by(
        Material.created_at.desc()
    ).all()

    return {

        "success": True,

        "topic": {
            "id": topic.id,
            "name": topic.name,
            "description": topic.description
        },

        "subject": {
            "id": subject.id,
            "name": subject.name
        },

        "count": len(materials),

        "materials": [
            material.to_dict()
            for material in materials
        ]

    }, 200


# =========================================================
# GET SINGLE MATERIAL
# =========================================================

@student_material_bp.get(
    "/materials/<int:material_id>"
)
@role_required("student")
def get_student_material(material_id):

    student_id = int(
        get_jwt_identity()
    )

    # -----------------------------------------------------
    # Find published material
    # -----------------------------------------------------

    material = Material.query.filter_by(
        id=material_id,
        is_published=True
    ).first()

    if not material:

        return {
            "success": False,
            "message": "Material not found"
        }, 404

    # -----------------------------------------------------
    # Find subject
    # -----------------------------------------------------

    subject = Subject.query.filter_by(
        id=material.subject_id,
        is_active=True
    ).first()

    if not subject:

        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    # -----------------------------------------------------
    # Check enrollment
    # -----------------------------------------------------

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
        "material": material.to_dict()
    }, 200


# =========================================================
# SERVE MATERIAL FILE
# =========================================================

@student_material_bp.get(
    "/materials/<int:material_id>/file"
)
@role_required("student")
def serve_student_material_file(material_id):

    student_id = int(
        get_jwt_identity()
    )

    # -----------------------------------------------------
    # Find published material
    # -----------------------------------------------------

    material = Material.query.filter_by(
        id=material_id,
        is_published=True
    ).first()

    if not material:

        return {
            "success": False,
            "message": "Material not found"
        }, 404

    # -----------------------------------------------------
    # Find subject
    # -----------------------------------------------------

    subject = Subject.query.filter_by(
        id=material.subject_id,
        is_active=True
    ).first()

    if not subject:

        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    # -----------------------------------------------------
    # Check enrollment
    # -----------------------------------------------------

    if not is_student_enrolled(
        student_id,
        subject.class_id
    ):

        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 403

    # -----------------------------------------------------
    # Check file URL
    # -----------------------------------------------------

    if not material.file_url:

        return {
            "success": False,
            "message": "This material does not contain a file"
        }, 404

    prefix = "/api/teacher/uploads/"

    if not material.file_url.startswith(prefix):

        return {
            "success": False,
            "message": "Invalid material file"
        }, 400

    filename = material.file_url[
        len(prefix):
    ]

    if not filename:

        return {
            "success": False,
            "message": "Material file not found"
        }, 404

    # -----------------------------------------------------
    # Verify file exists
    # -----------------------------------------------------

    upload_folder = current_app.config[
        "UPLOAD_FOLDER"
    ]

    file_path = os.path.join(
        upload_folder,
        filename
    )

    if not os.path.isfile(file_path):

        return {
            "success": False,
            "message": "Material file is missing"
        }, 404

    # -----------------------------------------------------
    # Send file
    # -----------------------------------------------------

    return send_from_directory(
        upload_folder,
        filename
    )