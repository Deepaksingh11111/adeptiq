from datetime import datetime

from app.extensions import db


class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    quiz_type = db.Column(
        db.String(30),
        nullable=False
    )

    difficulty = db.Column(
        db.String(20),
        nullable=False,
        default="medium"
    )

    question_count = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    # Quiz time limit in minutes
    time_limit_minutes = db.Column(
        db.Integer,
        nullable=False,
        default=30
    )

    class_id = db.Column(
        db.Integer,
        db.ForeignKey("classes.id"),
        nullable=True
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False
    )

    topic_id = db.Column(
        db.Integer,
        db.ForeignKey("topics.id"),
        nullable=True
    )

    created_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    is_ai_generated = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    is_published = db.Column(
        db.Boolean,
        nullable=False,
        default=False
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

    class_obj = db.relationship(
        "Class",
        backref=db.backref("quizzes", lazy=True)
    )

    subject = db.relationship(
        "Subject",
        backref=db.backref("quizzes", lazy=True)
    )

    topic = db.relationship(
        "Topic",
        backref=db.backref("quizzes", lazy=True)
    )

    creator = db.relationship(
        "User",
        backref=db.backref("created_quizzes", lazy=True)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "quiz_type": self.quiz_type,
            "difficulty": self.difficulty,
            "question_count": self.question_count,
            "time_limit_minutes": self.time_limit_minutes,
            "class_id": self.class_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "created_by": self.created_by,
            "is_ai_generated": self.is_ai_generated,
            "is_published": self.is_published,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at else None
            )
        }