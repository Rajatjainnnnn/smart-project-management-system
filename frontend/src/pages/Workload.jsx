import { useEffect, useState } from "react";

import { apiRequest } from "../lib/auth";

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";

// Full class strings so Tailwind can detect them (no dynamic class building).
const statusStyles = {
  overloaded: { label: "Overloaded", badge: "bg-[#FEF2F2] text-(--danger)", bar: "bg-red-500" },
  balanced: { label: "Balanced", badge: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  available: { label: "Available", badge: "bg-green-50 text-green-600", bar: "bg-green-500" },
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
    <div role="status" aria-live="polite" aria-label="Loading workload" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-(--radius) bg-slate-200" />
      ))}
      <span className="sr-only">Loading workload...</span>
    </div>
  );
}

function MemberCard({ member }) {
  const style = statusStyles[member.status] ?? statusStyles.available;
  const utilization = Math.max(0, Math.min(100, Number(member.utilization) || 0));

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm">{displayName(member.user)}</strong>
          <span className="mt-0.5 block text-[11px] text-(--text-muted)">
            {member.user?.profile?.role || "Member"}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badge}`}>
          {style.label}
        </span>
      </div>

      <div className="mt-4 flex justify-between text-xs">
        <span>Workload</span>
        <strong>{utilization}%</strong>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={utilization}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${displayName(member.user)} workload`}
      >
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${utilization}%` }} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] text-(--text-muted)">Active</dt>
          <dd className="text-lg font-bold">{member.active_tasks ?? 0}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-(--text-muted)">Overdue</dt>
          <dd className={`text-lg font-bold ${member.overdue_tasks > 0 ? "text-(--danger)" : ""}`}>
            {member.overdue_tasks ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-(--text-muted)">Effort</dt>
          <dd className="text-lg font-bold">{member.estimated_effort ?? 0}</dd>
        </div>
      </dl>
    </div>
  );
}

function Workload() {
  const [projectsKey, setProjectsKey] = useState(0);
  const [projectsState, setProjectsState] = useState({ status: "loading", projects: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [workloadKey, setWorkloadKey] = useState(0);
  const [workloadState, setWorkloadState] = useState({ status: "loading", members: [] });

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

  // Load the workload for the chosen project.
  useEffect(() => {
    if (activeId === null) return undefined;
    let active = true;

    apiRequest(`/api/projects/${activeId}/workload/`)
      .then((data) => {
        if (!active) return;
        setWorkloadState({ status: "ready", members: Array.isArray(data?.members) ? data.members : [] });
      })
      .catch(() => {
        if (!active) return;
        setWorkloadState({ status: "error", members: [] });
      });

    return () => {
      active = false;
    };
  }, [activeId, workloadKey]);

  function retryProjects() {
    setProjectsState({ status: "loading", projects: [] });
    setProjectsKey((key) => key + 1);
  }

  function retryWorkload() {
    setWorkloadState({ status: "loading", members: [] });
    setWorkloadKey((key) => key + 1);
  }

  function handleProjectChange(event) {
    setWorkloadState({ status: "loading", members: [] });
    setSelectedId(Number(event.target.value));
  }

  const overloadedCount = workloadState.members.filter((member) => member.status === "overloaded").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-(--smart)">SMART</div>
          <h1 className="text-2xl font-bold leading-[1.1] sm:text-[27px]">Workload</h1>
          <p className="mt-1.75 text-[13px] text-(--text-secondary)">
            {workloadState.status === "ready" && workloadState.members.length > 0
              ? overloadedCount > 0
                ? `${overloadedCount} of ${workloadState.members.length} members are overloaded.`
                : "Nobody is overloaded right now."
              : "See who has too much work and who has room for more."}
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
        <MessageCard title="No projects yet" message="Create or join a project to see its workload here." />
      )}

      {projectsState.status === "ready" && activeId !== null && workloadState.status === "loading" && <SkeletonBlocks />}

      {projectsState.status === "ready" && activeId !== null && workloadState.status === "error" && (
        <MessageCard
          title="Could not load the workload"
          message="Something went wrong while calculating the workload for this project. Please try again."
          actionLabel="Try again"
          onAction={retryWorkload}
        />
      )}

      {projectsState.status === "ready" &&
        activeId !== null &&
        workloadState.status === "ready" &&
        (workloadState.members.length === 0 ? (
          <MessageCard title="No team members" message="This project has no members to show workload for." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workloadState.members.map((member) => (
              <MemberCard key={member.user?.id ?? displayName(member.user)} member={member} />
            ))}
          </div>
        ))}
    </div>
  );
}

export default Workload;
