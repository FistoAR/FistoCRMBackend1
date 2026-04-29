class ExportToCSV {
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

  escapeCSV(value) {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return `"${stringValue}"`;
  }

  export(data, fileName, selectedEmployee, taskStats = null, unscheduledTasks = []) {
    let csvContent = "";

    // Task Overview Section
    if (selectedEmployee && taskStats) {
      csvContent += "TASK OVERVIEW\n";
      csvContent += "Total Tasks,Scheduled Tasks,Unscheduled Tasks\n";
      const scheduledPercent = taskStats.total > 0 
        ? Math.round((taskStats.scheduled / taskStats.total) * 100) 
        : 0;
      const unscheduledPercent = taskStats.total > 0 
        ? Math.round((taskStats.unscheduled / taskStats.total) * 100) 
        : 0;
      csvContent += `${taskStats.total},"${taskStats.scheduled} (${scheduledPercent}%)","${taskStats.unscheduled} (${unscheduledPercent}%)"\n\n\n`;
    }

    // Scheduled Tasks Section - All columns in one table
    csvContent += "SCHEDULED TASKS\n";
    
    // All columns combined (no splitting like PDF)
    const allHeaders = selectedEmployee === ""
      ? [
          "Project Name",
          "Project Status",
          "Project Start Date",
          "Project End Date",
          "Project Corrections Date",
          "Task Name",
          "Task Start Date",
          "Task End Date",
          "Activity",
          "Created",
          "Assigned By",
          "Assigned To",
          "Start Date",
          "End Date",
          "Actual Started Date",
          "Actual End Date",
          "Day Count",
          "Status"
        ]
      : [
          "Project Name",
          "Project Status",
          "Project Start Date",
          "Project End Date",
          "Project Corrections Date",
          "Task Name",
          "Task Start Date",
          "Task End Date",
          "Activity",
          "Created",
          "Assigned By",
          "Start Date",
          "End Date",
          "Actual Started Date",
          "Actual End Date",
          "Day Count",
          "Status"
        ];
    
    csvContent += allHeaders.join(",") + "\n";

    data.forEach((project) => {
      let projectStatusInfo = `${project.status}`;
      if (project.stausDate) {
        projectStatusInfo += ` on ${this.formatCreatedAt(project.stausDate)}`;
      }
      projectStatusInfo += ` (${project.percentage}%)`;
      
      const projectStartDate = project.projectStartDate ? this.formatDateTime(project.projectStartDate, null) : "N/A";
      const projectEndDate = project.projectEndDate ? this.formatDateTime(project.projectEndDate, null) : "N/A";
      
      let projectCorrections = "";
      if (project.projectCorrectionDays && project.projectCorrectionDays.length > 0) {
        projectCorrections = project.projectCorrectionDays
          .map((corr, index) => {
            const from = corr.createdAt ? this.formatCreatedAt(corr.createdAt) : "N/A";
            const to = corr.date ? this.formatDateTime(corr.date, corr.time) : "N/A";
            return `Correction ${index + 1}: ${from} To ${to}`;
          })
          .join("; ");
      }

      project.tasks.forEach((task) => {
        const hasActivities = task.activities && task.activities.length > 0;

        if (hasActivities) {
          task.activities.forEach((activity, activityIndex) => {
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
            const activityName = `${activityIndex + 1}. ${activity.activityName}`;

            const row = selectedEmployee === ""
              ? [
                  this.escapeCSV(project.projectName),
                  this.escapeCSV(projectStatusInfo),
                  this.escapeCSV(projectStartDate),
                  this.escapeCSV(projectEndDate),
                  this.escapeCSV(projectCorrections),
                  this.escapeCSV(task.taskName),
                  this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                  this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                  this.escapeCSV(activityName),
                  this.escapeCSV(this.formatCreatedAt(activity.createdAt)),
                  this.escapeCSV(activity.assignedBy.name),
                  this.escapeCSV(activity.assignedTo.name),
                  this.escapeCSV(this.formatDateTime(activity.startDate, activity.startTime)),
                  this.escapeCSV(this.formatDateTime(activity.endDate, activity.endTime)),
                  this.escapeCSV(this.formatCreatedAt(activity.actualStartDate)),
                  this.escapeCSV(this.formatCreatedAt(activity.actualEndDate)),
                  this.escapeCSV(dayCount),
                  this.escapeCSV(statusText)
                ]
              : [
                  this.escapeCSV(project.projectName),
                  this.escapeCSV(projectStatusInfo),
                  this.escapeCSV(projectStartDate),
                  this.escapeCSV(projectEndDate),
                  this.escapeCSV(projectCorrections),
                  this.escapeCSV(task.taskName),
                  this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                  this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                  this.escapeCSV(activityName),
                  this.escapeCSV(this.formatCreatedAt(activity.createdAt)),
                  this.escapeCSV(activity.assignedBy.name),
                  this.escapeCSV(this.formatDateTime(activity.startDate, activity.startTime)),
                  this.escapeCSV(this.formatDateTime(activity.endDate, activity.endTime)),
                  this.escapeCSV(this.formatCreatedAt(activity.actualStartDate)),
                  this.escapeCSV(this.formatCreatedAt(activity.actualEndDate)),
                  this.escapeCSV(dayCount),
                  this.escapeCSV(statusText)
                ];

            csvContent += row.join(",") + "\n";
          });
        } else {
          // Task without activities
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

          const row = selectedEmployee === ""
            ? [
                this.escapeCSV(project.projectName),
                this.escapeCSV(projectStatusInfo),
                this.escapeCSV(projectStartDate),
                this.escapeCSV(projectEndDate),
                this.escapeCSV(projectCorrections),
                this.escapeCSV(task.taskName),
                this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                this.escapeCSV("-"),
                this.escapeCSV(this.formatCreatedAt(task.createdAt)),
                this.escapeCSV(task.assignedBy.name),
                this.escapeCSV(task.assignedTo.name),
                this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                this.escapeCSV(this.formatCreatedAt(task.actualStartDate)),
                this.escapeCSV(this.formatCreatedAt(task.actualEndDate)),
                this.escapeCSV(dayCount),
                this.escapeCSV(statusText)
              ]
            : [
                this.escapeCSV(project.projectName),
                this.escapeCSV(projectStatusInfo),
                this.escapeCSV(projectStartDate),
                this.escapeCSV(projectEndDate),
                this.escapeCSV(projectCorrections),
                this.escapeCSV(task.taskName),
                this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                this.escapeCSV("-"),
                this.escapeCSV(this.formatCreatedAt(task.createdAt)),
                this.escapeCSV(task.assignedBy.name),
                this.escapeCSV(this.formatDateTime(task.startDate, task.startTime)),
                this.escapeCSV(this.formatDateTime(task.endDate, task.endTime)),
                this.escapeCSV(this.formatCreatedAt(task.actualStartDate)),
                this.escapeCSV(this.formatCreatedAt(task.actualEndDate)),
                this.escapeCSV(dayCount),
                this.escapeCSV(statusText)
              ];

          csvContent += row.join(",") + "\n";
        }
      });
    });

    // Unscheduled Tasks Section
    if (selectedEmployee && unscheduledTasks && unscheduledTasks.length > 0) {
      csvContent += "\n\nUNSCHEDULED TASKS\n";
      const unscheduledHeaders = ["S.No", "Report Date", "Task Name", "Project Name", "Start Time", "End Time", "Outcomes", "Status"];
      csvContent += unscheduledHeaders.join(",") + "\n";

      unscheduledTasks.forEach((task, index) => {
        const createdAt = task.createdAt 
          ? `${new Date(task.createdAt).toLocaleDateString("en-GB")} ${new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : "--";
        
        const row = [
          (index + 1).toString(),
          this.escapeCSV(createdAt),
          this.escapeCSV(task.taskName || "-"),
          this.escapeCSV(task.projectName || "-"),
          this.escapeCSV(this.formatToIndianTime(task.startTime)),
          this.escapeCSV(this.formatToIndianTime(task.endTime)),
          this.escapeCSV(task.outcomes || "--"),
          this.escapeCSV(task.finalStatus || "Pending")
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    // Create and download CSV file
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

export default ExportToCSV;