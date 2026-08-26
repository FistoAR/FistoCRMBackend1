import * as XLSX from "xlsx";

class ExportToCSV {
  export(data, options = {}) {
    let fileName = "Report";
    let title = "Management Followup Report";
    let filters = [];
    let withHistory = false;
    let historyData = null;

    if (typeof options === "string") {
      fileName = options;
    } else {
      fileName = options.fileName || "Report";
      title = options.title || "Management Followup Report";
      filters = options.filters || [];
      withHistory = options.withHistory || false;
      historyData = options.historyData || null;
    }

    const headers = [
      "S.NO",
      "Date",
      "Company Name",
      "Customer Name",
      "Project Name",
      "Category",
      "Reference",
      "Status",
      "Next Followup Date",
      "Handled By",
    ];

    const generatedOn = `Generated on: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    const filterText = filters && filters.length > 0 ? `Applied Filters: ${filters.join(" | ")}` : "Applied Filters: None";

    // Main Report Worksheet Data with Header Metadata
    const sheetData = [
      [title],
      [generatedOn],
      [filterText],
      [], // blank spacing row
      headers,
      ...data.map((row) => [
        row.sno,
        row.date || "-",
        row.company || "-",
        row.customer || "-",
        row.project_name || "-",
        row.category || "-",
        row.reference || "-",
        row.status || "-",
        row.next_followup_date || "-",
        row.handled_by || "-",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const wsReport = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths for main sheet
    wsReport["!cols"] = [
      { wch: 6 },  // S.NO
      { wch: 14 }, // Date
      { wch: 25 }, // Company Name
      { wch: 20 }, // Customer Name
      { wch: 22 }, // Project Name
      { wch: 15 }, // Category
      { wch: 15 }, // Reference
      { wch: 18 }, // Status
      { wch: 18 }, // Next Followup Date
      { wch: 18 }, // Handled By
    ];

    XLSX.utils.book_append_sheet(wb, wsReport, "Followup Report");

    // Optional History Sheet
    if (withHistory && historyData && Array.isArray(historyData)) {
      const historySheetRows = [
        [`${title} - Detailed History`],
        [generatedOn],
        [filterText],
        [], // blank spacing row
        ["S.NO", "Company Name", "Customer Name", "Followup Date", "Status", "Contacted Person", "Remarks", "Next Followup Date"],
      ];

      historyData.forEach((item) => {
        const clientSNo = item.sno || "-";
        if (item.history && item.history.length > 0) {
          item.history.forEach((h, hIdx) => {
            historySheetRows.push([
              hIdx === 0 ? clientSNo : "",
              hIdx === 0 ? item.company || "-" : "",
              hIdx === 0 ? item.customer || "-" : "",
              h.date || "-",
              h.status || "-",
              h.contactPerson || "-",
              h.remarks || "-",
              h.nextFollowupDate || "-",
            ]);
          });
        } else {
          historySheetRows.push([
            clientSNo,
            item.company || "-",
            item.customer || "-",
            "-",
            "-",
            "-",
            "No history records available",
            "-",
          ]);
        }
      });

      const wsHistory = XLSX.utils.aoa_to_sheet(historySheetRows);

      // Highlight the main client row (first row of each client) with a soft blue background
      let currentRowIndex = 4; // Headers are at row index 4 (0-indexed line 5)
      historyData.forEach((item) => {
        const rowCount = item.history && item.history.length > 0 ? item.history.length : 1;
        const mainRowIdx = currentRowIndex + 1; // 1-indexed for SheetJS

        // Highlight cells A to H of the primary client row
        ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
          const cellRef = `${col}${mainRowIdx}`;
          if (wsHistory[cellRef]) {
            wsHistory[cellRef].s = {
              fill: { fgColor: { rgb: "DBEAFE" } }, // Soft blue fill (Tailwind blue-100)
              font: { bold: true, color: { rgb: "1E3A8A" } }, // Dark blue text
            };
          }
        });

        currentRowIndex += rowCount;
      });

      // Set column widths for history sheet
      wsHistory["!cols"] = [
        { wch: 6 },  // S.NO
        { wch: 25 }, // Company Name
        { wch: 20 }, // Customer Name
        { wch: 16 }, // Followup Date
        { wch: 18 }, // Status
        { wch: 25 }, // Contacted Person
        { wch: 35 }, // Remarks
        { wch: 18 }, // Next Followup Date
      ];

      XLSX.utils.book_append_sheet(wb, wsHistory, "Followup History");
    }

    // Write binary Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }
}

export default ExportToCSV;
