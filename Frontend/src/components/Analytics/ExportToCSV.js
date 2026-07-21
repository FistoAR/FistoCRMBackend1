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
      "Company",
      "Customer",
      "Phone",
      "Location",
      "Status",
      "Remarks",
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
        row.phone || "-",
        row.location || "-",
        row.status || "-",
        row.remarks || "-",
        row.handled_by || "-",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const wsReport = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, wsReport, "Followup Report");

    // Optional History Sheet
    if (withHistory && historyData && Array.isArray(historyData)) {
      const historySheetRows = [
        [`${title} - Detailed History`],
        [generatedOn],
        [filterText],
        [], // blank spacing row
        ["S.NO", "Company", "Customer", "Followup Date", "Status", "Contacted Person", "Remarks", "Next Followup"],
      ];

      historyData.forEach((item) => {
        const clientSNo = item.sno || "-";
        if (item.history && item.history.length > 0) {
          item.history.forEach((h) => {
            historySheetRows.push([
              clientSNo,
              item.company || "-",
              item.customer || "-",
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
      XLSX.utils.book_append_sheet(wb, wsHistory, "Followup History");
    }

    // Write binary Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }
}

export default ExportToCSV;
