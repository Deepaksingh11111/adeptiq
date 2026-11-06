from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.quiz_attempt import QuizAttempt
from app.models.student_response import StudentResponse
from app.models.student_topic_performance import StudentTopicPerformance
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion


student_result_bp = Blueprint(
    "student_result",
    __name__,
    url_prefix="/api/student/results"
)


def get_student_id():
    return int(get_jwt_identity())


# ============================================================
# GET ALL QUIZ ATTEMPTS
# ============================================================

@student_result_bp.get("/attempts")
@jwt_required()
def get_attempt_history():

    student_id = get_student_id()

    attempts = (
        QuizAttempt.query
        .filter_by(student_id=student_id)
        .order_by(
            QuizAttempt.started_at.desc()
        )
        .all()
    )

    results = []

    for attempt in attempts:

        quiz = Quiz.query.get(
            attempt.quiz_id
        )

        result = attempt.to_dict()

        result["quiz"] = {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "quiz_type": quiz.quiz_type,
            "difficulty": quiz.difficulty,
            "subject_id": quiz.subject_id,
            "topic_id": quiz.topic_id
        } if quiz else None

        results.append(result)

    return {
        "success": True,
        "count": len(results),
        "attempts": results
    }, 200


# ============================================================
# GET SINGLE QUIZ RESULT
# ============================================================

@student_result_bp.get("/attempts/<int:attempt_id>")
@jwt_required()
def get_attempt_result(attempt_id):

    student_id = get_student_id()

    attempt = QuizAttempt.query.filter_by(
        id=attempt_id,
        student_id=student_id
    ).first()

    if not attempt:
        return {
            "success": False,
            "message": "Quiz attempt not found"
        }, 404

    quiz = Quiz.query.get(
        attempt.quiz_id
    )

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found"
        }, 404

    responses = (
        StudentResponse.query
        .filter_by(
            attempt_id=attempt.id
        )
        .order_by(
            StudentResponse.question_id.asc()
        )
        .all()
    )

    response_data = []

    for response in responses:

        question = QuizQuestion.query.get(
            response.question_id
        )

        response_data.append({
            "id": response.id,
            "question_id": response.question_id,
            "question_text": (
                question.question_text
                if question else None
            ),
            "selected_answer": response.selected_answer,
            "correct_answer": response.correct_answer,
            "is_correct": response.is_correct,
            "marks_obtained": response.marks_obtained,
            "time_taken_seconds": response.time_taken_seconds,
            "answered_at": (
                response.answered_at.isoformat()
                if response.answered_at
                else None
            )
        })

    return {
        "success": True,
        "attempt": attempt.to_dict(),

        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "quiz_type": quiz.quiz_type,
            "difficulty": quiz.difficulty,
            "question_count": quiz.question_count,
            "subject_id": quiz.subject_id,
            "topic_id": quiz.topic_id
        },

        "responses": response_data
    }, 200


# ============================================================
# GET STUDENT PERFORMANCE
# ============================================================

@student_result_bp.get("/performance")
@jwt_required()
def get_student_performance():

    student_id = get_student_id()

    performances = (
        StudentTopicPerformance.query
        .filter_by(
            student_id=student_id
        )
        .order_by(
            StudentTopicPerformance.updated_at.desc()
        )
        .all()
    )

    performance_data = []

    for performance in performances:

        data = performance.to_dict()

        data["subject"] = {
            "id": performance.subject.id,
            "name": performance.subject.name
        } if performance.subject else None

        data["topic"] = {
            "id": performance.topic.id,
            "name": performance.topic.name
        } if performance.topic else None

        performance_data.append(data)

    # --------------------------------------------------------
    # Overall statistics
    # --------------------------------------------------------

    total_attempts = sum(
        performance.total_attempts
        for performance in performances
    )

    total_questions = sum(
        performance.total_questions
        for performance in performances
    )

    total_correct = sum(
        performance.correct_answers
        for performance in performances
    )

    total_wrong = sum(
        performance.wrong_answers
        for performance in performances
    )

    if total_questions > 0:
        overall_accuracy = (
            total_correct /
            total_questions
        ) * 100
    else:
        overall_accuracy = 0.0

    if performances:
        overall_mastery = sum(
            performance.mastery_score
            for performance in performances
        ) / len(performances)
    else:
        overall_mastery = 0.0

    return {
        "success": True,

        "summary": {
            "total_attempts": total_attempts,
            "total_questions": total_questions,
            "correct_answers": total_correct,
            "wrong_answers": total_wrong,
            "overall_accuracy": round(
                overall_accuracy,
                2
            ),
            "overall_mastery_score": round(
                overall_mastery,
                2
            )
        },

        "topics": performance_data
    }, 200