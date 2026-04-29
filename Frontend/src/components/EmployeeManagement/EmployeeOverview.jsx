import React, { useState, useEffect } from "react";
import { Edit2, Trash2, ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";
import AddEmployeeModal from "./AddEmployee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RECORDS_PER_PAGE = 8;

const EmployeeOverview = () => {
  const { notify } = useNotification();
  const confirm = useConfirm();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dobFilter, setDobFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/employeeRegister`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.status && data.employees) {
        setEmployees(data.employees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      notify({
        title: "Error",
        message: `Failed to fetch employees: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: "error",
      title: "Delete Employee",
      message: "Are you sure you want to delete this employee?\nThis action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employeeRegister/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Employee deleted successfully",
        });
        fetchEmployees();
      } else {
        notify({
          title: "Error",
          message: "Failed to delete employee",
        });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      notify({
        title: "Error",
        message: "Error deleting employee",
      });
    }
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSuccess = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  // Helper function to check if DOB matches the filter
  const matchesDobFilter = (emp) => {
    if (!dobFilter || !emp.date_of_birth) return true;
    
    const empDob = new Date(emp.date_of_birth);
    const filterDate = new Date(dobFilter);
    
    // Compare year, month, and day
    return (
      empDob.getFullYear() === filterDate.getFullYear() &&
      empDob.getMonth() === filterDate.getMonth() &&
      empDob.getDate() === filterDate.getDate()
    );
  };

  // Filter employees based on search and DOB
  const filteredEmployees = employees.filter(
    (emp) => {
      const matchesSearch =
        emp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email_official?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email_personal?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDob = matchesDobFilter(emp);
      
      return matchesSearch && matchesDob;
    }
  );

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dobFilter]);

  const renderEmployeeCell = (emp) => (
    <div className="flex items-center gap-[0.5vw]">
      <div className="w-[2.2vw] h-[2.2vw] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        {emp.profile_url ? (
          <img
            src={`${API_BASE_URL}${emp.profile_url}`}
            alt={emp.employee_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center bg-gray-800 text-white ${
            emp.profile_url ? "hidden" : "flex"
          }`}
        >
          <span className="text-[0.9vw] font-semibold">
            {emp.employee_name?.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-[0.86vw] font-medium text-gray-900 leading-tight">
          {emp.employee_name}
        </div>
        <div className="text-[0.72vw] text-gray-500 leading-tight">
          {emp.employee_id}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="font-medium text-[0.95vw] text-gray-800">All Employees</span>
          <span className="text-[0.85vw] text-gray-500">({filteredEmployees.length})</span>
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-[1vw] pr-[1vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="relative">
            <Calendar className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-500 pointer-events-none" />
            <input
              type="date"
              placeholder="Filter by DOB"
              value={dobFilter}
              onChange={(e) => setDobFilter(e.target.value)}
              className="pl-[2vw] pr-[1vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
            />
            {dobFilter && (
              <button
                onClick={() => setDobFilter("")}
                className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                title="Clear DOB filter"
              >
                <span className="text-[1.2vw]">×</span>
              </button>
            )}
          </div>
          <button
            onClick={handleAddNew}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
          >
            <Plus size={"1vw"} className="mr-[0.3vw]" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-[1.1vw] font-medium mb-[0.5vw]">No employees found</p>
            <p className="text-[1vw] text-gray-400">
              {searchTerm || dobFilter ? "Try adjusting your filters" : "No employees registered yet"}
            </p>
          </div>
        ) : (
          <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-[#E2EBFF] sticky top-0">
                <tr>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    S.NO
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Employee
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Designation
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Email
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Date of Birth
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Employment Type
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Status
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((emp, index) => (
                  <tr
                    key={emp.employee_id || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                      {renderEmployeeCell(emp)}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                      {emp.designation}
                      {emp.team_head && (
                        <span className="ml-[0.3vw] text-[0.7vw] bg-purple-100 text-purple-700 px-[0.4vw] py-[0.1vw] rounded-full">
                          Team Head
                        </span>
                      )}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 truncate max-w-[12vw]">
                      {emp.email_official || emp.email_personal}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                      {emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[0.75vw] font-medium ${
                          emp.employment_type === "On Role"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {emp.employment_type}
                      </span>
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[0.75vw] font-medium ${
                          emp.working_status === "Active"
                            ? "bg-green-100 text-green-800"
                            : emp.working_status === "On Leave"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {emp.working_status}
                      </span>
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      <div className="flex items-center justify-center gap-[0.5vw]">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-[0.35vw] bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={"1vw"} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.employee_id)}
                          className="p-[0.35vw] bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={"1vw"} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredEmployees.length > 0 && (
        <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
          <div className="text-[0.85vw] text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of{" "}
            {filteredEmployees.length} entries
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
            >
              <ChevronLeft size={"1vw"} />
              Previous
            </button>
            <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
            >
              Next
              <ChevronRight size={"1vw"} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {isAddModalOpen && (
        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={handleModalClose}
          editingEmployee={editingEmployee}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default EmployeeOverview;