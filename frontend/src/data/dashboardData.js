// Dashboard data layer.
//
// IMPORTANT: everything below is DEMO data, not live backend data.
// The Dashboard page only talks to `loadDashboardData()`, so connecting the
// Django API later means changing this one function (and nothing in the UI).

const demoDashboard = {
  isDemo: true,
  projectName: "MCA E-Commerce Website",
  stats: {
    total: 42,
    completed: 27,
    inProgress: 10,
    overdue: 5,
  },
  progress: {
    completedTasks: 36,
    totalTasks: 50,
    statusLabel: "In Progress",
  },
  risk: {
    level: "High",
    score: 68,
    headline: "Needs attention",
    summary: "3 important tasks are overdue and testing has not started.",
  },
  teamWorkload: [
    { name: "Rajat", percentage: 90 },
    { name: "Rahul", percentage: 65 },
    { name: "Priya", percentage: 48 },
    { name: "Amit", percentage: 31 },
  ],
  deadlines: [
    { title: "Complete Login API", date: "24 Sep", priority: "High" },
    { title: "Database Testing", date: "26 Sep", priority: "Medium" },
    { title: "Project Documentation", date: "28 Sep", priority: "Low" },
  ],
  insight:
    "Rajat currently has the highest workload. Consider redistributing one suitable task to another team member.",
};

/**
 * Resolves with the dashboard data object.
 * Currently returns demo data after a short delay so the loading state is
 * visible. Replace the body with real API calls when the team is ready.
 */
export function loadDashboardData() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(demoDashboard)), 400);
  });
}
