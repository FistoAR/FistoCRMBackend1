import * as XLSX from 'xlsx';

class ExportInternReportExcel {
  export(data, employeeName, employeeId, startDate, endDate, reportType) {
    const isAllEmployees = !employeeId || employeeId === "all";
    
    // 1. Prepare Columns
    let columns = isAllEmployees 
      ? ["Employee", "Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", reportType === "management" ? "Outcomes" : "Task", "Progress", "Status", "Outcome"]
      : ["Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", reportType === "management" ? "Outcomes" : "Task", "Progress", "Status", "Outcome"];

    if (reportType === "management") {
      columns = columns.filter(col => !["Progress", "Status", "Outcome"].includes(col));
    }

    // 2. Prepare Data Rows
    const rows = [];
    
    // Sort data chronological
    const sortedData = [...data].sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

    sortedData.forEach((report) => {
      const date = new Date(report.report_date);
      const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const dayOfWeek = date.toLocaleDateString("en-GB", { weekday: "long" });

      const morningIn = this.formatTime(report.morning_in);
      const morningOut = this.formatTime(report.morning_out);
      const afternoonIn = this.formatTime(report.afternoon_in);
      const afternoonOut = this.formatTime(report.afternoon_out);

      const tasks = report.tasks || [];
      
      if (tasks.length > 0) {
        tasks.forEach((task, taskIndex) => {
          const isLeave = task.task_type === "leave";
          const rowData = {};

          if (isAllEmployees) rowData["Employee"] = report.employee_name || "-";
          rowData["Date"] = formattedDate;
          rowData["Day"] = dayOfWeek;

          if (isLeave) {
            rowData["Morning In"] = "LEAVE";
            rowData["Morning Out"] = "LEAVE";
            rowData["Afternoon In"] = "LEAVE";
            rowData["Afternoon Out"] = "LEAVE";
            rowData["Hours"] = "0";
            rowData["Project"] = "LEAVE";
            rowData["Task"] = task.task_name;
            rowData["Progress"] = "-";
            rowData["Status"] = task.status;
            rowData["Outcome"] = task.outcome;
          } else {
            // Only show attendance times for the first attendance task row to avoid redundancy in Excel
            // but for Excel specifically, it's often better to repeat them or leave them blank
            // Let's repeat them for easier filtering/sorting in Excel
            rowData["Morning In"] = morningIn;
            rowData["Morning Out"] = morningOut;
            rowData["Afternoon In"] = afternoonIn;
            rowData["Afternoon Out"] = afternoonOut;
            rowData["Hours"] = report.total_hours || "0";
            
            rowData["Project"] = task.project_name || "-";
            rowData["Task"] = task.task_name || "-";
            rowData["Progress"] = task.task_type === "unscheduled" ? "Unscheduled" : `${task.percentage || 0}%`;
            rowData["Status"] = task.status || "In Progress";
            rowData["Outcome"] = task.outcome || "-";
          }
          
          rows.push(rowData);
        });
      } else {
        const rowData = {};
        if (isAllEmployees) rowData["Employee"] = report.employee_name || "-";
        rowData["Date"] = formattedDate;
        rowData["Day"] = dayOfWeek;
        rowData["Morning In"] = morningIn;
        rowData["Morning Out"] = morningOut;
        rowData["Afternoon In"] = afternoonIn;
        rowData["Afternoon Out"] = afternoonOut;
        rowData["Hours"] = report.total_hours || "0";
        rowData["Project"] = "-";
        rowData["Task"] = "No tasks reported";
        rowData["Progress"] = "-";
        rowData["Status"] = "-";
        rowData["Outcome"] = "-";
        rows.push(rowData);
      }
    });

    // 3. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });

    // 4. Set Column Widths
    const wscols = columns.map(col => ({ wch: col.length + 10 }));
    worksheet['!cols'] = wscols;

    // 5. Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

    // 6. Generate Filename
    const empName = (employeeName || "All_Employees").replace(/\s+/g, "_");
    const dateRange = startDate ? `${startDate}_to_${endDate || 'today'}` : "Full_History";
    const fileName = `${empName}_Intern_Report_${dateRange}.xlsx`;

    // 7. Save File
    XLSX.writeFile(workbook, fileName);
  }

  formatTime(timeString) {
    if (!timeString || timeString === "LEAVE") return "-";
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  }
}

export default ExportInternReportExcel;
