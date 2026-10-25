import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/auth";

const PROJECT_STATUSES = [
  ["planning", "Planning"],
  ["active", "Active"],
  ["on_hold", "On Hold"],
  ["completed", "Completed"],
];
const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const buttonClass =
  "rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60";
const emptyForm = {
  name: "",
  description: "",
  status: "planning",
  start_date: "",
  end_date: "",
};

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status) {
  return PROJECT_STATUSES.find(([value]) => value === status)?.[1] ?? status;
}

function isProjectAdmin(project, userId) {
  const memberRole = project.members?.find((member) => member.user.id === userId)?.role;
  return project.owner?.id === userId ||
    ["team lead", "project manager", "lead", "owner"].includes(String(memberRole).toLowerCase());
}

function ProjectForm({ initial, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Enter a project name.");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("The deadline must be on or after the start date.");
      return;
    }
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Workspace</p>
            <h2 className="mt-1 text-xl font-bold">{initial.id ? "Edit project" : "Create project"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Close">
            ×
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Project name</span>
            <input required value={form.name} onChange={(event) => update("name", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select value={form.status} onChange={(event) => update("status", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Start date</span>
            <input type="date" value={form.start_date ?? ""} onChange={(event) => update("start_date", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Deadline</span>
            <input type="date" value={form.end_date ?? ""} onChange={(event) => update("end_date", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Saving..." : "Save project"}</button>
        </div>
      </form>
    </div>
  );
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [formProject, setFormProject] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/api/projects/"),
      apiRequest("/api/auth/profile/"),
    ]).then(([result, profile]) => {
      if (!active) return;
      setProjects(asList(result));
      setUserId(profile.id);
      setStatus("ready");
      setError("");
    }).catch((loadError) => {
      if (!active) return;
      setError(loadError.message);
      setStatus("error");
    });
    return () => { active = false; };
  }, [reload]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) =>
      (!query || `${project.name} ${project.description}`.toLowerCase().includes(query)) &&
      (filter === "all" || project.status === filter)
    );
  }, [projects, search, filter]);

  async function saveProject(form) {
    setBusy(true);
    try {
      if (form.id) {
        const updated = await apiRequest(`/api/projects/${form.id}/`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
      } else {
        const created = await apiRequest("/api/projects/", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setProjects((current) => [created, ...current]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.name}" and its project data?`)) return;
    setError("");
    try {
      await apiRequest(`/api/projects/${project.id}/`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const stats = {
    total: projects.length,
    active: projects.filter((project) => project.status === "active").length,
    completed: projects.filter((project) => project.status === "completed").length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">Workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Manage shared projects, teams, tasks and academic milestones.</p>
        </div>
        <button type="button" onClick={() => setFormProject({ ...emptyForm })} className={buttonClass}>+ New Project</button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status === "loading" && <p role="status" className={panelClass}>Loading projects...</p>}
      {status === "error" && (
        <div className={`${panelClass} text-center`}>
          <p className="font-semibold">Could not load projects</p>
          <button type="button" onClick={() => { setStatus("loading"); setReload((value) => value + 1); }} className={`${buttonClass} mt-4`}>Try again</button>
        </div>
      )}

      {status === "ready" && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Project statistics">
            {[["Total Projects", stats.total], ["Active Projects", stats.active], ["Completed", stats.completed]].map(([label, value]) => (
              <div className={panelClass} key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div>
            ))}
          </section>

          <section className={`${panelClass} mb-5 flex flex-col gap-3 sm:flex-row`}>
            <input type="search" aria-label="Search projects" placeholder="Search projects..." value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <select aria-label="Filter project status" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="all">All statuses</option>
              {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </section>

          {filteredProjects.length ? (
            <section className="grid gap-4 xl:grid-cols-2" aria-label="Projects">
              {filteredProjects.map((project) => {
                const total = project.task_count ?? 0;
                const complete = project.completed_task_count ?? 0;
                const progress = total ? Math.round(complete * 100 / total) : 0;
                return (
                  <article className={`${panelClass} flex flex-col`} key={project.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold">{project.name}</h2>
                        <p className="mt-1 text-xs text-slate-500">Project #{project.id} · {statusLabel(project.status)}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{progress}%</span>
                    </div>
                    <p className="mt-4 min-h-10 text-sm leading-5 text-slate-600">{project.description || "No description provided."}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${project.name} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <p>Start date <strong className="mt-1 block text-slate-700">{formatDate(project.start_date)}</strong></p>
                      <p>Deadline <strong className="mt-1 block text-slate-700">{formatDate(project.end_date)}</strong></p>
                      <p>Team members <strong className="mt-1 block text-slate-700">{project.members?.length ?? 0}</strong></p>
                      <p>Tasks <strong className="mt-1 block text-slate-700">{complete} / {total} completed</strong></p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link to={`/projects/${project.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white no-underline hover:bg-blue-700">Project details</Link>
                      <Link to={`/projects/${project.id}/board`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50">Open board</Link>
                      {isProjectAdmin(project, userId) && <button type="button" onClick={() => setFormProject({ ...project })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>}
                      {project.owner?.id === userId && <button type="button" onClick={() => deleteProject(project)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className={`${panelClass} py-12 text-center`}>
              <h2 className="font-semibold">No projects found</h2>
              <p className="mt-2 text-sm text-slate-500">Create a project or change your filters.</p>
            </div>
          )}
        </>
      )}
      {formProject && <ProjectForm initial={formProject} busy={busy} onClose={() => setFormProject(null)} onSubmit={saveProject} />}
    </div>
  );
}

export default Projects;
