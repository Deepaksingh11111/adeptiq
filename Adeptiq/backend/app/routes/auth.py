from functools import wraps

from flask import Blueprint, request

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from app.extensions import db
from app.models.user import User


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# =========================================================
# ROLE-BASED ACCESS DECORATOR
# =========================================================

def role_required(required_role):
    def decorator(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()

            user_role = claims.get("role")

            if user_role != required_role:
                return {
                    "success": False,
                    "message": "Access denied"
                }, 403

            return func(*args, **kwargs)

        return wrapper

    return decorator


# =========================================================
# REGISTER
# =========================================================

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(
        data.get("role", "student")
    ).strip().lower()

    # Validate name
    if not name:
        return {
            "success": False,
            "message": "Name is required"
        }, 400

    # Validate email
    if not email:
        return {
            "success": False,
            "message": "Email is required"
        }, 400

    # Validate password
    if not password:
        return {
            "success": False,
            "message": "Password is required"
        }, 400

    if len(password) < 6:
        return {
            "success": False,
            "message": "Password must be at least 6 characters"
        }, 400

    # Validate role
    if role not in ["student", "teacher"]:
        return {
            "success": False,
            "message": "Role must be student or teacher"
        }, 400

    # Check existing user
    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:
        return {
            "success": False,
            "message": "Email already registered"
        }, 409

    # Create user
    user = User(
        name=name,
        email=email,
        role=role
    )

    # Hash password
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return {
        "success": True,
        "message": "Registration successful",
        "user": user.to_dict()
    }, 201


# =========================================================
# LOGIN
# =========================================================

@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    # Validate email
    if not email:
        return {
            "success": False,
            "message": "Email is required"
        }, 400

    # Validate password
    if not password:
        return {
            "success": False,
            "message": "Password is required"
        }, 400

    # Find user
    user = User.query.filter_by(
        email=email
    ).first()

    # Invalid email
    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    # Invalid password
    if not user.check_password(password):
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    # Inactive account
    if not user.is_active:
        return {
            "success": False,
            "message": "Account is inactive"
        }, 403

    # Create JWT
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name
        }
    )

    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict()
    }, 200


# =========================================================
# CURRENT LOGGED-IN USER
# =========================================================

@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    user = User.query.get(
        int(user_id)
    )

    if not user:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    if not user.is_active:
        return {
            "success": False,
            "message": "Account is inactive"
        }, 403

    return {
        "success": True,
        "user": user.to_dict()
    }, 200


# =========================================================
# STUDENT TEST API
# =========================================================

@auth_bp.get("/student-test")
@role_required("student")
def student_test():
    return {
        "success": True,
        "message": "Student access granted"
    }, 200


# =========================================================
# TEACHER TEST API
# =========================================================

@auth_bp.get("/teacher-test")
@role_required("teacher")
def teacher_test():
    return {
        "success": True,
        "message": "Teacher access granted"
    }, 200