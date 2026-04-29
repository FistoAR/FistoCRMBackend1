import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../redux/slices/userslice";
import {
  Mail,
  Award,
  LogOut,
  X,
  Camera,
  User,
  Calendar,
  Phone,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = ({ onclose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [employeeData, setEmployeeData] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [employeeError, setEmployeeError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user);

  const closeProfile = () => {
    onclose();
  };

  // const formatDate = (value) => {
  //   if (!value) return "N/A";
  //   return value.toString().split("T")[0];
  // };

    const formatDate = (dateString) => {
  if (!dateString) return "";
  
  // Handle different date formats
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return "";
  
  // Format as YYYY-MM-DD for input[type="date"]
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

  // Load employee from sessionStorage + API
  useEffect(() => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!stored) {
      setEmployeeError("No user in session");
      setLoadingEmployee(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse session user", e);
      setEmployeeError("Invalid session data");
      setLoadingEmployee(false);
      return;
    }

    const employeeId =
      parsed.employee_id || parsed.employeeId || parsed.userName;
    if (!employeeId) {
      setEmployeeError("Employee ID not found in session");
      setLoadingEmployee(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/employeeRegister/${employeeId}`
        );
        const data = await res.json();
        if (!data.status) {
          setEmployeeError(data.message || "Failed to load employee details");
        } else {
          setEmployeeData(data.employee);
        }
      } catch (err) {
        console.error(err);
        setEmployeeError("Error loading employee details");
      } finally {
        setLoadingEmployee(false);
      }
    };

    fetchEmployee();
  }, []);

  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !employeeData) return;

    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("profile", file);
      formData.append("userName", employeeData.employeeId);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister/${
          employeeData.employeeId
        }`,
        {
          method: "PUT",
          body: formData,
        }
      );
      const data = await response.json();
      if (data.status) window.location.reload();
    } catch (error) {
      console.error("Profile upload failed:", error);
    } finally {
      setUploadingProfile(false);
      setShowUpload(false);
      e.target.value = "";
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      dispatch(clearUser());
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setTimeout(() => {
        setIsLoading(false);
        closeProfile();
        navigate("/");
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      console.error("Logout failed:", error);
    }
  };

  const openPasswordModal = () => {
    setShowPasswordModal(true);
    setOldPassword("");
    setNewPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSave = async () => {
    if (!employeeData) return;
    setPasswordError("");
    setPasswordSuccess("");

    if (!oldPassword || !newPassword) {
      setPasswordError("Both fields are required");
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError("New password must be different from old password");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister/${
          employeeData.employeeId
        }/change-password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );
      const data = await res.json();
      if (!data.status) {
        setPasswordError(data.message || "Failed to update password");
      } else {
        setPasswordSuccess("Password updated successfully");
        setTimeout(() => setShowPasswordModal(false), 1000);
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Something went wrong");
    } finally {
      setChangingPassword(false);
    }
  };

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-[0.7vw] border-b border-gray-100 hover:bg-gray-50 transition-colors px-[0.5vw] rounded-[0.3vw]">
      <div className="flex items-center gap-[0.7vw]">
        <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200">
          <Icon className="w-[1.1vw] h-[1.1vw] text-gray-600" />
        </div>
        <span className="text-[0.85vw] text-gray-600 font-medium">{label}</span>
      </div>
      <span className="text-[0.9vw] text-gray-900 font-semibold max-w-[18vw] text-right break-words">
        {value || "N/A"}
      </span>
    </div>
  );

  if (loadingEmployee) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-700 bg-white">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-3 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (employeeError || !employeeData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 gap-[0.8vw] bg-white">
        <p className="text-[0.95vw] text-red-600 font-medium">
          {employeeError || "Failed to load profile"}
        </p>
        <button
          onClick={handleLogout}
          className="px-[1.5vw] py-[0.6vw] bg-gray-900 text-white rounded-[0.6vw] text-[0.9vw] font-semibold hover:bg-gray-800 transition"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col text-gray-700 relative bg-white">
      {/* Close button fixed */}
      <button
        onClick={closeProfile}
        className="absolute top-[1vw] right-[1vw] p-[0.35vw] bg-gray-100 rounded-full hover:bg-gray-200 transition-all cursor-pointer border border-gray-300 z-20 shadow-sm"
      >
        <X className="w-[1.1vw] h-[1.1vw] text-gray-700" />
      </button>

      <div className="px-[2.5vw] pt-[2.2vw] pb-[1.5vw] flex items-center justify-between gap-[2vw] border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex items-center gap-[1.8vw]">
          <div className="relative group flex-shrink-0">
            <div
              className="w-[6.5vw] h-[6.5vw] rounded-full border-2 border-gray-300 shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-[0.15vw] hover:border-gray-400 overflow-hidden bg-gray-100"
              onMouseEnter={() => setShowUpload(true)}
              onMouseLeave={() => setShowUpload(false)}
            >
              {employeeData.profile ? (
                <div
                  className="relative w-full h-full cursor-pointer hover:scale-110 transition-transform duration-200"
                  title="Profile"
                >
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL1}${
                      employeeData.profile
                    }`}
                    alt={employeeData.employeeName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.classList.remove("hidden");
                    }}
                  />

                  <div
                    className={`absolute inset-0 bg-gray-800 text-white rounded-full flex items-center justify-center font-medium text-[2vw] hidden`}
                    onClick={() => handleProfile()}
                  >
                    {employeeData.employeeName?.[0]?.toUpperCase() || "?"}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800">
                  <span className="text-white text-[1.8vw] font-bold">
                    {employeeData.employeeName?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}

              {showUpload && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[1px]">
                  <Camera className="w-[1.3vw] h-[1.3vw] text-white mb-[0.3vw]" />
                  <span className="text-white text-[0.7vw] font-semibold">
                    Change Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingProfile}
                  />
                </div>
              )}
              {uploadingProfile && (
                <div className="absolute inset-0 bg-black/75 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-[1.2vw] h-[1.2vw] border-[0.15vw] border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[0.35vw] min-w-0">
            <h1 className="text-[1.35vw] font-bold text-gray-900 truncate leading-tight">
              {employeeData.employeeName || "Guest User"}
            </h1>
            <span className="inline-flex items-center gap-[0.4vw]">
              <span className="w-[0.55vw] h-[0.55vw] bg-emerald-500 rounded-full animate-pulse shadow-sm" />
              <span className="text-[0.85vw] text-gray-700 font-semibold bg-gray-100 px-[0.8vw] py-[0.15vw] rounded-full border border-gray-200">
                @{employeeData.employeeId}
              </span>
            </span>
            <span className="text-[0.85vw] text-gray-600 font-medium flex items-center gap-[0.45vw]">
              <Award className="w-[1vw] h-[1vw] text-orange-500" />
              {employeeData.designation || "Not assigned"}
            </span>
          </div>
        </div>

        <button
          onClick={openPasswordModal}
          className="text-[0.85vw] px-[1.3vw] py-[0.5vw] rounded-[0.6vw] border-2 border-gray-800 text-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition-all shadow-sm hover:shadow-md"
        >
          Change Password
        </button>
      </div>

      <div className="flex-1 px-[2.5vw] py-[1.5vw] overflow-y-auto bg-white">
        <div className="space-y-[0.3vw]">
          <Row
            icon={Mail}
            label="Email (Official)"
            value={employeeData.emailOfficial || "No email"}
          />
          <Row
            icon={Phone}
            label="Phone (Personal)"
            value={employeeData.phonePersonal}
          />
          <Row
            icon={Calendar}
            label="Date of Joining"
            value={formatDate(employeeData.doj)}
          />
          <Row icon={User} label="Gender" value={employeeData.gender} />
          <Row
            icon={Calendar}
            label="Date of Birth"
            value={formatDate(employeeData.dob)}
          />
          <Row
            icon={MapPin}
            label="Address"
            value={employeeData.address || "No address provided"}
          />
        </div>
      </div>

      <div className="px-[2.5vw] py-[1.2vw] border-t border-gray-200 bg-gradient-to-t from-gray-50 to-white">
        <button
          onClick={handleLogout}
          disabled={isLoading || uploadingProfile}
          className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-[0.8vw] px-[1.8vw] rounded-[0.7vw] font-bold text-[0.95vw] shadow-lg hover:shadow-xl hover:-translate-y-[0.1vw] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.6vw]"
        >
          {isLoading ? (
            <>
              <div className="w-[1vw] h-[1vw] border-[0.15vw] border-white border-t-transparent rounded-full animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut size="1.1vw" />
              Logout
            </>
          )}
        </button>
      </div>

      {showPasswordModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-30">
          <div className="w-[26vw] bg-white rounded-[1vw] shadow-2xl border border-gray-300 p-[1.8vw] relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-[0.7vw] right-[0.7vw] p-[0.3vw] rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-300 transition"
            >
              <X className="w-[0.9vw] h-[0.9vw] text-gray-700" />
            </button>

            <h2 className="text-[1.1vw] font-bold text-gray-900 mb-[1.2vw]">
              Change Password
            </h2>

            <div className="space-y-[1vw]">
              <div>
                <label className="block text-[0.8vw] text-gray-700 font-medium mb-[0.4vw]">
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-[0.6vw] px-[0.8vw] py-[0.5vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  placeholder="Enter old password"
                />
              </div>
              <div>
                <label className="block text-[0.8vw] text-gray-700 font-medium mb-[0.4vw]">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-[0.6vw] px-[0.8vw] py-[0.5vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  placeholder="Enter new password"
                />
              </div>

              {passwordError && (
                <p className="text-[0.75vw] text-red-600 font-medium bg-red-50 px-[0.6vw] py-[0.4vw] rounded-[0.4vw] border border-red-200">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="text-[0.75vw] text-emerald-600 font-medium bg-emerald-50 px-[0.6vw] py-[0.4vw] rounded-[0.4vw] border border-emerald-200">
                  {passwordSuccess}
                </p>
              )}

              <button
                onClick={handlePasswordSave}
                disabled={changingPassword}
                className="w-full mt-[0.8vw] bg-gradient-to-r from-gray-900 to-gray-800 text-white py-[0.65vw] rounded-[0.6vw] text-[0.85vw] font-bold hover:from-black hover:to-gray-900 transition shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-[0.5vw]"
              >
                {changingPassword ? (
                  <>
                    <div className="w-[0.9vw] h-[0.9vw] border-[0.15vw] border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Password"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
