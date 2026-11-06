from flask import Blueprint, request, current_app
from flask_jwt_extended import get_jwt_identity

from app.extensions import db

from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.topic import Topic

from app.routes.auth import role_required

import json
from groq import Groq


teacher_quiz_bp = Blueprint(
    "teacher_quiz",
    __name__,
    url_prefix="/api/teacher"
)


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_teacher_id():
    return int(get_jwt_identity())


def get_teacher_class(teacher_id, class_id):
    return Class.query.filter_by(
        id=class_id,
        teacher_id=teacher_id,
        is_active=True
    ).first()


def get_teacher_subject(teacher_id, subject_id):
    subject = Subject.query.filter_by(
        id=subject_id,
        is_active=True
    ).first()

    if not subject:
        return None

    class_item = get_teacher_class(
        teacher_id,
        subject.class_id
    )

    if not class_item:
        return None

    return subject


def get_teacher_topic(teacher_id, topic_id):
    topic = Topic.query.filter_by(
        id=topic_id,
        is_active=True
    ).first()

    if not topic:
        return None

    subject = get_teacher_subject(
        teacher_id,
        topic.subject_id
    )

    if not subject:
        return None

    return topic


def validate_time_limit(value):
    """
    Validates quiz duration in minutes.
    Allowed range: 1 to 180 minutes.
    """

    if isinstance(value, bool):
        raise ValueError(
            "Time limit must be a whole number of minutes"
        )

    try:
        if isinstance(value, float) and not value.is_integer():
            raise ValueError

        if isinstance(value, str):
            value = value.strip()

            if not value or not value.isdigit():
                raise ValueError

        minutes = int(value)

    except (TypeError, ValueError):
        raise ValueError(
            "Time limit must be a whole number of minutes"
        )

    if not 1 <= minutes <= 180:
        raise ValueError(
            "Time limit must be between 1 and 180 minutes"
        )

    return minutes


# =====================================================
# CREATE MANUAL QUIZ
# =====================================================

@teacher_quiz_bp.post("/quizzes")
@role_required("teacher")
def create_quiz():

    teacher_id = get_teacher_id()
    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()

    quiz_type = str(
        data.get("quiz_type", "teacher")
    ).strip().lower()

    difficulty = str(
        data.get("difficulty", "medium")
    ).strip().lower()

    class_id = data.get("class_id")
    subject_id = data.get("subject_id")
    topic_id = data.get("topic_id")

    try:
        time_limit_minutes = validate_time_limit(
            data.get("time_limit_minutes", 30)
        )
    except ValueError as error:
        return {
            "success": False,
            "message": str(error)
        }, 400

    if not title:
        return {
            "success": False,
            "message": "Quiz title is required"
        }, 400

    if not subject_id:
        return {
            "success": False,
            "message": "Subject is required"
        }, 400

    if difficulty not in ["easy", "medium", "hard"]:
        return {
            "success": False,
            "message": "Difficulty must be easy, medium or hard"
        }, 400

    try:
        subject_id = int(subject_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Invalid subject_id"
        }, 400

    subject = get_teacher_subject(
        teacher_id,
        subject_id
    )

    if not subject:
        return {
            "success": False,
            "message": "Subject not found or access denied"
        }, 404

    actual_class_id = subject.class_id

    if class_id is not None:
        try:
            class_id = int(class_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Invalid class_id"
            }, 400

        if class_id != actual_class_id:
            return {
                "success": False,
                "message": "Selected class does not belong to the subject"
            }, 400

    if topic_id is not None:
        try:
            topic_id = int(topic_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Invalid topic_id"
            }, 400

        topic = get_teacher_topic(
            teacher_id,
            topic_id
        )

        if not topic:
            return {
                "success": False,
                "message": "Topic not found or access denied"
            }, 404

        if topic.subject_id != subject.id:
            return {
                "success": False,
                "message": "Topic does not belong to selected subject"
            }, 400

    quiz = Quiz(
        title=title,
        description=description or None,
        quiz_type=quiz_type or "teacher",
        difficulty=difficulty,
        question_count=0,
        time_limit_minutes=time_limit_minutes,
        class_id=actual_class_id,
        subject_id=subject.id,
        topic_id=topic_id,
        created_by=teacher_id,
        is_ai_generated=False,
        is_published=False
    )

    try:
        db.session.add(quiz)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Creating manual quiz failed")

        return {
            "success": False,
            "message": "Failed to create quiz"
        }, 500

    return {
        "success": True,
        "message": "Quiz created successfully",
        "quiz": quiz.to_dict()
    }, 201


# =====================================================
# GET MY QUIZZES
# =====================================================

@teacher_quiz_bp.get("/quizzes")
@role_required("teacher")
def get_my_quizzes():

    teacher_id = get_teacher_id()

    quizzes = Quiz.query.filter_by(
        created_by=teacher_id
    ).order_by(
        Quiz.created_at.desc()
    ).all()

    return {
        "success": True,
        "count": len(quizzes),
        "quizzes": [
            quiz.to_dict()
            for quiz in quizzes
        ]
    }, 200


# =====================================================
# GET SINGLE QUIZ
# =====================================================

@teacher_quiz_bp.get("/quizzes/<int:quiz_id>")
@role_required("teacher")
def get_quiz(quiz_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    questions = QuizQuestion.query.filter_by(
        quiz_id=quiz.id
    ).order_by(
        QuizQuestion.order_number.asc(),
        QuizQuestion.id.asc()
    ).all()

    quiz_data = quiz.to_dict()

    quiz_data["questions"] = [
        question.to_dict()
        for question in questions
    ]

    return {
        "success": True,
        "quiz": quiz_data
    }, 200


# =====================================================
# UPDATE QUIZ
# =====================================================

@teacher_quiz_bp.put("/quizzes/<int:quiz_id>")
@role_required("teacher")
def update_quiz(quiz_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Published quiz cannot be edited"
        }, 400

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    if "title" in data:
        title = str(data.get("title", "")).strip()

        if not title:
            return {
                "success": False,
                "message": "Quiz title cannot be empty"
            }, 400

        quiz.title = title

    if "description" in data:
        description = str(data.get("description", "")).strip()
        quiz.description = description or None

    if "difficulty" in data:
        difficulty = str(data.get("difficulty", "")).strip().lower()

        if difficulty not in ["easy", "medium", "hard"]:
            return {
                "success": False,
                "message": "Invalid difficulty"
            }, 400

        quiz.difficulty = difficulty

    if "time_limit_minutes" in data:
        try:
            quiz.time_limit_minutes = validate_time_limit(
                data["time_limit_minutes"]
            )
        except ValueError as error:
            return {
                "success": False,
                "message": str(error)
            }, 400

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Updating quiz failed")

        return {
            "success": False,
            "message": "Failed to update quiz"
        }, 500

    return {
        "success": True,
        "message": "Quiz updated successfully",
        "quiz": quiz.to_dict()
    }, 200


# =====================================================
# ADD QUESTION
# =====================================================

@teacher_quiz_bp.post("/quizzes/<int:quiz_id>/questions")
@role_required("teacher")
def add_question(quiz_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Published quiz cannot be modified"
        }, 400

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    question_text = str(data.get("question_text", "")).strip()
    option_a = str(data.get("option_a", "")).strip()
    option_b = str(data.get("option_b", "")).strip()
    option_c = str(data.get("option_c", "")).strip()
    option_d = str(data.get("option_d", "")).strip()

    correct_answer = str(
        data.get("correct_answer", "")
    ).strip().upper()

    explanation = str(data.get("explanation", "")).strip()
    marks = data.get("marks", 1)

    if not question_text:
        return {
            "success": False,
            "message": "Question text is required"
        }, 400

    for label, option in [
        ("A", option_a),
        ("B", option_b),
        ("C", option_c),
        ("D", option_d)
    ]:
        if not option:
            return {
                "success": False,
                "message": f"Option {label} is required"
            }, 400

    if correct_answer not in ["A", "B", "C", "D"]:
        return {
            "success": False,
            "message": "Correct answer must be A, B, C or D"
        }, 400

    try:
        marks = int(marks)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Marks must be a number"
        }, 400

    if marks <= 0:
        return {
            "success": False,
            "message": "Marks must be greater than 0"
        }, 400

    last_question = QuizQuestion.query.filter_by(
        quiz_id=quiz.id
    ).order_by(
        QuizQuestion.order_number.desc()
    ).first()

    next_order = (
        last_question.order_number + 1
        if last_question
        else 1
    )

    question = QuizQuestion(
        quiz_id=quiz.id,
        question_text=question_text,
        option_a=option_a,
        option_b=option_b,
        option_c=option_c,
        option_d=option_d,
        correct_answer=correct_answer,
        explanation=explanation or None,
        marks=marks,
        order_number=next_order
    )

    try:
        db.session.add(question)
        db.session.flush()

        quiz.question_count = QuizQuestion.query.filter_by(
            quiz_id=quiz.id
        ).count()

        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Adding quiz question failed")

        return {
            "success": False,
            "message": "Failed to add question"
        }, 500

    return {
        "success": True,
        "message": "Question added successfully",
        "question": question.to_dict(),
        "question_count": quiz.question_count
    }, 201


# =====================================================
# UPDATE QUESTION
# =====================================================

@teacher_quiz_bp.put(
    "/quizzes/<int:quiz_id>/questions/<int:question_id>"
)
@role_required("teacher")
def update_question(quiz_id, question_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Published quiz cannot be modified"
        }, 400

    question = QuizQuestion.query.filter_by(
        id=question_id,
        quiz_id=quiz.id
    ).first()

    if not question:
        return {
            "success": False,
            "message": "Question not found"
        }, 404

    data = request.get_json(silent=True)

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    for field in [
        "question_text",
        "option_a",
        "option_b",
        "option_c",
        "option_d"
    ]:
        if field in data:
            value = str(data.get(field, "")).strip()

            if not value:
                return {
                    "success": False,
                    "message": f"{field} cannot be empty"
                }, 400

            setattr(question, field, value)

    if "correct_answer" in data:
        correct_answer = str(
            data.get("correct_answer", "")
        ).strip().upper()

        if correct_answer not in ["A", "B", "C", "D"]:
            return {
                "success": False,
                "message": "Correct answer must be A, B, C or D"
            }, 400

        question.correct_answer = correct_answer

    if "explanation" in data:
        explanation = str(data.get("explanation", "")).strip()
        question.explanation = explanation or None

    if "marks" in data:
        try:
            marks = int(data["marks"])
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Marks must be a number"
            }, 400

        if marks <= 0:
            return {
                "success": False,
                "message": "Marks must be greater than 0"
            }, 400

        question.marks = marks

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Updating question failed")

        return {
            "success": False,
            "message": "Failed to update question"
        }, 500

    return {
        "success": True,
        "message": "Question updated successfully",
        "question": question.to_dict()
    }, 200


# =====================================================
# DELETE QUESTION
# =====================================================

@teacher_quiz_bp.delete(
    "/quizzes/<int:quiz_id>/questions/<int:question_id>"
)
@role_required("teacher")
def delete_question(quiz_id, question_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Published quiz cannot be modified"
        }, 400

    question = QuizQuestion.query.filter_by(
        id=question_id,
        quiz_id=quiz.id
    ).first()

    if not question:
        return {
            "success": False,
            "message": "Question not found"
        }, 404

    try:
        db.session.delete(question)
        db.session.flush()

        quiz.question_count = QuizQuestion.query.filter_by(
            quiz_id=quiz.id
        ).count()

        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Deleting question failed")

        return {
            "success": False,
            "message": "Failed to delete question"
        }, 500

    return {
        "success": True,
        "message": "Question deleted successfully",
        "question_count": quiz.question_count
    }, 200


# =====================================================
# PUBLISH QUIZ
# =====================================================

@teacher_quiz_bp.post("/quizzes/<int:quiz_id>/publish")
@role_required("teacher")
def publish_quiz(quiz_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Quiz is already published"
        }, 400

    question_count = QuizQuestion.query.filter_by(
        quiz_id=quiz.id
    ).count()

    if question_count == 0:
        return {
            "success": False,
            "message": "Add at least one question before publishing"
        }, 400

    quiz.question_count = question_count
    quiz.is_published = True

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Publishing quiz failed")

        return {
            "success": False,
            "message": "Failed to publish quiz"
        }, 500

    return {
        "success": True,
        "message": "Quiz published successfully",
        "quiz": quiz.to_dict()
    }, 200


# =====================================================
# DELETE QUIZ
# =====================================================

@teacher_quiz_bp.delete("/quizzes/<int:quiz_id>")
@role_required("teacher")
def delete_quiz(quiz_id):

    teacher_id = get_teacher_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        created_by=teacher_id
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    if quiz.is_published:
        return {
            "success": False,
            "message": "Published quiz cannot be deleted"
        }, 400

    try:
        db.session.delete(quiz)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Deleting quiz failed")

        return {
            "success": False,
            "message": "Failed to delete quiz"
        }, 500

    return {
        "success": True,
        "message": "Quiz deleted successfully"
    }, 200


# =====================================================
# AI QUIZ GENERATION WITH GROQ
# =====================================================

@teacher_quiz_bp.post("/quizzes/generate-ai")
@role_required("teacher")
def generate_ai_quiz():

    teacher_id = get_teacher_id()
    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    difficulty = str(
        data.get("difficulty", "medium")
    ).strip().lower()

    subject_id = data.get("subject_id")
    topic_id = data.get("topic_id")
    question_count = data.get("question_count", 5)

    try:
        time_limit_minutes = validate_time_limit(
            data.get("time_limit_minutes", 30)
        )
    except ValueError as error:
        return {
            "success": False,
            "message": str(error)
        }, 400

    if not title:
        return {
            "success": False,
            "message": "Quiz title is required"
        }, 400

    if difficulty not in ["easy", "medium", "hard"]:
        return {
            "success": False,
            "message": "Difficulty must be easy, medium or hard"
        }, 400

    try:
        subject_id = int(subject_id)
        question_count = int(question_count)

        if topic_id is not None:
            topic_id = int(topic_id)

    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Invalid subject, topic or question count"
        }, 400

    if not 1 <= question_count <= 20:
        return {
            "success": False,
            "message": "Question count must be between 1 and 20"
        }, 400

    subject = get_teacher_subject(
        teacher_id,
        subject_id
    )

    if not subject:
        return {
            "success": False,
            "message": "Subject not found or access denied"
        }, 404

    topic = None

    if topic_id is not None:
        topic = get_teacher_topic(
            teacher_id,
            topic_id
        )

        if not topic or topic.subject_id != subject.id:
            return {
                "success": False,
                "message": "Topic not found or does not belong to this subject"
            }, 404

    api_key = current_app.config.get("GROQ_API_KEY")

    model = current_app.config.get(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile"
    )

    if not api_key:
        return {
            "success": False,
            "message": "Groq API key is not configured in backend .env"
        }, 500

    topic_name = topic.name if topic else subject.name

    prompt = f"""
Create exactly {question_count} multiple-choice questions.

Subject: {subject.name}
Topic: {topic_name}
Difficulty: {difficulty}
Quiz title: {title}
Description: {description or "Not provided"}

Return only a valid JSON object in this exact format:
{{
  "questions": [
    {{
      "question_text": "Question text",
      "option_a": "Option A",
      "option_b": "Option B",
      "option_c": "Option C",
      "option_d": "Option D",
      "correct_answer": "A",
      "explanation": "Short explanation",
      "marks": 1
    }}
  ]
}}

Rules:
- Generate exactly {question_count} questions.
- Each question must have four distinct options.
- correct_answer must be exactly A, B, C, or D.
- Exactly one option should be correct.
- Questions must be relevant to the selected subject and topic.
- Do not include markdown or text outside the JSON object.
"""

    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an educational assessment expert. "
                        "Generate accurate, unambiguous MCQs. "
                        "Return valid JSON only."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        ai_text = response.choices[0].message.content
        generated_data = json.loads(ai_text)
        questions_data = generated_data.get("questions", [])

    except Exception:
        current_app.logger.exception("Groq quiz generation failed")

        return {
            "success": False,
            "message": (
                "AI quiz generation failed. Check your Groq API key, "
                "model availability and backend logs."
            )
        }, 502

    if not isinstance(questions_data, list):
        return {
            "success": False,
            "message": "AI returned an invalid questions format"
        }, 502

    if len(questions_data) != question_count:
        return {
            "success": False,
            "message": "AI did not generate the requested number of questions"
        }, 502

    validated_questions = []

    for item in questions_data:
        if not isinstance(item, dict):
            return {
                "success": False,
                "message": "AI returned an invalid question"
            }, 502

        question_text = str(
            item.get("question_text", "")
        ).strip()

        option_a = str(item.get("option_a", "")).strip()
        option_b = str(item.get("option_b", "")).strip()
        option_c = str(item.get("option_c", "")).strip()
        option_d = str(item.get("option_d", "")).strip()

        correct_answer = str(
            item.get("correct_answer", "")
        ).strip().upper()

        explanation = str(
            item.get("explanation", "")
        ).strip()

        if (
            not question_text
            or not option_a
            or not option_b
            or not option_c
            or not option_d
            or correct_answer not in ["A", "B", "C", "D"]
        ):
            return {
                "success": False,
                "message": "AI returned an incomplete or invalid question"
            }, 502

        try:
            marks = int(item.get("marks", 1))
        except (TypeError, ValueError):
            marks = 1

        if marks <= 0:
            marks = 1

        validated_questions.append({
            "question_text": question_text,
            "option_a": option_a,
            "option_b": option_b,
            "option_c": option_c,
            "option_d": option_d,
            "correct_answer": correct_answer,
            "explanation": explanation or None,
            "marks": marks
        })

    try:
        quiz = Quiz(
            title=title,
            description=description or None,
            quiz_type="ai",
            difficulty=difficulty,
            question_count=len(validated_questions),
            time_limit_minutes=time_limit_minutes,
            class_id=subject.class_id,
            subject_id=subject.id,
            topic_id=topic.id if topic else None,
            created_by=teacher_id,
            is_ai_generated=True,
            is_published=False
        )

        db.session.add(quiz)
        db.session.flush()

        for index, item in enumerate(
            validated_questions,
            start=1
        ):
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=item["question_text"],
                option_a=item["option_a"],
                option_b=item["option_b"],
                option_c=item["option_c"],
                option_d=item["option_d"],
                correct_answer=item["correct_answer"],
                explanation=item["explanation"],
                marks=item["marks"],
                order_number=index
            )

            db.session.add(question)

        db.session.commit()

        saved_questions = QuizQuestion.query.filter_by(
            quiz_id=quiz.id
        ).order_by(
            QuizQuestion.order_number.asc()
        ).all()

        return {
            "success": True,
            "message": "AI quiz generated successfully. Review it before publishing.",
            "quiz": quiz.to_dict(),
            "questions": [
                question.to_dict()
                for question in saved_questions
            ]
        }, 201

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Saving AI quiz failed")

        return {
            "success": False,
            "message": "Failed to save the generated quiz"
        }, 500