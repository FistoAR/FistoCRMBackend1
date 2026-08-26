import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

class ExportMOM {
  export(meeting, logoImg = null) {
    try {
      const doc = new jsPDF("p", "mm", "a4");

      const companyName = meeting.company_name || meeting.company || "-";
      const meetingTitle = meeting.title || "-";

      const formatCleanDate = (dateVal) => {
        if (!dateVal) return "-";
        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          }
          const raw = String(dateVal).split("T")[0];
          const parts = raw.split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        } catch (e) {}
        return String(dateVal);
      };

      const scheduledDate = meeting.date
        ? formatCleanDate(meeting.date).split("/").join("-")
        : "-";
      const scheduledTime = meeting.time || "-";
      const meetingType = meeting.type || "-";

      // Top Primary Blue Accent Bar
      doc.setFillColor(37, 99, 235); // #2563eb
      doc.rect(0, 0, 210, 4, "F");

      // Render Logo on Top Left if available
      if (logoImg) {
        doc.addImage(logoImg, "PNG", 14, 10, 32, 12);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("FISTO", 14, 18);
      }

      // Title on Top Right Area
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Minutes of Meeting ", 196, 16, { align: "right" });

      // Metadata / Export Timestamp
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const generatedDate = new Date().toLocaleString("en-IN");
      doc.text(`Exported: ${generatedDate}`, 196, 22, { align: "right" });

      // Decorative Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 27, 196, 27);

      // Section 1: Meeting Details Card Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, 182, 38, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 32, 182, 38, 2, 2, "D");

      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Meeting Overview", 18, 40);

      autoTable(doc, {
        startY: 43,
        margin: { left: 18, right: 18 },
        body: [
          ["Company Name", companyName, "Meeting Title", meetingTitle],
          ["Scheduled Date", scheduledDate, "Scheduled Time", scheduledTime],
          ["Meeting Type", meetingType, "", ""],
        ],
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1.8 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [100, 116, 139], width: 32 },
          1: { width: 56, fontStyle: "bold", textColor: [15, 23, 42] },
          2: { fontStyle: "bold", textColor: [100, 116, 139], width: 32 },
          3: { width: 56, fontStyle: "bold", textColor: [15, 23, 42] },
        },
      });

      const conductedDate = meeting.date
        ? formatCleanDate(meeting.date)
        : meeting.mom_recorded_at
          ? formatCleanDate(meeting.mom_recorded_at)
          : meeting.mom_conductedDate || scheduledDate;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Minutes of Meeting Details", 14, 78);

      autoTable(doc, {
        startY: 82,
        margin: { left: 14, right: 14 },
        head: [["Category / Field", "Details"]],
        body: [
          ["Conducted Date", conductedDate],
          [
            "Meeting Timing",
            meeting.startTime && meeting.endTime
              ? `${meeting.startTime} to ${meeting.endTime}`
              : meeting.time
                ? `${meeting.time}${meeting.endTime ? ` to ${meeting.endTime}` : ""}`
                : meeting.mom_startTime && meeting.mom_endTime
                  ? `${meeting.mom_startTime} to ${meeting.mom_endTime}`
                  : meeting.time || "-",
          ],
          [
            "Attendees (Client Side)",
            meeting.attendees_client || meeting.attendeesClient || "-",
          ],
          [
            "Attendees (Our Side)",
            meeting.attendees_our_side || meeting.attendeesOurSide || "-",
          ],
          [
            "Agenda Discussed",
            meeting.agenda && meeting.agenda !== "-"
              ? meeting.agenda
              : meeting.mom_agenda || meeting.remarks || "-",
          ],
          [
            "Outcomes & Decisions",
            meeting.outcomes && meeting.outcomes !== "-"
              ? meeting.outcomes
              : meeting.mom_outcomes || meeting.remarks || "-",
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9.5,
          cellPadding: 3,
        },
        styles: { fontSize: 9, cellPadding: 3.5, overflow: "linebreak" },
        columnStyles: {
          0: {
            fontStyle: "bold",
            textColor: [30, 41, 59],
            fillColor: [248, 250, 252],
            width: 48,
          },
          1: { width: 134, textColor: [15, 23, 42] },
        },
      });

      // Page Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 285, 196, 285);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Fisto CRM • Minutes of Meeting Report", 14, 290);
        doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: "right" });
      }

      const safeTitle = (meetingTitle || "MOM").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`MOM_${safeTitle}.pdf`);
    } catch (err) {
      console.error("PDF generation error in ExportMOM:", err);
    }
  }
}

export default ExportMOM;
