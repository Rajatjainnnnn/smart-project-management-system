import { useMemo, useState } from "react";

const tasks = [
  {
    id: "TASK-101",
    title: "Create Login API",
    description: "Implement authentication API and token handling.",
    project: "MCA E-Commerce",
    status: "In Progress",
    priority: "High",
    dueDate: "Oct 10",
    type: "Task",
  },
  {
    id: "TASK-102",
    title: "Build Dashboard",
    description: "Create the main project dashboard interface.",
    project: "MCA E-Commerce",
    status: "To Do",
    priority: "Medium",
    dueDate: "Oct 12",
    type: "Task",
  },
  {
    id: "TASK-103",
    title: "Fix Navigation Bug",
    description: "Fix navigation issue on project pages.",
    project: "SPMS",
    status: "Review",
    priority: "High",
    dueDate: "Oct 9",
    type: "Bug",
  },
  {
    id: "TASK-104",
    title: "Database Testing",
    description: "Test project and task database operations.",
    project: "SPMS",
    status: "To Do",
    priority: "Medium",
    dueDate: "Oct 13",
    type: "Task",
  },
  {
    id: "TASK-105",
    title: "Prepare Documentation",
    description: "Prepare technical documentation for the project.",
    project: "SPMS",
    status: "Done",
    priority: "Low",
    dueDate: "Oct 7",
    type: "Task",
  },
  {
    id: "TASK-106",
    title: "Fix Profile Form",
    description: "Resolve validation issues in profile form.",
    project: "SPMS",
    status: "Done",
    priority: "Medium",
    dueDate: "Oct 6",
    type: "Bug",
  },
];

const statusOptions = [
  "All",
  "To Do",
  "In Progress",
  "Review",
  "Done",
];

const priorityOptions = [
  "All",
  "High",
  "Medium",
  "Low",
];

function MyTasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

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
  }, [search, statusFilter, priorityFilter]);

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
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Create Task
        </button>
      </div>

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

function TaskCard({ task }) {
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

            <span>
              Due {task.dueDate}
            </span>

          </div>

        </div>

        {/* Status / priority */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">

          <PriorityBadge priority={task.priority} />

          <StatusBadge status={task.status} />

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

function StatusBadge({ status }) {
  const classes = {
    "To Do": "bg-slate-100 text-slate-600",
    "In Progress": "bg-blue-50 text-blue-600",
    Review: "bg-purple-50 text-purple-600",
    Done: "bg-green-50 text-green-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        classes[status]
      }`}
    >
      {status}
    </span>
  );
}

export default MyTasks;