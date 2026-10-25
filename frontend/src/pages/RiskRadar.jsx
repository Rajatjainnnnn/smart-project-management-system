import { useEffect, useState } from "react";

import { apiRequest } from "../lib/auth";

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";

// Full class strings so Tailwind can detect them (no dynamic class building).
const riskStyles = {
  high: {
    label: "HIGH",
    badge: "bg-[#FEF2F2] text-(--danger)",
    panel: "border-red-200 bg-red-50",
    dot: "bg-red-500",
  },
  medium: {
    label: "MEDIUM",
    badge: "bg-amber-50 text-amber-600",
    panel: "border-amber-200 bg-amber-50",
    dot: "bg-amber-500",
  },
  low: {
    label: "LOW",
    badge: "bg-green-50 text-green-600",
    panel: "border-green-200 bg-green-50",
    dot: "bg-green-500",
  },
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function MessageCard({ title, message, actionLabel, onAction }) {
  return (
    <div className={`${card} px-6 py-12 text-center`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-(--text-secondary)">{message}</p>
      {actionLabel && (
        <button type="button" className={`${primaryButton} mt-5`} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SkeletonBlocks() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading risk details" className="flex flex-col gap-4">
      <div className="h-36 animate-pulse rounded-(--radius) bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-(--radius) bg-slate-200" />
        ))}
      </div>
      <span className="sr-only">Loading risk details...</span>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className={`${card} p-4.75`}>
      <span className="text-xs text-(--text-muted)">{label}</span>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-(--text-muted)">{hint}</div>
    </div>
  );
}

function RiskDetails({ data }) {
  const style = riskStyles[String(data.risk_level).toLowerCase()] ?? riskStyles.low;
  const reasons = Array.isArray(data.reasons) ? data.reasons : [];

  return (
    <>
      <div className={`mb-4 rounded-(--radius) border p-5 sm:p-6 ${style.panel}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${style.badge}`}>
            {style.label} RISK
          </span>
          <h2 className="text-base font-semibold">{data.project_name}</h2>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Why this level?</h3>
        {reasons.length === 0 ? (
          <p className="mt-2 text-[13px] text-(--text-secondary)">No specific reasons were reported.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2.5 text-[13px] text-(--text-secondary)">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Overdue tasks" value={data.overdue_tasks ?? 0} hint="Past their due date and not done" />
        <MetricCard
          label="High-priority open"
          value={data.unfinished_high_priority_tasks ?? 0}
          hint="High-priority tasks not yet done"
        />
        <MetricCard
          label="Pending milestones"
          value={data.pending_milestones ?? 0}
          hint="Not started or in progress"
        />
        <MetricCard
          label="Blocked by dependencies"
          value={data.blocked_tasks ?? 0}
          hint="Open tasks waiting on unfinished work"
        />
      </div>

      {data.generated_at && (
        <p className="text-[11px] text-(--text-muted)">Calculated {formatDate(data.generated_at)}</p>
      )}
    </>
  );
}

function RiskRadar() {
  const [projectsKey, setProjectsKey] = useState(0);
  const [projectsState, setProjectsState] = useState({ status: "loading", projects: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [riskKey, setRiskKey] = useState(0);
  const [riskState, setRiskState] = useState({ status: "loading", data: null });

  const activeId = selectedId ?? projectsState.projects[0]?.id ?? null;

  // Load the list of projects the user can see.
  useEffect(() => {
    let active = true;

    apiRequest("/api/projects/")
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setProjectsState({ status: "ready", projects: list });
      })
      .catch(() => {
        if (!active) return;
        setProjectsState({ status: "error", projects: [] });
      });

    return () => {
      active = false;
    };
  }, [projectsKey]);

  // Load the risk details for the chosen project.
  useEffect(() => {
    if (activeId === null) return undefined;
    let active = true;

    apiRequest(`/api/projects/${activeId}/risk/`)
      .then((data) => {
        if (!active) return;
        setRiskState({ status: "ready", data });
      })
      .catch(() => {
        if (!active) return;
        setRiskState({ status: "error", data: null });
      });

    return () => {
      active = false;
    };
  }, [activeId, riskKey]);

  function retryProjects() {
    setProjectsState({ status: "loading", projects: [] });
    setProjectsKey((key) => key + 1);
  }

  function retryRisk() {
    setRiskState({ status: "loading", data: null });
    setRiskKey((key) => key + 1);
  }

  function handleProjectChange(event) {
    setRiskState({ status: "loading", data: null });
    setSelectedId(Number(event.target.value));
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-(--smart)">SMART</div>
          <h1 className="text-2xl font-bold leading-[1.1] sm:text-[27px]">Risk Radar</h1>
          <p className="mt-1.75 text-[13px] text-(--text-secondary)">
            See how risky a project is and exactly why.
          </p>
        </div>

        {projectsState.status === "ready" && projectsState.projects.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-(--text-secondary)">
            Project
            <select
              value={activeId ?? ""}
              onChange={handleProjectChange}
              className="min-w-56 rounded-lg border border-(--border) bg-white px-3 py-2 text-[13px] font-normal text-(--text-primary)"
            >
              {projectsState.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {projectsState.status === "loading" && <SkeletonBlocks />}

      {projectsState.status === "error" && (
        <MessageCard
          title="Could not load your projects"
          message="Check that the backend is running and you are signed in, then try again."
          actionLabel="Try again"
          onAction={retryProjects}
        />
      )}

      {projectsState.status === "ready" && projectsState.projects.length === 0 && (
        <MessageCard
          title="No projects yet"
          message="Create or join a project to see its risk level here."
        />
      )}

      {projectsState.status === "ready" && activeId !== null && riskState.status === "loading" && <SkeletonBlocks />}

      {projectsState.status === "ready" && activeId !== null && riskState.status === "error" && (
        <MessageCard
          title="Could not load risk details"
          message="Something went wrong while calculating the risk for this project. Please try again."
          actionLabel="Try again"
          onAction={retryRisk}
        />
      )}

      {projectsState.status === "ready" && activeId !== null && riskState.status === "ready" && (
        <RiskDetails data={riskState.data} />
      )}
    </div>
  );
}

export default RiskRadar;
