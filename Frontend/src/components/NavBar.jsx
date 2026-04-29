import { useState, useEffect, useRef } from "react";
import NotificationIcon from "../assets/NavIcons/Notification.svg";
import RegisterPage from "../components/EmployeeManagement/ManagementLayout";
import ProfilePage from "../components/Profile";
import Attendance from "../components/Attendance";
import Notification from "./Notification/NotificationsModal";
import LoginIcon from "../assets/NavIcons/Login.webp";

export default function NavBar({ type, socketData }) {
  const [user, setUser] = useState(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openAttendance, setOpenAttendance] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Get notification data from socketData prop
  const unreadCount = socketData?.unreadCount || 0;
  const notifications = socketData?.notifications || [];
  const isConnected = socketData?.isConnected || false;

  const storedUser =
    localStorage.getItem("user") || sessionStorage.getItem("user");

  useEffect(() => {
    const storedUserData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUserData) {
      const parsed = JSON.parse(storedUserData);
      setUser(parsed);

      // If we just logged in (flag set by Login), trigger a refresh and open modal
      try {
        const just = sessionStorage.getItem("justLoggedIn");
        if (just) {
          if (socketData?.refreshNotifications) socketData.refreshNotifications();
          setOpenNotifications(true);
          sessionStorage.removeItem("justLoggedIn");
        }
      } catch (e) {
        console.warn("NavBar: justLoggedIn handling failed:", e);
      }
    }
  }, []);

  // Open notifications modal and refresh notifications when user logs in
  useEffect(() => {
    const onLogin = (ev) => {
      try {
        if (socketData?.refreshNotifications) socketData.refreshNotifications();
      } catch (e) {
        console.warn("NavBar: refreshNotifications failed:", e);
      }
      setOpenNotifications(true);
    };

    const onSigninClick = (ev) => {
      // open modal immediately when sign-in button clicked
      setOpenNotifications(true);
    };

    window.addEventListener("user-logged-in", onLogin);
    window.addEventListener("user-signin-clicked", onSigninClick);
    return () => {
      window.removeEventListener("user-logged-in", onLogin);
      window.removeEventListener("user-signin-clicked", onSigninClick);
    };
  }, [socketData]);

  const userRole = user?.role || "";

  const handleRegister = () => setOpenRegister((prev) => !prev);
  const handleProfile = () => setOpenProfile((prev) => !prev);
  const handleNotifications = () => setOpenNotifications((prev) => !prev);
  const handleAttendance = () => setOpenAttendance((prev) => !prev);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setOpenNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (openRegister) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm py-6 px-2">
        <div className="rounded-xl w-[85%] h-[95%] shadow-xl flex flex-col items-center bg-[#e9effc] relative overflow-hidden">
          <RegisterPage onclose={handleRegister} />
        </div>
      </div>
    );
  }

  if (openProfile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm py-6 px-2">
        <div className="rounded-xl w-[40vw] h-[95%] shadow-xl flex flex-col items-center bg-[#e9effc] relative overflow-hidden">
          <ProfilePage onclose={handleProfile} />
        </div>
      </div>
    );
  }

  if (openAttendance) {
    return (
      <div className="fixed inset-0 z-50">
        <Attendance onClose={handleAttendance} />
      </div>
    );
  }

  return (
    <>
      <div className={`sticky top-0 py-[0.3vw] z-48 min-h-[6vh] max-h-[6vh]`}>
        <div className="flex justify-between items-start">
          <div className="text-[1vw] ml-[0.3vw] font-semibold text-gray-700">
            {type}
          </div>
          <div className={`flex gap-[0.8vw] items-center`}>
            <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-full px-[0.4vw] py-[0.33vw] hover:shadow-md hover:border-gray-400 transition-all duration-200">
              <div
                title="Mark Attendance"
                className="w-[1.5vw] h-[1.5vw] cursor-pointer hover:scale-110 transition-transform duration-200 rounded-full flex items-center justify-center text-[1vw] font-bold"
                onClick={handleAttendance}
              >
                <img src={LoginIcon} alt="Login" />
              </div>

              <div className="relative" ref={notificationRef} title="Notification">
                <img
                  src={NotificationIcon}
                  alt="Notification"
                  className="w-[1.7vw] h-[1.7vw] rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
                  title="Notifications"
                  onClick={handleNotifications}
                />
                {/* Show unread count badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-[0.4vw] -right-[0.4vw] flex items-center justify-center h-[1.2vw] min-w-[1.2vw] px-[0.2vw] bg-red-500 text-white text-[0.65vw] font-bold rounded-full leading-none pointer-events-none">
                    {unreadCount}
                  </span>
                )}

                {/* Connection indicator (optional) */}
                {isConnected && (
                  <span className="absolute bottom-0 right-0 w-[0.4vw] h-[0.4vw] bg-green-500 rounded-full border-2 border-white"></span>
                )}

                {/* Notification Modal with all props */}
                {openNotifications && (
                  <Notification
                    onClose={() => setOpenNotifications(false)}
                    notifications={notifications}
                    onMarkAsRead={socketData?.markAsRead}
                    onClear={socketData?.clearNotification}
                    onClearAll={socketData?.clearAllNotifications}
                    refreshNotifications={socketData?.refreshNotifications}
                  />
                )}
              </div>

              {(() => {
                const user = storedUser ? JSON.parse(storedUser) : null;
                const hasProfile = user?.profile;
                return (
                  <div
                    className="relative w-[1.7vw] h-[1.7vw] cursor-pointer hover:scale-110 transition-transform duration-200"
                    title="Profile"
                  >
                    {hasProfile && (
                      <img
                        src={import.meta.env.VITE_API_BASE_URL1 + user.profile}
                        alt={user.employeeName}
                        className="w-full h-full rounded-full object-cover shadow-sm"
                        onClick={() => handleProfile()}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.classList.remove("hidden");
                        }}
                      />
                    )}
                    <div
                      className={`absolute inset-0 bg-gray-800 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw] ${
                        hasProfile ? "hidden" : ""
                      }`}
                      onClick={() => handleProfile()}
                    >
                      {user?.employeeName?.[0]?.toUpperCase() || "?"}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
