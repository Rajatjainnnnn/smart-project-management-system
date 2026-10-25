import { useEffect, useState } from "react";

import { apiRequest } from "../lib/auth";

const panel = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};
const PRIORITY_LABELS = { high: "High", medium: "Medium", low: "Low" };

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function Breakdown({ title, values, labels }) {
  const entries = Object.entries(values ?? {});
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <section className={panel}>
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-4 space-y-4">
        {entries.map(([key, count]) => (
          <li key={key}>
            <div className="mb-1 flex justify-between text-xs"><span>{labels[key] ?? key}</span><strong>{count}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(count * 100 / max)}%` }} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Analytics() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [loadedProjectId, setLoadedProjectId] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest("/api/projects/").then((result) => {
      if (!active) return;
      const items = asList(result);
      setProjects(items);
      setProjectId(items[0] ? String(items[0].id) : "");
      setStatus("ready");
    }).catch((requestError) => {
      if (active) {
        setError(requestError.message);
        setStatus("error");
      }
    });
    return () => { active = false; };
  }, [retryKey]);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }
    let active = true;
    apiRequest(`/api/projects/${projectId}/analytics/`).then((result) => {
      if (active) {
        setData(result);
        setLoadedProjectId(projectId);
        setStatus("ready");
        setError("");
      }
    }).catch((requestError) => {
      if (active) {
        setLoadedProjectId(projectId);
        setError(requestError.message);
        setStatus("error");
      }
    });
    return () => { active = false; };
  }, [projectId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Smart insights</p><h1 className="mt-1 text-3xl font-bold">Analytics</h1><p className="mt-1 text-sm text-slate-500">Live progress, task mix, milestone status and explainable risk.</p></div>
        {projects.length > 0 && <label className="text-xs font-semibold text-slate-600">Project<select value={projectId} onChange={(event) => { setData(null); setStatus("loading"); setProjectId(event.target.value); }} className="mt-1 block min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {(status === "loading" || (projectId && loadedProjectId !== projectId)) && <p role="status" className={panel}>Calculating analytics...</p>}
      {status === "error" && <button type="button" onClick={() => setRetryKey((value) => value + 1)} className={panel}>Try again</button>}
      {status === "ready" && !data && <p className={panel}>Create or join a project to see analytics.</p>}
      {status === "ready" && data && (
        <>
          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Completion", `${data.completion_percentage}%`],
              ["Tasks", data.total_tasks],
              ["Overdue", data.overdue_tasks],
              ["Pending milestones", data.pending_milestones],
              ["Waiting on dependencies", data.blocked_tasks],
            ].map(([label, value]) => <article key={label} className={panel}><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Tasks by status" values={data.status_breakdown} labels={STATUS_LABELS} />
            <Breakdown title="Tasks by priority" values={data.priority_breakdown} labels={PRIORITY_LABELS} />
          </div>
          <section className={`${panel} mt-4`}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Risk: {String(data.risk_level).toUpperCase()}</h2><span className="text-xs text-slate-500">{data.milestone_count} academic milestones</span></div>
            <ul className="mt-3 space-y-2">{(data.risk_reasons ?? []).map((reason) => <li key={reason} className="text-sm text-slate-600">• {reason}</li>)}</ul>
          </section>
          <p className="mt-4 text-xs text-slate-500">Contribution and workload scores are activity indicators, not measures of a student's ability or personal worth.</p>
        </>
      )}
    </div>
  );
}

export default Analytics;
