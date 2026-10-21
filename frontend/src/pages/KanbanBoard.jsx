import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { readDemoProjects } from "../data/demoProjects";
import {
  persistDemoTasks,
  readDemoTasks,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../data/demoTasks";

function normalizeProjectLabel(value) {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function getTaskProjectLabel(task) {
  if (typeof task.project === "string") return task.project;
  if (typeof task.project?.name === "string") return task.project.name;
  return "";
}

function taskBelongsToProject(task, project) {
  const projectId = task.projectId ?? task.project_id;
  if (projectId && String(projectId) === project.id) return true;

  const taskProjectKey = normalizeProjectLabel(getTaskProjectLabel(task));
  const projectNameKey = normalizeProjectLabel(project.name);
  if (!taskProjectKey || !projectNameKey) return false;

  const acronym = project.name
    .split(/[^a-z\d]+/i)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();

  return (
    projectNameKey === taskProjectKey ||
    projectNameKey.startsWith(taskProjectKey) ||
    taskProjectKey === acronym
  );
}

function formatDueDate(dueDate) {
  if (!dueDate) return "Not set";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate;

  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMemberName(task) {
  const member =
    task.assignee?.name ??
    task.assignee ??
    task.assignedTo?.name ??
    task.assignedTo ??
    task.member?.name ??
    task.member ??
    task.memberName;

  return typeof member === "string" ? member : "";
}

function KanbanBoard() {
  const { projectId } = useParams();
  const [projectState] = useState(readDemoProjects);
  const [taskState, setTaskState] = useState(readDemoTasks);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [persistenceError, setPersistenceError] = useState("");
  const project = projectState.projects.find((item) => item.id === projectId);

  const projectTasks = useMemo(
    () => (project ? taskState.tasks.filter((task) => taskBelongsToProject(task, project)) : []),
    [project, taskState.tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projectTasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.id.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query);
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [projectTasks, search, priorityFilter]);

  function moveTask(taskId, status) {
    if (!TASK_STATUSES.includes(status)) return;

    const nextTasks = taskState.tasks.map((task) =>
      task.id === taskId ? { ...task, status } : task
    );
    setTaskState({ tasks: nextTasks, error: "" });
    setPersistenceError(persistDemoTasks(nextTasks));
  }

  function handleDrop(event, status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) moveTask(taskId, status);
    setDraggedTaskId("");
  }

  function clearFilters() {
    setSearch("");
    setPriorityFilter("All");
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 p-5 sm:p-8">
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Project not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This project may have been removed from the local demo data.
          </p>
          <Link
            to="/projects"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/projects"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <span aria-hidden="true">←</span> All projects
          </Link>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
            Project board
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Move work through each stage and keep your team aligned.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1 sm:min-w-60">
            <span className="sr-only">Search board tasks</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter tasks by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All priorities</option>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority} priority</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!search && priorityFilter === "All"}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800">
        Demo board only: task status changes are stored in this browser and shared with My Tasks.
        They are not saved to the Django database.
      </div>

      {projectState.error || taskState.error || persistenceError ? (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {persistenceError || taskState.error || projectState.error}
        </p>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Board tasks</h2>
        <p className="text-xs text-slate-500">
          {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </p>
      </div>

      <section aria-label={`${project.name} Kanban board`} className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const columnTasks = filteredTasks.filter((task) => task.status === status);
          return (
            <div
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, status)}
              className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">{status}</h3>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-slate-600">
                  {columnTasks.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectName={project.name}
                      isDragging={draggedTaskId === task.id}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", task.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedTaskId(task.id);
                      }}
                      onDragEnd={() => setDraggedTaskId("")}
                      onStatusChange={(nextStatus) => moveTask(task.id, nextStatus)}
                    />
                  ))
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center text-xs text-slate-500">
                    {projectTasks.length === 0
                      ? "No tasks are linked to this project yet."
                      : "No tasks in this column."}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function TaskCard({ task, projectName, isDragging, onDragStart, onDragEnd, onStatusChange }) {
  const priorityClasses = {
    High: "bg-red-50 text-red-700",
    Medium: "bg-amber-50 text-amber-800",
    Low: "bg-green-50 text-green-700",
  };
  const memberName = getMemberName(task);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {task.id}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${priorityClasses[task.priority] || "bg-slate-100 text-slate-600"}`}>
          {task.priority || "No priority"}
        </span>
      </div>
      <h4 className="text-sm font-semibold leading-5 text-slate-900">{task.title}</h4>
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p className="flex items-center justify-between gap-2">
          <span>Due</span>
          <span className="font-medium text-slate-700">{formatDueDate(task.dueDate)}</span>
        </p>
        <p className="flex items-center justify-between gap-2">
          <span>Project</span>
          <span className="max-w-[70%] truncate text-right font-medium text-slate-700">
            {getTaskProjectLabel(task) || projectName}
          </span>
        </p>
        {memberName ? (
          <p className="flex items-center justify-between gap-2">
            <span>Member</span>
            <span className="truncate font-medium text-slate-700">{memberName}</span>
          </p>
        ) : null}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Change status for {task.id}</span>
        <select
          value={task.status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

export default KanbanBoard;
