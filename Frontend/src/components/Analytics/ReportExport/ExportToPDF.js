import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

class ExportToPDF {
  export(data, fileName) {
    const doc = new jsPDF("l", "mm", "a4"); // landscape orientation

    const headers = [
      [
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
      ],
    ];

    const rows = data.map((row) => [
      row.sno || "",
      row.date || "",
      row.taskName || "",
      row.taskDescription || "",
      row.employee || "",
      row.category || "",
      row.timeRange || "",
      row.progress || "",
      row.status || "",
      row.deadline || "",
    ]);

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(fileName, 14, 15);

    // Subtitle
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      14,
      22
    );

    // Use autoTable (imported separately)
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 28,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [226, 235, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },  // S.NO
        1: { cellWidth: 20 },                     // Date
        2: { cellWidth: 35 },                     // Task Name
        3: { cellWidth: 45 },                     // Task Description
        4: { cellWidth: 30 },                     // Employee
        5: { cellWidth: 25 },                     // Category
        6: { cellWidth: 18, halign: "center" },   // Time Range
        7: { cellWidth: 15, halign: "center" },   // Progress
        8: { cellWidth: 20, halign: "center" },   // Status
        9: { cellWidth: 30 },                     // Deadline
      },
      margin: { left: 10, right: 10 },
      didDrawPage: function (data) {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
    });

    doc.save(`${fileName}.pdf`);
  }
}

export default ExportToPDF;
