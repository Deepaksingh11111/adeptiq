from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.class_model import Class
from app.routes.auth import role_required


teacher_bp = Blueprint(
    "teacher",
    __name__,
    url_prefix="/api/teacher"
)


# =========================================================
# CREATE CLASS
# =========================================================

@teacher_bp.post("/classes")
@role_required("teacher")
def create_class():
    teacher_id = int(get_jwt_identity())

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    name = str(data.get("name", "")).strip()
    description = str(
        data.get("description", "")
    ).strip()

    if not name:
        return {
            "success": False,
            "message": "Class name is required"
        }, 400

    new_class = Class(
        name=name,
        description=description or None,
        teacher_id=teacher_id
    )

    db.session.add(new_class)
    db.session.commit()

    return {
        "success": True,
        "message": "Class created successfully",
        "class": new_class.to_dict()
    }, 201


# =========================================================
# GET ALL MY CLASSES
# =========================================================

@teacher_bp.get("/classes")
@role_required("teacher")
def get_my_classes():
    teacher_id = int(get_jwt_identity())

    classes = Class.query.filter_by(
        teacher_id=teacher_id
    ).order_by(
        Class.created_at.desc()
    ).all()

    return {
        "success": True,
        "count": len(classes),
        "classes": [
            class_item.to_dict()
            for class_item in classes
        ]
    }, 200


# =========================================================
# GET SINGLE CLASS
# =========================================================

@teacher_bp.get("/classes/<int:class_id>")
@role_required("teacher")
def get_class(class_id):
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

    return {
        "success": True,
        "class": class_item.to_dict()
    }, 200


# =========================================================
# UPDATE CLASS
# =========================================================

@teacher_bp.put("/classes/<int:class_id>")
@role_required("teacher")
def update_class(class_id):
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
                "message": "Class name cannot be empty"
            }, 400

        class_item.name = name

    if "description" in data:
        description = str(
            data.get("description", "")
        ).strip()

        class_item.description = (
            description or None
        )

    if "is_active" in data:
        class_item.is_active = bool(
            data.get("is_active")
        )

    db.session.commit()

    return {
        "success": True,
        "message": "Class updated successfully",
        "class": class_item.to_dict()
    }, 200


# =========================================================
# DELETE / DEACTIVATE CLASS
# =========================================================

@teacher_bp.delete("/classes/<int:class_id>")
@role_required("teacher")
def delete_class(class_id):
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

    # Soft delete
    class_item.is_active = False

    db.session.commit()

    return {
        "success": True,
        "message": "Class deactivated successfully"
    }, 200