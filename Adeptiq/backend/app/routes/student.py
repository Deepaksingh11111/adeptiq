from flask import Blueprint

from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.class_model import Class
from app.models.class_student import ClassStudent
from app.routes.auth import role_required


student_bp = Blueprint(
    "student",
    __name__,
    url_prefix="/api/student"
)


# =========================================================
# GET AVAILABLE CLASSES
# =========================================================

@student_bp.get("/classes")
@role_required("student")
def get_available_classes():

    classes = Class.query.filter_by(
        is_active=True
    ).order_by(
        Class.created_at.desc()
    ).all()

    result = []

    for class_item in classes:

        result.append({
            "id": class_item.id,
            "name": class_item.name,
            "description": class_item.description,
            "teacher_id": class_item.teacher_id,
            "is_active": class_item.is_active,
            "created_at": class_item.created_at.isoformat()
            if class_item.created_at else None
        })

    return {
        "success": True,
        "count": len(result),
        "classes": result
    }, 200


# =========================================================
# JOIN CLASS
# =========================================================

@student_bp.post("/classes/<int:class_id>/join")
@role_required("student")
def join_class(class_id):

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

    # Check whether already joined
    existing = ClassStudent.query.filter_by(
        class_id=class_id,
        student_id=student_id
    ).first()

    if existing:
        return {
            "success": False,
            "message": "You have already joined this class"
        }, 409

    enrollment = ClassStudent(
        class_id=class_id,
        student_id=student_id
    )

    db.session.add(enrollment)
    db.session.commit()

    return {
        "success": True,
        "message": "Class joined successfully",
        "class": {
            "id": class_item.id,
            "name": class_item.name,
            "description": class_item.description
        }
    }, 201


# =========================================================
# GET JOINED CLASSES
# =========================================================

@student_bp.get("/classes/joined")
@role_required("student")
def get_joined_classes():

    student_id = int(
        get_jwt_identity()
    )

    enrollments = ClassStudent.query.filter_by(
        student_id=student_id
    ).all()

    result = []

    for enrollment in enrollments:

        class_item = Class.query.filter_by(
            id=enrollment.class_id,
            is_active=True
        ).first()

        if not class_item:
            continue

        result.append({
            "id": class_item.id,
            "name": class_item.name,
            "description": class_item.description,
            "teacher_id": class_item.teacher_id,
            "is_active": class_item.is_active,
            "joined_at": enrollment.joined_at.isoformat()
            if enrollment.joined_at else None
        })

    return {
        "success": True,
        "count": len(result),
        "classes": result
    }, 200


# =========================================================
# LEAVE CLASS
# =========================================================

@student_bp.delete("/classes/<int:class_id>/leave")
@role_required("student")
def leave_class(class_id):

    student_id = int(
        get_jwt_identity()
    )

    enrollment = ClassStudent.query.filter_by(
        class_id=class_id,
        student_id=student_id
    ).first()

    if not enrollment:
        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 404

    db.session.delete(enrollment)
    db.session.commit()

    return {
        "success": True,
        "message": "You have left the class successfully"
    }, 200