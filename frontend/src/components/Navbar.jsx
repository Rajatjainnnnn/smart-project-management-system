import { useNavigate } from "react-router-dom";

import { apiRequest, clearAuth, getStoredAuth } from "../lib/auth";

function Navbar() {
  const navigate = useNavigate();
  const auth = getStoredAuth();

  async function handleLogout() {
    try {
      if (auth?.refresh) {
        await apiRequest("logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: auth.refresh }),
        });
      }
    } catch {
      // Ignore logout API failure and still clear local state.
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  const displayName = auth?.user?.first_name || auth?.user?.username || "User";
  const avatar = displayName.charAt(0).toUpperCase();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div>
          <h2>Smart Project Management</h2>
          <p>Manage your projects and team efficiently</p>
        </div>
      </div>

      <div className="navbar-right">
        <button className="notification-button" aria-label="Notifications">
          🔔
          <span className="notification-dot" />
        </button>

        <div className="profile">
          <div className="avatar">{avatar}</div>

          <div className="profile-info">
            <strong>{displayName}</strong>
            <span>{auth?.user?.email || "Student"}</span>
          </div>

          <span className="profile-arrow">⌄</span>
        </div>

        <button className="secondary-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;