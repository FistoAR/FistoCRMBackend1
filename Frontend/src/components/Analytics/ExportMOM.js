import jsPDF from "jspdf";

class ExportMOM {
  // Helper: draw a bold label + value pair in a two-column row
  _row(doc, x, y, label, value, colW, pageW) {
    doc.setFont(undefined, "bold");
    doc.setTextColor(55, 65, 81); // gray-700
    doc.setFontSize(8.5);
    doc.text(label, x, y);

    doc.setFont(undefined, "normal");
    doc.setTextColor(17, 24, 39); // gray-900
    const valueX = x + colW;
    const maxW = pageW - valueX - 14;
    const lines = doc.splitTextToSize(String(value || "-"), maxW);
    doc.text(lines, valueX, y);
    return lines.length > 1 ? (lines.length - 1) * 4.5 : 0; // extra height if wrapped
  }

  // Helper: draw a text-area style box with a title
  _textBox(doc, x, y, width, title, content, pageW) {
    const maxContentW = width - 6;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(String(content || "-"), maxContentW);
    const lineHeight = 5;
    const boxH = Math.max(22, lines.length * lineHeight + 12);

    // Label above box
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(title, x, y);
    y += 4;

    // Box border
    doc.setDrawColor(209, 213, 219); // gray-300
    doc.setFillColor(249, 250, 251); // gray-50
    doc.roundedRect(x, y, width, boxH, 2, 2, "FD");

    // Content inside box
    doc.setFont(undefined, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(lines, x + 4, y + 7);

    return y + boxH + 6;
  }

  export(meeting, logoImg = null) {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const marginL = 14;
    const marginR = 14;
    const contentW = pageW - marginL - marginR;
    let y = 12;

    // ── HEADER ────────────────────────────────────────────────────────
    if (logoImg) {
      doc.addImage(logoImg, "PNG", marginL, y, 28, 10);
    }
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Minutes of Meeting", pageW - marginR, y + 7, { align: "right" });
    y += 16;

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);
    y += 6;

    // ── TITLE + STATUS LABELS ─────────────────────────────────────────
    const statusLabel = String(meeting.status || "");
    const statusColorMap = {
      completed: [5, 150, 105],
      cancelled: [220, 38, 38],
      scheduled: [37, 99, 235],
    };
    const [sr, sg, sb] = statusColorMap[meeting.status] || [107, 114, 128];

    // "Title:" label + value
    doc.setFontSize(8.5);
    doc.setFont(undefined, "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Title:", marginL, y);
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(meeting.title || "Meeting", marginL + 20, y);
    y += 7;

    // "Status:" label + colored status
    doc.setFontSize(8.5);
    doc.setFont(undefined, "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Status:", marginL, y);
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(sr, sg, sb);
    doc.text(statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1), marginL + 20, y);
    y += 9;

    // Divider under title/status block
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 7;

    // ── INFO GRID: Left = Company Details, Right = Meeting Details ─────
    const colLabel = 38;
    const col1X = marginL;
    const col2X = marginL + contentW / 2;

    const fmtDate = (d) =>
      d ? new Date(d).toLocaleDateString("en-GB") : "-";

    // LEFT: Company Details
    const col1 = [
      ["Company:", meeting.company_name || "-"],
      ["Customer:", meeting.customer_name || "-"],
      ["Contact Person:", meeting.contact_person_name && meeting.contact_person_name !== "-"
        ? `${meeting.contact_person_name}${meeting.contact_person_phone && meeting.contact_person_phone !== "-" ? ` (${meeting.contact_person_phone})` : ""}`
        : "-"],
      ["Designation:", meeting.contact_person_designation || "-"],
      ["Location:", meeting.meeting_location && meeting.meeting_location !== "-" ? meeting.meeting_location : meeting.location || "-"],
      ["Handled By:", meeting.employee_name || "-"],
    ];

    // RIGHT: Meeting Details
    const col2 = [
      ["Date:", fmtDate(meeting.mom_conducted_date || meeting.date)],
      ["Start Time:", meeting.mom_start_time || meeting.time || "-"],
      ["End Time:", meeting.mom_end_time || "-"],
      ["Meeting Type:", meeting.type || "-"],
    ];

    // Section sub-headers
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text("COMPANY DETAILS", col1X, y);
    doc.text("MEETING DETAILS", col2X, y);
    y += 5;

    const rowStep = 7;
    const maxRows = Math.max(col1.length, col2.length);
    for (let i = 0; i < maxRows; i++) {
      if (col1[i]) this._row(doc, col1X, y, col1[i][0], col1[i][1], colLabel, col2X - 2);
      if (col2[i]) this._row(doc, col2X, y, col2[i][0], col2[i][1], colLabel, pageW);
      y += rowStep;
    }

    y += 4;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 6;


    // ── ATTENDEES (side-by-side) ──────────────────────────────────────
    if (meeting.mom_attendees_client || meeting.mom_attendees_our_side) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("Attendees", marginL, y);
      y += 5;

      const halfW = (contentW - 4) / 2;
      const attendeesStartY = y;

      // Compute box heights for both to pick the taller one
      const getBoxH = (text) => {
        if (!text) return 0;
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(String(text), halfW - 6);
        return Math.max(22, lines.length * 5 + 12);
      };
      const clientH = meeting.mom_attendees_client ? getBoxH(meeting.mom_attendees_client) : 0;
      const ourH = meeting.mom_attendees_our_side ? getBoxH(meeting.mom_attendees_our_side) : 0;
      const tallest = Math.max(clientH, ourH);

      if (meeting.mom_attendees_client) {
        // Label
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(30, 64, 175);
        doc.text("Client Side", marginL, attendeesStartY);
        const bY = attendeesStartY + 4;
        doc.setDrawColor(209, 213, 219); doc.setFillColor(249, 250, 251);
        doc.roundedRect(marginL, bY, halfW, tallest, 2, 2, "FD");
        doc.setFont(undefined, "normal"); doc.setFontSize(8.5); doc.setTextColor(31, 41, 55);
        const lines = doc.splitTextToSize(String(meeting.mom_attendees_client), halfW - 6);
        doc.text(lines, marginL + 4, bY + 7);
      }

      if (meeting.mom_attendees_our_side) {
        const x2 = marginL + halfW + 4;
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(30, 64, 175);
        doc.text("Our Side", x2, attendeesStartY);
        const bY = attendeesStartY + 4;
        doc.setDrawColor(209, 213, 219); doc.setFillColor(249, 250, 251);
        doc.roundedRect(x2, bY, halfW, tallest, 2, 2, "FD");
        doc.setFont(undefined, "normal"); doc.setFontSize(8.5); doc.setTextColor(31, 41, 55);
        const lines = doc.splitTextToSize(String(meeting.mom_attendees_our_side), halfW - 6);
        doc.text(lines, x2 + 4, bY + 7);
      }

      y = attendeesStartY + 4 + tallest + 8;
    }


    // ── AGENDA BOX ───────────────────────────────────────────────────
    const agendaContent = meeting.mom_agenda || meeting.agenda || "-";
    y = this._textBox(doc, marginL, y, contentW, "Agenda", agendaContent, pageW);

    // ── OUTCOMES BOX ─────────────────────────────────────────────────
    const outcomesContent = meeting.mom_outcomes || meeting.remarks || "-";
    y = this._textBox(doc, marginL, y, contentW, "Outcomes / Next Steps", outcomesContent, pageW);

    // ── FOOTER ───────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setFont(undefined, "normal");
    const genDate = new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
    doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);
    doc.text(`Generated on: ${genDate} (IST)`, pageW - marginR, pageH - 7, { align: "right" });
    doc.text("FISTO CRM — Management Followup System", marginL, pageH - 7);

    const safeTitle = (meeting.title || "MOM").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`MOM_${safeTitle}.pdf`);
  }
}

export default ExportMOM;


