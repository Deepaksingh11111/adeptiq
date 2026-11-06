from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, migrate, jwt


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # =====================================================
    # IMPORT MODELS
    # =====================================================

    from app import models  # noqa: F401

    # =====================================================
    # IMPORT ROUTES
    # =====================================================

    from app.routes.auth import auth_bp
    from app.routes.teacher import teacher_bp
    from app.routes.subject import subject_bp
    from app.routes.topic import topic_bp
    from app.routes.material import material_bp

    from app.routes.student import student_bp
    from app.routes.student_subject import student_subject_bp
    from app.routes.student_topic import student_topic_bp
    from app.routes.student_material import student_material_bp
    from app.routes.student_quiz import student_quiz_bp

    from app.routes.teacher_quiz import teacher_quiz_bp

    # Phase 13 - Student Results & Performance
    from app.routes.student_result import student_result_bp

    # =====================================================
    # REGISTER BLUEPRINTS
    # =====================================================

    app.register_blueprint(auth_bp)

    # -----------------------------------------------------
    # Teacher routes
    # -----------------------------------------------------

    app.register_blueprint(teacher_bp)
    app.register_blueprint(subject_bp)
    app.register_blueprint(topic_bp)
    app.register_blueprint(material_bp)

    # -----------------------------------------------------
    # Student routes
    # -----------------------------------------------------

    app.register_blueprint(student_bp)
    app.register_blueprint(student_subject_bp)
    app.register_blueprint(student_topic_bp)
    app.register_blueprint(student_material_bp)
    app.register_blueprint(student_quiz_bp)

    # -----------------------------------------------------
    # Teacher Quiz routes
    # -----------------------------------------------------

    app.register_blueprint(teacher_quiz_bp)

    # -----------------------------------------------------
    # Student Result & Performance routes
    # -----------------------------------------------------

    app.register_blueprint(student_result_bp)

    # =====================================================
    # HEALTH
    # =====================================================

    @app.get("/api/health")
    def health():

        return {
            "success": True,
            "message": "LearnAdapt AI backend is running"
        }

    # =====================================================
    # DATABASE HEALTH
    # =====================================================

    @app.get("/api/db-health")
    def db_health():

        try:

            db.session.execute(
                db.text("SELECT 1")
            )

            return {
                "success": True,
                "message": "Database connection successful"
            }

        except Exception as e:

            return {
                "success": False,
                "message": "Database connection failed",
                "error": str(e)
            }, 500

    return app