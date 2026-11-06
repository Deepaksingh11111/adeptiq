from datetime import datetime

from app.extensions import db


class LearningSession(db.Model):
    __tablename__ = "learning_sessions"

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

    session_type = db.Column(
        db.String(30),
        nullable=False,
        default="study"
    )

    started_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    ended_at = db.Column(
        db.DateTime,
        nullable=True
    )

    duration_seconds = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    student = db.relationship(
        "User",
        backref=db.backref(
            "learning_sessions",
            lazy=True
        )
    )

    subject = db.relationship(
        "Subject",
        backref=db.backref(
            "learning_sessions",
            lazy=True
        )
    )

    topic = db.relationship(
        "Topic",
        backref=db.backref(
            "learning_sessions",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "session_type": self.session_type,
            "started_at": (
                self.started_at.isoformat()
                if self.started_at else None
            ),
            "ended_at": (
                self.ended_at.isoformat()
                if self.ended_at else None
            ),
            "duration_seconds": self.duration_seconds
        }