import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Trash2,
  Plus,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Download 
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;

const isExistingDocument = (doc) => !doc.file;
const isNewDocument = (doc) => !!doc.file;

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const ProjectBudget = ({ showToast }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  const [formData, setFormData] = useState({
    projectId: "",
    companyName: "",
    customerName: "",
    projectName: "",
    projectCategory: "",
    totalBudget: "",
    startingDate: "",
    complicationDate: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handlePrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState({ po: [], invoice: [] });
  const [perDayAmount, setPerDayAmount] = useState({ amount: 0, days: 0 });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    companyName: "",
    customerName: "",
    projectName: "",
    projectCategory: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (
      formData.totalBudget &&
      formData.startingDate &&
      formData.complicationDate
    ) {
      calculatePerDayAmount();
    }
  }, [formData.totalBudget, formData.startingDate, formData.complicationDate]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = projects.filter(
        (project) =>
          project.companyName?.toLowerCase().includes(term) ||
          project.customerName?.toLowerCase().includes(term) ||
          project.projectName?.toLowerCase().includes(term) ||
          project.projectCategory?.toLowerCase().includes(term)
      );
      setFilteredProjects(filtered);
    }
  }, [searchTerm, projects]);

  const getProjectStatus = (project) => {
    if (!project.budget || !project.payments) {
      return { status: "pending", label: "Pending", color: "gray" };
    }

    const totalBudget = parseFloat(project.budget.totalBudget) || 0;
    const completionDate = new Date(project.budget.complicationDate);
    const today = new Date();

    // Calculate total received amount from payments
    const totalReceived = project.payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.receivedAmount) || 0);
    }, 0);

    const budgetFullyReceived = totalReceived >= totalBudget;

    if (budgetFullyReceived && today <= completionDate) {
      return { status: "completed", label: "Completed", color: "green" };
    } else if (today > completionDate && !budgetFullyReceived) {
      return { status: "overdue", label: "Overdue", color: "red" };
    } else if (budgetFullyReceived) {
      return { status: "completed", label: "Completed", color: "green" };
    } else {
      return { status: "pending", label: "Pending", color: "gray" };
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects`);
      const data = await res.json();
      if (data.success) {
        // Fetch budget details for each project
        const projectsWithDetails = await Promise.all(
          (data.projects || []).map(async (project) => {
            const details = await fetchProjectDetails(project.id);
            return details ? { ...project, ...details } : project;
          })
        );
        setProjects(projectsWithDetails);
        setFilteredProjects(projectsWithDetails);
      } else {
        showToast("Error", data.error || "Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      showToast("Error", "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        return data.project;
      }
      return null;
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    }
  };

  const calculatePerDayAmount = () => {
    const total = parseFloat(formData.totalBudget) || 0;
    const start = new Date(formData.startingDate);
    const end = new Date(formData.complicationDate);
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (days > 0 && total > 0) {
      setPerDayAmount({ amount: total / days, days });
    } else {
      setPerDayAmount({ amount: 0, days: 0 });
    }
  };

  const getTotalReceived = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return 0;
    return payments.reduce(
      (sum, p) => sum + (parseFloat(p.receivedAmount) || 0),
      0
    );
  };

  const isBudgetFullyPaid = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return false;
    const totalReceived = getTotalReceived();
    return totalReceived >= totalBudget - 0.01;
  };

  const overPaid = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return false;
    const totalReceived = getTotalReceived();
    return totalReceived > totalBudget + 0.01;
  };

  const disabledPayments = isBudgetFullyPaid();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "totalBudget") {
      const newTotal = parseFloat(value) || 0;
      if (!newTotal) {
        setPayments((prev) => prev.map((p) => ({ ...p, balanceAmount: "" })));
        return;
      }

      setPayments((prev) => {
        let runningReceived = 0;
        return prev.map((p) => {
          const received = parseFloat(p.receivedAmount) || 0;
          runningReceived += received;
          const percentage = received
            ? ((received / newTotal) * 100).toFixed(2)
            : "";
          const balance = (newTotal - runningReceived).toFixed(2);
          return {
            ...p,
            percentage,
            balanceAmount: balance,
          };
        });
      });
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10485760) {
      showToast("Error", "File size must be less than 10MB");
      e.target.value = "";
      return;
    }

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    };

    setDocuments((prev) => ({
      ...prev,
      [type]: [...prev[type], fileData],
    }));

    showToast("Success", "File added successfully");
    e.target.value = "";
  };

  const viewDocument = (docPath) => {
    window.open(`${API_BASE_URL1}${docPath}`, "_blank");
  };

  const downloadDocument = (docPath, docName) => {
    const url = (`${API_BASE_URL1}${docPath}`, "_blank");
    const link = document.createElement("a");
    link.href = url;
    link.download = docName || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeDocument = async (type, index) => {
    const doc = documents[type][index];
    const isSaved = !doc.file;

    const ok = window.confirm(
      `Are you sure you want to delete "${doc.name}"${
        isSaved ? " permanently" : ""
      }?`
    );
    if (!ok) return;

    if (!isSaved) {
      setDocuments((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index),
      }));
      showToast("Success", "File removed from list");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/budget/projects/${formData.projectId}/document`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            docId: doc.docId,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        showToast("Error", data.error || "Failed to delete document");
        return;
      }

      setDocuments(data.documents || { po: [], invoice: [] });
      showToast("Success", "Document deleted successfully");
    } catch (err) {
      console.error("Delete document error:", err);
      showToast("Error", "Failed to delete document");
    }
  };

  const addPaymentRow = () => {
    if (disabledPayments) {
      showToast(
        "Info",
        "Total budget is already fully received. You cannot add more payments."
      );
      return;
    }

    setPayments((prev) => [
      ...prev,
      {
        date: "",
        paymentMode: "Cash",
        percentage: "",
        receivedAmount: "",
        balanceAmount: "",
      },
    ]);
  };

  const removePaymentRow = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;

    const totalBudget = parseFloat(formData.totalBudget) || 0;

    if (field === "percentage" && totalBudget > 0) {
      const percentage = parseFloat(value) || 0;
      newPayments[index].receivedAmount = (
        (totalBudget * percentage) /
        100
      ).toFixed(2);
    } else if (field === "receivedAmount" && totalBudget > 0) {
      const amount = parseFloat(value) || 0;
      newPayments[index].percentage = ((amount / totalBudget) * 100).toFixed(2);
    }

    let totalReceived = 0;
    for (let i = 0; i <= index; i++) {
      totalReceived += parseFloat(newPayments[i].receivedAmount) || 0;
    }
    newPayments[index].balanceAmount = (totalBudget - totalReceived).toFixed(2);

    setPayments(newPayments);
  };

  const handleSubmit = async () => {
    if (
      !formData.totalBudget ||
      !formData.startingDate ||
      !formData.complicationDate
    ) {
      showToast("Error", "Please fill in all required budget fields");
      return;
    }

    if (!formData.projectId) {
      showToast("Error", "Project ID is missing");
      return;
    }

    const formDataToSend = new FormData();

    formDataToSend.append("projectId", formData.projectId);
    formDataToSend.append("totalBudget", parseFloat(formData.totalBudget));
    formDataToSend.append("startingDate", formData.startingDate);
    formDataToSend.append("complicationDate", formData.complicationDate);

    const validPayments = payments.filter(
      (p) => p.date && p.percentage && p.receivedAmount
    );
    formDataToSend.append("payments", JSON.stringify(validPayments));

    documents.po.forEach((doc) => {
      if (doc.file) {
        formDataToSend.append("po", doc.file);
      }
    });

    documents.invoice.forEach((doc) => {
      if (doc.file) {
        formDataToSend.append("invoice", doc.file);
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/budget/save-project`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();

      if (data.success) {
        showToast(
          "Success",
          data.message || "Project budget saved successfully"
        );
        closeModal();
        fetchProjects();
      } else {
        showToast("Error", data.error || "Failed to save project");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", "Failed to save project budget");
    }
  };

  const openAddModal = async (project) => {
    if (project) {
      setLoading(true);
      const projectDetails = await fetchProjectDetails(project.id);
      setLoading(false);

      if (projectDetails) {
        setCurrentProject(projectDetails);
        setFormData({
          projectId: projectDetails.id,
          companyName: projectDetails.companyName,
          customerName: projectDetails.customerName,
          projectName: projectDetails.projectName,
          projectCategory: projectDetails.projectCategory,
          totalBudget: projectDetails.budget?.totalBudget || "",
          startingDate: toDateInputValue(projectDetails.budget?.startingDate),
          complicationDate: toDateInputValue(
            projectDetails.budget?.complicationDate
          ),
        });
        setPayments(projectDetails.payments || []);
        setDocuments(projectDetails.documents || { po: [], invoice: [] });
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: "",
      companyName: "",
      customerName: "",
      projectName: "",
      projectCategory: "",
      totalBudget: "",
      startingDate: "",
      complicationDate: "",
    });
    setPayments([]);
    setDocuments({ po: [], invoice: [] });
    setCurrentProject(null);
    setPerDayAmount({ amount: 0, days: 0 });
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleCreateProject = async () => {
    const { companyName, customerName, projectName, projectCategory } =
      createFormData;

    if (!companyName || !customerName || !projectName || !projectCategory) {
      showToast("Error", "Please fill all fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Success", "Project created successfully");
        setShowCreateModal(false);
        // Reset form
        setCreateFormData({
          companyName: "",
          customerName: "",
          projectName: "",
          projectCategory: "",
        });
        // Refresh projects list
        await fetchProjects();
      } else {
        showToast("Error", data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Create project error:", error);
      showToast("Error", "Failed to create project");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="h-full px-[0.8vw] pb-[0.8vw] pt-[0.8vw]">
            {/* Card wrapper like Resource */}
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
              {/* Top toolbar */}
              <div className="flex items-center justify-between gap-[1vw] p-[0.8vw] h-[10%] flex-shrink-0">
                <div className="relative w-[25vw]">
                  <Search
                    className="absolute left-[0.8vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search by Company, Customer, Project Name or Category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-[2.5vw] pr-[1vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-[1.2vw] py-[0.6vw] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-[0.85vw] flex items-center gap-[0.5vw] cursor-pointer"
                >
                  <Plus size={18} />
                  Add Project
                </button>
              </div>

              {/* Table region (scrollable) */}
              <div className="flex-1 min-h-0">
                {filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg
                      className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                      {searchTerm
                        ? "No projects match your search."
                        : "No projects found."}
                    </p>
                    <p className="text-[1vw] text-gray-400">
                      Click "Add Project" to create your first project
                    </p>
                  </div>
                ) : (
                  <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-[#E2EBFF] sticky top-0 z-[5]">
                        <tr>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            S. No
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Company Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Customer Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Project Category
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Update
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProjects.map((project, index) => {
                          const statusInfo = getProjectStatus(project);
                          const bgColorClass = 
                            statusInfo.color === "green" 
                              ? "bg-green-50" 
                              : statusInfo.color === "red" 
                              ? "bg-red-50" 
                              : "hover:bg-gray-50";
                          const textColorClass = 
                            statusInfo.color === "green" 
                              ? "text-green-800" 
                              : statusInfo.color === "red" 
                              ? "text-red-800" 
                              : "text-gray-600";
                          const statusBgColor = 
                            statusInfo.color === "green" 
                              ? "bg-green-100" 
                              : statusInfo.color === "red" 
                              ? "bg-red-100" 
                              : "bg-gray-100";
                          const statusTextColor = 
                            statusInfo.color === "green" 
                              ? "text-green-700" 
                              : statusInfo.color === "red" 
                              ? "text-red-700" 
                              : "text-gray-700";

                          return (
                            <tr
                              key={project.id}
                              className={`transition-colors ${bgColorClass}`}
                            >
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium border border-gray-300 text-center ${textColorClass}`}>
                                {String(startIndex + index + 1).padStart(2, "0")}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.companyName}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.customerName}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.projectName}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.projectCategory}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] border border-gray-300 text-center`}>
                                <span className={`px-[0.6vw] py-[0.3vw] rounded text-[0.75vw] font-medium ${statusBgColor} ${statusTextColor}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <button
                                  onClick={() => openAddModal(project)}
                                  className="px-[1vw] py-[0.35vw] rounded-lg text-[0.75vw] bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination footer like Resource */}
              {filteredProjects.length > 0 && (
                <div className="flex items-center justify-between px-[0.8vw] py-[0.6vw] h-[10%] flex-shrink-0 border-t border-gray-200">
                  <div className="text-[0.80vw] text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredProjects.length)} of{" "}
                    {filteredProjects.length} projects
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <button
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="px-[0.8vw] py-[0.6vw] flex items-center gap-[0.6vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.80vw] cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-[0.80vw] text-gray-600 px-[0.5vw]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="px-[0.8vw] py-[0.6vw] flex items-center gap-[0.6vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.80vw] cursor-pointer"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[80vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-[1.2vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                {currentProject
                  ? "Update Project Budget"
                  : "Add Project Budget"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-[1.5vw] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.2vw] space-y-[1.5vw]">
              {/* Project Info */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <Briefcase size="1.2vw" className="text-blue-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Project Information
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-[1vw]">
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Project Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="projectCategory"
                      value={formData.projectCategory}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <FileText size="1.2vw" className="text-green-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Documents
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-[1vw]">
                  {/* PO */}
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Purchase Order (PO)
                    </label>
                    <div>
                      <input
                        type="file"
                        id="poFile"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(e, "po")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("poFile").click()
                        }
                        className="flex items-center gap-[0.5vw] w-full border border-gray-300 rounded-lg px-[0.8vw] py-[0.5vw] text-[0.85vw] hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Upload New PO
                      </button>

                      {documents.po.filter(isExistingDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            📁 Saved PO
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.po
                              .filter(isExistingDocument)
                              .map((doc, idx) => (
                                <div
                                  key={doc.docId || `po-saved-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-green-50 rounded border border-green-200"
                                >
                                  <span className="text-[0.8vw] text-green-800 truncate flex-1 font-medium">
                                    {doc.name}
                                  </span>
                                  <div className="flex items-center gap-[0.3vw]">
                                    {doc.path && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => viewDocument(doc.path)}
                                          className="text-green-600 hover:text-green-800 p-[0.2vw] hover:bg-green-100 rounded cursor-pointer"
                                          title="View"
                                        >
                                          <Eye size={18} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadDocument(doc.path, doc.name)
                                          }
                                          className="text-blue-600 hover:text-blue-800 p-[0.2vw] hover:bg-blue-100 rounded cursor-pointer"
                                          title="Download"
                                        >
                                          <Download  size={18} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeDocument(
                                          "po",
                                          documents.po.findIndex(
                                            (d) => d.docId === doc.docId
                                          )
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700 p-[0.2vw] hover:bg-red-100 rounded cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {documents.po.filter(isNewDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            ⏳ Pending PO
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.po
                              .filter(isNewDocument)
                              .map((doc, idx) => (
                                <div
                                  key={`po-new-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-blue-50 rounded border border-blue-200"
                                >
                                  <span className="text-[0.8vw] text-blue-700 truncate flex-1">
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "po",
                                        documents.po.findIndex((d) => d === doc)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice */}
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Invoice
                    </label>
                    <div>
                      <input
                        type="file"
                        id="invoiceFile"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(e, "invoice")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("invoiceFile").click()
                        }
                        className="flex items-center gap-[0.5vw] w-full border border-gray-300 rounded-lg px-[0.8vw] py-[0.5vw] text-[0.85vw] hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Upload New Invoice
                      </button>

                      {documents.invoice.filter(isExistingDocument).length >
                        0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            📁 Saved Invoice
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.invoice
                              .filter(isExistingDocument)
                              .map((doc, idx) => (
                                <div
                                  key={doc.docId || `invoice-saved-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-green-50 rounded border border-green-200"
                                >
                                  <span className="text-[0.8vw] text-green-800 truncate flex-1 font-medium">
                                    {doc.name}
                                  </span>
                                  <div className="flex items-center gap-[0.3vw]">
                                    {doc.path && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => viewDocument(doc.path)}
                                          className="text-green-600 hover:text-green-800 p-[0.2vw] hover:bg-green-100 rounded cursor-pointer"
                                          title="View"
                                        >
                                          <Eye size={18} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadDocument(doc.path, doc.name)
                                          }
                                          className="text-blue-600 hover:text-blue-800 p-[0.2vw] hover:bg-blue-100 rounded cursor-pointer"
                                          title="Download"
                                        >
                                          <Download  size={18} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeDocument(
                                          "invoice",
                                          documents.invoice.findIndex(
                                            (d) => d.docId === doc.docId
                                          )
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700 p-[0.2vw] hover:bg-red-100 rounded cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {documents.invoice.filter(isNewDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            ⏳ Pending Invoice
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.invoice
                              .filter(isNewDocument)
                              .map((doc, idx) => (
                                <div
                                  key={`invoice-new-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-blue-50 rounded border border-blue-200"
                                >
                                  <span className="text-[0.8vw] text-blue-700 truncate flex-1">
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "invoice",
                                        documents.invoice.findIndex(
                                          (d) => d === doc
                                        )
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <DollarSign size="1.2vw" className="text-purple-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Budget
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-[1vw]">
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Total Budget <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="totalBudget"
                      value={formData.totalBudget}
                      onChange={handleInputChange}
                      placeholder="₹ 80000"
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Starting Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startingDate"
                      value={formData.startingDate}
                      onChange={handleInputChange}
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Completion Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="complicationDate"
                      value={formData.complicationDate}
                      onChange={handleInputChange}
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                </div>

                {perDayAmount.days > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-[1vw]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[0.5vw]">
                        <Calendar size={18} className="text-blue-600" />
                        <span className="text-[0.9vw] font-semibold text-blue-700">
                          Per Day Amount: {formatCurrency(perDayAmount.amount)}
                        </span>
                      </div>
                      <span className="text-[0.75vw] text-blue-600">
                        Total {perDayAmount.days} days
                      </span>
                    </div>
                  </div>
                )}

                {overPaid() && (
                  <div className="text-[0.8vw] text-red-600 font-medium mt-[0.3vw]">
                    Warning: Total received amount is greater than Total Budget.
                    Please adjust payments or budget.
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <DollarSign size="1.2vw" className="text-orange-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Payment
                  </h3>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#E2EBFF]">
                      <tr>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Date
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Payment Mode
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Received Amount
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Percentage
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Balance Amount
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center w-[3vw]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center py-[1.5vw] text-gray-500 text-[0.85vw]"
                          >
                            No payment rows added. Click "+ Add" to add payment
                            details.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="date"
                                value={payment.date}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "date",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <select
                                value={payment.paymentMode}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "paymentMode",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              >
                                <option value="Cash">Cash</option>
                                <option value="Account">Account</option>
                              </select>
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.receivedAmount}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "receivedAmount",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                placeholder="2250.00"
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.percentage}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "percentage",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                placeholder="15"
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.balanceAmount}
                                readOnly
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw] font-semibold bg-gray-50"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                              <button
                                onClick={() => removePaymentRow(index)}
                                className="text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div>
                  {!disabledPayments && (
                    <button
                      type="button"
                      onClick={addPaymentRow}
                      className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] rounded-lg text-[0.85vw] bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  )}
                  {disabledPayments && (
                    <div className="text-[0.8vw] text-green-700 font-medium mt-[0.3vw]">
                      Total budget completed.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-[0.8vw] p-[1.2vw] border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-[1.5vw] py-[0.5vw] text-[0.9vw] border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-[1.5vw] py-[0.5vw] text-[0.9vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
              >
                {currentProject ? "Update Budget" : "Save Budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[50vw] max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-[1.5vw] border-b border-gray-200">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                Create New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-[1.5vw] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.5vw]">
              <div className="grid grid-cols-2 gap-[1.2vw]">
                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={createFormData.companyName}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        companyName: e.target.value,
                      })
                    }
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={createFormData.customerName}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        customerName: e.target.value,
                      })
                    }
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={createFormData.projectName}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        projectName: e.target.value,
                      })
                    }
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Project Category *
                  </label>
                  <input
                    type="text"
                    name="projectCategory"
                    value={createFormData.projectCategory}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        projectCategory: e.target.value,
                      })
                    }
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-[1.5vw] border-t border-gray-200 flex justify-end gap-[1vw]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-[1.5vw] py-[0.6vw] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-[1.5vw] py-[0.6vw] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBudget;
