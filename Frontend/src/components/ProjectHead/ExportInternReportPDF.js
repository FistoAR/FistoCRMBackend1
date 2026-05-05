import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../assets/Fisto Logo.png";

class ExportInternReportPDF {
  export(data, employeeName, employeeId, startDate, endDate, reportType) {
    return new Promise((resolve, reject) => {
      const doc = new jsPDF("l", "mm", "a4");

      const generatePDF = (logoImg = null) => {
        try {
          if (logoImg) {
            const desiredWidth = 42; // mm
            const ratio = logoImg.height / logoImg.width;
            const desiredHeight = desiredWidth * ratio;
            doc.addImage(logoImg, "PNG", 14, 8, desiredWidth, desiredHeight);
          }

          const reportDate = startDate ? new Date(startDate) : new Date();
          const monthYear = reportDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

          let dateRangeText = monthYear;
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            dateRangeText = `${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} to ${end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
          }

          const empName = employeeName || "All Employees";
          const empId = employeeId || "All";
          doc.setFontSize(10);
          doc.text(empName, 240, 12);
          doc.text(empId, 240, 17);

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${monthYear} Monthly Report`, doc.internal.pageSize.width / 2, 25, { align: "center" });

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Period: ${dateRangeText}`, doc.internal.pageSize.width / 2, 30, { align: "center" });

          const isAllEmployees = !employeeId || employeeId === "all";
          const headers = reportType === "management" 
            ? (isAllEmployees 
                ? [["Employee", "Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", "Outcomes"]]
                : [["Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", "Outcomes"]])
            : (isAllEmployees
              ? [["Employee", "Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", "Task", "Progress", "Status", "Outcome"]]
              : [["Date", "Day", "Morning In", "Morning Out", "Afternoon In", "Afternoon Out", "Hours", "Project", "Task", "Progress", "Status", "Outcome"]]);

          const sortedData = [...data].sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

          const bodyRows = [];
          sortedData.forEach((report) => {
            const formattedDate = new Date(report.report_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
            const dayOfWeek = new Date(report.report_date).toLocaleDateString("en-GB", { weekday: "long" });
            const morningIn = formatTime(report.morning_in);
            const morningOut = formatTime(report.morning_out);
            const afternoonIn = formatTime(report.afternoon_in);
            const afternoonOut = formatTime(report.afternoon_out);
            const isLate = checkIfLate(report.morning_in);
            const groupKey = `${report.employee_name || "unknown"}_${formattedDate}`;

            const tasks = report.tasks || [];
            if (tasks.length > 0) {
              tasks.forEach((task, idx) => {
                const isLeave = task.task_type === "leave";
                const row = [];

                // ONLY put text in the FIRST row of the group to avoid "leaking" text on splits
                const isFirstOfGroup = idx === 0;
                
                if (isAllEmployees) row.push(isFirstOfGroup ? (report.employee_name || "-") : "");
                row.push(isFirstOfGroup ? formattedDate : "");
                row.push(isFirstOfGroup ? dayOfWeek : "");

                if (!isLeave) {
                  row.push(
                    { content: isFirstOfGroup ? morningIn : "", styles: { fillColor: (isFirstOfGroup && isLate) ? [255, 255, 220] : null } },
                    isFirstOfGroup ? morningOut : "",
                    isFirstOfGroup ? afternoonIn : "",
                    isFirstOfGroup ? afternoonOut : "",
                    { content: isFirstOfGroup ? (report.total_hours || "-") : "", styles: { fontStyle: "bold" } }
                  );
                  row.push(task.project_name || "-", task.task_name || "-");
                  if (reportType !== "management") {
                    row.push(
                      task.task_type === "unscheduled" ? "Unscheduled" : `${task.percentage || 0}%`,
                      {
                        content: task.status || "In Progress",
                        styles: {
                          fillColor: task.status === "Under Review" ? [0, 0, 0] : null,
                          textColor: task.status === "Under Review" ? [255, 255, 255] : [0, 0, 0],
                          halign: "center", fontStyle: "bold",
                        },
                      },
                      task.outcome || "-"
                    );
                  }
                } else {
                  row.push({
                    content: `LEAVE REQUEST: ${task.task_name} (${task.outcome}) - STATUS: ${task.status}`,
                    colSpan: reportType === "management" ? (isAllEmployees ? 7 : 6) : (isAllEmployees ? 10 : 9),
                    styles: { halign: "center", fontStyle: "bolditalic", fillColor: [254, 249, 195] }
                  });
                }
                row.groupKey = groupKey;
                row.rawMetadata = { employee_name: report.employee_name, date: formattedDate, day: dayOfWeek, mIn: morningIn, mOut: morningOut, aIn: afternoonIn, aOut: afternoonOut, hours: report.total_hours };
                bodyRows.push(row);
              });
            } else {
              const fallbackRow = [...(isAllEmployees ? [report.employee_name || "-"] : []), formattedDate, dayOfWeek, morningIn, morningOut, afternoonIn, afternoonOut, report.total_hours || "0", { content: "No tasks reported", colSpan: reportType === "management" ? 2 : 5, styles: { halign: "center", fontStyle: "italic", fillColor: [240, 240, 240] } }];
              fallbackRow.groupKey = groupKey;
              fallbackRow.rawMetadata = { employee_name: report.employee_name, date: formattedDate, day: dayOfWeek, mIn: morningIn, mOut: morningOut, aIn: afternoonIn, aOut: afternoonOut, hours: report.total_hours };
              bodyRows.push(fallbackRow);
            }
          });

          let columnStyles = {};
          if (reportType === "management") {
            columnStyles = isAllEmployees 
              ? { 
                  0: { cellWidth: 25, halign: 'left' },   // Employee
                  1: { cellWidth: 22, halign: 'center' }, // Date
                  2: { cellWidth: 20, halign: 'center' }, // Day
                  3: { cellWidth: 18, halign: 'center' }, // Morning In
                  4: { cellWidth: 18, halign: 'center' }, // Morning Out
                  5: { cellWidth: 18, halign: 'center' }, // Afternoon In
                  6: { cellWidth: 18, halign: 'center' }, // Afternoon Out
                  7: { cellWidth: 20, halign: 'center' }, // Hours
                  8: { cellWidth: 35, halign: 'left' },   // Project
                  9: { cellWidth: 'auto', halign: 'left' } // Outcomes
                }
              : { 
                  0: { cellWidth: 25, halign: 'center' }, // Date
                  1: { cellWidth: 25, halign: 'center' }, // Day
                  2: { cellWidth: 20, halign: 'center' }, // Morning In
                  3: { cellWidth: 20, halign: 'center' }, // Morning Out
                  4: { cellWidth: 20, halign: 'center' }, // Afternoon In
                  5: { cellWidth: 20, halign: 'center' }, // Afternoon Out
                  6: { cellWidth: 20, halign: 'center' }, // Hours
                  7: { cellWidth: 40, halign: 'left' },   // Project
                  8: { cellWidth: 'auto', halign: 'left' } // Outcomes
                };
          } else {
            columnStyles = isAllEmployees
              ? { 
                  0: { cellWidth: 25, halign: 'left' },   // Employee
                  1: { cellWidth: 22, halign: 'center' }, // Date
                  2: { cellWidth: 20, halign: 'center' }, // Day
                  3: { cellWidth: 16, halign: 'center' }, // Morning In
                  4: { cellWidth: 16, halign: 'center' }, // Morning Out
                  5: { cellWidth: 16, halign: 'center' }, // Afternoon In
                  6: { cellWidth: 16, halign: 'center' }, // Afternoon Out
                  7: { cellWidth: 18, halign: 'center' }, // Hours
                  8: { cellWidth: 25, halign: 'left' },   // Project
                  9: { cellWidth: 25, halign: 'left' },   // Task
                  10: { cellWidth: 14, halign: 'center' }, // Progress
                  11: { cellWidth: 22, halign: 'center' }, // Status
                  12: { cellWidth: 'auto', halign: 'left' } // Outcome
                }
              : { 
                  0: { cellWidth: 22, halign: 'center' }, // Date
                  1: { cellWidth: 20, halign: 'center' }, // Day
                  2: { cellWidth: 17, halign: 'center' }, // Morning In
                  3: { cellWidth: 17, halign: 'center' }, // Morning Out
                  4: { cellWidth: 17, halign: 'center' }, // Afternoon In
                  5: { cellWidth: 17, halign: 'center' }, // Afternoon Out
                  6: { cellWidth: 18, halign: 'center' }, // Hours
                  7: { cellWidth: 30, halign: 'left' },   // Project
                  8: { cellWidth: 35, halign: 'left' },   // Task
                  9: { cellWidth: 16, halign: 'center' }, // Progress
                  10: { cellWidth: 22, halign: 'center' }, // Status
                  11: { cellWidth: 'auto', halign: 'left' } // Outcome
                };
          }

          autoTable(doc, {
            head: headers,
            body: bodyRows,
            startY: 35,
            rowPageBreak: 'avoid', // Crucial: Prevent single task row from splitting
            styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", halign: "left", valign: "middle", lineColor: [180, 180, 180], lineWidth: 0.1, textColor: [50, 50, 50] },
            headStyles: { fillColor: [76, 175, 80], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle", lineColor: [76, 175, 80], lineWidth: 0.1, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 251, 245] },
            columnStyles,
            margin: { left: 10, right: 10, top: 20, bottom: 15 },
            pageBreak: "auto",
            
            didDrawCell: function (data) {
              // Handle continuation of identity on new pages
              if (data.row.section === 'body' && data.column.index < 8) {
                const pageRows = data.table.pageRows || [];
                const isFirstRowOfPage = pageRows.length > 0 && data.row.index === pageRows[0].index && data.row.index > 0;
                
                if (isFirstRowOfPage) {
                  const cellText = data.cell.text.join("").trim();
                  if (!cellText) {
                    const meta = data.row.raw.rawMetadata;
                    let foundText = "";
                    if (data.column.index === 0 && isAllEmployees) foundText = meta.employee_name;
                    else if (data.column.index === (isAllEmployees ? 1 : 0)) foundText = meta.date;
                    else if (data.column.index === (isAllEmployees ? 2 : 1)) foundText = meta.day;
                    else if (data.column.index === (isAllEmployees ? 7 : 6)) foundText = meta.hours;
                    
                    if (foundText) {
                      doc.setFontSize(7.5);
                      doc.setTextColor(80, 80, 80);
                      doc.setFont("helvetica", "bolditalic");
                      doc.text(`${foundText} (cont.)`, data.cell.x + 2, data.cell.y + 4.5);
                    }
                  }
                }
              }
            },
            
            didDrawPage: function (dataCell) {
              const pageCount = doc.internal.getNumberOfPages();
              doc.setFontSize(8);
              doc.setTextColor(102, 102, 102);
              doc.text(`Page ${dataCell.pageNumber} of ${pageCount}`, dataCell.settings.margin.left, doc.internal.pageSize.height - 10);
            },
          });

          doc.save(`${empName.replace(/\s+/g, "_")}_Report.pdf`);
          resolve();
        } catch (error) { reject(error); }
      };

      const img = new Image();
      img.src = fistoLogo;
      img.onload = () => generatePDF(img);
      img.onerror = () => generatePDF(null);
    });
  }
}

function formatTime(timeString) {
  if (!timeString) return "-";
  try {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${minutes.padStart(2, "0")} ${ampm}`;
  } catch (error) { return timeString; }
}

function checkIfLate(timeString) {
  if (!timeString) return false;
  try {
    const [hours, minutes] = timeString.split(":");
    return (parseInt(hours) * 60 + parseInt(minutes)) > 585;
  } catch (error) { return false; }
}

export default ExportInternReportPDF;