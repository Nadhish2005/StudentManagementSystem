from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from pathlib import Path

app = Flask(__name__)

DATABASE = Path(
    os.environ.get("DATABASE_PATH", str(Path(__file__).with_name("students.db")))
)


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                course TEXT NOT NULL
            )
        """)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/students", methods=["GET"])
def get_students():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM students ORDER BY id DESC"
        ).fetchall()

    return jsonify([dict(row) for row in rows])


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    course = str(data.get("course", "")).strip()

    if not name or not email or not course:
        return jsonify({
            "error": "Name, email, and course are required."
        }), 400

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO students (name, email, phone, course)
                VALUES (?, ?, ?, ?)
                """,
                (name, email, phone, course)
            )

            student_id = cursor.lastrowid

            row = connection.execute(
                "SELECT * FROM students WHERE id = ?",
                (student_id,)
            ).fetchone()

        return jsonify(dict(row)), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "error": "This email is already registered."
        }), 409


@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    course = str(data.get("course", "")).strip()

    if not name or not email or not course:
        return jsonify({
            "error": "Name, email, and course are required."
        }), 400

    try:
        with get_connection() as connection:
            existing = connection.execute(
                "SELECT id FROM students WHERE id = ?",
                (student_id,)
            ).fetchone()

            if existing is None:
                return jsonify({
                    "error": "Student not found."
                }), 404

            connection.execute(
                """
                UPDATE students
                SET name = ?, email = ?, phone = ?, course = ?
                WHERE id = ?
                """,
                (name, email, phone, course, student_id)
            )

            updated = connection.execute(
                "SELECT * FROM students WHERE id = ?",
                (student_id,)
            ).fetchone()

        return jsonify(dict(updated))

    except sqlite3.IntegrityError:
        return jsonify({
            "error": "This email is already registered to another student."
        }), 409


if __name__ == "__main__":
    initialize_database()
    app.run(host="0.0.0.0", port=5000, debug=False)