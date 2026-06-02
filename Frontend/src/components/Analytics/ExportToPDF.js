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

    let startY = 15;

    // Logo
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 14, 10, 30, 10);
      startY = 25;
    }

    // Title
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    if (logoImg) {
      doc.text(title, 50, 17);
    } else {
      doc.text(title, 14, startY);
      startY += 7;
    }

    // Subtitle / Generated Date
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const generatedOn = `Generated on: ${new Date().toLocaleDateString("en-GB")}`;
    if (logoImg) {
      doc.text(generatedOn, 50, 23);
      startY = 32;
    } else {
      doc.text(generatedOn, 14, startY);
      startY += 6;
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

    doc.save(`${fileName}.pdf`);
  }
}

export default ExportToPDF;
