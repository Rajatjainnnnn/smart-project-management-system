function Navbar() {
  return (
    <header className="navbar">

      <div className="navbar-left">

        <div>
          <h2>
            Smart Project Management
          </h2>

          <p>
            Manage your projects and team efficiently
          </p>
        </div>

      </div>

      <div className="navbar-right">

        <button
          className="notification-button"
          aria-label="Notifications"
        >
          🔔
          <span className="notification-dot" />
        </button>

        <div className="profile">

          <div className="avatar">
            R
          </div>

          <div className="profile-info">

            <strong>
              Rajat
            </strong>

            <span>
              Student
            </span>

          </div>

          <span className="profile-arrow">
            ⌄
          </span>

        </div>

      </div>

    </header>
  );
}

export default Navbar;