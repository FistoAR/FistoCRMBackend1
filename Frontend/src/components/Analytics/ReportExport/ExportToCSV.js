class ExportToCSV {
  export(data, fileName) {
    const headers = [
      "S.NO",
      "Date",
      "Task Name",
      "Task Description",
      "Employee",
      "Category",
      "Time Range",
      "Progress",
      "Status",
      "Deadline",
    ];

    let csvContent = headers.join(",") + "\n";

    data.forEach((row) => {
      const safe = (v) =>
        `"${String(v ?? "")
          .replace(/"/g, '""')
          .trim()}"`;

      const line = [
        row.sno,
        `="${row.date}"`,
        safe(row.taskName),
        safe(row.taskDescription),
        safe(row.employee),
        safe(row.category),
        safe(row.timeRange),
        safe(row.progress),
        safe(row.status),
        safe(row.deadline),
      ];

      csvContent += line.join(",") + "\n";
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

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
