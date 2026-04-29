import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../../assets/Fisto Logo.png";

class ExportHRRequestsPDF {
  export(data, subTab, startDate, endDate, selectedEmployee, allEmployees = []) {
    const doc = new jsPDF("l", "mm", "a4");

    const img = new Image();
    img.src = fistoLogo;

    img.onload = () => {
      const desiredWidth = 42;
      const ratio = img.height / img.width;
      const desiredHeight = desiredWidth * ratio;

      doc.addImage(img, "PNG", 14, 8, desiredWidth, desiredHeight);

      // Report Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`${subTab}s Report`, 148.5, 25, { align: "center" });

      // Search Criteria
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      let criteria = [];
      if (selectedEmployee && selectedEmployee !== "all") criteria.push(`Employee: ${selectedEmployee}`);
      if (startDate) criteria.push(`From: ${startDate}`);
      if (endDate) criteria.push(`To: ${endDate}`);
      
      const criteriaText = criteria.length > 0 ? `Filtered by: ${criteria.join(" | ")}` : "All Records";
      doc.text(criteriaText, 148.5, 32, { align: "center" });

      let headers = [];
      let bodyRows = [];

      if (subTab === "Leave Request") {
        headers = [[
          "S.NO", "Employee", "Submitted", "Type", "From", "To", "Days", "Reason", "PH Status", "MGMT Status"
        ]];

        bodyRows = data.map((req, index) => {
          const emp = allEmployees.find(e => (e.employee_id || e.employeeId || e.userName) === req.employee_id);
          const empDesignation = (emp?.designation || "").toLowerCase();
          const isPHorSBU = empDesignation.includes("project head") || empDesignation.includes("sbu");

          return [
            index + 1,
            `${req.employee_name} (${req.employee_id})`,
            this.formatDate(req.created_at),
            req.leave_type,
            this.formatDate(req.from_date),
            this.formatDate(req.to_date),
            req.number_of_days,
            req.reason || "-",
            isPHorSBU ? "-" : (req.team_head_status ? req.team_head_status.toUpperCase() : "PENDING"),
            req.management_status ? req.management_status.toUpperCase() : "PENDING"
          ];
        });
      } else {
        headers = [[
          "S.NO", "Employee", "Submitted", "Date", "From", "To", "Duration", "Reason", "Status", "Approved By"
        ]];

        bodyRows = data.map((req, index) => [
          index + 1,
          `${req.employee_name} (${req.employee_id})`,
          this.formatDate(req.created_at),
          this.formatDate(req.permission_date),
          req.from_time,
          req.to_time,
          `${req.duration_minutes} mins`,
          req.reason || "-",
          req.status ? req.status.toUpperCase() : "PENDING",
          req.approved_by || "-"
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: bodyRows,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: {
            1: { cellWidth: 40 }, // Employee
            7: { cellWidth: 50 }, // Reason
        }
      });

      const fileName = `${subTab.replace(/\s+/g, "_")}_Export_${new Date().getTime()}.pdf`;
      doc.save(fileName);
    };
  }

  formatDate(dateString) {
    if (!dateString) return "-";
    try {
      // Handle simple date strings (YYYY-MM-DD) manually to force local time parsing
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return "-";
    }
  }
}

export default ExportHRRequestsPDF;
