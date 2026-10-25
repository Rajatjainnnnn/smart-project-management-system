import { apiRequest } from "../lib/auth";

function asList(value) {
  return Array.isArray(value) ? value : (value?.results ?? []);
}

function displayName(user) {
  return user?.first_name || user?.username || "Team member";
}

function formatDeadline(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export async function loadDashboardData() {
  const [projectsResponse, dashboard] = await Promise.all([
    apiRequest("/api/projects/"),
    apiRequest("/api/dashboard/"),
  ]);
  const projects = asList(projectsResponse);
  const tasksByProject = await Promise.all(
    projects.map(async (project) => ({
      project,
      tasks: asList(await apiRequest(`/api/projects/${project.id}/tasks/`)),
    }))
  );
  const tasks = tasksByProject.flatMap(({ project, tasks: items }) =>
    items.map((task) => ({ ...task, project_name: project.name }))
  );
  const primaryProject =
    projects.find((project) => project.status === "active") ?? projects[0] ?? null;
  const risk = primaryProject
    ? await apiRequest(`/api/projects/${primaryProject.id}/risk/`)
    : null;
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const upcomingDeadlines = activeTasks
    .filter((task) => task.due_date)
    .sort((left, right) => left.due_date.localeCompare(right.due_date))
    .slice(0, 4)
    .map((task) => ({
      title: task.title,
      date: formatDeadline(task.due_date),
      priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
    }));
  const workloadByUser = new Map();
  for (const projectWorkload of dashboard.workload ?? []) {
    for (const member of projectWorkload.members ?? []) {
      const key = member.user?.id ?? displayName(member.user);
      const current = workloadByUser.get(key);
      if (!current || member.utilization > current.percentage) {
        workloadByUser.set(key, {
          name: displayName(member.user),
          percentage: Math.min(100, Math.max(0, Math.round(member.utilization ?? 0))),
        });
      }
    }
  }
  const teamWorkload = [...workloadByUser.values()].slice(0, 5);
  const highestLoad = [...teamWorkload].sort((a, b) => b.percentage - a.percentage)[0];
  const riskLevel = risk?.risk_level
    ? risk.risk_level.charAt(0).toUpperCase() + risk.risk_level.slice(1)
    : "Low";
  const riskScore = { Low: 20, Medium: 55, High: 85 }[riskLevel];
  const completed = dashboard.completed_tasks ?? 0;
  const total = dashboard.total_tasks ?? 0;

  return {
    projectName: primaryProject?.name ?? "All projects",
    stats: {
      total,
      completed,
      inProgress: dashboard.in_progress_tasks ?? 0,
      overdue: dashboard.overdue_tasks ?? 0,
    },
    progress: {
      completedTasks: completed,
      totalTasks: total,
      statusLabel: primaryProject?.status
        ? primaryProject.status.replace("_", " ")
        : "No projects",
    },
    risk: {
      level: riskLevel,
      score: riskScore,
      headline: riskLevel === "Low" ? "On track" : "Needs attention",
      summary: risk?.reasons?.[0] ?? "Create a project to start tracking risk.",
    },
    teamWorkload,
    deadlines: upcomingDeadlines,
    insight: highestLoad
      ? `${highestLoad.name} has the highest current workload (${highestLoad.percentage}%). Review the workload page for balancing opportunities.`
      : "Add team members and assign tasks to see workload insights.",
    hasProjects: projects.length > 0,
    hasTasks: total > 0,
  };
}
