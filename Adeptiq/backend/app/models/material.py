from datetime import datetime

from app.extensions import db


class Material(db.Model):
    __tablename__ = "materials"

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

    material_type = db.Column(
        db.String(30),
        nullable=False
    )

    file_url = db.Column(
        db.Text,
        nullable=True
    )

    external_url = db.Column(
        db.Text,
        nullable=True
    )

    class_id = db.Column(
        db.Integer,
        db.ForeignKey("classes.id"),
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
        nullable=True
    )

    uploaded_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    is_published = db.Column(
        db.Boolean,
        nullable=False,
        default=True
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
        backref=db.backref(
            "materials",
            lazy=True
        )
    )

    subject = db.relationship(
        "Subject",
        backref=db.backref(
            "materials",
            lazy=True
        )
    )

    topic = db.relationship(
        "Topic",
        backref=db.backref(
            "materials",
            lazy=True
        )
    )

    uploader = db.relationship(
        "User",
        backref=db.backref(
            "uploaded_materials",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "material_type": self.material_type,
            "file_url": self.file_url,
            "external_url": self.external_url,
            "class_id": self.class_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "uploaded_by": self.uploaded_by,
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