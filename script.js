const STORAGE_KEY = "taskflowStudentTasks";

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskModal = document.getElementById("taskModal");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const toast = document.getElementById("toast");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let tasks = loadTasks();
let editingId = null;
let toastTimer;
const seenIds = new Set();

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

/* ---------- Animated numbers ---------- */
function setNumber(el, value, suffix = "") {
    const from = Number(el.dataset.v ?? 0);
    el.dataset.v = value;

    cancelAnimationFrame(el._raf);

    if (reduceMotion || from === value) {
        el.textContent = value + suffix;
        return;
    }

    const start = performance.now();
    const duration = 650;

    const step = now => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (value - from) * eased) + suffix;
        if (p < 1) el._raf = requestAnimationFrame(step);
    };

    el._raf = requestAnimationFrame(step);
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Done").length;
    const progress = tasks.filter(t => t.status === "In Progress").length;
    const overdue = tasks.filter(isOverdue).length;
    const percent = total ? Math.round(completed / total * 100) : 0;

    setNumber(document.getElementById("totalTasks"), total);
    setNumber(document.getElementById("progressTasks"), progress);
    setNumber(document.getElementById("completedTasks"), completed);
    setNumber(document.getElementById("overdueTasks"), overdue);
    setNumber(document.getElementById("progressPercent"), percent, "%");
    setNumber(document.getElementById("taskCount"), total);
    document.getElementById("progressBar").style.width = percent + "%";

    document.querySelector(".stat-orange")
        .classList.toggle("alert", overdue > 0);
    document.getElementById("progressPanel")
        .classList.toggle("complete", total > 0 && completed === total);

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

    let newIndex = 0;

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

        const overdue = isOverdue(task);

        const deadlineLabel = overdue
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

        const isNew = !seenIds.has(task.id);
        seenIds.add(task.id);
        const delay = isNew ? Math.min(newIndex++, 10) * 70 : 0;

        return `
            <article class="task-card ${task.status === "Done" ? "completed" : ""} ${isNew ? "enter" : ""}"
                     style="--d:${delay}ms">
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
                    <span class="${overdue ? "overdue-label" : ""}">${deadlineLabel}</span>
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
    const modalOpen = !taskModal.classList.contains("hidden");

    if (event.key === "Escape" && modalOpen) {
        closeModal();
        return;
    }

    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);

    if (modalOpen || typing || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openModal();
    } else if (event.key === "/") {
        event.preventDefault();
        searchInput.focus();
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

    const wasEditing = editingId !== null;

    if (wasEditing) {
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
    showToast(wasEditing ? "Task updated!" : "Task created successfully!");
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

        if (task.status === "Done") {
            burstConfetti(event.clientX, event.clientY, 70);

            if (tasks.length && tasks.every(item => item.status === "Done")) {
                setTimeout(() => {
                    burstConfetti(innerWidth / 2, innerHeight / 3, 230);
                    showToast("All tasks complete. Amazing work!");
                }, 300);
            }
        }
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

document.querySelectorAll(".nav-item[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-item[data-filter]").forEach(item => {
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

/* ---------- Greeting ---------- */
(function setGreeting() {
    const hour = new Date().getHours();
    const hello = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
    document.getElementById("greeting").textContent = hello + " · YOUR PERSONAL WORKSPACE";
})();

/* ---------- Rotating motivation in the sidebar ---------- */
(function rotateTips() {
    const tips = [
        ["Small steps.", "Big progress. Keep moving forward."],
        ["Start tiny.", "Two focused minutes beat an hour of dread."],
        ["One at a time.", "Finish what's In Progress before starting more."],
        ["Plan ahead.", "Deadlines feel lighter when they're broken into sprints."],
        ["Celebrate wins.", "Every task you complete counts."]
    ];

    const card = document.querySelector(".mini-card");
    const title = document.getElementById("miniTitle");
    const text = document.getElementById("miniText");
    let i = 0;

    if (reduceMotion) return;

    setInterval(() => {
        card.classList.add("swap");
        setTimeout(() => {
            i = (i + 1) % tips.length;
            title.textContent = tips[i][0];
            text.textContent = tips[i][1];
            card.classList.remove("swap");
        }, 400);
    }, 7000);
})();

/* ---------- Spotlight that follows the cursor ---------- */
document.addEventListener("pointermove", event => {
    const card = event.target.closest?.(".stat-card, .task-card, .progress-panel");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", (event.clientX - rect.left) + "px");
    card.style.setProperty("--my", (event.clientY - rect.top) + "px");
}, { passive: true });

/* ---------- Particle background ---------- */
(function particles() {
    const canvas = document.getElementById("fx");
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext("2d");
    const mouse = { x: -999, y: -999 };
    let w, h, dpr, parts = [];

    addEventListener("pointermove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = canvas.width = innerWidth * dpr;
        h = canvas.height = innerHeight * dpr;
        canvas.style.width = innerWidth + "px";
        canvas.style.height = innerHeight + "px";

        const count = Math.round(Math.min(60, innerWidth * innerHeight / 24000));
        parts = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - .5) * .3 * dpr,
            vy: (Math.random() - .5) * .3 * dpr,
            r: (Math.random() * 1.4 + .5) * dpr,
            col: Math.random() < .5 ? "167,139,250" : "103,232,249"
        }));
    }

    resize();
    addEventListener("resize", resize);

    function frame() {
        ctx.clearRect(0, 0, w, h);
        const mx = mouse.x * dpr, my = mouse.y * dpr;
        const link = 120 * dpr;

        for (const p of parts) {
            const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);

            if (d < 130 * dpr && d > 0) {
                p.vx += dx / d * .04 * dpr;
                p.vy += dy / d * .04 * dpr;
            }

            p.vx *= .985;
            p.vy *= .985;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.fillStyle = `rgba(${p.col},.6)`;
            ctx.arc(p.x, p.y, p.r, 0, 6.283);
            ctx.fill();
        }

        ctx.lineWidth = dpr;

        for (let i = 0; i < parts.length; i++) {
            for (let j = i + 1; j < parts.length; j++) {
                const a = parts[i], b = parts[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);

                if (d < link) {
                    ctx.strokeStyle = `rgba(${a.col},${(1 - d / link) * .16})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(frame);
    }

    frame();
})();

/* ---------- Confetti ---------- */
const burstConfetti = (function () {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    const colors = ["#a78bfa", "#67e8f9", "#6ee7b7", "#f0abfc", "#fdba74", "#ffffff"];
    let bits = [];
    let running = false;

    function size() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
    }

    size();
    addEventListener("resize", size);

    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bits = bits.filter(b => b.life > 0 && b.y < canvas.height + 40);

        for (const b of bits) {
            b.vx *= .992;
            b.vy += b.g;
            b.x += b.vx;
            b.y += b.vy;
            b.rot += b.vr;
            b.life -= .007;

            ctx.save();
            ctx.globalAlpha = Math.max(Math.min(b.life * 1.6, 1), 0);
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rot);
            ctx.fillStyle = b.c;

            if (b.round) {
                ctx.beginPath();
                ctx.arc(0, 0, b.w / 2, 0, 6.283);
                ctx.fill();
            } else {
                ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
            }

            ctx.restore();
        }

        if (bits.length) {
            requestAnimationFrame(tick);
        } else {
            running = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return function (x, y, count = 120) {
        if (reduceMotion) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * 6.283;
            const speed = Math.random() * 10 + 4;

            bits.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 7,
                g: .3,
                rot: Math.random() * 6,
                vr: (Math.random() - .5) * .45,
                w: Math.random() * 8 + 4,
                h: Math.random() * 5 + 3,
                c: colors[i % colors.length],
                life: 1,
                round: Math.random() < .3
            });
        }

        if (!running) {
            running = true;
            requestAnimationFrame(tick);
        }
    };
})();

renderTasks();
