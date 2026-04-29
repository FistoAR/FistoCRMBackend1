import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

class ExportToPDF {
  constructor(logoDataUrl = null) {
    this.logoDataUrl = logoDataUrl; 
    this.fileName = '';
    this.generatedDate = '';
    this.mainPageCounter = 0;
    this.currentMainPage = 0;
  }

  addHeader(doc, title, generatedDate) {
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, 14, 12);
    
    if (this.logoDataUrl) {
      try {
        const logoWidth = 35;
        const logoHeight = 23;
        const logoX = pageWidth - logoWidth - 14;
        
        doc.setFillColor(255, 255, 255);
        doc.rect(logoX - 1, 4, logoWidth + 2, logoHeight + 2, 'F');
        
        doc.addImage(this.logoDataUrl, 'PNG', logoX, 5, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${generatedDate}`, 14, 19);
    doc.setTextColor(0, 0, 0);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 25, pageWidth - 14, 25);
  }

  addFooter(doc, pageLabel) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    
    doc.text(pageLabel, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  getDateDifference(status, startDate, startTime, endDate, endTime, actualStartDate, actualEndDate) {
    if (!actualEndDate) return "-";

    const scheduledStart = new Date(startDate);
    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      scheduledStart.setHours(hours, minutes, 0, 0);
    } else {
      scheduledStart.setHours(0, 0, 0, 0);
    }

    const scheduledEnd = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      scheduledEnd.setHours(hours, minutes, 0, 0);
    } else {
      scheduledEnd.setHours(23, 59, 59, 999);
    }

    const effectiveStart = actualStartDate
      ? new Date(actualStartDate)
      : new Date(scheduledStart);

    const completion = new Date(actualEndDate);

    const scheduledDuration = scheduledEnd.getTime() - scheduledStart.getTime();
    const actualDuration = completion.getTime() - effectiveStart.getTime();

    const durationDiff = actualDuration - scheduledDuration;

    if (Math.abs(durationDiff) < 60000) {
      return "Completed on time";
    }

    const absMs = Math.abs(durationDiff);
    const totalMinutes = Math.floor(absMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    let timeText = "";
    if (days > 0) {
      timeText = `${days} day${days > 1 ? "s" : ""}`;
      if (hours > 0) {
        timeText += ` ${hours} hr${hours > 1 ? "s" : ""}`;
      }
      if (minutes > 0) {
        timeText += ` ${minutes} min`;
      }
    } else if (hours > 0) {
      timeText = `${hours} hr${hours > 1 ? "s" : ""}`;
      if (minutes > 0) {
        timeText += ` ${minutes} min`;
      }
    } else {
      timeText = `${minutes} min`;
    }

    if (status === "Completed" || status === "Delayed") {
      if (durationDiff < 0) {
        return `Completed before ${timeText}`;
      }
      
      if (durationDiff > 0) {
        return `Completed after ${timeText}`;
      }

      return "Completed on time";
    }

    return "-";
  }

  formatToIndianTime(time) {
    if (!time) return "--";

    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  formatDateTime(date, time) {
    if (!date) return "N/A";

    const dateTime = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      dateTime.setHours(hours, minutes, 0, 0);
    }

    return dateTime
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");
  }

  formatCreatedAt(dateValue) {
    if (!dateValue) return "N/A";

    const date = new Date(dateValue);
    return date
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");
  }

  addNewPage(doc, fileName, isFirstPage) {
    if (!isFirstPage) {
      doc.addPage();
    }
    this.mainPageCounter++;
    this.currentMainPage = this.mainPageCounter;
    this.addHeader(doc, fileName, this.generatedDate);
    this.addFooter(doc, `Page ${this.currentMainPage}`);
    return 32;
  }

  export(data, fileName, selectedEmployee, taskStats = null, unscheduledTasks = []) {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    this.fileName = fileName;
    this.generatedDate = new Date().toLocaleDateString("en-GB");
    this.mainPageCounter = 0;
    this.currentMainPage = 0;
    let isFirstPage = true;
    let currentY = 30;

    const self = this;

    // Task Overview Section
    if (selectedEmployee && taskStats) {
      currentY = this.addNewPage(doc, fileName, isFirstPage);
      isFirstPage = false;

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Task Overview', 14, currentY);
      currentY += 8;

      const boxWidth = 85;
      const boxHeight = 20;
      const spacing = 10;
      const startX = 14;

      doc.setFillColor(59, 130, 246);
      doc.rect(startX, currentY, boxWidth, boxHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('Total Tasks', startX + 5, currentY + 7);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(taskStats.total.toString(), startX + 5, currentY + 15);
      
      doc.setFillColor(34, 197, 94);
      doc.rect(startX + boxWidth + spacing, currentY, boxWidth, boxHeight, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Scheduled Tasks', startX + boxWidth + spacing + 5, currentY + 7);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const scheduledPercent = taskStats.total > 0 
        ? Math.round((taskStats.scheduled / taskStats.total) * 100) 
        : 0;
      doc.text(`${taskStats.scheduled} (${scheduledPercent}%)`, startX + boxWidth + spacing + 5, currentY + 15);
      
      doc.setFillColor(249, 115, 22);
      doc.rect(startX + (boxWidth + spacing) * 2, currentY, boxWidth, boxHeight, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Unscheduled Tasks', startX + (boxWidth + spacing) * 2 + 5, currentY + 7);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const unscheduledPercent = taskStats.total > 0 
        ? Math.round((taskStats.unscheduled / taskStats.total) * 100) 
        : 0;
      doc.text(`${taskStats.unscheduled} (${unscheduledPercent}%)`, startX + (boxWidth + spacing) * 2 + 5, currentY + 15);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    data.forEach((project, projectIndex) => {
      currentY = this.addNewPage(doc, fileName, isFirstPage);
      isFirstPage = false;

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(project.projectName, 14, currentY);
      currentY += 8;

      let projectStatusInfo = `(${project.status}`;
      if (project.stausDate) {
        projectStatusInfo += ` on ${this.formatCreatedAt(project.stausDate)}`;
      }
      projectStatusInfo += `, ${project.percentage}%)`;
      
      const projectName = `${project.projectName}\n${projectStatusInfo}`;
      const projectStartDate = project.projectStartDate ? this.formatDateTime(project.projectStartDate, null) : "N/A";
      const projectEndDate = project.projectEndDate ? this.formatDateTime(project.projectEndDate, null) : "N/A";
      
      let projectCorrections = "";
      if (project.projectCorrectionDays && project.projectCorrectionDays.length > 0) {
        projectCorrections = project.projectCorrectionDays
          .map((corr, index) => {
            const from = corr.createdAt ? this.formatCreatedAt(corr.createdAt) : "N/A";
            const to = corr.date ? this.formatDateTime(corr.date, corr.time) : "N/A";
            return `Correction ${index + 1}\n${from}\nTo\n${to}`;
          })
          .join("\n\n");
      }

      const firstHalfRows = [];
      const firstHalfRowSpanInfo = [];
      const projectTotalRows = project.tasks.reduce((sum, task) => {
        return sum + (task.activities && task.activities.length > 0 ? task.activities.length : 1);
      }, 0);

      project.tasks.forEach((task, taskIndex) => {
        const hasActivities = task.activities && task.activities.length > 0;

        if (hasActivities) {
          let taskNameInfo = `${task.taskName}\n\nStarted on: ${this.formatDateTime(task.startDate, task.startTime)}\nEnd by: ${this.formatDateTime(task.endDate, task.endTime)}\n\n`;
          
          task.activities.forEach((activity, activityIndex) => {
            const isFirstTaskRow = activityIndex === 0;
            const isFirstProjectRow = firstHalfRows.length === 0;

            const activityName = `${activityIndex + 1}. ${activity.activityName}`;

            const firstRow = [
              isFirstProjectRow ? projectName : '',
              isFirstProjectRow ? projectStartDate : '',
              isFirstProjectRow ? projectEndDate : '',
              isFirstProjectRow ? projectCorrections : '',
              isFirstTaskRow ? taskNameInfo : '',
              activityName,
              this.formatCreatedAt(activity.createdAt),
              activity.assignedBy.name,
            ];

            firstHalfRows.push(firstRow);

            if (isFirstProjectRow) {
              firstHalfRowSpanInfo.push({
                row: firstHalfRows.length - 1,
                col: [0, 1, 2, 3],
                rowspan: projectTotalRows
              });
            }
            if (isFirstTaskRow) {
              firstHalfRowSpanInfo.push({
                row: firstHalfRows.length - 1,
                col: [4],
                rowspan: task.activities.length
              });
            }
          });
        } else {
          const isFirstProjectRow = firstHalfRows.length === 0;

          const firstRow = [
            isFirstProjectRow ? projectName : '',
            isFirstProjectRow ? projectStartDate : '',
            isFirstProjectRow ? projectEndDate : '',
            isFirstProjectRow ? projectCorrections : '',
            task.taskName,
            '-',
            this.formatCreatedAt(task.createdAt),
            task.assignedBy.name,
          ];

          firstHalfRows.push(firstRow);

          if (isFirstProjectRow) {
            firstHalfRowSpanInfo.push({
              row: firstHalfRows.length - 1,
              col: [0, 1, 2, 3],
              rowspan: projectTotalRows
            });
          }
        }
      });

      const firstHalfHeaders = [["Project Name", "Project Start Date", "Project End Date", "Project Corrections Date", "Task Name", "Activity", "Created", "Assigned By"]];

      const firstTableMainPage = this.currentMainPage;
      let continuationCounter = 0;

      autoTable(doc, {
        head: firstHalfHeaders,
        body: firstHalfRows,
        startY: currentY,
        styles: { 
          fontSize: 7.5,
          cellPadding: 2.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          minCellHeight: 10
        },
        headStyles: { 
          fillColor: [226, 235, 255], 
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          minCellHeight: 10
        },
        alternateRowStyles: { 
          fillColor: [249, 249, 249] 
        },
        columnStyles: {
          0: { cellWidth: 42, halign: 'center', valign: 'middle' },
          1: { cellWidth: 33, halign: 'center', valign: 'middle' },
          2: { cellWidth: 33, halign: 'center', valign: 'middle' },
          3: { cellWidth: 40, halign: 'left', valign: 'middle' },
          4: { cellWidth: 45, halign: 'left', valign: 'middle' },
          5: { cellWidth: 32, halign: 'left', valign: 'middle' },
          6: { cellWidth: 28, halign: 'center', valign: 'middle' },
          7: { cellWidth: 32, halign: 'left', valign: 'middle' },
        },
        didDrawCell: function(data) {
          const rowIdx = data.row.index;
          const colIdx = data.column.index;
          
          if (colIdx === 5 && data.cell.text[0] !== '-') {
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.2);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
          }
          
          firstHalfRowSpanInfo.forEach(span => {
            if (span.col.includes(colIdx) && rowIdx >= span.row && rowIdx < span.row + span.rowspan) {
              if (rowIdx !== span.row) {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.line(
                  data.cell.x,
                  data.cell.y,
                  data.cell.x + data.cell.width,
                  data.cell.y
                );
              }
            }
          });
        },
        tableWidth: 'wrap',
        margin: { left: 14, right: 14, top: 30, bottom: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        didDrawPage: function(data) {
          if (data.pageNumber > 1) {
            continuationCounter++;
            self.addHeader(doc, self.fileName, self.generatedDate);
            self.addFooter(doc, `Continuation Page ${firstTableMainPage}`);
          }
        }
      });

      currentY = this.addNewPage(doc, fileName, false);

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(project.projectName, 14, currentY);
      currentY += 8;

      const secondHalfRows = [];

      project.tasks.forEach((task) => {
        const hasActivities = task.activities && task.activities.length > 0;

        if (hasActivities) {
          task.activities.forEach((activity) => {
            const dayCount = (activity.status === "Delayed" || activity.status === "Completed")
              ? this.getDateDifference(
                  activity.status,
                  activity.startDate,
                  activity.startTime,
                  activity.endDate,
                  activity.endTime,
                  activity.actualStartDate,
                  activity.actualEndDate
                )
              : "-";
            
            const statusText = activity.status === "Delayed" ? "Delayed completed" : activity.status;

            const secondRow = selectedEmployee === "" 
              ? [
                  activity.assignedTo.name,
                  this.formatDateTime(activity.startDate, activity.startTime),
                  this.formatDateTime(activity.endDate, activity.endTime),
                  this.formatCreatedAt(activity.actualStartDate),
                  this.formatCreatedAt(activity.actualEndDate),
                  dayCount,
                  statusText
                ]
              : [
                  this.formatDateTime(activity.startDate, activity.startTime),
                  this.formatDateTime(activity.endDate, activity.endTime),
                  this.formatCreatedAt(activity.actualStartDate),
                  this.formatCreatedAt(activity.actualEndDate),
                  dayCount,
                  statusText
                ];

            secondHalfRows.push(secondRow);
          });
        } else {
          const dayCount = (task.status === "Delayed" || task.status === "Completed")
            ? this.getDateDifference(
                task.status,
                task.startDate,
                task.startTime,
                task.endDate,
                task.endTime,
                task.actualStartDate,
                task.actualEndDate
              )
            : "-";
          
          const statusText = task.status === "Delayed" ? "Delayed completed" : task.status;

          const secondRow = selectedEmployee === "" 
            ? [
                task.assignedTo.name,
                this.formatDateTime(task.startDate, task.startTime),
                this.formatDateTime(task.endDate, task.endTime),
                this.formatCreatedAt(task.actualStartDate),
                this.formatCreatedAt(task.actualEndDate),
                dayCount,
                statusText
              ]
            : [
                this.formatDateTime(task.startDate, task.startTime),
                this.formatDateTime(task.endDate, task.endTime),
                this.formatCreatedAt(task.actualStartDate),
                this.formatCreatedAt(task.actualEndDate),
                dayCount,
                statusText
              ];

          secondHalfRows.push(secondRow);
        }
      });

      const secondHalfHeaders = selectedEmployee === ""
        ? [["Assigned To", "Start Date", "End Date", "Actual Started Date", "Actual End Date", "Day Count", "Status"]]
        : [["Start Date", "End Date", "Actual Started Date", "Actual End Date", "Day Count", "Status"]];

      const secondTableMainPage = this.currentMainPage;
      continuationCounter = 0;

      autoTable(doc, {
        head: secondHalfHeaders,
        body: secondHalfRows,
        startY: currentY,
        styles: { 
          fontSize: 7.5,
          cellPadding: 2.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          minCellHeight: 10
        },
        headStyles: { 
          fillColor: [226, 235, 255], 
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          minCellHeight: 10
        },
        alternateRowStyles: { 
          fillColor: [249, 249, 249] 
        },
        columnStyles: selectedEmployee === "" ? {
          0: { cellWidth: 38, halign: 'left', valign: 'middle' },
          1: { cellWidth: 35, halign: 'center', valign: 'middle' },
          2: { cellWidth: 35, halign: 'center', valign: 'middle' },
          3: { cellWidth: 35, halign: 'center', valign: 'middle' },
          4: { cellWidth: 35, halign: 'center', valign: 'middle' },
          5: { cellWidth: 45, halign: 'left', valign: 'middle' },
          6: { cellWidth: 33, halign: 'center', valign: 'middle' }
        } : {
          0: { cellWidth: 38, halign: 'center', valign: 'middle' },
          1: { cellWidth: 38, halign: 'center', valign: 'middle' },
          2: { cellWidth: 38, halign: 'center', valign: 'middle' },
          3: { cellWidth: 38, halign: 'center', valign: 'middle' },
          4: { cellWidth: 48, halign: 'left', valign: 'middle' },
          5: { cellWidth: 35, halign: 'center', valign: 'middle' }
        },
        tableWidth: 'wrap',
        margin: { left: 14, right: 14, top: 30, bottom: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        didDrawPage: function(data) {
          if (data.pageNumber > 1) {
            continuationCounter++;
            self.addHeader(doc, self.fileName, self.generatedDate);
            self.addFooter(doc, `Continuation Page ${secondTableMainPage}`);
          }
        }
      });
    });

    // Unscheduled Tasks Section
    if (selectedEmployee && unscheduledTasks && unscheduledTasks.length > 0) {
      currentY = this.addNewPage(doc, fileName, false);

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Unscheduled Tasks', 14, currentY);
      currentY += 8;

      const unscheduledHeaders = [["S.No", "Report Date", "Task Name", "Project Name", "Start Time", "End Time", "Outcomes", "Status"]];
      const unscheduledRows = [];

      unscheduledTasks.forEach((task, index) => {
        const createdAt = task.createdAt 
          ? `${new Date(task.createdAt).toLocaleDateString("en-GB")}\n${new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : "--";
        
        const row = [
          (index + 1).toString(),
          createdAt,
          task.taskName || "-",
          task.projectName || "-",
          this.formatToIndianTime(task.startTime),
          this.formatToIndianTime(task.endTime),
          task.outcomes || "--",
          task.finalStatus || "Pending"
        ];
        unscheduledRows.push(row);
      });

      const unscheduledMainPage = this.currentMainPage;
      let continuationCounter = 0;

      autoTable(doc, {
        head: unscheduledHeaders,
        body: unscheduledRows,
        startY: currentY,
        styles: { 
          fontSize: 8,
          cellPadding: 2.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          minCellHeight: 10
        },
        headStyles: { 
          fillColor: [226, 235, 255], 
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          minCellHeight: 10
        },
        alternateRowStyles: { 
          fillColor: [249, 249, 249] 
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', valign: 'middle' },
          1: { cellWidth: 30, halign: 'center', valign: 'middle' },
          2: { cellWidth: 50, halign: 'left', valign: 'middle' },
          3: { cellWidth: 45, halign: 'left', valign: 'middle' },
          4: { cellWidth: 25, halign: 'center', valign: 'middle' },
          5: { cellWidth: 25, halign: 'center', valign: 'middle' },
          6: { cellWidth: 55, halign: 'left', valign: 'middle' },
          7: { cellWidth: 25, halign: 'center', valign: 'middle' }
        },
        tableWidth: 'auto',
        margin: { left: 14, right: 14, top: 30, bottom: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        didDrawPage: function(data) {
          if (data.pageNumber > 1) {
            continuationCounter++;
            self.addHeader(doc, self.fileName, self.generatedDate);
            self.addFooter(doc, `Continuation Page ${unscheduledMainPage}`);
          }
        }
      });
    }

    doc.save(`${fileName}.pdf`);
  }
}

export default ExportToPDF;