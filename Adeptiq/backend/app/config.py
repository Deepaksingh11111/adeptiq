import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(
    os.path.dirname(__file__)
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)


class Config:

    # =====================================================
    # SECURITY
    # =====================================================

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "learnadapt-development-secret"
    )

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "learnadapt-jwt-development-secret"
    )

    # =====================================================
    # JWT
    # =====================================================

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=8
    )

    # =====================================================
    # DATABASE
    # =====================================================

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # =====================================================
    # GROQ AI CONFIGURATION
    # =====================================================

    GROQ_API_KEY = os.getenv(
        "GROQ_API_KEY"
    )

    GROQ_MODEL = os.getenv(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile"
    )

    # =====================================================
    # FILE UPLOAD
    # =====================================================

    UPLOAD_FOLDER = UPLOAD_FOLDER

    MAX_CONTENT_LENGTH = (
        100 * 1024 * 1024
    )