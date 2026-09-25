import { NavLink } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "⌂" },
  { label: "Projects", path: "/projects", icon: "▣" },
  { label: "My Tasks", path: "/tasks", icon: "✓" },
  { label: "Team", path: "/team", icon: "♙" },
];

const smartItems = [
  { label: "Analytics", path: "/analytics", icon: "◈" },
  { label: "Workload", path: "/workload", icon: "◉" },
  { label: "Contribution", path: "/contribution", icon: "◇" },
  { label: "Risk Radar", path: "/risk", icon: "!" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">S</div>
        <div>
          <div className="logo-title">SPMS</div>
          <div className="logo-subtitle">Student Project Management</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Workspace</div>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title smart-heading">Smart</div>

        {smartItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link smart-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">System</div>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">◌</span>
          <span>Notifications</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-project">
        <div className="project-mini-label">CURRENT PROJECT</div>
        <div className="project-mini-name">MCA E-Commerce</div>
        <div className="project-mini-progress">
          <div className="project-mini-progress-bar"></div>
        </div>
        <div className="project-mini-footer">
          <span>72% complete</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;