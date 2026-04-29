import React, { useState, useMemo } from "react";
import WeeklyReports from "../components/MasterResource/Weeklyreports ";
import ExistingClients from "../components/MasterResource/Existingclients";

const ADMIN_ROLES = ["Admin", "SBU", "Project Head"];

const ALL_NAV_ITEMS = [
  { label: "Project source", component: "ExistingClients" },
  { label: "Weekly Report", component: "WeeklyReports" },
];

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw)
      return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
    const u = JSON.parse(raw);
    return {
      employeeId: u.userName || u.employeeId || "FST006",
      role: u.designation || "Project Head",
      isTeamHead: !!u.teamHead,
    };
  } catch {
    return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
  }
}

export default function MasterResource() {
  const [navOpen, setNavOpen] = useState(true);
  const [activePage, setActivePage] = useState(0);

  const currentUser = useMemo(() => getCurrentUser(), []);

  // Determine if the user has elevated access
  const hasFullAccess =
    ADMIN_ROLES.includes(currentUser.role) || currentUser.isTeamHead;

  // Filter nav items based on role
  const navItems = useMemo(() => {
    if (hasFullAccess) {
      return ALL_NAV_ITEMS; // Show both "Project source" & "Weekly Report"
    }
    // Non-admin, non-teamHead: only "Project source"
    return ALL_NAV_ITEMS.filter((item) => item.label === "Project source");
  }, [hasFullAccess]);

  // Clamp activePage to valid range when nav items change
  const safeActivePage = Math.min(activePage, navItems.length - 1);

  const activeComponent = navItems[safeActivePage]?.component;

  return (
    <div className="min-h-[90vh] p-0 font-[DM_Sans,sans-serif]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Sticky Top Nav ── */}
      <div
        className="bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 rounded-2xl px-[0.4vw] py-[0.4vw]"
        style={{ minHeight: "5.6vh" }}
      >
        <div className="flex items-center gap-0">
          {/* Collapse / Expand Toggle — only show if more than 1 nav item */}
          {navItems.length > 1 ? (
            <button
              onClick={() => setNavOpen((o) => !o)}
              title={navOpen ? "Collapse" : "Expand"}
              className="flex items-center gap-[0.4vh] bg-slate-100 hover:bg-slate-200 border-none cursor-pointer text-slate-800 font-semibold font-[inherit] transition-colors rounded-[0.8vw] px-[1vh] py-[0.6vh] text-[0.8vw]"
            >
              {navOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              ) : (
                <>
                  <span className="font-semibold px-[0.4vw]">
                    {navItems[safeActivePage]?.label}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            /* Single nav item — just show the label as a static pill */
            <span className="flex items-center gap-[0.4vh] bg-slate-800 text-white font-semibold font-[inherit] rounded-[2vh] px-[1.6vh] py-[0.7vh] text-[1.6vh] whitespace-nowrap">
              {navItems[0]?.label}
            </span>
          )}

          {/* Sliding Nav Pills — only when multiple items */}
          {navItems.length > 1 && (
            <div
              className="flex items-center gap-[0.6vh] overflow-hidden transition-all duration-300"
              style={{
                maxWidth: navOpen ? "50vw" : "0px",
                opacity: navOpen ? 1 : 0,
                marginLeft: navOpen ? "0.8vh" : "0px",
                pointerEvents: navOpen ? "auto" : "none",
              }}
            >
              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActivePage(i)}
                  className={`px-[1.6vh] py-[0.7vh] rounded-[2vh] border-none font-semibold text-[1.6vh] whitespace-nowrap cursor-pointer font-[inherit] transition-all
                    ${
                      safeActivePage === i
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="pt-[0.3vh]">
        {activeComponent === "ExistingClients" && <ExistingClients />}
        {activeComponent === "WeeklyReports" && <WeeklyReports />}
      </div>
    </div>
  );
}