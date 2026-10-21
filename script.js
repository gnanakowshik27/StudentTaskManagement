
"use strict";

const STORAGE_KEY = "taskflow_student_tasks_v1";

const $ = (id) => document.getElementById(id);

const dialog = $("taskDialog");
const form = $("taskForm");
const taskTitle = $("taskTitle");
const taskDescription = $("taskDescription");
const taskDue = $("taskDue");
const taskPriority = $("taskPriority");
const taskSprint = $("taskSprint");
const taskStatus = $("taskStatus");

const statusLists = {
  "To Do": $("todoList"),
  "In Progress": $("progressList"),
  "Done": $("doneList")
};

const statusCounts = {
  "To Do": $("todoBoardCount"),
  "In Progress": $("progressBoardCount"),
  "Done": $("doneBoardCount")
};

let tasks = loadTasks();
let editingId = null;
let toastTimer;

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
      return [
        {
          id: makeId(),
          title: "Complete DBMS assignment",
          description: "Finish SQL queries and revise the results.",
          dueDate: localDateString(
            new Date(Date.now() + 2 * 86400000)
          ),
          priority: "High",
          sprint: "Sprint 1",
          status: "To Do"
        },
        {
          id: makeId(),
          title: "Revise DAA concepts",
          description: "Study algorithms and solve practice questions.",
          dueDate: localDateString(
            new Date(Date.now() + 4 * 86400000)
          ),
          priority: "Medium",
          sprint: "Sprint 1",
          status: "In Progress"
        },
        {
          id: makeId(),
          title: "Organize project folder",
          description: "Keep project files ready for the next review.",
          dueDate: localDateString(),
          priority: "Low",
          sprint: "Sprint 1",
          status: "Done"
        }
      ];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validPriorities = ["Low", "Medium", "High"];
    const validStatuses = ["To Do", "In Progress", "Done"];
    const validSprints = ["Sprint 1", "Sprint 2", "Sprint 3"];

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.description === "string" &&
      typeof task.dueDate === "string" &&
      validPriorities.includes(task.priority) &&
      validStatuses.includes(task.status) &&
      validSprints.includes(task.sprint)
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showToast("Could not save. Check your browser storage settings.");
    return false;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function addPill(parent, text, className = "") {
  const pill = createElement("span", `pill ${className}`.trim(), text);
  parent.appendChild(pill);
}

function formatDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString || "No deadline";
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function makeActionButton(label, action, taskId, extraClass = "") {
  const button = createElement(
    "button",
    extraClass,
    label
  );

  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = taskId;

  return button;
}

function renderTask(task) {
  const card = createElement("article", "task-card");

  const heading = createElement("h4", "", task.title);
  card.appendChild(heading);

  if (task.description) {
    card.appendChild(
      createElement("p", "task-description", task.description)
    );
  }

  const meta = createElement("div", "task-meta");

  const priorityClass = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low"
  }[task.priority];

  addPill(meta, task.priority + " priority", priorityClass);
  addPill(meta, task.sprint);

  card.appendChild(meta);

  const overdue =
    task.status !== "Done" &&
    task.dueDate < localDateString();

  const due = createElement(
    "div",
    overdue ? "due-date overdue" : "due-date",
    (overdue ? "Overdue · " : "Due · ") + formatDate(task.dueDate)
  );

  card.appendChild(due);

  const actions = createElement("div", "task-actions");

  actions.appendChild(
    makeActionButton("Edit", "edit", task.id)
  );

  if (task.status === "To Do") {
    actions.appendChild(
      makeActionButton("Start", "start", task.id)
    );
  } else if (task.status === "In Progress") {
    actions.appendChild(
      makeActionButton("Complete", "complete", task.id)
    );
  } else {
    actions.appendChild(
      makeActionButton("Reopen", "reopen", task.id)
    );
  }

  actions.appendChild(
    makeActionButton("Delete", "delete", task.id, "delete-btn")
  );

  card.appendChild(actions);

  return card;
}

function render() {
  const sprint = $("sprintFilter").value;
  const status = $("statusFilter").value;
  const search = $("searchInput").value.trim().toLowerCase();

  const total = tasks.length;
  const todo = tasks.filter((task) => task.status === "To Do").length;
  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;
  const done = tasks.filter((task) => task.status === "Done").length;

  $("totalCount").textContent = total;
  $("todoCount").textContent = todo;
  $("progressCount").textContent = inProgress;
  $("doneCount").textContent = done;

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  $("progressPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";

  Object.values(statusLists).forEach((list) => {
    list.replaceChildren();
  });

  Object.values(statusCounts).forEach((count) => {
    count.textContent = "0";
  });

  const filtered = tasks.filter((task) => {
    const matchesSprint = sprint === "all" || task.sprint === sprint;
    const matchesStatus = status === "all" || task.status === status;

    const searchableText =
      `${task.title} ${task.description} ${task.sprint}`.toLowerCase();

    return matchesSprint &&
      matchesStatus &&
      searchableText.includes(search);
  });

  for (const task of filtered) {
    statusLists[task.status].appendChild(renderTask(task));
    statusCounts[task.status].textContent =
      Number(statusCounts[task.status].textContent) + 1;
  }

  for (const [taskStatus, list] of Object.entries(statusLists)) {
    if (list.children.length === 0) {
      const empty = createElement(
        "div",
        "empty-state",
        "No tasks to show"
      );
      list.appendChild(empty);
    }
  }
}

function openNewTaskDialog() {
  editingId = null;
  form.reset();

  $("dialogTitle").textContent = "Add a task";
  taskDue.value = localDateString();
  taskPriority.value = "Medium";
  taskSprint.value = $("sprintFilter").value === "all"
    ? "Sprint 1"
    : $("sprintFilter").value;
  taskStatus.value = "To Do";

  dialog.showModal();
  taskTitle.focus();
}

function openEditTaskDialog(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    showToast("Task not found.");
    return;
  }

  editingId = id;
  $("dialogTitle").textContent = "Edit task";

  taskTitle.value = task.title;
  taskDescription.value = task.description;
  taskDue.value = task.dueDate;
  taskPriority.value = task.priority;
  taskSprint.value = task.sprint;
  taskStatus.value = task.status;

  dialog.showModal();
  taskTitle.focus();
}

function handleSubmit(event) {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const dueDate = taskDue.value;

  if (!title || !dueDate) {
    showToast("Please enter a title and deadline.");
    return;
  }

  const taskData = {
    title,
    description,
    dueDate,
    priority: taskPriority.value,
    sprint: taskSprint.value,
    status: taskStatus.value
  };

  if (editingId) {
    const index = tasks.findIndex((task) => task.id === editingId);

    if (index === -1) {
      showToast("Task not found.");
      return;
    }

    tasks[index] = { ...tasks[index], ...taskData };
  } else {
    tasks.push({
      id: makeId(),
      ...taskData
    });
  }

  if (!saveTasks()) {
    return;
  }

  dialog.close();
  render();
  showToast(editingId ? "Task updated!" : "Task added!");

  editingId = null;
}

function handleTaskAction(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    showToast("Task not found.");
    return;
  }

  if (action === "edit") {
    openEditTaskDialog(id);
    return;
  }

  if (action === "delete") {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    tasks = tasks.filter((item) => item.id !== id);

    if (!saveTasks()) {
      tasks.push(task);
      return;
    }

    render();
    showToast("Task deleted.");
    return;
  }

  const nextStatus = {
    start: "In Progress",
    complete: "Done",
    reopen: "To Do"
  }[action];

  if (!nextStatus) {
    return;
  }

  const previousStatus = task.status;
  task.status = nextStatus;

  if (!saveTasks()) {
    task.status = previousStatus;
    return;
  }

  render();
  showToast("Task moved to " + nextStatus + ".");
}

$("addTaskTop").addEventListener("click", openNewTaskDialog);
$("taskForm").addEventListener("submit", handleSubmit);
$("closeDialog").addEventListener("click", () => dialog.close());
$("cancelDialog").addEventListener("click", () => dialog.close());

$("sprintFilter").addEventListener("change", render);
$("statusFilter").addEventListener("change", render);
$("searchInput").addEventListener("input", render);

Object.values(statusLists).forEach((list) => {
  list.addEventListener("click", handleTaskAction);
});

render();
