import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/auth";

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function Team() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/projects/").then((result) => {
      if (!active) return;
      const list = asList(result);
      setProjects(list);
      setProjectId(list[0] ? String(list[0].id) : "");
      setStatus("ready");
    }).catch((requestError) => {
      if (active) {
        setError(requestError.message);
        setStatus("error");
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }
    let active = true;
    apiRequest(`/api/projects/${projectId}/members/`).then((result) => {
      if (active) setMembers(asList(result));
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    });
    return () => { active = false; };
  }, [projectId]);

  const project = projects.find((item) => String(item.id) === projectId);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Workspace</p><h1 className="mt-1 text-3xl font-bold">Team</h1><p className="mt-1 text-sm text-slate-500">See project members, roles and team profiles.</p></div>
        {projects.length > 0 && <select aria-label="Choose project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status === "loading" && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5">Loading team...</p>}
      {status === "ready" && !project && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">No project teams yet</h2><p className="mt-2 text-sm text-slate-500">Create a project to organize a team.</p><Link to="/projects" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline">Go to projects</Link></div>}
      {project && (
        <>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{project.name}</h2><Link to={`/projects/${project.id}`} className="text-sm font-semibold text-blue-600 no-underline">Manage team →</Link></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">{(member.user.first_name || member.user.username || "?").slice(0, 1).toUpperCase()}</span><div><h3 className="font-semibold">{member.user.first_name ? `${member.user.first_name} ${member.user.last_name || ""}`.trim() : member.user.username}</h3><p className="text-xs text-slate-500">{member.user.username}</p></div></div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Project role</span><strong>{member.role}</strong></div>
                {member.user.profile?.department && <p className="mt-2 text-xs text-slate-500">{member.user.profile.department}</p>}
              </article>
            ))}
            {members.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">No members in this project.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default Team;
