import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/auth";

const COLUMNS = [
  ["todo", "To Do"],
  ["in_progress", "In Progress"],
  ["review", "Review"],
  ["done", "Done"],
];
const PRIORITIES = ["high", "medium", "low"];

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function dateLabel(value) {
  if (!value) return "No due date";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KanbanBoard() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [dragging, setDragging] = useState(null);
  const [reload, setReload] = useState(0);
  const [loadedProjectId, setLoadedProjectId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/api/projects/${projectId}/`),
      apiRequest(`/api/projects/${projectId}/tasks/`),
    ]).then(([projectData, taskData]) => {
      if (!active) return;
      setProject(projectData);
      setTasks(asList(taskData));
      setLoadedProjectId(projectId);
      setError("");
      setStatus("ready");
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError.message);
      setStatus("error");
      setLoadedProjectId(projectId);
    });
    return () => { active = false; };
  }, [projectId, reload]);

  const filteredTasks = useMemo(() => tasks.filter((task) =>
    (!search.trim() || `${task.title} ${task.description}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (priority === "all" || task.priority === priority)
  ), [tasks, search, priority]);

  async function moveTask(taskId, nextStatus) {
    setError("");
    try {
      const updated = await apiRequest(`/api/tasks/${taskId}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...updated } : task));
    } catch (requestError) {
      setError(requestError.message);
    }
    setDragging(null);
  }

  if (status === "loading" || loadedProjectId !== projectId) {
    return <div className="p-8" role="status">Loading project board...</div>;
  }

  if (status === "error") {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <h1 className="font-semibold">Could not load this project board</h1>
          <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => { setStatus("loading"); setReload((value) => value + 1); }} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/projects" className="mb-3 inline-flex text-sm font-medium text-blue-600 no-underline">← All projects</Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-700">Kanban board</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{project?.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Changes are saved to the shared project database.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="search" aria-label="Search board tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <select aria-label="Filter board by priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="all">All priorities</option>{PRIORITIES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
          </select>
          <Link to="/tasks" className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white no-underline hover:bg-blue-700">Create work</Link>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section aria-label={`${project?.name} Kanban board`} className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map(([key, label]) => {
          const columnTasks = filteredTasks.filter((task) => task.status === key);
          return (
            <div key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              event.preventDefault();
              const taskId = Number(event.dataTransfer.getData("text/plain") || dragging);
              if (taskId) moveTask(taskId, key);
            }} className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{label}</h2><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold">{columnTasks.length}</span></div>
              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.map((task) => (
                  <article key={task.id} draggable onDragStart={(event) => {
                    setDragging(task.id);
                    event.dataTransfer.setData("text/plain", String(task.id));
                    event.dataTransfer.effectAllowed = "move";
                  }} onDragEnd={() => setDragging(null)} className={`cursor-grab rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${dragging === task.id ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2"><span className="text-[11px] text-slate-400">TASK-{task.id}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold capitalize">{task.priority}</span></div>
                    <h3 className="mt-2 text-sm font-semibold">{task.title}</h3>
                    {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
                    <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <p>Due {dateLabel(task.due_date)}</p>
                      <p className="mt-1">Assignee: {task.assignee?.first_name || task.assignee?.username || "Unassigned"}</p>
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Move TASK-{task.id}</span>
                      <select value={task.status} onChange={(event) => moveTask(task.id, event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs">
                        {COLUMNS.map(([statusKey, statusLabel]) => <option key={statusKey} value={statusKey}>{statusLabel}</option>)}
                      </select>
                    </label>
                  </article>
                ))}
                {columnTasks.length === 0 && <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center text-xs text-slate-500">{tasks.length === 0 ? "No project tasks yet." : "Drop work here or use the status selector."}</div>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default KanbanBoard;
