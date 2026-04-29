import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

class ExportToPDF {
  /**
   * data: array of flat rows
   * [
   *  {
   *    sno,
   *    date,
   *    company,
   *    customer,
   *    industry,
   *    city,
   *    state,
   *    contact,
   *    designation,
   *    status
   *  },
   *  ...
   * ]
   */
  export(data, fileName) {
    const doc = new jsPDF("l", "mm", "a4");

    const headers = [
      [
        "S.NO",
        "Date",
        "Company",
        "Customer",
        "Industry",
        "City",
        "State",
        "Contact",
        "Designation",
        "Status",
      ],
    ];

    const rows = data.map((row) => [
      row.sno,
      row.date,
      row.company || "",
      row.customer || "",
      row.industry || "",
      row.city || "",
      row.state || "",
      row.contact || "",
      row.designation || "",
      row.status || "",
    ]);

    // Title
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    doc.text(fileName, 14, 15);

    // Subtitle
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      14,
      22
    );

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        halign: "left",
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
        0: { cellWidth: 13 }, // S.NO
        1: { cellWidth: 20 }, // Date
        2: { cellWidth: 30 }, // Company
        3: { cellWidth: 30 }, // Customer
        4: { cellWidth: 30 }, // Industry
        5: { cellWidth: 25 }, // City
        6: { cellWidth: 25 }, // State
        7: { cellWidth: 40 }, // Contact
        8: { cellWidth: 30 }, // Designation
        9: { cellWidth: 30 }, // Status
      },
      margin: { left: 13, right: 13 },
    });

    doc.save(`${fileName}.pdf`);
  }
}

export default ExportToPDF;
