import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { loadDashboardData } from "../data/dashboardData";

// Full class strings so Tailwind can detect them (no dynamic class building).
const statCards = [
  { key: "total", title: "Total Tasks", icon: "✓", type: "primary" },
  { key: "completed", title: "Completed", icon: "✓", type: "success" },
  { key: "inProgress", title: "In Progress", icon: "◷", type: "info" },
  { key: "overdue", title: "Overdue", icon: "!", type: "danger" },
];

const statIconStyles = {
  primary: "bg-[#EFF6FF] text-(--primary)",
  success: "bg-green-50 text-green-600",
  info: "bg-sky-50 text-sky-600",
  danger: "bg-[#FEF2F2] text-(--danger)",
};

const workloadFillStyles = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

const priorityStyles = {
  High: "bg-[#FEF2F2] text-(--danger)",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-green-50 text-green-600",
};

const riskStyles = {
  High: { badge: "bg-[#FEF2F2] text-(--danger)", circle: "bg-[#FEF2F2] text-(--danger)" },
  Medium: { badge: "bg-amber-50 text-amber-600", circle: "bg-amber-50 text-amber-600" },
  Low: { badge: "bg-green-50 text-green-600", circle: "bg-green-50 text-green-600" },
};

function getWorkloadLevel(percentage) {
  if (percentage >= 80) return "high";
  if (percentage >= 60) return "medium";
  return "low";
}

function getStatDescription(key, stats) {
  if (key === "total") return "Across all projects";
  if (key === "completed") {
    const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
    return `${rate}% completion rate`;
  }
  if (key === "inProgress") return "Currently being worked on";
  return "Requires attention";
}

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const badge = "rounded-full px-2.5 py-1 text-[11px] font-bold";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";
const secondaryButton =
  "rounded-lg border border-(--border) bg-white px-[13px] py-[9px] text-xs font-semibold text-(--text-secondary) disabled:cursor-not-allowed disabled:opacity-60";
const smartButton =
  "rounded-lg border-none bg-(--smart) px-[15px] py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60";

function CardHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-(--text-muted)">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function PageHeader({ onNewProject }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-(--primary)">
          OVERVIEW
        </div>
        <h1 className="text-2xl font-bold leading-[1.1] sm:text-[27px]">Dashboard</h1>
        <p className="mt-1.75 text-[13px] text-(--text-secondary)">
          Here's what's happening across your projects.
        </p>
      </div>

      <button type="button" className={`${primaryButton} self-start sm:self-auto`} onClick={onNewProject}>
        + New Project
      </button>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading dashboard">
      <div className="mb-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div className={`${card} p-4.75`} key={item}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-16" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mb-4.5 grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
      </div>
      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
      </div>
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}

function MessageCard({ title, message, actionLabel, onAction }) {
  return (
    <div className={`${card} px-6 py-12 text-center`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-(--text-secondary)">{message}</p>
      <button type="button" className={`${primaryButton} mt-5`} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function DashboardContent({ data }) {
  const { stats, progress, risk, teamWorkload, deadlines, insight } = data;
  const percentComplete = progress.totalTasks
    ? Math.round((progress.completedTasks / progress.totalTasks) * 100)
    : 0;
  const remaining = progress.totalTasks - progress.completedTasks;
  const riskStyle = riskStyles[risk.level] ?? riskStyles.Low;

  return (
    <>
      {/* Statistics */}
      <div className="mb-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div className={`${card} p-4.75`} key={stat.key}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--text-muted)">{stat.title}</span>
              <div
                className={`flex h-7.25 w-7.25 items-center justify-center rounded-lg text-xs font-bold ${statIconStyles[stat.type]}`}
                aria-hidden="true"
              >
                {stat.icon}
              </div>
            </div>

            <div
              className={`mt-3.25 text-3xl font-bold ${
                stat.type === "danger" ? "text-(--danger)" : ""
              }`}
            >
              {stats[stat.key]}
            </div>

            <div className="mt-1 text-[11px] text-(--text-muted)">
              {getStatDescription(stat.key, stats)}
            </div>
          </div>
        ))}
      </div>

      {/* Progress + Risk */}
      <div className="mb-4.5 grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]">
        <div className={`${card} p-5`}>
          <CardHeader title="Project Progress" subtitle={data.projectName}>
            <span className={`${badge} bg-[#EFF6FF] text-(--primary)`}>{progress.statusLabel}</span>
          </CardHeader>

          <div className="mt-5">
            <div className="text-4xl font-bold">{percentComplete}%</div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Project progress"
            >
              <div
                className="h-full rounded-full bg-(--primary)"
                style={{ width: `${percentComplete}%` }}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 text-xs text-(--text-muted)">
              <span>
                {progress.completedTasks} of {progress.totalTasks} tasks completed
              </span>
              <span>{remaining} remaining</span>
            </div>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <CardHeader title="Project Risk" subtitle="Current project health">
            <span className={`${badge} ${riskStyle.badge}`}>{risk.level.toUpperCase()}</span>
          </CardHeader>

          <div className="my-5 flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${riskStyle.circle}`}
            >
              {risk.score}
            </div>

            <div>
              <strong className="text-[13px]">{risk.headline}</strong>
              <p className="mt-1 text-xs text-(--text-muted)">{risk.summary}</p>
            </div>
          </div>

          <button type="button" className={secondaryButton} disabled title="Coming soon">
            View Risk Details
          </button>
        </div>
      </div>

      {/* Workload + Deadlines */}
      <div className="mb-4.5 grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]">
        <div className={`${card} p-5`}>
          <CardHeader title="Team Workload" subtitle="Current workload distribution" />

          <div className="mt-4.5 flex flex-col gap-4">
            {teamWorkload.map((member) => (
              <div key={member.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{member.name}</span>
                  <strong>{member.percentage}%</strong>
                </div>

                <div
                  className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuenow={member.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${member.name} workload`}
                >
                  <div
                    className={`h-full rounded-full ${workloadFillStyles[getWorkloadLevel(member.percentage)]}`}
                    style={{ width: `${member.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-5`}>
          <CardHeader title="Upcoming Deadlines" subtitle="Tasks that need attention" />

          <div className="mt-4.5 flex flex-col">
            {deadlines.length === 0 ? (
              <p className="py-6 text-center text-xs text-(--text-muted)">No upcoming deadlines.</p>
            ) : (
              deadlines.map((deadline) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-(--border) py-3 last:border-b-0"
                  key={deadline.title}
                >
                  <div className="min-w-0">
                    <strong className="block text-xs">{deadline.title}</strong>
                    <span className="mt-0.5 block text-[11px] text-(--text-muted)">
                      {deadline.date}
                    </span>
                  </div>

                  <span className={`${badge} shrink-0 ${priorityStyles[deadline.priority]}`}>
                    {deadline.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Smart Insight */}
      <div className="flex flex-col gap-4 rounded-(--radius) border border-violet-200 bg-violet-50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--smart) text-lg text-white"
          aria-hidden="true"
        >
          ✦
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold">Smart Insight</h3>
          <p className="mt-1 text-xs text-(--text-secondary)">{insight}</p>
        </div>

        <button type="button" className={`${smartButton} self-start sm:self-auto`} disabled title="Coming soon">
          View Insights
        </button>
      </div>
    </>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let active = true;

    loadDashboardData()
      .then((data) => {
        if (!active) return;
        setState({ status: data.stats.total === 0 ? "empty" : "ready", data });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: "error", data: null });
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setState({ status: "loading", data: null });
    setReloadKey((key) => key + 1);
  }

  function goToProjects() {
    navigate("/projects");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader onNewProject={goToProjects} />

      {state.status === "loading" && <DashboardSkeleton />}

      {state.status === "error" && (
        <MessageCard
          title="Could not load the dashboard"
          message="Something went wrong while loading your dashboard. Please try again."
          actionLabel="Try again"
          onAction={retry}
        />
      )}

      {state.status === "empty" && (
        <MessageCard
          title="No tasks yet"
          message="Create a project and add tasks to see progress, workload and deadlines here."
          actionLabel="Go to Projects"
          onAction={goToProjects}
        />
      )}

      {state.status === "ready" && (
        <>
          {state.data.isDemo && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Showing demo data. These numbers are not connected to the backend yet.
            </p>
          )}
          <DashboardContent data={state.data} />
        </>
      )}
    </div>
  );
}

export default Dashboard;
