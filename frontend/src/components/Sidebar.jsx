import { NavLink } from "react-router-dom";

const AVAILABLE_PATHS = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/bugs",
  "/team",
  "/analytics",
  "/workload",
  "/contribution",
  "/notifications",
  "/profile",
  "/risk",
];

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "⌂" },
  { label: "Projects", path: "/projects", icon: "▣" },
  { label: "My Tasks", path: "/tasks", icon: "✓" },
  { label: "Bugs", path: "/bugs", icon: "!" },
  { label: "Team", path: "/team", icon: "♙" },
];

const smartItems = [
  { label: "Analytics", path: "/analytics", icon: "◈" },
  { label: "Workload", path: "/workload", icon: "◉" },
  { label: "Contribution", path: "/contribution", icon: "◇" },
  { label: "Risk Radar", path: "/risk", icon: "!" },
];

const navLinkBase =
  "flex items-center gap-[11px] px-[11px] py-2.5 rounded-lg text-[13px] font-medium no-underline text-(--sidebar-text) transition duration-200 ease-in-out hover:bg-slate-800 hover:text-white";

const sectionTitle =
  "mt-[15px] mx-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500";

function SidebarLink({ to, icon, label, smart = false, onNavigate }) {
  if (!AVAILABLE_PATHS.includes(to)) {
    return (
      <div
        aria-disabled="true"
        title="Coming soon"
        className="flex cursor-not-allowed items-center gap-[11px] rounded-lg px-[11px] py-2.5 text-[13px] font-medium text-slate-500"
      >
        <span className="inline-flex w-4.5 justify-center text-sm">{icon}</span>
        <span>{label}</span>
        <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          Soon
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${navLinkBase} ${
          isActive
            ? `text-white ${smart ? "bg-(--smart)" : "bg-(--primary)"}`
            : ""
        }`
      }
    >
      <span className="inline-flex w-4.5 justify-center text-sm">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function Sidebar({ open = false, onNavigate }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-y-auto bg-(--sidebar) px-6 py-3 text-(--sidebar-text) transition-transform duration-200 ease-in-out lg:z-10 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--primary) text-base font-bold text-white">
          S
        </div>
        <div>
          <div className="text-[17px] font-bold text-white">SPMS</div>
          <div className="mt-0.5 max-w-33.75 text-[11px] text-slate-400">
            Student Project Management
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-2.5 flex flex-col gap-1">
        <div className={sectionTitle}>Workspace</div>
        {menuItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            onNavigate={onNavigate}
          />
        ))}

        <div className={`${sectionTitle} text-violet-400`}>Smart</div>
        {smartItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            onNavigate={onNavigate}
            smart
          />
        ))}

        <div className={sectionTitle}>System</div>
        <SidebarLink to="/notifications" icon="◌" label="Notifications" onNavigate={onNavigate} />
        <SidebarLink to="/profile" icon="⚙" label="Profile & Skills" onNavigate={onNavigate} />
      </nav>

    </aside>
  );
}

export default Sidebar;
