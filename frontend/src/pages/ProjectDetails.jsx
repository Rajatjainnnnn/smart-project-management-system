import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/auth";

const panel = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
const MILESTONE_STATUSES = [
  ["pending", "Pending"],
  ["in_progress", "In Progress"],
  ["completed", "Completed"],
];
const emptyMilestone = { title: "", description: "", due_date: "", status: "pending" };

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function nameOf(user) {
  return user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.username ?? "Team member";
}

function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole] = useState("Member");
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/api/projects/${projectId}/`),
      apiRequest(`/api/projects/${projectId}/members/`),
      apiRequest(`/api/projects/${projectId}/milestones/`),
      apiRequest(`/api/projects/${projectId}/activity/`),
      apiRequest("/api/auth/profile/"),
    ]).then(([projectData, memberData, milestoneData, activityData, profile]) => {
      if (!active) return;
      const projectMembers = asList(memberData);
      setProject(projectData);
      setMembers(projectMembers);
      setMilestones(asList(milestoneData));
      setActivity(asList(activityData));
      const memberRole = projectMembers.find((item) => item.user.id === profile.id)?.role;
      setIsAdmin(
        projectData.owner?.id === profile.id ||
        ["team lead", "project manager", "lead", "owner"].includes(String(memberRole).toLowerCase())
      );
      setError("");
      setState("ready");
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError.message);
      setState("error");
    });
    return () => { active = false; };
  }, [projectId, reload]);

  useEffect(() => {
    if (!query.trim()) {
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      apiRequest(`/api/users/?search=${encodeURIComponent(query.trim())}`)
        .then((result) => { if (active) setUsers(asList(result)); })
        .catch((requestError) => { if (active) setError(requestError.message); });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const memberIds = useMemo(() => new Set(members.map((member) => member.user.id)), [members]);
  const availableUsers = query.trim() ? users.filter((user) => !memberIds.has(user.id)) : [];

  async function addMember(event) {
    event.preventDefault();
    if (!selectedUser) return;
    setError("");
    try {
      await apiRequest(`/api/projects/${projectId}/members/`, {
        method: "POST",
        body: JSON.stringify({ user_id: Number(selectedUser), role }),
      });
      setQuery("");
      setSelectedUser("");
      setUsers([]);
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${nameOf(member.user)} from this project?`)) return;
    setError("");
    try {
      await apiRequest(`/api/projects/${projectId}/members/${member.user.id}/`, { method: "DELETE" });
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createMilestone(event) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest(`/api/projects/${projectId}/milestones/`, {
        method: "POST",
        body: JSON.stringify({ ...milestoneForm, due_date: milestoneForm.due_date || null }),
      });
      setMilestoneForm(emptyMilestone);
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateMilestone(milestone, changes) {
    setError("");
    try {
      await apiRequest(`/api/milestones/${milestone.id}/`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteMilestone(milestone) {
    if (!window.confirm(`Delete milestone "${milestone.title}"?`)) return;
    setError("");
    try {
      await apiRequest(`/api/milestones/${milestone.id}/`, { method: "DELETE" });
      setReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (state === "loading") return <div className="p-8" role="status">Loading project...</div>;
  if (state === "error") return (
    <div className="p-6 sm:p-8">
      <div className={`${panel} text-center`}>
        <h1 className="font-semibold">Could not load project details</h1>
        <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => { setState("loading"); setReload((value) => value + 1); }} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    </div>
  );

  const projectStatus = project.status?.replace("_", " ");
  const completedMilestones = milestones.filter((milestone) => milestone.status === "completed").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link to="/projects" className="text-sm font-medium text-blue-600 no-underline">← All projects</Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Project workspace · {projectStatus}</p><h1 className="mt-1 text-3xl font-bold">{project.name}</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">{project.description || "No project description."}</p></div>
          <Link to={`/projects/${project.id}/board`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white no-underline hover:bg-blue-700">Open Kanban board</Link>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className={panel}><p className="text-sm text-slate-500">Team</p><p className="mt-2 text-2xl font-bold">{members.length}</p></div>
        <div className={panel}><p className="text-sm text-slate-500">Milestones complete</p><p className="mt-2 text-2xl font-bold">{completedMilestones} / {milestones.length}</p></div>
        <div className={panel}><p className="text-sm text-slate-500">Project timeline</p><p className="mt-2 text-sm font-semibold">{project.start_date || "No start date"} → {project.end_date || "No deadline"}</p></div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className={panel}>
          <div className="mb-4 flex items-start justify-between"><div><h2 className="text-lg font-semibold">Team members</h2><p className="mt-1 text-xs text-slate-500">Manage project membership and roles.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{members.length}</span></div>
          <ul className="divide-y divide-slate-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-semibold">{nameOf(member.user)}</p><p className="text-xs text-slate-500">{member.user.email || member.user.username}</p></div>
                <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{member.role}</span>{isAdmin && member.user.id !== project.owner?.id && <button type="button" onClick={() => removeMember(member)} className="text-xs font-semibold text-red-600">Remove</button>}</div>
              </li>
            ))}
            {members.length === 0 && <li className="py-5 text-sm text-slate-500">No project members.</li>}
          </ul>
          {isAdmin && (
            <form onSubmit={addMember} className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-semibold">Add a member</h3>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedUser(""); }} placeholder="Search by name, username or email" className={input} />
                <select required aria-label="Select team member" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} className={input}>
                  <option value="">Select person</option>
                  {availableUsers.map((user) => <option key={user.id} value={user.id}>{nameOf(user)} · {user.username}</option>)}
                </select>
              </div>
              <div className="mt-2 flex gap-2">
                <select value={role} onChange={(event) => setRole(event.target.value)} className={input}><option>Member</option><option>Developer</option><option>Reviewer</option><option>Team Lead</option></select>
                <button type="submit" disabled={!selectedUser} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
              </div>
              {query && availableUsers.length === 0 && <p className="mt-2 text-xs text-slate-500">No available users match this search.</p>}
            </form>
          )}
          {!isAdmin && <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">Only project leads can change team membership.</p>}
        </section>

        <section className={panel}>
          <div className="mb-4"><h2 className="text-lg font-semibold">Academic milestones</h2><p className="mt-1 text-xs text-slate-500">Track proposal, design, development, testing and submission.</p></div>
          <ul className="space-y-2">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">{milestone.title}</p><p className="mt-0.5 text-xs text-slate-500">{milestone.due_date || "No due date"}{milestone.description ? ` · ${milestone.description}` : ""}</p></div>
                <div className="flex items-center gap-2">
                  <select aria-label={`Status for ${milestone.title}`} disabled={!isAdmin} value={milestone.status} onChange={(event) => updateMilestone(milestone, { status: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs disabled:opacity-70">
                    {MILESTONE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {isAdmin && <button type="button" onClick={() => deleteMilestone(milestone)} className="text-xs font-semibold text-red-600">Delete</button>}
                </div>
              </li>
            ))}
            {milestones.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No milestones added yet.</li>}
          </ul>
          {isAdmin && (
            <form onSubmit={createMilestone} className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-semibold">Add milestone</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input required value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} placeholder="Milestone title" className={input} />
                <input type="date" value={milestoneForm.due_date} onChange={(event) => setMilestoneForm((current) => ({ ...current, due_date: event.target.value }))} className={input} />
                <input value={milestoneForm.description} onChange={(event) => setMilestoneForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description (optional)" className={`${input} sm:col-span-2`} />
              </div>
              <button type="submit" className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Add milestone</button>
            </form>
          )}
        </section>
      </div>

      <section className={`${panel} mt-5`}>
        <h2 className="text-lg font-semibold">Recent project activity</h2>
        {activity.length ? (
          <ol className="mt-3 divide-y divide-slate-100">
            {activity.slice(0, 10).map((item) => <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between"><p className="text-sm"><strong>{nameOf(item.user)}</strong> {item.action.toLowerCase()}{item.details ? ` · ${item.details}` : ""}</p><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></li>)}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-500">Activity will appear here as the team works.</p>}
      </section>
    </div>
  );
}

export default ProjectDetails;
