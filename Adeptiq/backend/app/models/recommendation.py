from datetime import datetime

from app.extensions import db


class Recommendation(db.Model):
    __tablename__ = "recommendations"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    topic_id = db.Column(
        db.Integer,
        db.ForeignKey("topics.id"),
        nullable=True
    )

    recommendation_type = db.Column(
        db.String(30),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    difficulty = db.Column(
        db.String(20),
        nullable=True
    )

    resource_url = db.Column(
        db.Text,
        nullable=True
    )

    is_completed = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    student = db.relationship(
        "User",
        backref=db.backref(
            "recommendations",
            lazy=True
        )
    )

    subject = db.relationship(
        "Subject",
        backref=db.backref(
            "recommendations",
            lazy=True
        )
    )

    topic = db.relationship(
        "Topic",
        backref=db.backref(
            "recommendations",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "recommendation_type": self.recommendation_type,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "resource_url": self.resource_url,
            "is_completed": self.is_completed,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }