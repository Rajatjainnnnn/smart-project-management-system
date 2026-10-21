const stats = [
  { title: "Total Tasks", value: 42, description: "Across all projects", icon: "✓", type: "primary" },
  { title: "Completed", value: 27, description: "64% completion rate", icon: "✓", type: "success" },
  { title: "In Progress", value: 10, description: "Currently being worked on", icon: "◷", type: "info" },
  { title: "Overdue", value: 5, description: "Requires attention", icon: "!", type: "danger" },
];

const teamWorkload = [
  { name: "Rajat", percentage: 90 },
  { name: "Rahul", percentage: 65 },
  { name: "Priya", percentage: 48 },
  { name: "Amit", percentage: 31 },
];

const deadlines = [
  { title: "Complete Login API", date: "24 Sep", priority: "High" },
  { title: "Database Testing", date: "26 Sep", priority: "Medium" },
  { title: "Project Documentation", date: "28 Sep", priority: "Low" },
];

// Full class strings so Tailwind can detect them (no dynamic class building).
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

function getWorkloadLevel(percentage) {
  if (percentage >= 80) return "high";
  if (percentage >= 60) return "medium";
  return "low";
}

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const badge = "rounded-full px-[9px] py-[5px] text-[9px] font-bold";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";
const secondaryButton =
  "cursor-pointer rounded-lg border border-(--border) bg-white px-[13px] py-[9px] text-xs font-semibold text-(--text-secondary)";
const smartButton =
  "cursor-pointer rounded-lg border-none bg-(--smart) px-[15px] py-2.5 text-xs font-semibold text-white";

function CardHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-[11px] text-(--text-muted)">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6.75 flex items-end justify-between">
        <div>
          <div className="mb-1.5 text-[10px] font-bold tracking-[0.08em] text-(--primary)">
            OVERVIEW
          </div>
          <h1 className="text-[27px] font-bold leading-[1.1]">Dashboard</h1>
          <p className="mt-1.75 text-[13px] text-(--text-secondary)">
            Here's what's happening across your projects.
          </p>
        </div>

        <button className={primaryButton}>+ New Project</button>
      </div>

      {/* Statistics */}
      <div className="mb-4.5 grid grid-cols-4 gap-4.25">
        {stats.map((stat) => (
          <div className={`${card} p-4.75`} key={stat.title}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--text-muted)">{stat.title}</span>
              <div
                className={`flex h-7.25 w-7.25 items-center justify-center rounded-lg text-xs font-bold ${statIconStyles[stat.type]}`}
              >
                {stat.icon}
              </div>
            </div>

            <div
              className={`mt-3.25 text-3xl font-bold ${
                stat.type === "danger" ? "text-(--danger)" : ""
              }`}
            >
              {stat.value}
            </div>

            <div className="mt-1 text-[10px] text-(--text-muted)">{stat.description}</div>
          </div>
        ))}
      </div>

      {/* Progress + Risk */}
      <div className="mb-4.5 grid grid-cols-[1.35fr_1fr] gap-4.5">
        <div className={`${card} p-5.5`}>
          <CardHeader title="Project Progress" subtitle="MCA E-Commerce Website">
            <span className={`${badge} bg-[#EFF6FF] text-(--primary)`}>In Progress</span>
          </CardHeader>

          <div className="mt-5">
            <div className="text-4xl font-bold">72%</div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-(--primary)" style={{ width: "72%" }} />
            </div>

            <div className="mt-2.5 flex justify-between text-[11px] text-(--text-muted)">
              <span>36 of 50 tasks completed</span>
              <span>14 remaining</span>
            </div>
          </div>
        </div>

        <div className={`${card} p-5.5`}>
          <CardHeader title="Project Risk" subtitle="Current project health">
            <span className={`${badge} bg-[#FEF2F2] text-(--danger)`}>HIGH</span>
          </CardHeader>

          <div className="my-5 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-2xl font-bold text-(--danger)">
              68
            </div>

            <div>
              <strong className="text-[13px]">Needs attention</strong>
              <p className="mt-1 text-[11px] text-(--text-muted)">
                3 important tasks are overdue and testing has not started.
              </p>
            </div>
          </div>

          <button className={secondaryButton}>View Risk Details</button>
        </div>
      </div>

      {/* Workload + Deadlines */}
      <div className="mb-4.5 grid grid-cols-[1.35fr_1fr] gap-4.5">
        <div className={`${card} p-5.5`}>
          <CardHeader title="Team Workload" subtitle="Current workload distribution" />

          <div className="mt-4.5 flex flex-col gap-4">
            {teamWorkload.map((member) => (
              <div key={member.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{member.name}</span>
                  <strong>{member.percentage}%</strong>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${workloadFillStyles[getWorkloadLevel(member.percentage)]}`}
                    style={{ width: `${member.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-5.5`}>
          <CardHeader title="Upcoming Deadlines" subtitle="Tasks that need attention" />

          <div className="mt-4.5 flex flex-col">
            {deadlines.map((deadline) => (
              <div
                className="flex items-center justify-between border-b border-(--border) py-3 last:border-b-0"
                key={deadline.title}
              >
                <div>
                  <strong className="block text-xs">{deadline.title}</strong>
                  <span className="mt-0.5 block text-[10px] text-(--text-muted)">
                    {deadline.date}
                  </span>
                </div>

                <span className={`${badge} ${priorityStyles[deadline.priority]}`}>
                  {deadline.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Insight */}
      <div className="flex items-center gap-4 rounded-(--radius) border border-violet-200 bg-violet-50 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--smart) text-lg text-white">
          ✦
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold">Smart Insight</h3>
          <p className="mt-1 text-xs text-(--text-secondary)">
            Rajat currently has the highest workload. Consider redistributing one suitable task to
            another team member.
          </p>
        </div>

        <button className={smartButton}>View Insights</button>
      </div>
    </div>
  );
}

export default Dashboard;