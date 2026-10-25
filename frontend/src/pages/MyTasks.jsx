import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/auth";

const STATUSES = [
  ["todo", "To Do"],
  ["in_progress", "In Progress"],
  ["review", "Review"],
  ["done", "Done"],
];
const PRIORITIES = [["high", "High"], ["medium", "Medium"], ["low", "Low"]];
const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const actionClass = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50";
const initialForm = {
  title: "",
  description: "",
  project: "",
  issue_type: "task",
  status: "todo",
  priority: "medium",
  due_date: "",
  estimated_effort: 1,
  assignee_id: "",
  required_skill_ids: [],
  dependency_ids: [],
};

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function isProjectAdmin(project, userId) {
  const memberRole = project?.members?.find((member) => member.user.id === userId)?.role;
  return project?.owner?.id === userId ||
    ["team lead", "project manager", "lead", "owner"].includes(String(memberRole).toLowerCase());
}

function dateLabel(value) {
  if (!value) return "No deadline";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskEditor({ initial, projects, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.project) {
      return;
    }
    let active = true;
    Promise.all([
      apiRequest(`/api/projects/${form.project}/members/`),
      apiRequest("/api/skills/"),
      apiRequest(`/api/projects/${form.project}/tasks/`),
    ]).then(([membersResult, skillsResult, tasksResult]) => {
      if (!active) return;
      setMembers(asList(membersResult));
      setSkills(asList(skillsResult));
      setProjectTasks(asList(tasksResult));
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    });
    return () => { active = false; };
  }, [form.project]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.project) {
      setError("Choose a project and enter a task title.");
      return;
    }
    setBusy(true);
    setError("");
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      issue_type: form.issue_type,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      estimated_effort: Number(form.estimated_effort),
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      required_skill_ids: form.required_skill_ids.map(Number),
      dependency_ids: form.dependency_ids.map(Number),
    };
    try {
      await onSave(form.id, form.project, body);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <form onSubmit={submit} className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{form.id ? "Update work" : "New work"}</p>
            <h2 className="mt-1 text-xl font-bold">{form.id ? "Edit task" : "Create task or bug"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-400">×</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input required value={form.title} onChange={(event) => update("title", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Project</span>
            <select required disabled={Boolean(form.id)} value={form.project} onChange={(event) => update("project", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">Choose project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Work type</span>
            <select value={form.issue_type} onChange={(event) => update("issue_type", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="task">Task</option><option value="bug">Bug</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select value={form.status} onChange={(event) => update("status", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              {STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Priority</span>
            <select value={form.priority} onChange={(event) => update("priority", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              {PRIORITIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Deadline</span>
            <input type="date" value={form.due_date ?? ""} onChange={(event) => update("due_date", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Estimated effort (hours)</span>
            <input type="number" min="1" value={form.estimated_effort} onChange={(event) => update("estimated_effort", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Assign to</span>
            <select value={form.assignee_id ?? ""} onChange={(event) => update("assignee_id", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">Unassigned</option>
              {members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.first_name || member.user.username}</option>)}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Required skills</legend>
            {skills.length === 0 ? <p className="text-xs text-slate-500">No skills in the catalogue yet. Add skills in Profile & Skills.</p> : (
              <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                {skills.map((skill) => (
                  <label key={skill.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={form.required_skill_ids.map(Number).includes(skill.id)} onChange={(event) => update(
                      "required_skill_ids",
                      event.target.checked
                        ? [...form.required_skill_ids, skill.id]
                        : form.required_skill_ids.filter((id) => Number(id) !== skill.id)
                    )} />
                    {skill.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Blocked by (optional dependencies)</legend>
            <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              {projectTasks.filter((task) => task.id !== form.id).map((task) => (
                <label key={task.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.dependency_ids.map(Number).includes(task.id)} onChange={(event) => update(
                    "dependency_ids",
                    event.target.checked
                      ? [...form.dependency_ids, task.id]
                      : form.dependency_ids.filter((id) => Number(id) !== task.id)
                  )} />
                  TASK-{task.id} · {task.title} ({task.status.replace("_", " ")})
                </label>
              ))}
              {projectTasks.filter((task) => task.id !== form.id).length === 0 && <p className="text-xs text-slate-500">No other project tasks to depend on yet.</p>}
            </div>
          </fieldset>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={actionClass}>Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function CommentsDialog({ task, onClose }) {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/api/tasks/${task.id}/comments/`),
      apiRequest(`/api/tasks/${task.id}/attachments/`),
    ]).then(([commentResult, attachmentResult]) => {
      if (active) {
        setComments(asList(commentResult));
        setAttachments(asList(attachmentResult));
      }
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    });
    return () => { active = false; };
  }, [task.id, reload]);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/tasks/${task.id}/comments/`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody("");
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(event) {
    event.preventDefault();
    if (!file) return;
    const formElement = event.currentTarget;
    setAttachmentBusy(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiRequest(`/api/tasks/${task.id}/attachments/`, {
        method: "POST",
        body: formData,
      });
      setFile(null);
      formElement.reset();
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function downloadAttachment(attachment) {
    setError("");
    try {
      const blob = await apiRequest(attachment.download_url, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.original_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-blue-600">Collaboration</p><h2 className="mt-1 text-lg font-bold">{task.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-400">×</button>
        </div>
        <div className="my-4 max-h-64 space-y-3 overflow-y-auto">
          {comments.length === 0 ? <p className="text-sm text-slate-500">No comments yet.</p> : comments.map((comment) => (
            <article key={comment.id} className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm">{comment.body}</p>
              <p className="mt-2 text-xs text-slate-500">{comment.author?.first_name || comment.author?.username || "Team member"} · {new Date(comment.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
        <section className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold">Attachments</h3>
          <ul className="mt-2 space-y-2">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="truncate">{attachment.original_name} · {(attachment.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => downloadAttachment(attachment)} className="shrink-0 font-semibold text-blue-700">Download</button>
              </li>
            ))}
            {attachments.length === 0 && <li className="text-xs text-slate-500">No attachments yet.</li>}
          </ul>
          <form onSubmit={uploadAttachment} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="file" accept=".csv,.docx,.jpeg,.jpg,.md,.pdf,.png,.txt,.xlsx,.zip" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs" />
            <button type="submit" disabled={!file || attachmentBusy} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">{attachmentBusy ? "Uploading..." : "Upload file"}</button>
          </form>
          <p className="mt-1 text-[11px] text-slate-500">PDF, documents, images and spreadsheets up to 10 MB.</p>
        </section>
        <form onSubmit={submit} className="space-y-3">
          <textarea required rows="3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a comment..." className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end"><button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Posting..." : "Post comment"}</button></div>
        </form>
      </section>
    </div>
  );
}

function RecommendationDialog({ task, onClose, onAssigned }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/projects/${task.project}/tasks/${task.id}/recommendation/`)
      .then((data) => { if (active) setItems(data.recommendations ?? []); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [task.id, task.project]);

  async function assign(item) {
    setBusyId(item.user.id);
    setError("");
    try {
      await apiRequest(`/api/tasks/${task.id}/assign/`, {
        method: "PATCH",
        body: JSON.stringify({ assignee_id: item.user.id }),
      });
      onAssigned();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-violet-700">Skill match</p><h2 className="mt-1 text-lg font-bold">{task.title}</h2></div><button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-400">×</button></div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.user.id} className="flex items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-semibold">{item.user.first_name || item.user.username}</p><p className="text-xs text-slate-500">Skill fit: {item.match_score}%</p></div>
              <button type="button" onClick={() => assign(item)} disabled={busyId !== null} className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-50">{busyId === item.user.id ? "Assigning..." : "Assign"}</button>
            </li>
          ))}
          {items.length === 0 && !error && <li className="py-4 text-sm text-slate-500">No matching members yet. Add skill proficiencies to your team profiles.</li>}
        </ul>
      </section>
    </div>
  );
}

function MyTasks({ issueType = "all" }) {
  const [projects, setProjects] = useState([]);
  const [userId, setUserId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [editor, setEditor] = useState(null);
  const [commentsTask, setCommentsTask] = useState(null);
  const [recommendationTask, setRecommendationTask] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/api/projects/"),
      issueType === "bug" ? null : apiRequest("/api/my-tasks/"),
      apiRequest("/api/auth/profile/"),
    ]).then(async ([projectResponse, myTaskResponse, profile]) => {
      const projectList = asList(projectResponse);
      const taskList = issueType === "bug"
        ? (await Promise.all(projectList.map(async (project) => {
          const projectTasks = asList(await apiRequest(`/api/projects/${project.id}/tasks/`));
          return projectTasks.filter((task) => task.issue_type === "bug").map((task) => ({ ...task, project_name: project.name }));
        }))).flat()
        : asList(myTaskResponse).map((task) => ({
          ...task,
          project_name: projectList.find((project) => project.id === task.project)?.name ?? "Project",
        }));
      if (active) {
        setProjects(projectList);
        setUserId(profile.id);
        setTasks(taskList);
        setStatus("ready");
        setError("");
      }
    }).catch((requestError) => {
      if (active) {
        setError(requestError.message);
        setStatus("error");
      }
    });
    return () => { active = false; };
  }, [reload, issueType]);

  const visibleTasks = useMemo(() => tasks.filter((task) =>
    (issueType === "all" || task.issue_type === issueType) &&
    (statusFilter === "all" || task.status === statusFilter) &&
    (priorityFilter === "all" || task.priority === priorityFilter) &&
    (!search.trim() || `${task.title} ${task.description} ${task.project_name}`.toLowerCase().includes(search.trim().toLowerCase()))
  ), [tasks, issueType, statusFilter, priorityFilter, search]);
  const manageableProjects = projects.filter((project) => isProjectAdmin(project, userId));

  async function saveTask(id, projectId, body) {
    if (id) {
      await apiRequest(`/api/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
    } else {
      await apiRequest(`/api/projects/${projectId}/tasks/`, { method: "POST", body: JSON.stringify(body) });
    }
    setReload((value) => value + 1);
  }

  async function changeStatus(task, nextStatus) {
    setError("");
    try {
      const updated = await apiRequest(`/api/tasks/${task.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...updated } : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiRequest(`/api/tasks/${task.id}/`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const heading = issueType === "bug" ? "Bug Management" : "My Tasks";
  const assignedTasks = visibleTasks.filter((task) => task.assignee);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = visibleTasks.filter((task) => task.status !== "done" && task.due_date && task.due_date < today).length;
  const inProgress = visibleTasks.filter((task) => task.status === "in_progress").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Workspace</p><h1 className="mt-1 text-3xl font-bold">{heading}</h1><p className="mt-1 text-sm text-slate-500">{issueType === "bug" ? "Track and resolve project bugs." : "Shared tasks from your projects, updated in real time."}</p></div>
        <button type="button" onClick={() => setEditor({ ...initialForm, issue_type: issueType === "bug" ? "bug" : "task", project: manageableProjects[0] ? String(manageableProjects[0].id) : "" })} disabled={!manageableProjects.length} title={!manageableProjects.length ? "Project lead permission is required to create work" : undefined} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">+ Create {issueType === "bug" ? "bug" : "task"}</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status === "loading" && <div role="status" className={panelClass}>Loading tasks...</div>}
      {status === "error" && <div className={`${panelClass} text-center`}><p>Could not load tasks.</p><button type="button" onClick={() => { setStatus("loading"); setReload((value) => value + 1); }} className={`${actionClass} mt-3`}>Try again</button></div>}
      {status === "ready" && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {[["Tasks", visibleTasks.length], ["In progress", inProgress], ["Overdue", overdue]].map(([label, value]) => <div className={panelClass} key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
          </div>
          <div className={`${panelClass} mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]`}>
            <input type="search" aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or projects..." className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option>{STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All priorities</option>{PRIORITIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          </div>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Project work</h2><span className="text-xs text-slate-500">{visibleTasks.length} items</span></div>
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <article key={task.id} className={`${panelClass} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>TASK-{task.id}</span><span>·</span><span>{task.project_name}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase">{task.issue_type}</span></div>
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{task.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">Assigned to {task.assignee?.first_name || task.assignee?.username || "Nobody"} · Due {dateLabel(task.due_date)} · {task.estimated_effort}h{task.dependencies?.length ? ` · ${task.dependencies.length} dependency` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">{task.priority}</span>
                  {(isProjectAdmin(projects.find((project) => project.id === task.project), userId) || task.assignee?.id === userId) && <select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(event) => changeStatus(task, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">{STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
                  <button type="button" onClick={() => setCommentsTask(task)} className={actionClass}>Comments</button>
                  {isProjectAdmin(projects.find((project) => project.id === task.project), userId) && <button type="button" onClick={() => setRecommendationTask(task)} className={actionClass}>Match</button>}
                  {isProjectAdmin(projects.find((project) => project.id === task.project), userId) && <button type="button" onClick={() => setEditor({
                    ...task,
                    project: String(task.project),
                    assignee_id: task.assignee?.id ? String(task.assignee.id) : "",
                    required_skill_ids: (task.required_skills ?? []).map((skill) => skill.id),
                    dependency_ids: task.dependencies ?? [],
                  })} className={actionClass}>Edit</button>}
                  {isProjectAdmin(projects.find((project) => project.id === task.project), userId) && <button type="button" onClick={() => deleteTask(task)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>}
                  <Link to={`/projects/${task.project}/board`} className="text-xs font-semibold text-blue-700">Board</Link>
                </div>
              </article>
            ))}
            {visibleTasks.length === 0 && <div className={`${panelClass} py-12 text-center text-sm text-slate-500`}>{assignedTasks.length === 0 && issueType === "all" ? "No tasks are assigned to you yet." : "No tasks match these filters."}</div>}
          </div>
        </>
      )}
      {editor && <TaskEditor initial={editor} projects={manageableProjects} onClose={() => setEditor(null)} onSave={saveTask} />}
      {commentsTask && <CommentsDialog task={commentsTask} onClose={() => setCommentsTask(null)} />}
      {recommendationTask && <RecommendationDialog task={recommendationTask} onClose={() => setRecommendationTask(null)} onAssigned={() => setReload((value) => value + 1)} />}
    </div>
  );
}

export default MyTasks;
