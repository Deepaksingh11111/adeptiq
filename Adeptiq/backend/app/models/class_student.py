from datetime import datetime

from app.extensions import db


class ClassStudent(db.Model):
    __tablename__ = "class_students"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    class_id = db.Column(
        db.Integer,
        db.ForeignKey("classes.id"),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    joined_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    class_obj = db.relationship(
        "Class",
        backref=db.backref(
            "students",
            lazy=True
        )
    )

    student = db.relationship(
        "User",
        backref=db.backref(
            "class_memberships",
            lazy=True
        )
    )

    __table_args__ = (
        db.UniqueConstraint(
            "class_id",
            "student_id",
            name="uq_class_student"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "class_id": self.class_id,
            "student_id": self.student_id,
            "joined_at": (
                self.joined_at.isoformat()
                if self.joined_at else None
            ),
            "is_active": self.is_active
        }