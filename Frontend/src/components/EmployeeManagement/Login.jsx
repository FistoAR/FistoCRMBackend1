import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userslice";
import { Shield, Eye, EyeOff, User } from "lucide-react";
import { useNotification } from "../NotificationContext";
import logo from "../../assets/Fisto Logo.png";


const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notify } = useNotification();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});


  // Auto-login check on component mount
  useEffect(() => {
    checkExistingSession();
  }, []);


  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (mounted && !isCheckingAuth) {
      const emailInput = document.querySelector(
        'input[name="emailOrUsername"]'
      );
      if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
      }
    }
  }, [mounted, isCheckingAuth]);


  // Function to check existing session and auto-login
  const checkExistingSession = async () => {
    setIsCheckingAuth(true);


    try {
      // Check localStorage first (Remember Me), then sessionStorage
      const storedUser =
        localStorage.getItem("user") || sessionStorage.getItem("user");


      if (storedUser) {
        const userData = JSON.parse(storedUser);


        console.log(
          "Found stored user data, attempting auto-login...",
          userData
        );


        // Dispatch to Redux store
        dispatch(setUser(userData));


        // Navigate based on role
        navigateByRole(userData);
      } else {
        // No stored credentials, show login form
        setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      // If there's an error, clear storage and show login form
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setIsCheckingAuth(false);
    }
  };


  // Function to navigate based on user role
  const navigateByRole = (userData) => {
    const role =
      userData.employeementType === "Intern"
        ? userData.employeementType
        : userData.designation;


    console.log("Navigating based on role:", role);


    switch (role?.trim()) {
      case "Digital Marketing":
        navigate("/marketing/dashboard");
        break;


      case "Digital Marketing & HR":
        navigate("/marketing/dashboard");
        break;


      case "Project Head":
        navigate("/projectHead/dashboard");
        break;


      case "Admin":
        navigate("/admin/dashboard");
        break;


      case "Intern":
        navigate("/intern/dailyReport");
        break;


      case "3D":
        navigate("/threeD/dashboard");
        break;


      case "Management":
        navigate("/management/dashboard");
        break;


      case "Software Developer":
        navigate("/softwareDeveloper/dashboard");
        break;


      case "UI/UX":
        navigate("/designer/dashboard");
        break;

      case "SBU":
        navigate("/sbu/dashboard");
        break;


      default:
        navigate("/management");
        break;
    }
  };


  // ✅ Updated handleInputChange with uppercase conversion
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;


    // Convert emailOrUsername to uppercase automatically
    const processedValue = name === "emailOrUsername" 
      ? value.toUpperCase() 
      : value;


    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : processedValue,
    }));


    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };


  const validateForm = () => {
    const newErrors = {};


    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = "Email or username is required";
    }


    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    // Notify UI that sign-in was clicked (opens notifications modal immediately)
    try {
      window.dispatchEvent(
        new CustomEvent("user-signin-clicked", { detail: { emailOrUsername: formData.emailOrUsername } })
      );
    } catch (err) {
      console.warn("Failed to dispatch user-signin-clicked event:", err);
    }
    if (!validateForm()) return;


    setIsLoading(true);


    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailOrUsername: formData.emailOrUsername,
            password: formData.password,
            rememberMe: formData.rememberMe,
          }),
        }
      );


      const result = await response.json();


      if (result.status) {
        setIsLoading(false);


        notify({
          title: "Success",
          message: `${result.message}`,
        });


        const userData = {
          employeeName: result.data.employeeName,
          userName: result.data.userName,
          emailOfficial: result.data.emailOfficial,
          designation: result.data.designation,
          teamHead: result.data.teamHead,
          profile: result.data.profile || null,
          employeementType: result.data.employmentType,
        };


        // Dispatch to Redux store
        dispatch(setUser(userData));


        // ✅ ALWAYS save to sessionStorage (for current session)
        sessionStorage.setItem("user", JSON.stringify(userData));

        // ✅ Save to localStorage ONLY if Remember Me is checked (for persistence)
        if (formData.rememberMe) {
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          // Clear localStorage if Remember Me is not checked
          localStorage.removeItem("user");
        }

        // Notify other parts of the app (socket service) that a user just logged in
        try {
          window.dispatchEvent(
            new CustomEvent("user-logged-in", { detail: userData })
          );
        } catch (err) {
          console.warn("Failed to dispatch user-logged-in event:", err);
        }

        // Mark that we just logged in so components mounted after navigation can act
        try {
          sessionStorage.setItem("justLoggedIn", "1");
        } catch (err) {
          /* ignore */
        }

        console.log(result.data);


        // Navigate based on role
        navigateByRole(userData);
      } else {
        setIsLoading(false);
        setErrors({
          general: result.message || "Login failed. Please try again.",
        });
      }
    } catch (error) {
      setIsLoading(false);
      setErrors({ general: "Login failed. Please try again." });
    }
  };


  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-black via-black to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-black via-black to-black relative overflow-hidden text-gray-700">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-300">
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-gray-900 to-black opacity-80"></div>
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-[0.5vw] h-[0.5vw] bg-white bg-opacity-20 rounded-full transition-all duration-[6000ms] ${
                mounted ? "animate-pulse" : ""
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>


      <div className="relative z-10 w-full max-w-[28%]">
        <div
          className={`transition-all duration-1000 ${
            mounted
              ? "transform translate-y-0 opacity-100"
              : "transform translate-y-8 opacity-0"
          }`}
        >
          <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-[1.5vw] border border-white border-opacity-20">
            <div className="flex flex-col items-center text-center mb-[1vw]">
              <img src={logo} alt="App Logo" className="mb-[1vw] w-[8vw]" />
              <p className="text-gray-800 text-[1vw]">
                Welcome back! Please sign in to your account.
              </p>
            </div>


            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-[0.4vw] mb-[0.9vw]">
                <p className="text-red-600 text-[0.9vw]">{errors.general}</p>
              </div>
            )}


            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">
                  Employee ID *
                </label>
                <div className="relative">
                  <User
                    className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-black transition-colors"
                    size={"1vw"}
                  />
                  <input
                    type="text"
                    name="emailOrUsername"
                    value={formData.emailOrUsername}
                    onChange={handleInputChange}
                    className={`w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw] ${
                      errors.emailOrUsername
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter your Emp ID or Email"
                  />
                </div>
                {errors.emailOrUsername && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.emailOrUsername}
                  </p>
                )}
              </div>


              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">
                  Password *
                </label>
                <div className="relative">
                  <Shield
                    className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-black transition-colors"
                    size={"1vw"}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw] ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <Eye size={"1vw"} />
                    ) : (
                      <EyeOff size={"1vw"} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>


              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-[1.2vw] h-[1.2vw] text-black border-gray-300 rounded"
                  />
                  <span className="ml-[0.5vw] text-[0.9vw] text-gray-700">
                    Remember me
                  </span>
                </label>
              </div>


              <button
                type="submit"
                disabled={isLoading}
                className="text-[1vw] w-full bg-gradient-to-br from-black via-gray-800 to-gray-800 text-white py-[0.6vw] px-[0.2vw] rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LoginPage;