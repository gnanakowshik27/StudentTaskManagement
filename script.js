
const STORAGE_KEY = "taskflowStudentTasks";

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskModal = document.getElementById("taskModal");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const toast = document.getElementById("toast");

let tasks = loadTasks();
let editingId = null;
let toastTimer;

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch {
        showToast("Unable to save. Browser storage may be full.");
        return false;
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function isOverdue(task) {
    return task.status !== "Done" &&
        task.deadline &&
        task.deadline < localDateString();
}

function localDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "No deadline";

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Done").length;
    const progress = tasks.filter(t => t.status === "In Progress").length;
    const overdue = tasks.filter(isOverdue).length;
    const percent = total ? Math.round(completed / total * 100) : 0;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("progressTasks").textContent = progress;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("overdueTasks").textContent = overdue;
    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("taskCount").textContent = total;

    const caption = total === 0
        ? "Add your first task to get started."
        : completed === total
            ? "Amazing! Every task is complete."
            : `${completed} of ${total} tasks completed. Keep going!`;

    document.getElementById("progressCaption").textContent = caption;
}

function getVisibleTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    let result = tasks.filter(task => {
        const matchesStatus =
            selectedStatus === "All" || task.status === selectedStatus;

        const searchableText = [
            task.name,
            task.description,
            task.priority,
            task.sprint,
            task.status
        ].join(" ").toLowerCase();

        return matchesStatus && searchableText.includes(query);
    });

    if (sortFilter.value === "priority") {
        const rank = { High: 0, Medium: 1, Low: 2 };
        result.sort((a, b) =>
            (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3)
        );
    } else if (sortFilter.value === "newest") {
        result.sort((a, b) => b.id - a.id);
    } else {
        result.sort((a, b) =>
            (a.deadline || "9999-12-31")
                .localeCompare(b.deadline || "9999-12-31")
        );
    }

    return result;
}

function renderTasks() {
    const visibleTasks = getVisibleTasks();

    if (visibleTasks.length === 0) {
        const hasTasks = tasks.length > 0;

        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✧</div>
                <h3>${hasTasks ? "No matching tasks" : "A fresh start."}</h3>
                <p>${hasTasks
                    ? "Try changing your search or filters."
                    : "Create your first task and turn your plans into progress."}</p>
            </div>
        `;

        updateDashboard();
        return;
    }

    taskList.innerHTML = visibleTasks.map(task => {
        const statusClass = {
            "To Do": "status-todo",
            "In Progress": "status-progress",
            "Done": "status-done"
        }[task.status] || "status-todo";

        const priorityClass = {
            High: "priority-high",
            Medium: "priority-medium",
            Low: "priority-low"
        }[task.priority] || "priority-medium";

        const deadlineLabel = isOverdue(task)
            ? "⚠ Overdue · " + formatDate(task.deadline)
            : "◷ " + formatDate(task.deadline);

        const description = task.description
            ? escapeHTML(task.description)
            : "No description added.";

        const nextStatus = {
            "To Do": "In Progress",
            "In Progress": "Done",
            "Done": "To Do"
        }[task.status];

        return `
            <article class="task-card ${task.status === "Done" ? "completed" : ""}">
                <div class="task-card-top">
                    <h3 class="task-title">${escapeHTML(task.name)}</h3>
                    <span class="badge ${priorityClass}">
                        ${escapeHTML(task.priority)}
                    </span>
                </div>

                <p class="task-description">${description}</p>

                <div class="task-meta">
                    <span class="badge ${statusClass}">
                        ${escapeHTML(task.status)}
                    </span>
                    <span>${deadlineLabel}</span>
                </div>

                <div class="task-meta">
                    <span>▦ ${escapeHTML(task.sprint || "Backlog")}</span>
                </div>

                <div class="task-actions">
                    <button class="action-btn" data-action="status"
                        data-id="${task.id}">
                        → ${escapeHTML(nextStatus)}
                    </button>
                    <button class="action-btn" data-action="edit"
                        data-id="${task.id}">✎ Edit</button>
                    <button class="action-btn delete" data-action="delete"
                        data-id="${task.id}">× Delete</button>
                </div>
            </article>
        `;
    }).join("");

    updateDashboard();
}

function openModal(task = null) {
    taskForm.reset();
    editingId = task ? task.id : null;

    document.getElementById("modalTitle").textContent =
        task ? "Edit your task" : "Create a task";

    document.getElementById("saveBtn").textContent =
        task ? "Save Changes →" : "Save Task →";

    document.getElementById("taskName").value = task?.name || "";
    document.getElementById("taskDescription").value =
        task?.description || "";
    document.getElementById("deadline").value = task?.deadline || "";
    document.getElementById("priority").value = task?.priority || "Medium";
    document.getElementById("taskStatus").value = task?.status || "To Do";
    document.getElementById("sprint").value = task?.sprint || "Sprint 1";

    taskModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("taskName").focus();
}

function closeModal() {
    taskModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingId = null;
}

document.getElementById("openFormBtn").addEventListener("click", () => {
    openModal();
});

document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
document.getElementById("modalBackdrop").addEventListener("click", closeModal);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !taskModal.classList.contains("hidden")) {
        closeModal();
    }
});

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("taskName").value.trim();

    if (!name) {
        showToast("Please enter a task name.");
        return;
    }

    const taskData = {
        name,
        description: document.getElementById("taskDescription").value.trim(),
        deadline: document.getElementById("deadline").value,
        priority: document.getElementById("priority").value,
        status: document.getElementById("taskStatus").value,
        sprint: document.getElementById("sprint").value
    };

    if (!taskData.deadline) {
        showToast("Please select a deadline.");
        return;
    }

    if (editingId !== null) {
        const index = tasks.findIndex(task => task.id === editingId);

        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...taskData };
        }
    } else {
        tasks.push({
            id: Date.now(),
            ...taskData
        });
    }

    if (!saveTasks()) return;

    closeModal();
    renderTasks();
    showToast(editingId === null ? "Task created successfully!" : "Task updated!");
});

taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    if (action === "edit") {
        openModal(task);
        return;
    }

    if (action === "status") {
        const previousStatus = task.status;

        task.status = {
            "To Do": "In Progress",
            "In Progress": "Done",
            "Done": "To Do"
        }[task.status] || "To Do";

        if (!saveTasks()) {
            task.status = previousStatus;
            return;
        }

        renderTasks();
        showToast("Status changed to " + task.status + ".");
        return;
    }

    if (action === "delete") {
        if (!confirm(`Delete "${task.name}"?`)) return;

        const previousTasks = tasks;
        tasks = tasks.filter(item => item.id !== id);

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }

        renderTasks();
        showToast("Task deleted.");
    }
});

searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);
sortFilter.addEventListener("change", renderTasks);

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        statusFilter.value = button.dataset.filter;
        renderTasks();
    });
});

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

renderTasks();
