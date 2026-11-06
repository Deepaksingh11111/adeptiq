from app.routes.auth import auth_bp
from app.routes.teacher import teacher_bp
from app.routes.subject import subject_bp
from app.routes.topic import topic_bp
from app.routes.material import material_bp


__all__ = [
    "auth_bp",
    "teacher_bp",
    "subject_bp",
    "topic_bp",
    "material_bp"
]