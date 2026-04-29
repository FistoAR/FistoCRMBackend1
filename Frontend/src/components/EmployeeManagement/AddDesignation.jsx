import React, { useState, useEffect } from "react";
import { Plus, Briefcase, Trash2, Edit2, X, Check } from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";

const AddDesignation = () => {
  const { notify } = useNotification();
  const confirm = useConfirm();

  const [designations, setDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/designations`
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.status && data.designations) {
        setDesignations(data.designations);
      }
    } catch (error) {
      console.error("Error fetching designations:", error);
      notify({
        title: "Error",
        message: "Failed to fetch designations",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newDesignation.trim()) {
      notify({
        title: "Warning",
        message: "Designation name cannot be empty",
      });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/designations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designation: newDesignation.trim() }),
        }
      );
      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Designation added successfully",
        });
        setNewDesignation("");
        fetchDesignations();
      } else {
        notify({
          title: "Error",
          message: data.message || "Failed to add designation",
        });
      }
    } catch (error) {
      console.error("Error adding designation:", error);
      notify({
        title: "Error",
        message: "An error occurred while adding designation",
      });
    }
  };

  const handleEdit = (designation) => {
    setEditId(designation.id);
    setEditValue(designation.designation);
  };

  const handleSaveEdit = async (id) => {
    if (!editValue.trim()) {
      notify({
        title: "Validation Error",
        message: "Designation name cannot be empty",
      });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/designations/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designation: editValue.trim() }),
        }
      );
      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Designation updated successfully",
        });
        setEditId(null);
        setEditValue("");
        fetchDesignations();
      } else {
        notify({
          title: "Error",
          message: data.message || "Failed to update designation",
        });
      }
    } catch (error) {
      console.error("Error updating designation:", error);
      notify({
        title: "Error",
        message: "An error occurred while updating designation",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditValue("");
  };

  const handleDelete = async (id, designation) => {
    const confirmed = await confirm({
      type: "error",
      title: "Delete Designation",
      message: `Are you sure you want to delete "${designation}"?\nThis action cannot be undone.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/designations/${id}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Designation deleted successfully",
        });
        fetchDesignations();
      } else {
        notify({
          title: "Error",
          message: data.message || "Failed to delete designation",
        });
      }
    } catch (error) {
      console.error("Error deleting designation:", error);
      notify({
        title: "Error",
        message: "An error occurred while deleting designation",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="h-full w-full flex flex-col px-[0.9vw] py-[0.7vw] overflow-hidden">
      {/* Header */}
      <div className="mb-[0.7vw] flex items-center justify-between">
        <div>
          <h3 className="text-[1.05vw] font-semibold text-gray-900 flex items-center gap-[0.4vw]">
            <Briefcase className="w-[1.2vw] h-[1.2vw] text-gray-900" />
            <span>Manage Designations</span>
          </h3> 
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 px-[0.9vw] py-[0.7vw] mb-[0.7vw] shadow-sm">
        <label className="block text-[0.83vw] font-medium text-gray-900 mb-[0.45vw]">
          Add New Designation
        </label>
        <div className="flex gap-[0.55vw]">
          <div className="relative flex-1">
            <Briefcase className="w-[0.85vw] h-[0.85vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Enter designation name"
              className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.4vw] border border-gray-300 rounded-full text-[0.82vw] placeholder:text-gray-500 focus:outline-none focus:ring-[0.09vw] focus:ring-gray-400 focus:border-gray-500 transition-all bg-gray-50"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-[0.3vw] px-[1.1vw] py-[0.4vw] rounded-full text-[0.82vw] bg-gray-800/80 hover:bg-gray-700 text-white cursor-pointer transition-colors backdrop-blur-sm"
          >
            <Plus className="w-[0.85vw] h-[0.85vw]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
        <div className="bg-gray-900 text-white px-[0.9vw] py-[0.55vw] flex items-center justify-between">
          <h4 className="font-medium text-[0.88vw] flex items-center gap-[0.4vw]">
            <Briefcase className="w-[0.95vw] h-[0.95vw]" />
            <span>Current Designations</span>
          </h4>
          <span className="text-[0.72vw] text-gray-300">
            Total: {designations.length}
          </span>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-gray-200">
          {loading ? (
            <div className="px-[0.9vw] py-[2vw] text-center">
              <div className="inline-block w-[1.7vw] h-[1.7vw] border-[0.2vw] border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              <p className="text-gray-600 mt-[0.55vw] text-[0.8vw]">
                Loading designations...
              </p>
            </div>
          ) : designations.length > 0 ? (
            designations.map((designation, index) => (
              <div
                key={designation.id}
                className="px-[0.9vw] py-[0.55vw] hover:bg-gray-50 transition-colors"
              >
                {editId === designation.id ? (
                  <div className="flex gap-[0.55vw] items-center">
                    <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-[0.7vw] flex-shrink-0">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveEdit(designation.id)
                      }
                      className="flex-1 px-[0.65vw] py-[0.35vw] border-2 border-gray-700 rounded-full text-[0.82vw] focus:outline-none focus:ring-[0.09vw] focus:ring-gray-500/50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(designation.id)}
                      className="p-[0.38vw] bg-green-500/90 text-white rounded-full hover:bg-green-500 transition-colors cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-[0.85vw] h-[0.85vw]" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-[0.38vw] bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-[0.85vw] h-[0.85vw]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-[0.7vw]">
                    <div className="flex items-center gap-[0.65vw] flex-1 min-w-0">
                      <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-[0.7vw] flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-900 font-medium text-[0.86vw] block truncate">
                          {designation.designation}
                        </span>
                        <div className="flex gap-[0.7vw] text-[0.7vw] text-gray-500 mt-[0.15vw]">
                          <span>
                            Created: {formatDate(designation.created_date)}
                          </span>
                          {designation.updated_date &&
                            designation.updated_date !==
                              designation.created_date && (
                              <span>
                                Updated: {formatDate(
                                  designation.updated_date
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-[0.35vw] flex-shrink-0">
                      <button
                        onClick={() => handleEdit(designation)}
                        className="p-[0.38vw] text-gray-700 hover:bg-gray-200 rounded-full transition-all cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            designation.id,
                            designation.designation
                          )
                        }
                        className="p-[0.38vw] text-gray-700 hover:bg-gray-200 rounded-full transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-[0.9vw] py-[2vw] text-center text-gray-500 text-[0.8vw]">
              No designations added yet. Add your first designation above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDesignation;
