export const DEMO_TASKS_STORAGE_KEY = "spms-demo-tasks-v1";
export const TASK_STATUSES = ["To Do", "In Progress", "Review", "Done"];
export const TASK_PRIORITIES = ["High", "Medium", "Low"];

const sampleTasks = [
  {
    id: "TASK-101",
    title: "Create Login API",
    description: "Implement authentication API and token handling.",
    project: "MCA E-Commerce",
    status: "In Progress",
    priority: "High",
    dueDate: "Oct 10",
    type: "Task",
  },
  {
    id: "TASK-102",
    title: "Build Dashboard",
    description: "Create the main project dashboard interface.",
    project: "MCA E-Commerce",
    status: "To Do",
    priority: "Medium",
    dueDate: "Oct 12",
    type: "Task",
  },
  {
    id: "TASK-103",
    title: "Fix Navigation Bug",
    description: "Fix navigation issue on project pages.",
    project: "SPMS",
    status: "Review",
    priority: "High",
    dueDate: "Oct 9",
    type: "Bug",
  },
  {
    id: "TASK-104",
    title: "Database Testing",
    description: "Test project and task database operations.",
    project: "SPMS",
    status: "To Do",
    priority: "Medium",
    dueDate: "Oct 13",
    type: "Task",
  },
  {
    id: "TASK-105",
    title: "Prepare Documentation",
    description: "Prepare technical documentation for the project.",
    project: "SPMS",
    status: "Done",
    priority: "Low",
    dueDate: "Oct 7",
    type: "Task",
  },
  {
    id: "TASK-106",
    title: "Fix Profile Form",
    description: "Resolve validation issues in profile form.",
    project: "SPMS",
    status: "Done",
    priority: "Medium",
    dueDate: "Oct 6",
    type: "Bug",
  },
];

export function readDemoTasks() {
  try {
    const storedTasks = localStorage.getItem(DEMO_TASKS_STORAGE_KEY);

    if (storedTasks === null) {
      return { tasks: sampleTasks, error: "" };
    }

    const parsedTasks = JSON.parse(storedTasks);
    if (!Array.isArray(parsedTasks)) {
      throw new Error("Saved demo tasks are not in the expected format.");
    }

    return { tasks: parsedTasks, error: "" };
  } catch {
    return {
      tasks: sampleTasks,
      error: "Saved demo tasks could not be read. The sample task list is shown instead.",
    };
  }
}

export function persistDemoTasks(tasks) {
  try {
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(tasks));
    return "";
  } catch {
    return "Changes are visible for this session but could not be saved in this browser.";
  }
}
