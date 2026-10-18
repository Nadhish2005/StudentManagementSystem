const form = document.getElementById("student-form");
const table = document.getElementById("student-table");
const message = document.getElementById("message");

let editingStudentId = null;

// Load students from the database
async function loadStudents() {
    try {
        const response = await fetch("/api/students");

        if (!response.ok) {
            throw new Error("Unable to load students.");
        }

        const students = await response.json();

        table.replaceChildren();

        students.forEach(student => {
            const row = table.insertRow();

            [
                student.id,
                student.name,
                student.email,
                student.phone || "-",
                student.course
            ].forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });

            const actionCell = row.insertCell();

            // Edit button
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.style.marginRight = "8px";

            editButton.addEventListener("click", () => {
                startEditing(student);
            });

            actionCell.appendChild(editButton);

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                deleteStudent(student.id);
            });

            actionCell.appendChild(deleteButton);
        });

        if (students.length === 0) {
            const row = table.insertRow();
            const cell = row.insertCell();

            cell.colSpan = 6;
            cell.textContent = "No students added yet.";
        }

        document.getElementById("total-students").textContent =
            students.length;

        document.getElementById("total-courses").textContent =
            new Set(students.map(student => student.course)).size;

    } catch (error) {
        message.textContent = "Unable to load students.";
        console.error(error);
    }
}


// Prepare the form for editing
function startEditing(student) {
    editingStudentId = student.id;

    document.getElementById("name").value = student.name;
    document.getElementById("email").value = student.email;
    document.getElementById("phone").value = student.phone || "";
    document.getElementById("course").value = student.course;

    form.querySelector('button[type="submit"]').textContent =
        "Update Student";

    message.textContent = `Editing student: ${student.name}`;

    // Add Cancel button if it doesn't already exist
    let cancelButton = document.getElementById("cancel-edit");

    if (!cancelButton) {
        cancelButton = document.createElement("button");
        cancelButton.id = "cancel-edit";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel Edit";
        cancelButton.style.marginTop = "10px";

        form.appendChild(cancelButton);

        cancelButton.addEventListener("click", cancelEditing);
    }

    form.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// Cancel editing
function cancelEditing() {
    editingStudentId = null;
    form.reset();

    form.querySelector('button[type="submit"]').textContent =
        "Add Student";

    document.getElementById("cancel-edit")?.remove();

    message.textContent = "Editing cancelled.";
}


// Add or update a student
form.addEventListener("submit", async event => {
    event.preventDefault();

    const student = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        course: document.getElementById("course").value
    };

    if (!student.name || !student.email || !student.course) {
        message.textContent =
            "Please complete all required fields.";
        return;
    }

    const isEditing = editingStudentId !== null;

    const url = isEditing
        ? `/api/students/${editingStudentId}`
        : "/api/students";

    const method = isEditing ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(student)
        });

        const result = await response.json();

        if (!response.ok) {
            message.textContent =
                result.error || "Operation failed.";
            return;
        }

        form.reset();

        editingStudentId = null;

        form.querySelector('button[type="submit"]').textContent =
            "Add Student";

        document.getElementById("cancel-edit")?.remove();

        message.textContent = isEditing
            ? "Student updated successfully!"
            : "Student added successfully!";

        await loadStudents();

    } catch (error) {
        message.textContent =
            "Unable to connect to the server.";

        console.error(error);
    }
});


// Delete a student
async function deleteStudent(studentId) {
    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/students/${studentId}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            message.textContent =
                result.error || "Unable to delete student.";
            return;
        }

        if (editingStudentId === studentId) {
            cancelEditing();
        }

        message.textContent = result.message;

        await loadStudents();

    } catch (error) {
        message.textContent =
            "Unable to connect to the server.";

        console.error(error);
    }
}


// Load records when the page opens
loadStudents();