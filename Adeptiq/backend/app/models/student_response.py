from datetime import datetime

from app.extensions import db


class StudentResponse(db.Model):
    __tablename__ = "student_responses"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    attempt_id = db.Column(
        db.Integer,
        db.ForeignKey("quiz_attempts.id"),
        nullable=False
    )

    question_id = db.Column(
        db.Integer,
        db.ForeignKey("quiz_questions.id"),
        nullable=False
    )

    selected_answer = db.Column(
        db.String(1),
        nullable=True
    )

    correct_answer = db.Column(
        db.String(1),
        nullable=False
    )

    is_correct = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    time_taken_seconds = db.Column(
        db.Integer,
        nullable=True
    )

    marks_obtained = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    answered_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    attempt = db.relationship(
        "QuizAttempt",
        backref=db.backref(
            "responses",
            lazy=True,
            cascade="all, delete-orphan"
        )
    )

    question = db.relationship(
        "QuizQuestion",
        backref=db.backref(
            "student_responses",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "question_id": self.question_id,
            "selected_answer": self.selected_answer,
            "correct_answer": self.correct_answer,
            "is_correct": self.is_correct,
            "time_taken_seconds": self.time_taken_seconds,
            "marks_obtained": self.marks_obtained,
            "answered_at": (
                self.answered_at.isoformat()
                if self.answered_at else None
            )
        }