import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DEMO_PROJECTS_STORAGE_KEY,
  isProjectDeadlineApproaching,
  PROJECT_STATUSES,
  readDemoProjects,
} from "../data/demoProjects";

const PROJECT_FILTERS = ["All", ...PROJECT_STATUSES];

const emptyProjectForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  status: "Planning",
};

function formatDate(date) {
  if (!date) return "Not set";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createProjectId(projects) {
  const usedIds = new Set(projects.map((project) => project.id));
  const highestNumber = projects.reduce((highest, project) => {
    const match = /^PROJ-(\d+)$/.exec(project.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 100);

  let nextNumber = highestNumber + 1;
  while (usedIds.has(`PROJ-${nextNumber}`)) {
    nextNumber += 1;
  }

  return `PROJ-${nextNumber}`;
}

function Projects() {
  const [projectState, setProjectState] = useState(readDemoProjects);
  const { projects, error: storageError } = projectState;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState(emptyProjectForm);
  const [formErrors, setFormErrors] = useState({});
  const [persistenceError, setPersistenceError] = useState("");

  useEffect(() => {
    if (!isCreateModalOpen && !selectedProject) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsCreateModalOpen(false);
        setSelectedProject(null);
        setForm(emptyProjectForm);
        setFormErrors({});
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, selectedProject]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const projectStats = {
    total: projects.length,
    active: projects.filter((project) => project.status === "Active").length,
    completed: projects.filter((project) => project.status === "Completed").length,
    approaching: projects.filter((project) => isProjectDeadlineApproaching(project, today)).length,
  };

  function saveProjects(nextProjects) {
    setProjectState({ projects: nextProjects, error: "" });

    try {
      localStorage.setItem(DEMO_PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
      setPersistenceError("");
    } catch {
      setPersistenceError(
        "Changes are visible for this session but could not be saved in this browser."
      );
    }
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setForm(emptyProjectForm);
    setFormErrors({});
  }

  function updateFormField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  }

  function handleCreateProject(event) {
    event.preventDefault();
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Enter a project name.";
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = "The deadline must be on or after the start date.";
    }
    if (!PROJECT_STATUSES.includes(form.status)) {
      errors.status = "Select a valid project status.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newProject = {
      id: createProjectId(projects),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      progress: 0,
      memberCount: 0,
      taskCount: 0,
      completedTaskCount: 0,
    };

    saveProjects([newProject, ...projects]);
    closeCreateModal();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-5 sm:p-6 lg:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Workspace
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your projects, track progress, and keep important deadlines in view.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:self-auto"
        >
          <span aria-hidden="true">+</span> New Project
        </button>
      </div>

      <div className="mb-6 flex gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        <span className="mt-0.5 shrink-0" aria-hidden="true">✦</span>
        <p>
          These are demo projects saved in this browser only. They are temporary
          frontend data and are not connected to the Django database.
        </p>
      </div>

      {storageError || persistenceError ? (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {persistenceError || storageError}
        </p>
      ) : null}

      <section aria-label="Project statistics" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={projectStats.total} icon="▣" tone="blue" />
        <StatCard label="Active Projects" value={projectStats.active} icon="◷" tone="blue" />
        <StatCard label="Completed Projects" value={projectStats.completed} icon="✓" tone="green" />
        <StatCard label="Deadlines Approaching" value={projectStats.approaching} icon="!" tone="amber" />
      </section>

      <section aria-label="Project search and filters" className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search projects</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by project name or description..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter by project status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto"
            >
              {PROJECT_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!search && statusFilter === "All"}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            Clear Filters
          </button>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your Projects</h2>
          <p className="mt-1 text-xs text-slate-500">
            {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"} found
          </p>
        </div>
      </div>

      {filteredProjects.length ? (
        <section aria-label="Projects" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onViewDetails={() => setSelectedProject(project)}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-600" aria-hidden="true">
            ▣
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No projects found</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Try another search or status filter, or create a project to get started.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Project
            </button>
          </div>
        </div>
      )}

      {isCreateModalOpen ? (
        <ProjectFormModal
          form={form}
          errors={formErrors}
          onChange={updateFormField}
          onClose={closeCreateModal}
          onSubmit={handleCreateProject}
        />
      ) : null}

      {selectedProject ? (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${toneClasses[tone]}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function ProjectCard({ project, onViewDetails }) {
  const statusClasses = {
    Planning: "bg-violet-50 text-violet-700",
    Active: "bg-blue-50 text-blue-700",
    Completed: "bg-green-50 text-green-700",
    "On Hold": "bg-amber-50 text-amber-800",
  };

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600" aria-hidden="true">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {project.id}
            </p>
            <h3 className="break-words text-base font-semibold text-slate-900">
              {project.name}
            </h3>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[project.status]}`}>
          {project.status}
        </span>
      </div>

      <p className="mt-4 min-h-10 text-sm leading-5 text-slate-600">
        {project.description || "No description provided."}
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Project progress</span>
          <span className="font-semibold text-slate-900">{project.progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${project.name} progress`}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={project.progress}
          className="h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
        <div>
          <p className="text-slate-400">Start date</p>
          <p className="mt-1 font-medium text-slate-700">{formatDate(project.startDate)}</p>
        </div>
        <div>
          <p className="text-slate-400">Deadline</p>
          <p className="mt-1 font-medium text-slate-700">{formatDate(project.endDate)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
        {project.memberCount !== undefined ? (
          <span>
            <strong className="font-semibold text-slate-700">{project.memberCount}</strong>{" "}
            {project.memberCount === 1 ? "member" : "members"}
          </span>
        ) : null}
        {project.taskCount !== undefined && project.completedTaskCount !== undefined ? (
          <span>
            <strong className="font-semibold text-slate-700">
              {project.completedTaskCount}/{project.taskCount}
            </strong>{" "}
            tasks completed
          </span>
        ) : null}
      </div>

      <div className="mt-auto pt-5">
        <Link
          to={`/projects/${project.id}/board`}
          className="mb-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Open Kanban board
        </Link>
        <button
          type="button"
          onClick={onViewDetails}
          className="w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
        >
          View project details
        </button>
      </div>
    </article>
  );
}

function ProjectFormModal({ form, errors, onChange, onClose, onSubmit }) {
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
        aria-labelledby="create-project-title"
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
              Demo project
            </p>
            <h2 id="create-project-title" className="text-xl font-bold text-slate-900">
              Create a project
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a project to your local demo workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create project dialog"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Project name <span className="text-red-600">*</span>
              </span>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={inputClass}
                placeholder="e.g. Student Research Portal"
              />
              {renderError("name")}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                rows="3"
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                className={inputClass}
                placeholder="What is this project about?"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Start date</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => onChange("startDate", event.target.value)}
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">End date / deadline</span>
              <input
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(event) => onChange("endDate", event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? "endDate-error" : undefined}
                className={inputClass}
              />
              {renderError("endDate")}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Initial status</span>
              <select
                value={form.status}
                onChange={(event) => onChange("status", event.target.value)}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "status-error" : undefined}
                className={inputClass}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {renderError("status")}
            </label>
          </div>

          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
            New projects start at 0% progress with no members or tasks. You can update
            these when the project data is connected.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              Create Project
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProjectDetailsModal({ project, onClose }) {
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
        aria-labelledby="project-details-title"
        className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {project.id}
            </p>
            <h2 id="project-details-title" className="text-xl font-bold text-slate-900">
              {project.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p className="text-sm leading-6 text-slate-600">
              {project.description || "No description provided."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Status" value={project.status} />
            <DetailItem label="Progress" value={`${project.progress}%`} />
            <DetailItem label="Start date" value={formatDate(project.startDate)} />
            <DetailItem label="Deadline" value={formatDate(project.endDate)} />
            {project.memberCount !== undefined ? (
              <DetailItem label="Members" value={project.memberCount} />
            ) : null}
            {project.taskCount !== undefined && project.completedTaskCount !== undefined ? (
              <DetailItem
                label="Tasks completed"
                value={`${project.completedTaskCount} of ${project.taskCount}`}
              />
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Close details
        </button>
      </section>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default Projects;
