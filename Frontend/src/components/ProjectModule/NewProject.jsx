import { useState, useEffect, useRef } from "react";
import { IoIosClose } from "react-icons/io";
import {
  Shield,
  X,
  ChevronDown,
  Check,
  ClipboardList,
  Plus,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../NotificationContext";
import searchIcon from "../../assets/ProjectPages/search.webp";

export default function NewProject() {
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeID, setEmployeeID] = useState(null);
  const [employeeRole, setEmployeeRole] = useState(null);
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProject, setFetchingProject] = useState(false);
  const [teamHeads, setTeamHeads] = useState([]);

  const [activeTab, setActiveTab] = useState("form");

  const [requests, setRequests] = useState([]);
  const [fetchingRequests, setFetchingRequests] = useState(false);
  const [loadingRequestId, setLoadingRequestId] = useState(null);

  const [loadedFromRequest, setLoadedFromRequest] = useState(null);

  const [companyType, setCompanyType] = useState("new");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const priorityRef = useRef(null);

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [originalStatus, setOriginalStatus] = useState(null);

  const priorityOptions = [
    { value: "High", label: "High", color: "bg-red-100 text-red-700" },
    {
      value: "Medium",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-700",
    },
    { value: "Low", label: "Low", color: "bg-green-100 text-green-700" },
  ];

  const statusOptions = [
    {
      value: "In Progress",
      label: "In Progress",
      color: "bg-blue-100 text-blue-700",
    },
    { value: "Hold", label: "Hold", color: "bg-yellow-500 text-white" },
    { value: "Canceled", label: "Canceled", color: "bg-red-400 text-white" },
  ];

  const companyRef = useRef(null);
  const categoryRef = useRef(null);
  const departmentRef = useRef(null);

  const [accessModal, setAccessModal] = useState({
    visible: false,
    currentAccess: [],
    creator: null,
  });

  const [formData, setFormData] = useState({
    companyName: "",
    projectName: "",
    category: "",
    department: [],
    startDate: "",
    endDate: "",
    description: "",
    accessGrantedTo: [],
    employeeID: "",
    priority: "Medium",
    status: "In Progress",
    statusHistory: [],
    pendingStatusReason: "",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [projectId, setProjectId] = useState(null);

  const isRequestOnlyUser =
    isTeamHead && !["Admin", "SBU", "Project Head"].includes(employeeRole);

  const isAdminLevel = ["Admin", "SBU", "Project Head"].includes(employeeRole);

  useEffect(() => {
    if (location.state?.isEditMode && location.state?.projectId) {
      setIsEditMode(true);
      setFetchingProject(true);

      setProjectId(location.state.projectId);
      setFormData((prev) => ({
        ...prev,
        projectName: location.state.projectName,
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setEmployeeID(user.userName);
      setEmployeeRole(user.designation);
      setIsTeamHead(user.teamHead || false);
      setFormData((prev) => ({ ...prev, employeeID: user.userName }));
      fetchTeamHeads();
      fetchDepartments();
      fetchCompanyOptions();
      fetchCategoryOptions("");
    }
  }, []);

  useEffect(() => {
    if (employeeID) fetchRequests();
  }, [employeeID]);

  useEffect(() => {
    if (activeTab === "requests" && employeeID) fetchRequests();
  }, [activeTab]);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!isEditMode || !projectId) return;
      setFetchingProject(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/${projectId}`,
        );
        const result = await response.json();
        if (result.success && result.data) {
          const project = result.data;
          const existingCompany = companyOptions.includes(project.companyName);
          setCompanyType(existingCompany ? "existing" : "new");

          let departmentData = [];
          if (project.departmentDetails?.length > 0) {
            departmentData = project.departmentDetails.map((dept) => ({
              id: dept.id,
              name: dept.name,
            }));
          } else if (project.department?.length > 0) {
            departmentData = project.department
              .map((deptId) => {
                const found = departments.find(
                  (d) => d.id.toString() === deptId.toString(),
                );
                return found ? { id: found.id, name: found.name } : null;
              })
              .filter(Boolean);
          }

          const projectStatus = project.status || "In Progress";
          setFormData({
            companyName: project.companyName || "",
            projectName: project.projectName || "",
            category: project.category || "",
            department: departmentData,
            startDate: project.startDate || "",
            endDate: project.endDate || "",
            description: project.description || "",
            accessGrantedTo: project.accessGrantedTo || [],
            employeeID: project.employeeID || "",
            priority: project.preiority || project.priority || "Medium",
            status: projectStatus,
            statusHistory: project.statusHistory || [],
            pendingStatusReason: "",
          });
          setOriginalStatus(projectStatus);
        } else {
          notify({
            title: "Error",
            message: "Failed to fetch project details",
          });
        }
      } catch (error) {
        console.error("Error fetching project details:", error);
        notify({ title: "Error", message: "Failed to fetch project details" });
      } finally {
        setFetchingProject(false);
      }
    };
    if (departments.length > 0 && companyOptions.length >= 0)
      fetchProjectDetails();
  }, [isEditMode, projectId, departments, companyOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyRef.current && !companyRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
        setCompanySearchTerm("");
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target))
        setShowCategoryDropdown(false);
      if (
        departmentRef.current &&
        !departmentRef.current.contains(event.target)
      )
        setShowDepartmentDropdown(false);
      if (priorityRef.current && !priorityRef.current.contains(event.target))
        setShowPriorityDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTeamHeads = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/teamHeads`,
      );
      const result = await res.json();
      if (result.success) setTeamHeads(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/departments`,
      );
      const result = await res.json();
      if (result.success) setDepartments(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCompanyOptions = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/autocomplete/company`,
      );
      const result = await res.json();
      if (result.success) setCompanyOptions(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategoryOptions = async (search) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/autocomplete/category?search=${encodeURIComponent(search)}`,
      );
      const result = await res.json();
      if (result.success) setCategoryOptions(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    if (!employeeID) return;
    setFetchingRequests(true);
    try {
      const url = isAdminLevel
        ? `${import.meta.env.VITE_API_BASE_URL}/project/requests`
        : `${import.meta.env.VITE_API_BASE_URL}/project/requests?employeeID=${employeeID}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) setRequests(result.data || []);
    } catch (e) {
      console.error("Error fetching requests:", e);
    } finally {
      setFetchingRequests(false);
    }
  };

  const handleInputChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleCategoryChange = (value) => {
    handleInputChange("category", value);
    fetchCategoryOptions(value);
    setShowCategoryDropdown(true);
  };

  const handleDepartmentToggle = (dept) => {
    setFormData((prev) => {
      const isSelected = prev.department.some((d) => d.id === dept.id);
      return {
        ...prev,
        department: isSelected
          ? prev.department.filter((d) => d.id !== dept.id)
          : [...prev.department, { id: dept.id, name: dept.name }],
      };
    });
  };

  const removeDepartment = (deptId) =>
    setFormData((prev) => ({
      ...prev,
      department: prev.department.filter((d) => d.id !== deptId),
    }));

  const handleAccessManagement = () => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    setAccessModal({
      visible: true,
      currentAccess: formData.accessGrantedTo || [],
      creator: currentUser,
    });
  };

  const handleGrantAccess = (employeeId) => {
    if (formData.accessGrantedTo?.some((a) => a.employeeId === employeeId)) {
      notify({
        title: "Warning",
        message: "Access already granted to this admin",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      accessGrantedTo: [
        ...(prev.accessGrantedTo || []),
        { employeeId, grantedAt: new Date() },
      ],
    }));
  };

  const handleRevokeAccess = (employeeId) =>
    setFormData((prev) => ({
      ...prev,
      accessGrantedTo: prev.accessGrantedTo.filter(
        (a) => a.employeeId !== employeeId,
      ),
    }));

  const closeAccessModal = () =>
    setAccessModal({ visible: false, currentAccess: [], creator: null });

  const getProjectsPath = (designation) => {
    if (designation === "Software Developer")
      return "/softwareDeveloper/projects";
    if (designation === "UI/UX") return "/designer/projects";
    if (designation === "3D") return "/threeD/projects";
    if (designation === "Project Head") return "/projectHead/projects";
    if (designation === "Admin") return "/admin/project";
    return "/projects";
  };

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find((p) => p.value === priority);
    return option ? option.color : "bg-gray-100 text-gray-700";
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find((s) => s.value === status);
    return option ? option.color : "bg-gray-100 text-gray-700";
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === formData.status) return;
    setPendingStatus(newStatus);
    setShowReasonModal(true);
  };

  const handleConfirmStatusChange = () => {
    if (!statusReason.trim()) {
      notify({
        title: "Warning",
        message: "Please provide a reason for the status change",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      status: pendingStatus,
      pendingStatusReason: statusReason,
    }));
    setShowReasonModal(false);
    setPendingStatus(null);
    setStatusReason("");
  };

  const handleCancelStatusChange = () => {
    setShowReasonModal(false);
    setPendingStatus(null);
    setStatusReason("");
  };

  const getEmployeeNameById = (id) => {
    const teamHead = teamHeads.find((h) => h.id === id);
    if (teamHead) return teamHead.name;
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.userName === id || user.id === id)
        return user.employeeName || user.name || id;
    }
    const accessPerson = formData.accessGrantedTo?.find(
      (a) => a.employeeId === id,
    );
    if (accessPerson?.name) return accessPerson.name;
    return id;
  };

  const handleDeniedRequest = async (request) => {
    if (request?._id) {
      try {
        await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/request/${request._id}/reject`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (e) {
        console.error("Failed to mark request as approved:", e);
      }

      notify({
        title: "Success",
        message: "Request Denied successfully!",
      });

      fetchRequests();
    }
  };

  const handleLoadRequest = async (request) => {
    if (!departments.length) {
      notify({
        title: "Warning",
        message: "Please wait, departments are loading...",
      });
      return;
    }
    setLoadingRequestId(request._id);
    try {
      let departmentData = [];
      if (request.department?.length > 0) {
        departmentData = request.department
          .map((deptId) => {
            const found = departments.find(
              (d) => d.id.toString() === deptId.toString(),
            );
            return found ? { id: found.id, name: found.name } : null;
          })
          .filter(Boolean);
      }
      setCompanyType("new");
      setFormData((prev) => ({
        ...prev,
        companyName: request.companyName || "",
        projectName: request.projectName || "",
        category: request.category || "",
        department: departmentData,
        startDate: request.startDate || "",
        endDate: request.endDate || "",
        description: request.description || "",
      }));
      setLoadedFromRequest(request);
      setActiveTab("form");
    } finally {
      setLoadingRequestId(null);
    }
  };

  const clearLoadedRequest = () => {
    setLoadedFromRequest(null);
    setFormData((prev) => ({
      ...prev,
      companyName: "",
      projectName: "",
      category: "",
      department: [],
      startDate: "",
      endDate: "",
      description: "",
    }));
  };

  const handleSave = async () => {
    const requiredFields = [
      { field: "companyName", label: "Company Name" },
      { field: "projectName", label: "Project Name" },
      { field: "category", label: "Category" },
      { field: "department", label: "Department", isArray: true },
      ...(isAdminLevel
        ? [
            { field: "startDate", label: "Start Date" },
            { field: "endDate", label: "End Date" },
          ]
        : []),
    ];

    for (let item of requiredFields) {
      const value = formData[item.field];
      const isEmpty = item.isArray ? !value || value.length === 0 : !value;
      if (isEmpty) {
        notify({ title: "Warning", message: `Please select ${item.label}` });
        return;
      }
    }

    if (
      isAdminLevel &&
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) < new Date(formData.startDate)
    ) {
      notify({
        title: "Warning",
        message: "End date cannot be before start date",
      });
      return;
    }

    setLoading(true);
    try {
      if (!isEditMode && isRequestOnlyUser) {
        const requestPayload = {
          companyName: formData.companyName,
          projectName: formData.projectName,
          category: formData.category,
          department: formData.department.map((d) => d.id),
          startDate: formData.startDate,
          endDate: formData.endDate,
          description: formData.description,
          employeeID: formData.employeeID,
        };
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/request`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
          },
        );
        const data = await response.json();
        if (response.ok) {
          notify({
            title: "Success",
            message: "Project request submitted successfully!",
          });
          fetchRequests();
          setFormData((prev) => ({
            ...prev,
            companyName: "",
            projectName: "",
            category: "",
            department: [],
            startDate: "",
            endDate: "",
            description: "",
          }));
          setActiveTab("requests");
        } else {
          notify({
            title: "Error",
            message: `Error submitting request: ${data.message}`,
          });
        }
        return;
      }

      let payload = {
        companyName: formData.companyName,
        projectName: formData.projectName,
        category: formData.category,
        department: formData.department.map((d) => d.id),
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        accessGrantedTo: formData.accessGrantedTo,
        employeeID: formData.employeeID,
        preiority: formData.priority,
        isNewCompany: companyType === "new",
      };

      if (isEditMode && formData.status && formData.status !== originalStatus) {
        payload.status = formData.status;
        payload.statusHistory = [
          ...(formData.statusHistory || []),
          {
            status: formData.status,
            changedBy: employeeID,
            reason: formData.pendingStatusReason || "",
          },
        ];
      }

      let response;
      if (isEditMode && projectId) {
        response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/${projectId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
      } else {
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/project`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (response.ok) {
        if (loadedFromRequest?._id) {
          try {
            await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/project/request/${loadedFromRequest._id}/approve`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
              },
            );
          } catch (e) {
            console.error("Failed to mark request as approved:", e);
          }
        }

        notify({
          title: "Success",
          message: isEditMode
            ? "Project updated successfully!"
            : "Project created successfully!",
        });

        if (
          isEditMode &&
          formData.status &&
          formData.status !== originalStatus
        ) {
          setOriginalStatus(formData.status);
          setFormData((prev) => ({ ...prev, pendingStatusReason: "" }));
        }

        navigate(getProjectsPath(employeeRole));
      } else {
        notify({
          title: "Error",
          message: `Error ${isEditMode ? "updating" : "creating"} project: ${data.message}`,
        });
      }
    } catch (err) {
      notify({
        title: "Error",
        message: `Error ${isEditMode ? "updating" : "creating"} project: ${err}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRequestStatusBadge = (status) => {
    const map = {
      Requested: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      Approved: "bg-green-100 text-green-700 border border-green-200",
      Rejected: "bg-red-100 text-red-700 border border-red-200",
    };
    return map[status] || "bg-gray-100 text-gray-700 border border-gray-200";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const pendingCount = requests.filter((r) => r.status === "Requested").length;

  const AccessManagementModal = () => {
    if (!accessModal.visible) return null;
    const currentUserId = employeeID;
    const hasAccessIds =
      formData.accessGrantedTo?.map((a) => a.employeeId) || [];

    return (
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50"
        onClick={closeAccessModal}
      >
        <div
          className="bg-white rounded-lg w-[28%] max-h-[60vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-[1.2vw] py-[0.8vw] border-b border-gray-200">
            <h2 className="text-[1.1vw] font-semibold flex items-center">
              <Shield className="w-[1.2vw] h-[1.2vw] mr-[0.3vw] text-blue-600" />
              Add Supporting Person's
            </h2>
            <button
              onClick={closeAccessModal}
              className="p-[0.4vw] hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <X className="w-[1.2vw] h-[1.2vw]" />
            </button>
          </div>

          <div className="overflow-y-auto p-[1.2vw] space-y-[1vw]">
            <div>
              <h3 className="text-[0.95vw] font-medium mb-[0.9vw]">
                Creator (You)
              </h3>
              <div className="flex items-center space-x-[0.6vw] p-[0.7vw] bg-blue-50 rounded-lg">
                <div className="relative w-[2.2vw] h-[2.2vw] bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {accessModal.creator?.profile ? (
                    <>
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL1}${accessModal.creator.profile}`}
                        alt={accessModal.creator.employeeName}
                        className="w-full h-full rounded-full bg-white object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                        {accessModal.creator.employeeName?.[0]?.toUpperCase() ||
                          "?"}
                      </div>
                    </>
                  ) : (
                    accessModal.creator?.employeeName
                      ?.charAt(0)
                      ?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {accessModal.creator?.employeeName}
                  </div>
                  <div className="text-[0.75vw] text-gray-600">
                    {accessModal.creator?.designation}
                  </div>
                </div>
                <span className="ml-auto px-[0.7vw] py-[0.2vw] bg-blue-100 text-blue-800 rounded-full text-[0.75vw] font-medium">
                  Owner
                </span>
              </div>
            </div>

            {formData.accessGrantedTo?.length > 0 && (
              <div>
                <h3 className="text-[0.95vw] font-medium mb-[0.9vw]">
                  Current Access ({formData.accessGrantedTo.length})
                </h3>
                <div className="space-y-2">
                  {formData.accessGrantedTo.map((access) => {
                    const employee = teamHeads.find(
                      (h) => h.id === access.employeeId,
                    );
                    return (
                      <div
                        key={access.employeeId}
                        className="flex items-center justify-between p-[0.7vw] bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-[0.6vw]">
                          <div className="w-[2.2vw] h-[2.2vw] bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {employee?.profile ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={`${import.meta.env.VITE_API_BASE_URL1}${employee.profile}`}
                                  alt={employee.name}
                                  className="w-full h-full object-cover bg-white rounded-full"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                                  {employee?.name?.[0]?.toUpperCase() || "?"}
                                </div>
                              </div>
                            ) : (
                              employee?.name?.charAt(0)?.toUpperCase() || "U"
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{employee?.name}</div>
                            <div className="text-[0.7vw] text-gray-600">
                              {employee?.department}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(access.employeeId)}
                          className="px-[0.7vw] py-[0.2vw] bg-red-100 text-red-700 rounded-full text-[0.75vw] font-medium hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[0.95vw] font-medium mb-[0.9vw]">
                Grant Access to Admins
              </h3>
              {teamHeads.filter(
                (h) => h.id !== currentUserId && !hasAccessIds.includes(h.id),
              ).length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-[0.8vw]">
                  No Admins available for access
                </p>
              ) : (
                <div className="space-y-2">
                  {teamHeads
                    .filter(
                      (h) =>
                        h.id !== currentUserId && !hasAccessIds.includes(h.id),
                    )
                    .map((head) => (
                      <div
                        key={head.id}
                        className="flex items-center justify-between p-[0.7vw] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center space-x-[0.6vw]">
                          <div className="w-[2.2vw] h-[2.2vw] bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {head.profile ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={`${import.meta.env.VITE_API_BASE_URL1}${head.profile}`}
                                  alt={head.name}
                                  className="w-full h-full object-cover bg-white rounded-full"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                                  {head?.name?.[0]?.toUpperCase() || "?"}
                                </div>
                              </div>
                            ) : (
                              head.name?.charAt(0)?.toUpperCase() || "U"
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[0.85vw]">
                              {head.name}
                            </div>
                            <div className="text-[0.7vw] text-gray-600">
                              {head.department}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleGrantAccess(head.id)}
                          className="px-[0.7vw] py-[0.2vw] bg-blue-100 text-blue-700 rounded-full text-[0.75vw] font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                        >
                          Grant
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-[92vh] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600 mx-auto mb-[1vw]"></div>
          <p className="text-gray-600 text-[0.85vw]">
            {fetchingProject ? "Loading project details..." : "Saving..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[92vh] w-full max-h-full overflow-hidden pb-[1vw]">
      <div className="text-[0.9vw] text-gray-500 ml-[0.3vw] max-h-[5%] h-[4.5%]">
        <span
          onClick={() => navigate(getProjectsPath(employeeRole))}
          className="cursor-pointer hover:text-[#3B82F6]"
        >
          Projects
        </span>
        <span className="m-[0.3vw]">{"/"}</span>
        <span className="text-black">
          {isEditMode
            ? formData.projectName
            : isRequestOnlyUser
              ? "Request Project"
              : "New Project"}
        </span>
      </div>

      <div className="bg-white rounded-[1vw] border border-gray-200 overflow-y-hidden max-h-[95%] h-[95%]">
        <div className="flex justify-between items-end pb-[0.15vw] bg-gray-200 px-[1vw] h-[6%] gap-[1vw]">
          <div className="flex items-center gap-[0.2vw]">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-end gap-[0.4vw] px-[0.9vw] py-[0.25vw]  text-[0.8vw] font-medium transition-colors cursor-pointer ${
                activeTab === "form"
                  ? " text-gray-700 border-b-2 border-gray-700 "
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              {isRequestOnlyUser
                ? "Request Project"
                : isEditMode
                  ? "Edit Project"
                  : "Add Project"}
            </button>

            {(isRequestOnlyUser || isAdminLevel) && (
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.25vw] text-[0.8vw] font-medium transition-colors cursor-pointer ${
                  activeTab === "requests"
                    ? "text-gray-700 border-b-2 border-gray-700 "
                    : "text-gray-600 hover:bg-gray-300"
                }`}
              >
                <ClipboardList className="w-[0.85vw] h-[0.85vw]" />
                Requests
                {pendingCount > 0 && (
                  <span
                    className={`text-[0.6vw] px-[0.45vw] py-[0.05vw] rounded-full font-semibold min-w-[1.1vw] text-center ${
                      activeTab === "requests"
                        ? "bg-white text-black "
                        : "bg-black text-white"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-[0.8vw]">
            {fetchingProject && (
              <p className="text-[0.8vw] text-gray-600">
                <svg
                  className="animate-spin h-[1vw] w-[1vw] text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </p>
            )}
            {activeTab === "form" && loadedFromRequest && !isEditMode && (
              <div className="flex items-center gap-[0.5vw] bg-white  px-[0.7vw] mb-[0.7vh] py-[0.2vw] rounded-full">
                <span className="text-[0.72vw] text-gray-700">
                  From: <strong>{loadedFromRequest.employeeName}</strong>
                </span>
                <button
                  onClick={clearLoadedRequest}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-[0.75vw] h-[0.75vw]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === "requests" && (
          <div className="h-[87%] max-h-[87%] overflow-y-auto px-[1vw] py-[0.8vw]">
            {fetchingRequests ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-[1.8vw] w-[1.8vw] border-b-2 border-blue-600" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ClipboardList className="w-[3vw] h-[3vw] mb-[0.8vw] opacity-30" />
                <p className="text-[0.9vw] font-medium">No requests found</p>
                <p className="text-[0.75vw] mt-[0.3vw]">
                  {isRequestOnlyUser
                    ? "You haven't submitted any project requests yet."
                    : "No project requests have been submitted."}
                </p>
              </div>
            ) : (
              <div className="space-y-[0.6vw] ">
                {requests.map((req) => {
                  const deptNames = req.department
                    ?.map((deptId) => {
                      const found = departments.find(
                        (d) => d.id.toString() === deptId.toString(),
                      );
                      return found?.name || deptId;
                    })
                    .join(", ");

                  const isPending = req.status === "Requested";
                  const isThisLoading = loadingRequestId === req._id;

                  return (
                    <div
                      key={req._id}
                      className={` p-[0.85vw] bg-white transition-shadow ${
                        isPending
                          ? "border-b border-gray-300 hover:shadow-sm"
                          : "border-b border-gray-200 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-[1vw]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-[0.6vw] mb-[0.35vw]">
                            <p className="text-[0.8vw] text-gray-800 ">
                              <span className="font-medium text-gray-700">
                                Company:
                              </span>{" "}
                              {req.companyName}
                            </p>
                            |
                            <span className="text-[0.8vw] text-gray-800 truncate">
                              <span className="font-medium ">
                                Project Name :
                              </span>{" "}
                              {req.projectName}
                            </span>
                            <span
                              className={`shrink-0 px-[0.55vw] py-[0.1vw] rounded-full text-[0.65vw] font-medium ${getRequestStatusBadge(req.status)}`}
                            >
                              {req.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-[1vw] mb-[0.35vw]">
                            <p className="text-[0.78vw] text-gray-700 mb-[0.35vw]">
                              <span className="font-medium text-gray-600">
                                Category:
                              </span>{" "}
                              {req.category}
                            </p>
                            {deptNames && (
                              <p className="text-[0.78vw] text-gray-700 mb-[0.35vw]">
                                <span className="font-medium text-gray-700">
                                  Dept:
                                </span>{" "}
                                {deptNames}
                              </p>
                            )}
                          </div>



                          <p className="text-[0.78vw] text-gray-700 flex items-center gap-[1vw]">
                            {req.startDate && (
                            <>
                              <span className="font-medium text-gray-700">
                                Start Date :
                              </span>{" "}
                              {formatDate(req.startDate)}{" "}
                              
                            </>
                            )}

                             {req.endDate && (
                            <>
                              <span className="font-medium text-gray-700">
                                End Date :
                              </span>{" "}
                              {formatDate(req.endDate)}
                            </>
                             )}
                            Requested on {formatDate(req.createdAt)}
                          </p>

                          {req.description && (
                            <p className="text-[0.72vw] text-gray-700 mt-[0.35vw] line-clamp-2 ">
                              <span className="font-medium text-gray-700">
                                Description :
                              </span>{" "}
                              {req.description}
                            </p>
                          )}

                          {isAdminLevel && req.employeeName && (
                            <p className="text-[0.72vw] text-gray-500 mt-[0.35vw] line-clamp-2 ">
                              <span className="font-medium text-gray-600">
                                Requested by :
                              </span>{" "}
                              {req.employeeName}
                            </p>
                          )}
                        </div>

                        {isAdminLevel && isPending && (
                          <>
                            <button
                              onClick={() => handleLoadRequest(req)}
                              disabled={isThisLoading}
                              className="shrink-0 flex items-center gap-[0.35vw] px-[0.9vw] py-[0.3vw] bg-green-500 text-white rounded-full text-[0.72vw] font-medium hover:bg-green-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isThisLoading ? (
                                <div className="w-[0.8vw] h-[0.8vw] border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <></>
                              )}
                              Accept
                            </button>

                            <button
                              onClick={() => handleDeniedRequest(req)}
                              disabled={isThisLoading}
                              className="shrink-0 flex items-center gap-[0.35vw] px-[0.9vw] py-[0.3vw] bg-red-500 text-white rounded-full text-[0.72vw] font-medium hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isThisLoading ? (
                                <div className="w-[0.8vw] h-[0.8vw] border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <></>
                              )}
                              Denied
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "form" && (
          <>
            <div className="h-[87%] max-h-[87%] overflow-y-auto px-[1vw] py-[0.8vw] pr-[15%]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[1vw] mb-[1vw]">
                <div ref={companyRef} className="relative">
                  <div className="flex gap-[0.5vw] mb-[0.5vw] justify-between">
                    <label className="block text-[0.85vw] text-gray-700">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="absolute right-0 -top-[0.3vw] flex gap-[0.5vw] bg-black rounded-full p-[0.15vw]">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyType("existing");
                          setFormData((p) => ({ ...p, companyName: "" }));
                          setCompanySearchTerm("");
                        }}
                        className={`min-w-[3.7vw] py-[0.15vw] text-[0.75vw] rounded-full transition-colors cursor-pointer ${
                          companyType === "existing"
                            ? "bg-white text-gray-800"
                            : "bg-black text-white hover:bg-white hover:text-black"
                        }`}
                      >
                        Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyType("new");
                          setFormData((p) => ({ ...p, companyName: "" }));
                          setCompanySearchTerm("");
                        }}
                        className={`min-w-[3.7vw] py-[0.15vw] text-[0.75vw] rounded-full transition-colors cursor-pointer ${
                          companyType === "new"
                            ? "bg-white text-gray-800"
                            : "bg-black text-white hover:bg-white hover:text-black"
                        }`}
                      >
                        New
                      </button>
                    </div>
                  </div>

                  {companyType === "new" ? (
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <div
                        className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={() =>
                          setShowCompanyDropdown(!showCompanyDropdown)
                        }
                      >
                        <span
                          className={
                            formData.companyName
                              ? "text-gray-700"
                              : "text-gray-400"
                          }
                        >
                          {formData.companyName || "Select existing company"}
                        </span>
                        <ChevronDown
                          className={`w-[1vw] h-[1vw] text-gray-500 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`}
                        />
                      </div>
                      {showCompanyDropdown && (
                        <div className="absolute z-20 w-full mt-[0.2vw] bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                          <div className="p-[0.5vw] border-b border-gray-200">
                            <div className="relative">
                              <img
                                src={searchIcon}
                                className="w-[0.9vw] h-[0.9vw] absolute left-[0.6vw] top-1/2 -translate-y-1/2 opacity-60"
                                alt="search"
                              />
                              <input
                                type="text"
                                placeholder="Search company..."
                                value={companySearchTerm}
                                onChange={(e) =>
                                  setCompanySearchTerm(e.target.value)
                                }
                                onMouseDown={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-full border border-gray-300 rounded-full px-[0.6vw] py-[0.25vw] text-[0.75vw] pl-[1.8vw] focus:outline-none focus:ring-1 focus:ring-gray-500"
                              />
                              {companySearchTerm && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompanySearchTerm("");
                                  }}
                                  className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                  <X className="w-[0.8vw] h-[0.8vw]" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-[12vw] overflow-y-auto">
                            {companyOptions.filter((o) =>
                              o
                                .toLowerCase()
                                .includes(companySearchTerm.toLowerCase()),
                            ).length === 0 ? (
                              <div className="px-[0.7vw] py-[0.8vw] text-[0.8vw] text-gray-500 text-center">
                                No companies found
                              </div>
                            ) : (
                              companyOptions
                                .filter((o) =>
                                  o
                                    .toLowerCase()
                                    .includes(companySearchTerm.toLowerCase()),
                                )
                                .map((option, i) => (
                                  <div
                                    key={i}
                                    className={`px-[0.7vw] py-[0.4vw] text-[0.8vw] cursor-pointer flex items-center justify-between border-b border-gray-100 transition-colors ${
                                      formData.companyName === option
                                        ? "bg-blue-50 text-blue-700"
                                        : "hover:bg-gray-50"
                                    }`}
                                    onClick={() => {
                                      handleInputChange("companyName", option);
                                      setShowCompanyDropdown(false);
                                      setCompanySearchTerm("");
                                    }}
                                  >
                                    <span>{option}</span>
                                    {formData.companyName === option && (
                                      <Check className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                                    )}
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    value={formData.projectName}
                    onChange={(e) =>
                      handleInputChange("projectName", e.target.value)
                    }
                    className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div ref={categoryRef} className="relative">
                  <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter category"
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showCategoryDropdown && categoryOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-[0.2vw] bg-white border border-gray-300 rounded-lg shadow-lg max-h-[15vw] overflow-y-auto">
                      {categoryOptions
                        .filter((o) =>
                          o
                            .toLowerCase()
                            .includes(formData.category.toLowerCase()),
                        )
                        .map((option, i) => (
                          <div
                            key={i}
                            className="px-[0.7vw] py-[0.4vw] text-[0.8vw] hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              handleInputChange("category", option);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                    Start Date <span className="text-red-500"> {!isRequestOnlyUser ? "*":""}</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    min={
                      isEditMode
                        ? undefined
                        : new Date().toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                    End Date  <span className="text-red-500"> {!isRequestOnlyUser ? "*":""}</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    disabled={!formData.startDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div ref={departmentRef} className="relative">
                  <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="w-full border border-gray-600 rounded-[0.8vw] px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 cursor-pointer min-h-[2vw] flex items-center flex-wrap gap-[0.3vw]"
                    onClick={() =>
                      setShowDepartmentDropdown(!showDepartmentDropdown)
                    }
                  >
                    {formData.department.length === 0 ? (
                      <span className="text-gray-400">Select departments</span>
                    ) : (
                      formData.department.map((dept) => (
                        <span
                          key={dept.id}
                          className="bg-blue-100 text-blue-800 px-[0.5vw] py-[0.1vw] rounded-full text-[0.7vw] flex items-center gap-[0.2vw]"
                        >
                          {dept.name}
                          <IoIosClose
                            className="w-[0.9vw] h-[0.9vw] cursor-pointer hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDepartment(dept.id);
                            }}
                          />
                        </span>
                      ))
                    )}
                    <ChevronDown className="w-[1vw] h-[1vw] ml-auto text-gray-500" />
                  </div>
                  {showDepartmentDropdown && (
                    <div
                      className="absolute z-20 w-full mt-[0.2vw] bg-white border border-gray-300 rounded-lg shadow-lg max-h-[15vw] overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {departments.length === 0 ? (
                        <div className="px-[0.7vw] py-[0.4vw] text-[0.8vw] text-gray-500">
                          No departments available
                        </div>
                      ) : (
                        departments.map((dept) => {
                          const isSelected = formData.department.some(
                            (d) => d.id === dept.id,
                          );
                          return (
                            <div
                              key={dept.id}
                              className={`px-[0.7vw] py-[0.4vw] border-b border-gray-200 text-[0.8vw] cursor-pointer flex items-center justify-between transition ${
                                isSelected
                                  ? "bg-blue-50 text-blue-700"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => handleDepartmentToggle(dept)}
                            >
                              <span>{dept.name}</span>
                              {isSelected && (
                                <Check className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {!isRequestOnlyUser && (
                  <div ref={priorityRef} className="relative">
                    <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                      Priority
                    </label>
                    <div
                      className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 cursor-pointer flex items-center justify-between"
                      onClick={() =>
                        setShowPriorityDropdown(!showPriorityDropdown)
                      }
                    >
                      <span
                        className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.75vw] font-medium ${getPriorityColor(formData.priority)}`}
                      >
                        {formData.priority}
                      </span>
                      <ChevronDown
                        className={`w-[1vw] h-[1vw] text-gray-500 transition-transform ${showPriorityDropdown ? "rotate-180" : ""}`}
                      />
                    </div>
                    {showPriorityDropdown && (
                      <div className="absolute z-20 w-full mt-[0.2vw] bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                        {priorityOptions.map((option) => (
                          <div
                            key={option.value}
                            className={`px-[0.7vw] py-[0.4vw] text-[0.8vw] cursor-pointer flex items-center justify-between border-b border-gray-100 transition-colors ${
                              formData.priority === option.value
                                ? "bg-gray-50"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              handleInputChange("priority", option.value);
                              setShowPriorityDropdown(false);
                            }}
                          >
                            <span
                              className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.75vw] font-medium ${option.color}`}
                            >
                              {option.label}
                            </span>
                            {formData.priority === option.value && (
                              <Check className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isEditMode && !isRequestOnlyUser && (
                  <div className="relative">
                    <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                      Project Status
                    </label>
                    {originalStatus === "Canceled" ? (
                      <div className="w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 bg-gray-100 cursor-not-allowed flex items-center">
                        <span
                          className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.75vw] font-medium ${getStatusColor(originalStatus)}`}
                        >
                          {originalStatus}
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          className="appearance-none w-full border border-gray-600 rounded-full px-[0.7vw] py-[0.3vw] text-[0.80vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          value={formData.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                        >
                          {statusOptions.map((status) => (
                            <option
                              key={status.value}
                              value={status.value}
                              disabled={status.value === originalStatus}
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-500 pointer-events-none" />
                      </div>
                    )}
                    {formData.status !== originalStatus && (
                      <p className="text-[0.7vw] text-gray-600 mt-[0.2vw] ml-[0.3vw]">
                        Status will change from "{originalStatus}" to "
                        {formData.status}"
                      </p>
                    )}
                  </div>
                )}

                {!isRequestOnlyUser && (
                  <div>
                    <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                      Supporting Person's (Optional)
                    </label>
                    <button
                      onClick={handleAccessManagement}
                      className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.3vw] text-[0.80vw] text-gray-700 bg-white border border-gray-600 rounded-full hover:bg-gray-50 cursor-pointer"
                      title="Manage Access"
                    >
                      <span>Add supporting person's</span>
                      {formData.accessGrantedTo?.length > 0 && (
                        <span className="bg-blue-600 text-white text-[0.6vw] rounded-full min-w-[1vw] h-[1vw] flex items-center justify-center px-[0.15vw]">
                          {formData.accessGrantedTo.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-[1vw]">
                <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  className="w-full border border-gray-600 rounded-xl px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                />
              </div>

              {isEditMode &&
                !isRequestOnlyUser &&
                formData.statusHistory?.length > 0 && (
                  <div className="mb-[1vw]">
                    <label className="block text-[0.85vw] text-gray-700 mb-[0.5vw]">
                      Status History
                    </label>
                    <div className="border border-gray-300 rounded-lg max-w-[30vw] overflow-hidden">
                      <div className="max-h-[10vw] overflow-y-auto">
                        {formData.statusHistory.map((history, index) => (
                          <div
                            key={index}
                            className={`p-[0.6vw] flex items-center gap-[0.8vw] ${
                              index !== formData.statusHistory.length - 1
                                ? "border-b border-gray-200"
                                : ""
                            }`}
                          >
                            <div
                              className={`px-[0.9vw] py-[0.15vw] rounded-xl text-[0.73vw] font-medium ${getStatusColor(history.status)}`}
                            >
                              {history.status}
                            </div>
                            <div className="flex-1">
                              <p className="text-[0.78vw] text-gray-600">
                                Reason: {history.reason || "No reason provided"}
                              </p>
                              <p className="text-[0.78vw] text-gray-400 mt-[0.2vw]">
                                Changed by:{" "}
                                {getEmployeeNameById(history.changedBy) ||
                                  "Unknown"}
                                {history.createdAt &&
                                  ` - ${new Date(history.createdAt).toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-end pr-[1vw] h-[7%] pb-[0.5vw] gap-[1vw]">
              <button
                className="bg-gray-300 hover:bg-gray-200 text-black px-[1.3vw] py-[0.3vw] rounded-full text-[0.8vw] cursor-pointer"
                onClick={() => navigate(getProjectsPath(employeeRole))}
              >
                Cancel
              </button>
              {originalStatus === "Canceled" ? null : (
                <button
                  className="bg-black hover:bg-gray-900 text-white px-[1.6vw] py-[0.3vw] rounded-full text-[0.8vw] cursor-pointer disabled:opacity-60"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {( !isEditMode && isRequestOnlyUser )
                    ? "Request"
                    : isEditMode
                      ? "Update"
                      : "Save"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <AccessManagementModal />

      {showReasonModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[28%] p-[1.2vw]">
            <div className="flex justify-between items-center mb-[1vw]">
              <h3 className="text-[1vw] font-semibold">
                Change Status to{" "}
                <span className="font-semibold">{pendingStatus}</span>
              </h3>
              <button
                onClick={handleCancelStatusChange}
                className="p-[0.4vw] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X className="w-[1.2vw] h-[1.2vw]" />
              </button>
            </div>
            <div className="mb-[1vw]">
              <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.5vw]">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Please provide a reason for this status change..."
                rows={4}
                className="w-full border border-gray-600 rounded-lg px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-[1vw] justify-end">
              <button
                onClick={handleCancelStatusChange}
                className="px-[1.3vw] py-[0.3vw] bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full text-[0.8vw] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                className="px-[1.3vw] py-[0.3vw] bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[0.8vw] cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
