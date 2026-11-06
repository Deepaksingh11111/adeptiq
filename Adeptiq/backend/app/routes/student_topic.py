from flask import Blueprint

from flask_jwt_extended import get_jwt_identity

from app.models.class_student import ClassStudent
from app.models.subject import Subject
from app.models.topic import Topic
from app.routes.auth import role_required


student_topic_bp = Blueprint(
    "student_topic",
    __name__,
    url_prefix="/api/student"
)


def is_student_enrolled(student_id, class_id):

    enrollment = ClassStudent.query.filter_by(
        student_id=student_id,
        class_id=class_id
    ).first()

    return enrollment is not None


# =========================================================
# GET TOPICS OF A SUBJECT
# =========================================================

@student_topic_bp.get("/subjects/<int:subject_id>/topics")
@role_required("student")
def get_subject_topics(subject_id):

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

    if not is_student_enrolled(
        student_id,
        subject.class_id
    ):
        return {
            "success": False,
            "message": "You are not enrolled in this class"
        }, 403

    topics = Topic.query.filter_by(
        subject_id=subject_id,
        is_active=True
    ).order_by(
        Topic.order_number.asc(),
        Topic.created_at.asc()
    ).all()

    return {
        "success": True,
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "description": subject.description,
            "class_id": subject.class_id
        },
        "count": len(topics),
        "topics": [
            topic.to_dict()
            for topic in topics
        ]
    }, 200


# =========================================================
# GET SINGLE TOPIC
# =========================================================

@student_topic_bp.get("/topics/<int:topic_id>")
@role_required("student")
def get_student_topic(topic_id):

    student_id = int(
        get_jwt_identity()
    )

    topic = Topic.query.filter_by(
        id=topic_id,
        is_active=True
    ).first()

    if not topic:
        return {
            "success": False,
            "message": "Topic not found"
        }, 404

    subject = Subject.query.filter_by(
        id=topic.subject_id,
        is_active=True
    ).first()

    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }, 404

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
        "topic": topic.to_dict()
    }, 200