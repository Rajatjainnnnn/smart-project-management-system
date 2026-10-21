export const DEMO_PROJECTS_STORAGE_KEY = "spms-demo-projects-v1";
export const PROJECT_STATUSES = ["Planning", "Active", "Completed", "On Hold"];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const sampleProjects = [
  {
    id: "PROJ-101",
    name: "MCA E-Commerce Website",
    description: "A student team project building a full-featured online shopping experience.",
    status: "Active",
    startDate: "2026-08-12",
    endDate: "2026-10-30",
    progress: 72,
    memberCount: 4,
    taskCount: 50,
    completedTaskCount: 36,
  },
  {
    id: "PROJ-102",
    name: "Smart Project Management System",
    description: "A student-focused workspace for planning work and coordinating project teams.",
    status: "Active",
    startDate: "2026-09-01",
    endDate: "2026-12-15",
    progress: 45,
    memberCount: 4,
    taskCount: 20,
    completedTaskCount: 9,
  },
  {
    id: "PROJ-103",
    name: "Campus Event Planner",
    description: "Plan campus events, coordinate volunteers, and keep event information in one place.",
    status: "Planning",
    startDate: "2026-10-20",
    endDate: "2027-01-15",
    progress: 0,
    memberCount: 3,
  },
  {
    id: "PROJ-104",
    name: "Student Portfolio Portal",
    description: "A completed portfolio site for showcasing student projects and skills.",
    status: "Completed",
    startDate: "2026-05-01",
    endDate: "2026-09-30",
    progress: 100,
    memberCount: 3,
    taskCount: 12,
    completedTaskCount: 12,
  },
  {
    id: "PROJ-105",
    name: "Library Digitization",
    description: "Organize a digital catalogue and streamline access to learning resources.",
    status: "On Hold",
    startDate: "2026-08-01",
    endDate: "2026-11-01",
    progress: 20,
    memberCount: 2,
    taskCount: 10,
    completedTaskCount: 2,
  },
];

function isValidDate(value) {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidProject(project) {
  return (
    project !== null &&
    typeof project === "object" &&
    typeof project.id === "string" &&
    project.id.trim().length > 0 &&
    typeof project.name === "string" &&
    project.name.trim().length > 0 &&
    typeof project.description === "string" &&
    PROJECT_STATUSES.includes(project.status) &&
    typeof project.startDate === "string" &&
    isValidDate(project.startDate) &&
    typeof project.endDate === "string" &&
    isValidDate(project.endDate) &&
    (!project.startDate || !project.endDate || project.endDate >= project.startDate) &&
    Number.isFinite(project.progress) &&
    project.progress >= 0 &&
    project.progress <= 100 &&
    ["memberCount", "taskCount", "completedTaskCount"].every(
      (field) =>
        project[field] === undefined ||
        (Number.isInteger(project[field]) && project[field] >= 0)
    )
  );
}

export function readDemoProjects() {
  try {
    const storedProjects = localStorage.getItem(DEMO_PROJECTS_STORAGE_KEY);
    if (storedProjects === null) {
      return { projects: sampleProjects, error: "" };
    }

    const parsedProjects = JSON.parse(storedProjects);
    if (!Array.isArray(parsedProjects) || !parsedProjects.every(isValidProject)) {
      throw new Error("Saved demo projects are not in the expected format.");
    }

    return { projects: parsedProjects, error: "" };
  } catch {
    return {
      projects: sampleProjects,
      error: "Saved demo projects could not be read. The sample project list is shown instead.",
    };
  }
}

export function isProjectDeadlineApproaching(project, today = new Date()) {
  if (!project.endDate || project.status === "Completed") return false;

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const deadline = new Date(`${project.endDate}T00:00:00`);
  const daysRemaining = (deadline - startOfToday) / DAY_IN_MS;
  return daysRemaining >= 0 && daysRemaining <= 30;
}
