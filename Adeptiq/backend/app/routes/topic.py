from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.subject import Subject
from app.models.topic import Topic
from app.routes.auth import role_required


topic_bp = Blueprint(
    "topic",
    __name__,
    url_prefix="/api/teacher"
)


@topic_bp.post("/subjects/<int:subject_id>/topics")
@role_required("teacher")
def create_topic(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        created_by=teacher_id,
        is_active=True
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

    name = str(
        data.get("name", "")
    ).strip()

    description = str(
        data.get("description", "")
    ).strip()

    order_number = data.get(
        "order_number",
        0
    )

    if not name:
        return {
            "success": False,
            "message": "Topic name is required"
        }, 400

    try:
        order_number = int(order_number)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Order number must be an integer"
        }, 400

    existing_topic = Topic.query.filter_by(
        subject_id=subject_id,
        name=name
    ).first()

    if existing_topic:
        return {
            "success": False,
            "message": "Topic already exists in this subject"
        }, 409

    topic = Topic(
        name=name,
        description=description or None,
        subject_id=subject_id,
        created_by=teacher_id,
        order_number=order_number
    )

    db.session.add(topic)
    db.session.commit()

    return {
        "success": True,
        "message": "Topic created successfully",
        "topic": topic.to_dict()
    }, 201


@topic_bp.get("/subjects/<int:subject_id>/topics")
@role_required("teacher")
def get_subject_topics(subject_id):
    teacher_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        created_by=teacher_id,
        is_active=True
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

    topics = Topic.query.filter_by(
        subject_id=subject_id,
        is_active=True
    ).order_by(
        Topic.order_number.asc(),
        Topic.id.asc()
    ).all()

    return {
        "success": True,
        "subject_id": subject_id,
        "count": len(topics),
        "topics": [
            topic.to_dict()
            for topic in topics
        ]
    }, 200


@topic_bp.get("/topics/<int:topic_id>")
@role_required("teacher")
def get_topic(topic_id):
    teacher_id = int(get_jwt_identity())

    topic = Topic.query.join(
        Subject,
        Topic.subject_id == Subject.id
    ).filter(
        Topic.id == topic_id,
        Subject.created_by == teacher_id
    ).first()

    if not topic:
        return {
            "success": False,
            "message": "Topic not found"
        }, 404

    return {
        "success": True,
        "topic": topic.to_dict()
    }, 200


@topic_bp.put("/topics/<int:topic_id>")
@role_required("teacher")
def update_topic(topic_id):
    teacher_id = int(get_jwt_identity())

    topic = Topic.query.join(
        Subject,
        Topic.subject_id == Subject.id
    ).filter(
        Topic.id == topic_id,
        Subject.created_by == teacher_id
    ).first()

    if not topic:
        return {
            "success": False,
            "message": "Topic not found"
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
                "message": "Topic name cannot be empty"
            }, 400

        duplicate = Topic.query.filter(
            Topic.subject_id == topic.subject_id,
            Topic.name == name,
            Topic.id != topic.id
        ).first()

        if duplicate:
            return {
                "success": False,
                "message": "Another topic with this name already exists"
            }, 409

        topic.name = name

    if "description" in data:
        description = str(
            data.get("description", "")
        ).strip()

        topic.description = (
            description or None
        )

    if "order_number" in data:
        try:
            topic.order_number = int(
                data.get("order_number")
            )
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Order number must be an integer"
            }, 400

    if "is_active" in data:
        topic.is_active = bool(
            data.get("is_active")
        )

    db.session.commit()

    return {
        "success": True,
        "message": "Topic updated successfully",
        "topic": topic.to_dict()
    }, 200


@topic_bp.delete("/topics/<int:topic_id>")
@role_required("teacher")
def delete_topic(topic_id):
    teacher_id = int(get_jwt_identity())

    topic = Topic.query.join(
        Subject,
        Topic.subject_id == Subject.id
    ).filter(
        Topic.id == topic_id,
        Subject.created_by == teacher_id
    ).first()

    if not topic:
        return {
            "success": False,
            "message": "Topic not found"
        }, 404

    topic.is_active = False

    db.session.commit()

    return {
        "success": True,
        "message": "Topic deactivated successfully"
    }, 200