import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

class ExportToPDF {
  export(data, options = {}) {
    const {
      fileName = "Report",
      title = fileName,
      headers = [
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
      ],
      dataKeys = [
        "sno",
        "date",
        "company",
        "customer",
        "industry",
        "city",
        "state",
        "contact",
        "designation",
        "status"
      ],
      filters = [], 
      logoImg = null 
    } = options;

    const doc = new jsPDF("l", "mm", "a4");

    const rows = data.map((row) => 
      dataKeys.map(key => row[key] !== undefined ? row[key] : "")
    );

    const pageWidth = doc.internal.pageSize.width || 297;
    const rightMargin = 14;
    let startY = 15;

    // Logo
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 14, 10, 30, 10);
      startY = 25;
    }

    // Title
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    const titleX = options.titleAlign === "right" ? pageWidth - rightMargin : (logoImg ? 50 : 14);
    const alignOpt = options.titleAlign === "right" ? { align: "right" } : undefined;
    
    if (logoImg && options.titleAlign !== "right") {
      doc.text(title, titleX, 17);
    } else {
      doc.text(title, titleX, logoImg ? 17 : startY, alignOpt);
      if (!logoImg) startY += 7;
    }

    // Subtitle / Generated Date
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const generatedOn = `Generated on: ${new Date().toLocaleDateString("en-GB")}`;
    if (logoImg && options.titleAlign !== "right") {
      doc.text(generatedOn, 50, 23);
      startY = 32;
    } else {
      doc.text(generatedOn, titleX, logoImg ? 23 : startY, alignOpt);
      startY = logoImg ? 32 : startY + 6;
    }

    // Filters
    if (filters && filters.length > 0) {
      doc.setFontSize(8);
      doc.setFont(undefined, "italic");
      const filterText = `Filters Applied: ${filters.join(" | ")}`;
      const splitText = doc.splitTextToSize(filterText, 260); 
      doc.text(splitText, 14, startY);
      startY += splitText.length * 4 + 2;
    }

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: startY,
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
      margin: { left: 13, right: 13 },
    });

    if (options.withHistory && options.historyData) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Followup History Details", 14, 15);

      let historyY = 22;
      options.historyData.forEach((item, idx) => {
        if (historyY > 170) {
          doc.addPage();
          historyY = 15;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`${item.sno || idx + 1}. ${item.company} (${item.customer})`, 14, historyY);
        historyY += 5;

        if (item.history && item.history.length > 0) {
          const historyRows = item.history.map((h, hIdx) => [
            hIdx + 1,
            h.date,
            h.status,
            h.contactPerson,
            h.remarks,
            h.nextFollowupDate || "-"
          ]);

          autoTable(doc, {
            head: [["S.NO", "Date", "Status", "Contacted Person", "Remarks", "Next Followup"]],
            body: historyRows,
            startY: historyY,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            margin: { left: 14, right: 14 }
          });

          historyY = doc.lastAutoTable.finalY + 8;
        } else {
          doc.setFontSize(8);
          doc.setFont(undefined, "italic");
          doc.text("No history records available", 18, historyY);
          historyY += 8;
        }
      });
    }

    doc.save(`${fileName}.pdf`);
  }
}

export default ExportToPDF;
