import React, { useState, useEffect } from "react";
import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Upload,
  X,
  Download,
  UserPlus,
  ImagePlus,
} from "lucide-react";

const RECORDS_PER_PAGE = 6;

const OCCASION_OPTIONS = [
  {
    value: "Birthday",
    label: "Birthday",
    color: "bg-pink-100 text-pink-800",
    type: "employee",
  },
  {
    value: "Work Anniversary",
    label: "Work Anniversary",
    color: "bg-indigo-100 text-indigo-800",
    type: "employee",
  },
  {
    value: "Holiday",
    label: "Holiday",
    color: "bg-blue-100 text-blue-800",
    type: "occasion",
  },
  {
    value: "Special Day",
    label: "Special Day",
    color: "bg-purple-100 text-purple-800",
    type: "occasion",
  },
  {
    value: "Celebration",
    label: "Celebration",
    color: "bg-red-100 text-red-800",
    type: "occasion",
  },
  { value: "Announcement", label: "Announcement", color: "bg-yellow-100 text-yellow-800", type: "occasion" }
];

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [employeeImages, setEmployeeImages] = useState([]);
  const [occasionImages, setOccasionImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    quote: "",
    occasion: "",
    image: null,
  });
  const [errors, setErrors] = useState({});
  
  const [newImageData, setNewImageData] = useState({
    name: "",
    image: null,
    preview: null,
  });
  const [imageUploadType, setImageUploadType] = useState("employee");

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const API_URL1 = import.meta.env.VITE_API_BASE_URL1;

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/quotes`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status) {
        setQuotes(data.quotes);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeImages = async () => {
    try {
      const response = await fetch(`${API_URL}/quotes/images/employees`);
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.status) {
        setEmployeeImages(data.images);
      }
    } catch (error) {
      console.error("Error fetching employee images:", error);
    }
  };

  const fetchOccasionImages = async () => {
    try {
      const response = await fetch(`${API_URL}/quotes/images/occasions`);
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.status) {
        setOccasionImages(data.images);
      }
    } catch (error) {
      console.error("Error fetching occasion images:", error);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchEmployeeImages();
    fetchOccasionImages();
  }, []);

  const handleAddNew = () => {
    setEditingQuote(null);
    setFormData({
      date: "",
      quote: "",
      occasion: "",
      image: null,
    });
    setSelectedImage(null);
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setFormData({
      date: formatDateForInput(quote.date),
      quote: quote.quote,
      occasion: quote.occasion || "",
      image: null,
    });
    setSelectedImage(quote.image_url);
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quote?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/quotes/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.status) {
        fetchQuotes();
        alert("Quote deleted successfully");
      } else {
        alert(data.message || "Failed to delete quote");
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("An error occurred while deleting the quote");
    }
  };

  const handleDownload = (quote) => {
    console.log("Downloading quote:", quote);
    alert(`Download functionality for: "${quote.quote}"`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setFormData((prev) => ({ ...prev, image: null }));
  };

  const handleOpenImageUploadModal = () => {
    const type = getCurrentOccasionType();
    setImageUploadType(type);
    setNewImageData({
      name: "",
      image: null,
      preview: null,
    });
    setIsImageUploadModalOpen(true);
  };

  const handleNewImageInputChange = (e) => {
    const { name, value } = e.target;
    setNewImageData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewImageData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageData((prev) => ({ ...prev, preview: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewImage = async (e) => {
    e.preventDefault();

    if (!newImageData.name.trim()) {
      alert(imageUploadType === "employee" ? "Employee name is required" : "Occasion name is required");
      return;
    }


    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append("name", newImageData.name);
      submitFormData.append("image", newImageData.image);

      const endpoint = imageUploadType === "employee" 
        ? `${API_URL}/quotes/images/employees`
        : `${API_URL}/quotes/images/occasions`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: submitFormData,
      });

      const data = await response.json();

      if (data.status) {
        alert(`${imageUploadType === "employee" ? "Employee" : "Occasion"} image added successfully!`);
        
        if (imageUploadType === "employee") {
          fetchEmployeeImages();
        } else {
          fetchOccasionImages();
        }
        
        setIsImageUploadModalOpen(false);
        setNewImageData({
          name: "",
          image: null,
          preview: null,
        });
      } else {
        alert(data.message || "Failed to add image");
      }
    } catch (error) {
      console.error("Error adding image:", error);
      alert("An error occurred while adding the image");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.quote.trim()) newErrors.quote = "Quote is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append("date", formData.date);
      submitFormData.append("quote", formData.quote);
      submitFormData.append("occasion", formData.occasion);

      if (formData.image) {
        submitFormData.append("image", formData.image);
      } else if (selectedImage) {
        submitFormData.append("imageUrl", selectedImage);
      }

      const url = editingQuote
        ? `${API_URL}/quotes/${editingQuote.id}`
        : `${API_URL}/quotes`;

      const response = await fetch(url, {
        method: editingQuote ? "PUT" : "POST",
        body: submitFormData,
      });

      const data = await response.json();

      if (data.status) {
        alert(editingQuote ? "Quote updated successfully!" : "Quote added successfully!");
        fetchQuotes();
        handleModalClose();
      } else {
        alert(data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingQuote(null);
    setFormData({
      date: "",
      quote: "",
      occasion: "",
      image: null,
    });
    setSelectedImage(null);
    setErrors({});
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCurrentOccasionType = () => {
    const option = OCCASION_OPTIONS.find((o) => o.value === formData.occasion);
    return option?.type || "employee";
  };

  const getImageList = () => {
    const type = getCurrentOccasionType();
    return type === "employee" ? employeeImages : occasionImages;
  };

  const filteredQuotes = quotes.filter(
    (q) =>
      q.quote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.occasion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(q.date)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQuotes.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="font-medium text-[0.95vw] text-gray-800">All Quotes</span>
          <span className="text-[0.85vw] text-gray-500">({filteredQuotes.length})</span>
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-[1vw] pr-[0.8vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddNew}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
          >
            <Plus size={"1vw"} className="mr-[0.3vw]" />
            Add Quote
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto p-[0.8vw]">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
            <div className="text-[4vw] mb-[1vw]">📝</div>
            <p className="text-[1.1vw] font-medium mb-[0.5vw]">No quotes found</p>
            <p className="text-[1vw] text-gray-400">
              {searchTerm ? "Try adjusting your search" : "Add your first quote to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
            {paginatedQuotes.map((q) => (
              <div key={q.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative h-[12vw] overflow-hidden">
                  <img
                    src={q.image_url?.startsWith("http") ? q.image_url : `${API_URL1}${q.image_url}`}
                    alt="Quote"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-[0.5vw] left-[0.5vw]">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-[0.6vw] py-[0.2vw]">
                      <span className="text-[0.75vw] font-medium">{q.occasion || "General"}</span>
                    </div>
                  </div>
                  <div className="absolute top-[0.5vw] right-[0.5vw] flex gap-[0.3vw]">
                    <button onClick={() => handleEdit(q)} className="p-[0.35vw] bg-white/90 backdrop-blur-sm rounded-full hover:bg-white cursor-pointer">
                      <Edit2 size={"0.9vw"} className="text-blue-600" />
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-[0.35vw] bg-white/90 backdrop-blur-sm rounded-full hover:bg-white cursor-pointer">
                      <Trash2 size={"0.9vw"} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="p-[0.8vw]">
                  <div className="flex items-center justify-between mb-[0.5vw]">
                    <div className="text-[0.75vw] text-gray-500 font-medium">{formatDate(q.date)}</div>
                    <button onClick={() => handleDownload(q)} className="text-gray-600 hover:text-blue-600 cursor-pointer">
                      <Download size={"0.9vw"} />
                    </button>
                  </div>
                  <p className="text-[0.85vw] text-gray-800 font-medium line-clamp-3">"{q.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredQuotes.length > 0 && (
        <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
          <div className="text-[0.85vw] text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredQuotes.length)} of {filteredQuotes.length} entries
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

      {/* Add/Edit Quote Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[50vw] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.1vw] font-semibold text-gray-800">
                {editingQuote ? "Edit Quote" : "Add New Quote"}
              </h2>
              <button onClick={handleModalClose} className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <X size={"1.2vw"} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex-1 overflow-y-auto p-[1.2vw]">
                <div className="space-y-[1vw]">
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          name="date"
                          type="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black ${errors.date ? "border-red-500" : "border-gray-300"}`}
                        />
                      </div>
                      {errors.date && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.date}</p>}
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">Occasion</label>
                      <select
                        name="occasion"
                        value={formData.occasion}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
                        style={{ 
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="">None</option>
                        {OCCASION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                      Quote <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="quote"
                      value={formData.quote}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-[0.8vw] py-[0.6vw] border rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black resize-vertical ${errors.quote ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter your inspirational quote here..."
                    />
                    {errors.quote && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.quote}</p>}
                  </div>

                  {formData.occasion && getImageList().length >= 0 && (
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        {getCurrentOccasionType() === "employee" ? "Select Employee" : "Select Image"}
                        <span className="text-[0.7vw] font-normal text-gray-500 ml-[0.3vw]">(Click to select)</span>
                      </label>
                      <div className="grid grid-cols-5 gap-[0.5vw]">
                        {getImageList().map((item) => (
                          <div
                            key={item.id}
                            className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all ${
                              selectedImage === item.imageUrl
                                ? "border-blue-500 ring-2 ring-blue-200"
                                : "border-gray-200 hover:border-blue-300"
                            }`}
                            onClick={() => handleSelectImage(item.imageUrl)}
                          >
                            <div className="w-full aspect-square overflow-hidden">
                              <img
                                src={item.imageUrl?.startsWith("http") ? item.imageUrl : `${API_URL1}${item.imageUrl}`}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                            </div>
                            {getCurrentOccasionType() === "employee" && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[0.65vw] px-[0.3vw] py-[0.2vw] truncate">
                                {item.name}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <div 
                          className="relative cursor-pointer group rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 transition-all"
                          onClick={handleOpenImageUploadModal}
                        >
                          <div className="w-full aspect-square flex flex-col items-center justify-center">
                            <Plus size={"1.5vw"} className="text-gray-400 group-hover:text-blue-500 mb-[0.2vw]" />
                            <span className="text-[0.65vw] text-gray-500 group-hover:text-blue-500 text-center px-[0.2vw]">
                              Add {getCurrentOccasionType() === "employee" ? "Employee" : "Image"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                      Image Upload <span className="text-red-500">(Optional)</span>
                      <span className="text-[0.7vw] font-normal text-gray-500 ml-[0.3vw]">
                        {formData.occasion ? "(Or upload custom image)" : "(Upload image)"}
                      </span>
                    </label>
                    <div className={`border-2 border-dashed rounded-lg p-[1.2vw] text-center transition ${
                        selectedImage ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                      }`}>
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                        {selectedImage ? (
                          <div className="space-y-[0.4vw]">
                            <div className="w-[8vw] h-[8vw] mx-auto rounded-lg overflow-hidden border border-gray-200">
                              <img
                                src={selectedImage?.startsWith("http") || selectedImage?.startsWith("data:") ? selectedImage : `${API_URL1}${selectedImage}`}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-[0.8vw] text-gray-600">Click to change image</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto text-gray-400 mb-[0.4vw]" size={"2vw"} />
                            <p className="text-[0.85vw] text-gray-600 mb-[0.2vw]">
                              <span className="text-blue-600">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-[0.7vw] text-gray-500">PNG, JPG, GIF up to 5MB</p>
                          </>
                        )}
                      </label>
                    </div>
                    {errors.image && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.image}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-end gap-[0.5vw]">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-[0.3vw] min-w-[5vw] justify-center disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-[0.8vw] w-[0.8vw] border-b-2 border-white"></div>
                      <span>{editingQuote ? "Updating..." : "Submitting..."}</span>
                    </>
                  ) : editingQuote ? "Update" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {isImageUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-[30vw]">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200">
              <h2 className="text-[1.1vw] font-semibold text-gray-800 flex items-center gap-[0.4vw]">
                {imageUploadType === "employee" ? (
                  <>
                    <UserPlus size={"1.2vw"} />
                    Add Employee Image
                  </>
                ) : (
                  <>
                    <ImagePlus size={"1.2vw"} />
                    Add Occasion Image
                  </>
                )}
              </h2>
              <button
                onClick={() => setIsImageUploadModalOpen(false)}
                className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={"1.2vw"} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitNewImage} className="p-[1vw]">
              <div className="space-y-[1vw]">
                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    {imageUploadType === "employee" ? "Employee Name" : "Occasion Name"}
                    <span className="text-red-500 ml-[0.2vw]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newImageData.name}
                    onChange={handleNewImageInputChange}
                    placeholder={imageUploadType === "employee" ? "Enter employee name" : "Enter occasion name"}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Image <span className="text-red-500 ml-[0.2vw]">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-[1vw] hover:border-blue-400 hover:bg-gray-50 transition">
                    <input
                      type="file"
                      id="new-image-upload"
                      accept="image/*"
                      onChange={handleNewImageFileChange}
                      className="hidden"
                    />
                    <label htmlFor="new-image-upload" className="cursor-pointer flex flex-col items-center">
                      {newImageData.preview ? (
                        <div className="space-y-[0.4vw]">
                          <div className="w-[8vw] h-[8vw] mx-auto rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={newImageData.preview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[0.8vw] text-gray-600 text-center">Click to change image</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto text-gray-400 mb-[0.4vw]" size={"2vw"} />
                          <p className="text-[0.85vw] text-gray-600 mb-[0.2vw]">
                            <span className="text-blue-600">Click to upload</span>
                          </p>
                          <p className="text-[0.7vw] text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-[0.5vw] mt-[1.2vw]">
                <button
                  type="button"
                  onClick={() => setIsImageUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-[0.3vw] min-w-[6vw] justify-center disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-[0.8vw] w-[0.8vw] border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Add Image"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Quotes;