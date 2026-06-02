class ExportToCSV {

  export(data, fileName) {
    const headers = [
      "S.NO",
      "Date",
      "Company",
      "Customer",
      "Industry",
      "City",
      "State",
      "Contact",
      "Designation",
      "Next Follow up",
      "Status",
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
        safe(row.company),
        safe(row.customer),
        safe(row.industry),
        safe(row.city),
        safe(row.state),
        safe(row.contact),
        safe(row.designation),
        safe(row.nextFollowupDate),
        safe(row.status),
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
