import { Navigate, Outlet } from "react-router-dom";

import { getStoredAuth } from "../lib/auth";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout() {
  const auth = getStoredAuth();

  if (!auth?.access) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="w-[calc(100%-250px)] min-h-screen ml-62.5">
        <Navbar />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;