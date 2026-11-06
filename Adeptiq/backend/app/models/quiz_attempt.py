from datetime import datetime

from app.extensions import db


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id"),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    total_questions = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    attempted_questions = db.Column(
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

    skipped_questions = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    score = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    accuracy = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    time_taken_seconds = db.Column(
        db.Integer,
        nullable=True
    )

    started_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    completed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="in_progress"
    )

    quiz = db.relationship(
        "Quiz",
        backref=db.backref(
            "attempts",
            lazy=True
        )
    )

    student = db.relationship(
        "User",
        backref=db.backref(
            "quiz_attempts",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "student_id": self.student_id,
            "total_questions": self.total_questions,
            "attempted_questions": self.attempted_questions,
            "correct_answers": self.correct_answers,
            "wrong_answers": self.wrong_answers,
            "skipped_questions": self.skipped_questions,
            "score": self.score,
            "accuracy": self.accuracy,
            "time_taken_seconds": self.time_taken_seconds,
            "started_at": (
                self.started_at.isoformat()
                if self.started_at else None
            ),
            "completed_at": (
                self.completed_at.isoformat()
                if self.completed_at else None
            ),
            "status": self.status
        }