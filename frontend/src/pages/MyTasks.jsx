import { useEffect, useMemo, useState } from "react";

import {
  persistDemoTasks,
  readDemoTasks,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../data/demoTasks";

const statusOptions = ["All", ...TASK_STATUSES];
const priorityOptions = ["All", ...TASK_PRIORITIES];
const taskStatuses = TASK_STATUSES;
const priorities = TASK_PRIORITIES;

const emptyTaskForm = {
  title: "",
  description: "",
  project: "",
  priority: "Medium",
  status: "To Do",
  dueDate: "",
};

function formatDueDate(dueDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate;
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MyTasks() {
  const [taskState, setTaskState] = useState(readDemoTasks);
  const { tasks, error: storageError } = taskState;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [formErrors, setFormErrors] = useState({});
  const [persistenceError, setPersistenceError] = useState("");

  useEffect(() => {
    if (!isCreateModalOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeCreateModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen]);

  function saveTasks(nextTasks) {
    setTaskState({ tasks: nextTasks, error: "" });
    setPersistenceError(persistDemoTasks(nextTasks));
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setTaskForm(emptyTaskForm);
    setFormErrors({});
  }

  function updateTaskField(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  }

  function handleCreateTask(event) {
    event.preventDefault();

    const errors = {};
    ["title", "description", "project", "dueDate"].forEach((field) => {
      if (!taskForm[field].trim()) {
        errors[field] = "This field is required.";
      }
    });

    if (!TASK_PRIORITIES.includes(taskForm.priority)) {
      errors.priority = "Select a valid priority.";
    }
    if (!TASK_STATUSES.includes(taskForm.status)) {
      errors.status = "Select a valid status.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const highestTaskNumber = tasks.reduce((highest, task) => {
      const match = /^TASK-(\d+)$/.exec(task.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const nextTask = {
      ...taskForm,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      project: taskForm.project.trim(),
      id: `TASK-${String(highestTaskNumber + 1).padStart(3, "0")}`,
      type: "Task",
    };

    saveTasks([nextTask, ...tasks]);
    closeCreateModal();
  }

  function handleStatusChange(taskId, status) {
    saveTasks(
      tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.id.toLowerCase().includes(search.toLowerCase()) ||
        task.project.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const taskStats = {
    total: tasks.length,
    inProgress: tasks.filter(
      (task) => task.status === "In Progress"
    ).length,
    dueSoon: 2,
    overdue: 1,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">

      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            WORKSPACE
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            My Tasks
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage and track the work assigned to you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Create Task
        </button>
      </div>

      <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-800">
        Demo tasks are stored only in this browser’s local storage. This temporary
        frontend storage is not a database and is not shared with your team.
      </div>

      {storageError || persistenceError ? (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {persistenceError || storageError}
        </p>
      ) : null}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Assigned Tasks"
          value={taskStats.total}
          icon="✓"
        />

        <StatCard
          label="In Progress"
          value={taskStats.inProgress}
          icon="◷"
        />

        <StatCard
          label="Due Soon"
          value={taskStats.dueSoon}
          icon="◉"
        />

        <StatCard
          label="Overdue"
          value={taskStats.overdue}
          icon="!"
          danger
        />

      </div>

      {/* Filters */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row">

          {/* Search */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                Status: {status}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                Priority: {priority}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* Task list header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Assigned Tasks
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {filteredTasks.length} tasks found
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatusFilter("All");
            setPriorityFilter("All");
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Clear Filters
        </button>
      </div>

      {/* Task cards */}
      <div className="space-y-3">

        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mb-3 text-3xl">🔎</div>

            <h3 className="text-sm font-semibold text-slate-900">
              No tasks found
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        )}

      </div>

      {isCreateModalOpen ? (
        <CreateTaskModal
          tasks={tasks}
          form={taskForm}
          errors={formErrors}
          onChange={updateTaskField}
          onClose={closeCreateModal}
          onSubmit={handleCreateTask}
        />
      ) : null}

    </div>
  );
}

function CreateTaskModal({ tasks, form, errors, onChange, onClose, onSubmit }) {
  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  function renderError(field) {
    return errors[field] ? (
      <span id={`${field}-error`} className="mt-1 block text-xs text-red-600">
        {errors[field]}
      </span>
    ) : null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
              Demo task
            </p>
            <h2 id="create-task-title" className="text-xl font-bold text-slate-900">
              Create a task
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a task to your local demo list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create task dialog"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={(event) => onChange("title", event.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                className={inputClass}
                placeholder="e.g. Design the project overview"
              />
              {renderError("title")}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                rows="3"
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : undefined}
                className={inputClass}
                placeholder="Describe what needs to be done"
              />
              {renderError("description")}
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Project</span>
              <input
                type="text"
                list="task-project-options"
                value={form.project}
                onChange={(event) => onChange("project", event.target.value)}
                aria-invalid={Boolean(errors.project)}
                aria-describedby={errors.project ? "project-error" : undefined}
                className={inputClass}
                placeholder="Enter a project name"
              />
              <datalist id="task-project-options">
                {[...new Set(tasks.map((task) => task.project))].map((project) => (
                  <option key={project} value={project} />
                ))}
              </datalist>
              {renderError("project")}
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => onChange("dueDate", event.target.value)}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
                className={inputClass}
              />
              {renderError("dueDate")}
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Priority</span>
              <select
                value={form.priority}
                onChange={(event) => onChange("priority", event.target.value)}
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? "priority-error" : undefined}
                className={inputClass}
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              {renderError("priority")}
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(event) => onChange("status", event.target.value)}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "status-error" : undefined}
                className={inputClass}
              >
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {renderError("status")}
            </label>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Task
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  danger = false,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-slate-500">
          {label}
        </span>

        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
            danger
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-600",
          ].join(" ")}
        >
          {icon}
        </div>

      </div>

      <div
        className={[
          "mt-3 text-2xl font-bold",
          danger ? "text-red-600" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>

    </div>
  );
}

function TaskCard({ task, onStatusChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        {/* Main information */}
        <div className="min-w-0 flex-1">

          <div className="mb-2 flex flex-wrap items-center gap-2">

            <span className="text-xs font-semibold text-slate-400">
              {task.id}
            </span>

            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
              {task.type}
            </span>

          </div>

          <h3 className="text-sm font-semibold text-slate-900">
            {task.title}
          </h3>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {task.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">

            <span>
              {task.project}
            </span>

            <span className="text-slate-300">
              •
            </span>

            <span>Due {formatDueDate(task.dueDate)}</span>

          </div>

        </div>

        {/* Status / priority */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">

          <PriorityBadge priority={task.priority} />

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="sr-only">Status for {task.title}</span>
            <select
              value={task.status}
              onChange={(event) => onStatusChange(task.id, event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {taskStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

        </div>

      </div>

    </div>
  );
}

function PriorityBadge({ priority }) {
  const classes = {
    High: "bg-red-50 text-red-600",
    Medium: "bg-amber-50 text-amber-700",
    Low: "bg-green-50 text-green-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        classes[priority]
      }`}
    >
      {priority}
    </span>
  );
}

export default MyTasks;