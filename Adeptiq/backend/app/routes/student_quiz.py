from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.quiz_attempt import QuizAttempt
from app.models.student_response import StudentResponse
from app.models.student_topic_performance import StudentTopicPerformance
from app.models.class_student import ClassStudent


student_quiz_bp = Blueprint(
    "student_quiz",
    __name__,
    url_prefix="/api/student/quizzes"
)


# ============================================================
# HELPERS
# ============================================================

def get_student_id():
    return int(get_jwt_identity())


def student_can_access_quiz(student_id, quiz):
    if not quiz.is_published:
        return False

    # Self-learning quiz
    if quiz.class_id is None:
        return True

    # Class-based quiz
    enrollment = ClassStudent.query.filter_by(
        class_id=quiz.class_id,
        student_id=student_id,
        is_active=True
    ).first()

    return enrollment is not None


def quiz_to_student_dict(quiz):
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "quiz_type": quiz.quiz_type,
        "difficulty": quiz.difficulty,
        "question_count": quiz.question_count,
        "class_id": quiz.class_id,
        "subject_id": quiz.subject_id,
        "topic_id": quiz.topic_id,
        "is_ai_generated": quiz.is_ai_generated,
        "is_published": quiz.is_published,
        "created_at": (
            quiz.created_at.isoformat()
            if quiz.created_at else None
        ),
    }


def question_to_student_dict(question):
    # Never expose the correct answer to the student.
    return {
        "id": question.id,
        "question_text": question.question_text,
        "options": {
            "A": question.option_a,
            "B": question.option_b,
            "C": question.option_c,
            "D": question.option_d,
        },
        "marks": question.marks,
        "order_number": question.order_number,
    }


def get_quiz_questions(quiz_id):
    return QuizQuestion.query.filter_by(
        quiz_id=quiz_id
    ).order_by(
        QuizQuestion.order_number.asc(),
        QuizQuestion.id.asc()
    ).all()


# ============================================================
# GET AVAILABLE QUIZZES
# ============================================================

@student_quiz_bp.get("")
@jwt_required()
def get_student_quizzes():
    student_id = get_student_id()

    class_id = request.args.get("class_id", type=int)
    subject_id = request.args.get("subject_id", type=int)
    topic_id = request.args.get("topic_id", type=int)

    query = Quiz.query.filter_by(
        is_published=True
    )

    if class_id is not None:
        query = query.filter_by(class_id=class_id)

    if subject_id is not None:
        query = query.filter_by(subject_id=subject_id)

    if topic_id is not None:
        query = query.filter_by(topic_id=topic_id)

    quizzes = query.order_by(
        Quiz.created_at.desc()
    ).all()

    accessible_quizzes = []

    for quiz in quizzes:
        if student_can_access_quiz(student_id, quiz):
            accessible_quizzes.append(
                quiz_to_student_dict(quiz)
            )

    return {
        "success": True,
        "count": len(accessible_quizzes),
        "quizzes": accessible_quizzes
    }, 200


# ============================================================
# GET SINGLE QUIZ
# ============================================================

@student_quiz_bp.get("/<int:quiz_id>")
@jwt_required()
def get_student_quiz(quiz_id):
    student_id = get_student_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        is_published=True
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found or not published"
        }, 404

    if not student_can_access_quiz(student_id, quiz):
        return {
            "success": False,
            "message": "You are not allowed to access this quiz"
        }, 403

    questions = get_quiz_questions(quiz.id)

    if not questions:
        return {
            "success": False,
            "message": "This quiz has no questions"
        }, 400

    return {
        "success": True,
        "quiz": quiz_to_student_dict(quiz),
        "questions": [
            question_to_student_dict(question)
            for question in questions
        ]
    }, 200


# ============================================================
# START QUIZ
# ============================================================

@student_quiz_bp.post("/<int:quiz_id>/start")
@jwt_required()
def start_quiz(quiz_id):
    student_id = get_student_id()

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        is_published=True
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found or not published"
        }, 404

    if not student_can_access_quiz(student_id, quiz):
        return {
            "success": False,
            "message": "You are not allowed to access this quiz"
        }, 403

    questions = get_quiz_questions(quiz.id)

    if not questions:
        return {
            "success": False,
            "message": "This quiz has no questions"
        }, 400

    # Resume only an unfinished attempt.
    existing_attempt = QuizAttempt.query.filter_by(
        quiz_id=quiz.id,
        student_id=student_id,
        status="in_progress"
    ).order_by(
        QuizAttempt.started_at.desc()
    ).first()

    if existing_attempt:
        return {
            "success": True,
            "message": "Existing quiz attempt resumed",
            "attempt": existing_attempt.to_dict(),
            "quiz": quiz_to_student_dict(quiz),
            "questions": [
                question_to_student_dict(question)
                for question in questions
            ]
        }, 200

    # Never reuse a completed attempt.
    # Create a new attempt for a fresh start.
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=student_id,
        total_questions=len(questions),
        attempted_questions=0,
        correct_answers=0,
        wrong_answers=0,
        skipped_questions=0,
        score=0.0,
        accuracy=0.0,
        time_taken_seconds=0,
        status="in_progress",
        started_at=datetime.utcnow()
    )

    db.session.add(attempt)
    db.session.commit()

    return {
        "success": True,
        "message": "New quiz attempt started",
        "attempt": attempt.to_dict(),
        "quiz": quiz_to_student_dict(quiz),
        "questions": [
            question_to_student_dict(question)
            for question in questions
        ]
    }, 201


# ============================================================
# SUBMIT QUIZ
# ============================================================

@student_quiz_bp.post("/<int:quiz_id>/submit")
@jwt_required()
def submit_quiz(quiz_id):
    student_id = get_student_id()

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "A valid JSON request body is required"
        }, 400

    attempt_id = data.get("attempt_id")
    answers = data.get("answers")

    time_taken_seconds = data.get(
        "time_taken_seconds"
    )

    if not attempt_id:
        return {
            "success": False,
            "message": "attempt_id is required"
        }, 400

    if not isinstance(answers, list):
        return {
            "success": False,
            "message": "answers must be a list"
        }, 400

    quiz = Quiz.query.filter_by(
        id=quiz_id,
        is_published=True
    ).first()

    if not quiz:
        return {
            "success": False,
            "message": "Quiz not found or not published"
        }, 404

    if not student_can_access_quiz(student_id, quiz):
        return {
            "success": False,
            "message": "You are not allowed to access this quiz"
        }, 403

    # Validate attempt belongs to this student and quiz.
    attempt = QuizAttempt.query.filter_by(
        id=attempt_id,
        quiz_id=quiz.id,
        student_id=student_id
    ).first()

    if not attempt:
        return {
            "success": False,
            "message": "Quiz attempt not found"
        }, 404

    # Prevent duplicate submissions.
    if attempt.status != "in_progress":
        return {
            "success": False,
            "message": "This quiz attempt has already been submitted"
        }, 400

    questions = get_quiz_questions(quiz.id)

    if not questions:
        return {
            "success": False,
            "message": "This quiz has no questions"
        }, 400

    question_map = {
        question.id: question
        for question in questions
    }

    # Validate answer objects and question IDs.
    submitted_answers = {}

    for answer in answers:
        if not isinstance(answer, dict):
            return {
                "success": False,
                "message": "Each answer must be an object"
            }, 400

        question_id = answer.get("question_id")

        try:
            question_id = int(question_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "A valid question_id is required"
            }, 400

        if question_id not in question_map:
            return {
                "success": False,
                "message": "Invalid question ID for this quiz"
            }, 400

        if question_id in submitted_answers:
            return {
                "success": False,
                "message": "Duplicate answers are not allowed"
            }, 400

        selected_answer = answer.get("selected_answer")

        if selected_answer is not None:
            selected_answer = str(
                selected_answer
            ).strip().upper()

        if selected_answer == "":
            selected_answer = None

        if selected_answer not in [
            None, "A", "B", "C", "D"
        ]:
            return {
                "success": False,
                "message": (
                    "selected_answer must be A, B, C, D or null"
                )
            }, 400

        submitted_answers[question_id] = selected_answer

    # Require at least one selected option.
    has_actual_answer = any(
        answer in ["A", "B", "C", "D"]
        for answer in submitted_answers.values()
    )

    if not has_actual_answer:
        return {
            "success": False,
            "message": (
                "Please select at least one answer before submitting"
            )
        }, 400

    # Validate time.
    if time_taken_seconds is not None:
        try:
            time_taken_seconds = int(time_taken_seconds)

            if time_taken_seconds < 0:
                raise ValueError

        except (TypeError, ValueError):
            return {
                "success": False,
                "message": (
                    "time_taken_seconds must be a non-negative integer"
                )
            }, 400
    else:
        elapsed = datetime.utcnow() - attempt.started_at

        time_taken_seconds = max(
            0,
            int(elapsed.total_seconds())
        )

    # Calculate results.
    total_questions = len(questions)
    attempted_questions = 0
    correct_answers = 0
    wrong_answers = 0
    skipped_questions = 0
    score = 0.0
    total_marks = 0.0

    response_objects = []

    for question in questions:
        question_marks = float(question.marks or 0)
        total_marks += question_marks

        selected_answer = submitted_answers.get(
            question.id
        )

        is_skipped = selected_answer is None
        is_correct = False
        marks_obtained = 0.0

        if is_skipped:
            skipped_questions += 1
        else:
            attempted_questions += 1

            if selected_answer == question.correct_answer:
                correct_answers += 1
                is_correct = True
                marks_obtained = question_marks
                score += marks_obtained
            else:
                wrong_answers += 1

        response_objects.append(
            StudentResponse(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_answer=selected_answer,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                time_taken_seconds=None,
                marks_obtained=marks_obtained,
                answered_at=datetime.utcnow()
            )
        )

    accuracy = (
        (correct_answers / attempted_questions) * 100
        if attempted_questions > 0
        else 0.0
    )

    # Update attempt status only after validation and calculation.
    attempt.total_questions = total_questions
    attempt.attempted_questions = attempted_questions
    attempt.correct_answers = correct_answers
    attempt.wrong_answers = wrong_answers
    attempt.skipped_questions = skipped_questions
    attempt.score = score
    attempt.accuracy = accuracy
    attempt.time_taken_seconds = time_taken_seconds
    attempt.completed_at = datetime.utcnow()
    attempt.status = "completed"

    for response in response_objects:
        db.session.add(response)

    # Update topic performance.
    if quiz.topic_id is not None:
        performance = StudentTopicPerformance.query.filter_by(
            student_id=student_id,
            subject_id=quiz.subject_id,
            topic_id=quiz.topic_id
        ).first()

        if not performance:
            performance = StudentTopicPerformance(
                student_id=student_id,
                subject_id=quiz.subject_id,
                topic_id=quiz.topic_id,
                total_attempts=0,
                total_questions=0,
                correct_answers=0,
                wrong_answers=0,
                accuracy=0.0,
                average_time_seconds=0.0,
                mastery_score=0.0,
                current_level="beginner"
            )

            db.session.add(performance)

        old_attempts = performance.total_attempts
        performance.total_attempts = old_attempts + 1

        performance.total_questions += total_questions
        performance.correct_answers += correct_answers
        performance.wrong_answers += wrong_answers

        if performance.total_questions > 0:
            performance.accuracy = (
                performance.correct_answers
                / performance.total_questions
            ) * 100

        previous_total_time = (
            performance.average_time_seconds
            * old_attempts
        )

        performance.average_time_seconds = (
            previous_total_time + time_taken_seconds
        ) / performance.total_attempts

        performance.mastery_score = min(
            100.0,
            performance.accuracy
        )

        if performance.mastery_score < 40:
            performance.current_level = "beginner"
        elif performance.mastery_score < 70:
            performance.current_level = "intermediate"
        else:
            performance.current_level = "advanced"

        performance.last_attempt_at = attempt.completed_at

    db.session.commit()

    return {
        "success": True,
        "message": "Quiz submitted successfully",
        "result": {
            "attempt_id": attempt.id,
            "quiz_id": quiz.id,
            "total_questions": total_questions,
            "attempted_questions": attempted_questions,
            "correct_answers": correct_answers,
            "wrong_answers": wrong_answers,
            "skipped_questions": skipped_questions,
            "score": score,
            "total_marks": total_marks,
            "accuracy": round(accuracy, 2),
            "time_taken_seconds": time_taken_seconds,
            "status": attempt.status,
            "completed_at": (
                attempt.completed_at.isoformat()
                if attempt.completed_at
                else None
            )
        }
    }, 200