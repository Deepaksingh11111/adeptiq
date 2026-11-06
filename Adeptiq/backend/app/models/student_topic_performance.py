from datetime import datetime

from app.extensions import db


class StudentTopicPerformance(db.Model):
    __tablename__ = "student_topic_performance"

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
        nullable=False
    )

    topic_id = db.Column(
        db.Integer,
        db.ForeignKey("topics.id"),
        nullable=False
    )

    total_attempts = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    total_questions = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    correct_answers = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    wrong_answers = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    accuracy = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    average_time_seconds = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    mastery_score = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    current_level = db.Column(
        db.String(20),
        nullable=False,
        default="beginner"
    )

    last_attempt_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    student = db.relationship(
        "User",
        backref=db.backref(
            "topic_performances",
            lazy=True
        )
    )

    subject = db.relationship(
        "Subject",
        backref=db.backref(
            "student_performances",
            lazy=True
        )
    )

    topic = db.relationship(
        "Topic",
        backref=db.backref(
            "student_performances",
            lazy=True
        )
    )

    __table_args__ = (
        db.UniqueConstraint(
            "student_id",
            "subject_id",
            "topic_id",
            name="uq_student_subject_topic_performance"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "total_attempts": self.total_attempts,
            "total_questions": self.total_questions,
            "correct_answers": self.correct_answers,
            "wrong_answers": self.wrong_answers,
            "accuracy": self.accuracy,
            "average_time_seconds": self.average_time_seconds,
            "mastery_score": self.mastery_score,
            "current_level": self.current_level,
            "last_attempt_at": (
                self.last_attempt_at.isoformat()
                if self.last_attempt_at else None
            ),
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at else None
            )
        }