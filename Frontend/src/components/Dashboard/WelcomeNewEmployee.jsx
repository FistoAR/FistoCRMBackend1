import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/Fisto Logo.png";

const WelcomeNewEmployee = ({ user: propUser }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!user) {
      try {
        const storedUserData =
          sessionStorage.getItem("user") || localStorage.getItem("user");
        if (storedUserData) setUser(JSON.parse(storedUserData));
      } catch {}
    }
  }, [propUser, user]);

  // Animate the "..." in waiting text
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 600);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => window.location.reload(), 900);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const employeeName = user?.employeeName || user?.name || user?.userName || "Team Member";
  const designation = user?.designation || "New Role";

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Soft gradient background shapes */}
      <div style={{
        position: "absolute", top: "-120px", left: "-120px",
        width: "480px", height: "480px", borderRadius: "50%",
        background: "radial-gradient(circle, #e0e7ff 0%, transparent 70%)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", right: "-100px",
        width: "420px", height: "420px", borderRadius: "50%",
        background: "radial-gradient(circle, #fce7f3 0%, transparent 70%)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "60%",
        width: "300px", height: "300px", borderRadius: "50%",
        background: "radial-gradient(circle, #d1fae5 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      {/* Main centered layout */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%",
      }}>
        <div style={{
          display: "flex",
          width: "min(900px, 92vw)",
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.10), 0 1.5px 8px rgba(99,102,241,0.06)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}>
          {/* Left accent panel */}
          <div style={{
            width: "240px", flexShrink: 0,
            background: "linear-gradient(160deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 24px", gap: "24px",
            position: "relative", overflow: "hidden",
          }}>
            {/* decorative circles in panel */}
            <div style={{
              position: "absolute", top: "-40px", right: "-40px",
              width: "140px", height: "140px", borderRadius: "50%",
              background: "rgba(255,255,255,0.08)"
            }} />
            <div style={{
              position: "absolute", bottom: "-30px", left: "-30px",
              width: "110px", height: "110px", borderRadius: "50%",
              background: "rgba(255,255,255,0.06)"
            }} />

            {/* Logo */}
            <div style={{
              background: "#fff",
              padding: "14px 18px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}>
              <img src={logo} alt="Fisto" style={{ height: "56px", objectFit: "contain", display: "block" }} />
            </div>


            <p style={{
              color: "rgba(255,255,255,0.75)", fontSize: "12px",
              textAlign: "center", lineHeight: "1.6", fontWeight: 500
            }}>
              Fisto CRM<br />Employee Portal
            </p>
          </div>

          {/* Right content */}
          <div style={{ flex: 1, padding: "44px 40px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div>
         

              <h1 style={{
                fontSize: "26px", fontWeight: 800, color: "#111827",
                margin: "0 0 8px", lineHeight: 1.3,
                letterSpacing: "-0.5px"
              }}>
                Welcome aboard, <span style={{ color: "#4f46e5" }}>{employeeName}</span>! 👋
              </h1>

              <p style={{ fontSize: "15px", color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
                We're thrilled to have you join the Fisto team. Your account has been created and you're almost ready to get started.
              </p>
            </div>

            {/* Designation badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 16px",
              background: "#f5f3ff",
              borderRadius: "12px",
              border: "1px solid #ddd6fe",
            }}>
              <div>
                <p style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Designation</p>
                <p style={{ fontSize: "15px", color: "#1e1b4b", fontWeight: 700, margin: 0 }}>{designation}</p>
              </div>
            </div>

            {/* Pending setup notice */}
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "14px",
              padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>
                    Workspace Setup in Progress
                  </p>
                  <p style={{ fontSize: "13px", color: "#78350f", margin: "0 0 10px", lineHeight: 1.6 }}>
                    Your Admin/HR needs to configure the tabs and permissions for your designation. This is a one-time setup.
                  </p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    border: "1px solid #fcd34d",
                  }}>
                    <span style={{ fontSize: "13px" }}>📋</span>
                    <p style={{ fontSize: "12px", color: "#92400e", margin: 0, fontWeight: 600 }}>
                      Please contact your <span style={{ color: "#d97706" }}>Administrator / HR</span> to set up Role Access for <strong>{designation}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting indicator */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 0",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#4f46e5",
                animation: "pulse 1.5s infinite",
                flexShrink: 0,
              }} />
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                Waiting for admin configuration{"." .repeat(dots + 1)}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "11px 22px",
                  background: isRefreshing ? "#6366f1" : "#4f46e5",
                  color: "#fff",
                  border: "none", borderRadius: "10px",
                  fontSize: "14px", fontWeight: 600,
                  cursor: isRefreshing ? "not-allowed" : "pointer",
                  opacity: isRefreshing ? 0.8 : 1,
                  transition: "all 0.2s",
                  boxShadow: "0 2px 12px rgba(79,70,229,0.25)",
                }}
              >
                {isRefreshing ? "Checking..." : "Refresh Access"}
              </button>

              <button
                onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "11px 22px",
                  background: "#fff",
                  color: "#374151",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "14px", fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeNewEmployee;
