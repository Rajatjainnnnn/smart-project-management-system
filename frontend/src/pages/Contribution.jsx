import { useEffect, useState } from "react";

import { apiRequest } from "../lib/auth";

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";

// Full class strings so Tailwind can detect them (no dynamic class building).
const levelStyles = {
  high: { label: "High", badge: "bg-green-50 text-green-600", bar: "bg-green-500" },
  medium: { label: "Medium", badge: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  low: { label: "Low", badge: "bg-slate-100 text-slate-600", bar: "bg-slate-400" },
};

function displayName(user) {
  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
  return fullName || user?.username || "Unknown";
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
    <div role="status" aria-live="polite" aria-label="Loading contribution" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-(--radius) bg-slate-200" />
      ))}
      <span className="sr-only">Loading contribution...</span>
    </div>
  );
}

function ContributorRow({ entry, rank, maxScore }) {
  const style = levelStyles[entry.level] ?? levelStyles.low;
  const score = Math.max(0, Number(entry.score) || 0);
  const percent = Math.min(100, Math.round((score / maxScore) * 100));

  return (
    <li className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-(--text-secondary)"
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
          <strong className="truncate text-sm">{displayName(entry.user)}</strong>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badge}`}>{style.label}</span>
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${displayName(entry.user)} activity score`}
      >
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${percent}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] text-(--text-muted)">Completed</dt>
          <dd className="text-base font-bold">{entry.completed_tasks ?? 0}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-(--text-muted)">On time</dt>
          <dd className="text-base font-bold">{entry.on_time_completion ?? 0}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-(--text-muted)">Comments</dt>
          <dd className="text-base font-bold">{entry.comment_count ?? 0}</dd>
        </div>
      </dl>
    </li>
  );
}

function Contribution() {
  const [projectsKey, setProjectsKey] = useState(0);
  const [projectsState, setProjectsState] = useState({ status: "loading", projects: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [dataKey, setDataKey] = useState(0);
  const [dataState, setDataState] = useState({ status: "loading", entries: [], methodology: null });

  const activeId = selectedId ?? projectsState.projects[0]?.id ?? null;

  // Load the projects the user can see.
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

  // Load the contribution data for the chosen project.
  useEffect(() => {
    if (activeId === null) return undefined;
    let active = true;

    apiRequest(`/api/projects/${activeId}/contribution/`)
      .then((data) => {
        if (!active) return;
        setDataState({
          status: "ready",
          entries: Array.isArray(data?.contribution) ? data.contribution : [],
          methodology: data?.methodology ?? null,
        });
      })
      .catch(() => {
        if (!active) return;
        setDataState({ status: "error", entries: [], methodology: null });
      });

    return () => {
      active = false;
    };
  }, [activeId, dataKey]);

  function retryProjects() {
    setProjectsState({ status: "loading", projects: [] });
    setProjectsKey((key) => key + 1);
  }

  function retryData() {
    setDataState({ status: "loading", entries: [], methodology: null });
    setDataKey((key) => key + 1);
  }

  function handleProjectChange(event) {
    setDataState({ status: "loading", entries: [], methodology: null });
    setSelectedId(Number(event.target.value));
  }

  const maxScore = Number(dataState.methodology?.maximum_score) || 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-(--smart)">SMART</div>
          <h1 className="text-2xl font-bold leading-[1.1] sm:text-[27px]">Contribution</h1>
          <p className="mt-1.75 text-[13px] text-(--text-secondary)">
            Project activity by team member, based on completed work.
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

      <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-(--text-secondary)">
        {dataState.methodology?.description ??
          "This is a project activity score based on completed tasks, priority, on-time completion and comments. It is not a measure of ability or personal worth."}
      </p>

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
        <MessageCard title="No projects yet" message="Create or join a project to see contribution here." />
      )}

      {projectsState.status === "ready" && activeId !== null && dataState.status === "loading" && <SkeletonBlocks />}

      {projectsState.status === "ready" && activeId !== null && dataState.status === "error" && (
        <MessageCard
          title="Could not load contribution"
          message="Something went wrong while loading contribution for this project. Please try again."
          actionLabel="Try again"
          onAction={retryData}
        />
      )}

      {projectsState.status === "ready" &&
        activeId !== null &&
        dataState.status === "ready" &&
        (dataState.entries.length === 0 ? (
          <MessageCard title="No activity yet" message="Completed tasks and comments will show up here." />
        ) : (
          <ol className="flex flex-col gap-3">
            {dataState.entries.map((entry, index) => (
              <ContributorRow
                key={entry.user?.id ?? index}
                entry={entry}
                rank={index + 1}
                maxScore={maxScore}
              />
            ))}
          </ol>
        ))}
    </div>
  );
}

export default Contribution;
