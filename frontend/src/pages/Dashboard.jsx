const stats = [
  {
    title: "Total Tasks",
    value: 42,
    description: "Across all projects",
    icon: "✓",
    type: "primary",
  },
  {
    title: "Completed",
    value: 27,
    description: "64% completion rate",
    icon: "✓",
    type: "success",
  },
  {
    title: "In Progress",
    value: 10,
    description: "Currently being worked on",
    icon: "◷",
    type: "info",
  },
  {
    title: "Overdue",
    value: 5,
    description: "Requires attention",
    icon: "!",
    type: "danger",
  },
];

const teamWorkload = [
  { name: "Rajat", percentage: 90 },
  { name: "Rahul", percentage: 65 },
  { name: "Priya", percentage: 48 },
  { name: "Amit", percentage: 31 },
];

const deadlines = [
  {
    title: "Complete Login API",
    date: "24 Sep",
    priority: "High",
  },
  {
    title: "Database Testing",
    date: "26 Sep",
    priority: "Medium",
  },
  {
    title: "Project Documentation",
    date: "28 Sep",
    priority: "Low",
  },
];

function getWorkloadClass(percentage) {
  if (percentage >= 80) return "high";
  if (percentage >= 60) return "medium";
  return "low";
}

function Dashboard() {
  return (
    <div className="dashboard">

      {/* Page Header */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">OVERVIEW</div>

          <h1>Dashboard</h1>

          <p className="page-subtitle">
            Here's what's happening across your projects.
          </p>
        </div>

        <button className="primary-button">
          + New Project
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.title}>
            <div className="stat-top">

              <span className="stat-title">
                {stat.title}
              </span>

              <div className={`stat-icon ${stat.type}`}>
                {stat.icon}
              </div>

            </div>

            <div
              className={`stat-value ${
                stat.type === "danger"
                  ? "danger-text"
                  : ""
              }`}
            >
              {stat.value}
            </div>

            <div className="stat-description">
              {stat.description}
            </div>
          </div>
        ))}
      </div>

      {/* Main Dashboard Row */}
      <div className="dashboard-grid">

        {/* Project Progress */}
        <div className="dashboard-card">

          <div className="card-header">
            <div>
              <h3>Project Progress</h3>

              <p>
                MCA E-Commerce Website
              </p>
            </div>

            <span className="status-badge status-progress">
              In Progress
            </span>
          </div>

          <div className="progress-section">

            <div className="progress-value">
              72%
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: "72%" }}
              />
            </div>

            <div className="progress-footer">
              <span>
                36 of 50 tasks completed
              </span>

              <span>
                14 remaining
              </span>
            </div>

          </div>
        </div>

        {/* Project Risk */}
        <div className="dashboard-card">

          <div className="card-header">
            <div>
              <h3>Project Risk</h3>

              <p>
                Current project health
              </p>
            </div>

            <span className="risk-badge">
              HIGH
            </span>
          </div>

          <div className="risk-content">

            <div className="risk-score">
              68
            </div>

            <div>
              <strong>
                Needs attention
              </strong>

              <p>
                3 important tasks are overdue
                and testing has not started.
              </p>
            </div>

          </div>

          <button className="secondary-button">
            View Risk Details
          </button>

        </div>

      </div>

      {/* Workload + Deadlines */}
      <div className="dashboard-grid">

        {/* Team Workload */}
        <div className="dashboard-card">

          <div className="card-header">

            <div>
              <h3>Team Workload</h3>

              <p>
                Current workload distribution
              </p>
            </div>

          </div>

          <div className="workload-list">

            {teamWorkload.map((member) => {

              const workloadClass =
                getWorkloadClass(
                  member.percentage
                );

              return (
                <div
                  className="workload-row"
                  key={member.name}
                >

                  <div className="workload-info">

                    <span>
                      {member.name}
                    </span>

                    <strong>
                      {member.percentage}%
                    </strong>

                  </div>

                  <div className="workload-track">

                    <div
                      className={`workload-fill ${workloadClass}`}
                      style={{
                        width: `${member.percentage}%`,
                      }}
                    />

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* Upcoming Deadlines */}
        <div className="dashboard-card">

          <div className="card-header">

            <div>
              <h3>Upcoming Deadlines</h3>

              <p>
                Tasks that need attention
              </p>
            </div>

          </div>

          <div className="deadline-list">

            {deadlines.map((deadline) => (

              <div
                className="deadline-item"
                key={deadline.title}
              >

                <div>

                  <strong>
                    {deadline.title}
                  </strong>

                  <span>
                    {deadline.date}
                  </span>

                </div>

                <span
                  className={`priority-badge priority-${deadline.priority.toLowerCase()}`}
                >
                  {deadline.priority}
                </span>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* Smart Insights */}
      <div className="smart-banner">

        <div className="smart-banner-icon">
          ✦
        </div>

        <div className="smart-banner-content">

          <h3>
            Smart Insight
          </h3>

          <p>
            Rajat currently has the highest
            workload. Consider redistributing
            one suitable task to another team
            member.
          </p>

        </div>

        <button className="smart-button">
          View Insights
        </button>

      </div>

    </div>
  );
}

export default Dashboard;