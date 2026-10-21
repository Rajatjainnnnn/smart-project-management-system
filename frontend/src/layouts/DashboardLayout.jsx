import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getStoredAuth } from "../lib/auth";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout() {
  const auth = getStoredAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!auth?.access) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      {/* Dark backdrop behind the sidebar drawer on small screens */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* The sidebar is w-64 (16rem), so the content is offset by the same amount on large screens */}
      <div className="min-h-screen min-w-0 lg:ml-64">
        <div className="flex items-center gap-3 border-b border-(--border) bg-(--surface) px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--surface) text-lg"
          >
            ☰
          </button>
          <span className="text-sm font-bold">SPMS</span>
        </div>

        <Navbar />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
