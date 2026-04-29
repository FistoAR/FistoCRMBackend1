// ExportMaidReportPDF.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../../assets/Fisto Logo.png";

class ExportMaidReportPDF {
  export(monthData, selectedMonth, stats, MONTHS) {
    const doc = new jsPDF("l", "mm", "a4");

    const img = new Image();
    img.src = fistoLogo;

    img.onload = () => {
      const desiredWidth = 42;
      const ratio = img.height / img.width;
      const desiredHeight = desiredWidth * ratio;

      doc.addImage(img, "PNG", 14, 8, desiredWidth, desiredHeight);

      const monthYear = `${MONTHS[selectedMonth.month]} ${selectedMonth.year}`;

      // Title - Right aligned
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Maid Attendance", 280, 15, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text("Monthly Report", 280, 21, { align: "right" });

      // Centered report title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`${monthYear} - Maid Attendance Report`, doc.internal.pageSize.width / 2, 32, { align: "center" });

      // Stats summary
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const statsText = `Present: ${stats.presentDays} | Partial: ${stats.partialDays} | Maid Leave: ${stats.maidFullDay + stats.maidMorning + stats.maidEvening} | Office Leave: ${stats.officeFullDay + stats.officeMorning + stats.officeEvening} | Total Working Days: ${stats.totalWorkingDays}`;
      doc.text(statsText, doc.internal.pageSize.width / 2, 38, { align: "center" });

      // Generation timestamp
      doc.setFontSize(8);
      doc.setTextColor(102, 102, 102);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        14,
        42
      );
      doc.setTextColor(0, 0, 0);

      // Helper function to format time to 12-hour format
      const formatTimeTo12Hour = (timeString) => {
        if (!timeString || timeString === "-" || timeString === "Leave") {
          return timeString;
        }
        
        try {
          // Check if already in 12-hour format with AM/PM
          if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
            return timeString;
          }
          
          // If it's in 24-hour format (HH:MM)
          if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
          }
          
          return timeString;
        } catch (error) {
          console.error('Error formatting time:', error, timeString);
          return timeString;
        }
      };

      // Updated headers - removed Leave Type and Leave Duration, added Work Done
      const headers = [[
        "S.No",
        "Day",
        "Date",
        "Morning In",
        "Morning Out",
        "Evening In",
        "Evening Out",
        "Status",
        "Work Done"
      ]];

      const rows = monthData.map((row, index) => {
        const date = row.date;
        const formattedDate = date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        let status = "Pending";

        if (row.isLeave) {
          if (row.leaveDuration === "full") {
            status = row.leaveType === "maid" ? "Maid Leave (Full)" : "Office Leave (Full)";
          } else if (row.leaveDuration === "morning") {
            status = row.leaveType === "maid" ? "Maid Leave (AM)" : "Office Leave (AM)";
          } else if (row.leaveDuration === "evening") {
            status = row.leaveType === "maid" ? "Maid Leave (PM)" : "Office Leave (PM)";
          }
        } else if (row.morningIn && row.morningOut && row.eveningIn && row.eveningOut) {
          status = "Complete";
        } else if (row.morningIn || row.morningOut || row.eveningIn || row.eveningOut) {
          status = "Partial";
        }

        // Format times to 12-hour format
        const morningIn = row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "morning") 
          ? "Leave" : formatTimeTo12Hour(row.morningIn || "-");
        
        const morningOut = row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "morning") 
          ? "Leave" : formatTimeTo12Hour(row.morningOut || "-");
        
        const eveningIn = row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "evening") 
          ? "Leave" : formatTimeTo12Hour(row.eveningIn || "-");
        
        const eveningOut = row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "evening") 
          ? "Leave" : formatTimeTo12Hour(row.eveningOut || "-");

        return {
          sno: index + 1,
          day: row.dayName,
          date: formattedDate,
          morningIn,
          morningOut,
          eveningIn,
          eveningOut,
          status,
          workDone: row.workDone || "-",
          isLeave: row.isLeave,
          leaveTypeRaw: row.leaveType,
          leaveDurationRaw: row.leaveDuration,
        };
      });

      const body = rows.map((row) => [
        row.sno,
        row.day,
        row.date,
        row.morningIn,
        row.morningOut,
        row.eveningIn,
        row.eveningOut,
        row.status,
        row.workDone,
      ]);

      // Updated column styles - adjusted for new columns
      const columnStyles = {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 22, halign: "center" },
        7: { cellWidth: 35, halign: "center" },
        8: { cellWidth: 80, halign: "left" }, // Work Done - wider column
      };

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 46,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak",
          halign: "center",
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        alternateRowStyles: {
          fillColor: [249, 249, 249],
        },
        columnStyles,
        margin: { left: 10, right: 10 },
        didParseCell: function (dataCell) {
          if (dataCell.section !== "body") return;

          const rowData = rows[dataCell.row.index];
          if (!rowData) return;

          dataCell.cell.styles.lineColor = [0, 0, 0];
          dataCell.cell.styles.lineWidth = 0.3;

          // Full day maid leave - Red background
          if (rowData.isLeave && rowData.leaveTypeRaw === "maid" && rowData.leaveDurationRaw === "full") {
            dataCell.cell.styles.fillColor = [255, 230, 230];
          }
          // Full day office leave - Blue background
          else if (rowData.isLeave && rowData.leaveTypeRaw === "office" && rowData.leaveDurationRaw === "full") {
            dataCell.cell.styles.fillColor = [230, 240, 255];
          }
          // Half day leave - Light orange
          else if (rowData.isLeave && (rowData.leaveDurationRaw === "morning" || rowData.leaveDurationRaw === "evening")) {
            dataCell.cell.styles.fillColor = [255, 245, 220];
          }
          // Complete - Light green
          else if (rowData.status === "Complete") {
            dataCell.cell.styles.fillColor = [230, 255, 230];
          }
          // Partial - Light yellow
          else if (rowData.status === "Partial") {
            dataCell.cell.styles.fillColor = [255, 255, 204];
          }

          // Work Done column - has tasks done
          if (dataCell.column.index === 8 && rowData.workDone !== "-") {
            dataCell.cell.styles.fillColor = [240, 253, 244]; // Light green tint
            dataCell.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: function (dataCell) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(102, 102, 102);
          doc.text(
            `Page ${dataCell.pageNumber} of ${pageCount}`,
            dataCell.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        },
      });

      // Add summary at the end
      const finalY = doc.lastAutoTable.finalY + 10;
      
      if (finalY < doc.internal.pageSize.height - 50) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Summary", 14, finalY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        // Count days with work done
        const daysWithWork = monthData.filter(d => d.workDone && d.workDone !== "-").length;
        
        const summaryLines = [
          `Total Working Days: ${stats.totalWorkingDays}`,
          `Present (Complete): ${stats.presentDays}`,
          `Partial Attendance: ${stats.partialDays}`,
          `Pending: ${stats.pendingDays}`,
          `Days with Tasks Completed: ${daysWithWork}`,
          ``,
          `Maid Leave - Full Day: ${stats.maidFullDay}, Morning: ${stats.maidMorning}, Evening: ${stats.maidEvening}`,
          `Office Leave - Full Day: ${stats.officeFullDay}, Morning: ${stats.officeMorning}, Evening: ${stats.officeEvening}`,
        ];

        summaryLines.forEach((line, idx) => {
          doc.text(line, 14, finalY + 6 + (idx * 5));
        });

        // Legend
        const legendY = finalY + 50;
        doc.setFontSize(8);
        doc.text("Legend:", 14, legendY);
        
        // Green - Complete
        doc.setFillColor(230, 255, 230);
        doc.rect(14, legendY + 3, 8, 4, "F");
        doc.text("Complete", 24, legendY + 6);
        
        // Yellow - Partial
        doc.setFillColor(255, 255, 204);
        doc.rect(55, legendY + 3, 8, 4, "F");
        doc.text("Partial", 65, legendY + 6);
        
        // Red - Maid Leave
        doc.setFillColor(255, 230, 230);
        doc.rect(96, legendY + 3, 8, 4, "F");
        doc.text("Maid Leave", 106, legendY + 6);
        
        // Blue - Office Leave
        doc.setFillColor(230, 240, 255);
        doc.rect(145, legendY + 3, 8, 4, "F");
        doc.text("Office Leave", 155, legendY + 6);
        
        // Orange - Half Day
        doc.setFillColor(255, 245, 220);
        doc.rect(200, legendY + 3, 8, 4, "F");
        doc.text("Half Day Leave", 210, legendY + 6);
      }

      const fileName = `Maid_Attendance_${monthYear.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
    };

    // Fallback if image fails to load
    img.onerror = () => {
      console.warn("Logo failed to load, generating PDF without logo");
      this.exportWithoutLogo(doc, monthData, selectedMonth, stats, MONTHS);
    };
  }

  exportWithoutLogo(doc, monthData, selectedMonth, stats, MONTHS) {
    const monthYear = `${MONTHS[selectedMonth.month]} ${selectedMonth.year}`;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${monthYear} - Maid Attendance Report`, doc.internal.pageSize.width / 2, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const statsText = `Present: ${stats.presentDays} | Partial: ${stats.partialDays} | Maid Leave: ${stats.maidFullDay + stats.maidMorning + stats.maidEvening} | Office Leave: ${stats.officeFullDay + stats.officeMorning + stats.officeEvening}`;
    doc.text(statsText, doc.internal.pageSize.width / 2, 26, { align: "center" });

    // Helper function to format time to 12-hour format (for fallback)
    const formatTimeTo12Hour = (timeString) => {
      if (!timeString || timeString === "-" || timeString === "Leave") {
        return timeString;
      }
      
      try {
        // Check if already in 12-hour format with AM/PM
        if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
          return timeString;
        }
        
        // If it's in 24-hour format (HH:MM)
        if (timeString.includes(':')) {
          const [hours, minutes] = timeString.split(':');
          const hour = parseInt(hours, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }
        
        return timeString;
      } catch (error) {
        console.error('Error formatting time:', error, timeString);
        return timeString;
      }
    };

    // Updated headers
    const headers = [[
      "S.No", "Day", "Date", "Morning In", "Morning Out", 
      "Evening In", "Evening Out", "Status", "Work Done"
    ]];

    const rows = monthData.map((row, index) => {
      const date = row.date;
      const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      let status = "Pending";

      if (row.isLeave) {
        if (row.leaveDuration === "full") {
          status = row.leaveType === "maid" ? "Maid Leave (Full)" : "Office Leave (Full)";
        } else if (row.leaveDuration === "morning") {
          status = row.leaveType === "maid" ? "Maid Leave (AM)" : "Office Leave (AM)";
        } else if (row.leaveDuration === "evening") {
          status = row.leaveType === "maid" ? "Maid Leave (PM)" : "Office Leave (PM)";
        }
      } else if (row.morningIn && row.morningOut && row.eveningIn && row.eveningOut) {
        status = "Complete";
      } else if (row.morningIn || row.morningOut || row.eveningIn || row.eveningOut) {
        status = "Partial";
      }

      return [
        index + 1,
        row.dayName,
        formattedDate,
        row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "morning") 
          ? "Leave" : formatTimeTo12Hour(row.morningIn || "-"),
        row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "morning") 
          ? "Leave" : formatTimeTo12Hour(row.morningOut || "-"),
        row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "evening") 
          ? "Leave" : formatTimeTo12Hour(row.eveningIn || "-"),
        row.isLeave && (row.leaveDuration === "full" || row.leaveDuration === "evening") 
          ? "Leave" : formatTimeTo12Hour(row.eveningOut || "-"),
        status,
        row.workDone || "-",
      ];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 32,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        8: { cellWidth: 80, halign: "left" }, // Work Done column
      },
      margin: { left: 10, right: 10 },
    });

    const fileName = `Maid_Attendance_${monthYear.replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
  }
}

export default ExportMaidReportPDF;