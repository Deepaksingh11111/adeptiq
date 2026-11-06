from datetime import datetime

from app.extensions import db


class QuizQuestion(db.Model):
    __tablename__ = "quiz_questions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id"),
        nullable=False
    )

    question_text = db.Column(
        db.Text,
        nullable=False
    )

    option_a = db.Column(
        db.Text,
        nullable=False
    )

    option_b = db.Column(
        db.Text,
        nullable=False
    )

    option_c = db.Column(
        db.Text,
        nullable=False
    )

    option_d = db.Column(
        db.Text,
        nullable=False
    )

    correct_answer = db.Column(
        db.String(1),
        nullable=False
    )

    explanation = db.Column(
        db.Text,
        nullable=True
    )

    marks = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )

    order_number = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    quiz = db.relationship(
        "Quiz",
        backref=db.backref(
            "questions",
            lazy=True,
            cascade="all, delete-orphan"
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "question_text": self.question_text,
            "options": {
                "A": self.option_a,
                "B": self.option_b,
                "C": self.option_c,
                "D": self.option_d
            },
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "marks": self.marks,
            "order_number": self.order_number,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }