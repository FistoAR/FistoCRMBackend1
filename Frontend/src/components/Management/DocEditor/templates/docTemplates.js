import fistoLogo from "../../../../assets/Fisto Logo.png";

export const STYLES = `
  .scrollbar-none::-webkit-scrollbar { display: none !important; }
  .scrollbar-none { -ms-overflow-style: none !important; scrollbar-width: none !important; }
  .doc-preview table { width: 100% !important; border-collapse: collapse !important; margin: 12px 0 !important; }
  .doc-preview td, .doc-preview th { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; min-width: 24px; vertical-align: top; }
  .doc-preview hr { border: none !important; border-top: 1px solid #cbd5e1 !important; margin: 16px 0 !important; }
  .doc-preview p, .doc-preview li { word-break: break-word; white-space: pre-wrap; margin: 0 0 8px 0; }
  .doc-preview p:last-child { margin-bottom: 0; }
`;

export const formatDate = (d) => {
  if (!d) return "";
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
};

export const df = (field, val) =>
  `<span data-field="${field}">${val ?? ""}</span>`;

export const SIG_HTML = `
  <div style="display:flex;flex-direction:column;align-items:flex-end;text-align:right;">
    <span style="font-family:Georgia,serif;font-style:italic;font-size:18px;font-weight:700;color:#1f2937;letter-spacing:.05em;display:block;margin-bottom:2px;">Nijamudeen</span>
    <span style="font-weight:700;font-size:11px;color:#111827;display:block;">Mr. NIJAMUDEEN</span>
    <span style="font-size:10px;color:#4b5563;font-weight:500;display:block;">Managing Director</span>
    <span style="font-size:10px;font-weight:700;color:#1f2937;display:block;">FISTO TECH PRIVATE LIMITED</span>
  </div>`;

export const FOOTER_HTML = `
  <div style="width:100%;border-top:2px solid #84cc16;padding-top:8px;margin-top:auto;">
    <div style="font-weight:700;font-size:10px;color:#111827;text-transform:uppercase;letter-spacing:.05em;">FISTO TECH PRIVATE LIMITED</div>
    <div style="font-size:9px;color:#4b5563;line-height:1.4;">11/12, Sundaram Brothers Layout, Ramanathapuram, Coimbatore, Tamil Nadu - 641045</div>
    <div style="font-size:9px;color:#4b5563;line-height:1.4;">P : +91 99944 25147, +91 75300 25147 &nbsp;|&nbsp; E : info@fist-o.com &nbsp;|&nbsp; W : www.fist-o.com</div>
  </div>`;

export const buildLetterHeader = (refNum, date) => `
  <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:14px;">
    <div>
      <div style="font-size:11px;font-weight:700;color:#111827;letter-spacing:.05em;">REF:&nbsp;${df("refNumber", refNum)}</div>
      <div style="font-size:10px;font-weight:500;color:#4b5563;margin-top:2px;">${df("date", date)}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;">
      <img src="${fistoLogo}" alt="Fisto" style="height:32px;object-fit:contain;margin-bottom:2px;">
      <span style="font-size:8px;font-weight:700;letter-spacing:.2em;color:#6b7280;text-transform:uppercase;">TECH PVT LTD</span>
    </div>
  </div>`;

export const buildOfferHTML = (d) => `
  ${buildLetterHeader(d.refNumber, formatDate(d.date))}
  <div style="flex:1;font-size:11.5px;line-height:1.5;color:#111827;">
    <p style="font-weight:700;font-size:13px;text-transform:uppercase;margin:0 0 4px 0;">${df("candidateName", d.candidateName)}</p>
    <p style="color:#374151;white-space:pre-wrap;line-height:1.3;margin:0 0 8px 0;">${df("address", d.address)}</p>
    <p style="margin:0 0 8px 0;font-weight:500;">Dear ${df("candidateName2", d.candidateName)},</p>
    <p style="margin:0 0 8px 0;">
      This has reference to the interview and the subsequent discussions you had with us.
      We are pleased to offer you appointment as
      "<strong style="color:#111827;">${df("designation", d.designation)}</strong>"
      in our organization starting from
      <strong>${df("joiningDate", formatDate(d.joiningDate))}</strong>,
      at your salary will be
      <strong>INR.${df("salary", d.salary)}/- (${df("salaryWords", d.salaryWords)})</strong>
      per month. No other benefits are provided.
    </p>
    <ol style="padding-left:18px;font-size:11px;margin:0 0 10px 0;">
      <li style="margin-bottom:4px;">You will be in probation for a period of ${df("probationMonths", d.probationMonths)} month(s) from the date of joining. At the end of this period, if your performance is found satisfactory, your service will be confirmed.</li>
      <li style="margin-bottom:4px;">Your place of posting will be at our office located at <strong>11/12, Sundaram Brothers layout, Ramanathapuram, Coimbatore - 641 045, TAMILNADU (INDIA)</strong>.</li>
      <li style="margin-bottom:4px;">Either party may terminate the employment with ${df("noticePeriod", d.noticePeriod)} notice, which may vary depending on the assigned project.</li>
    </ol>
    <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div><p style="margin:0;">Sincerely,</p><p style="margin:0;font-weight:700;">FISTO TECH PRIVATE LIMITED</p></div>
      ${SIG_HTML}
    </div>
  </div>
  ${FOOTER_HTML}`;

export const buildExpHTML = (d) => {
  const isFemale = d.gender === "Female";
  const him = isFemale ? "her" : "him";
  const His = isFemale ? "Her" : "His";
  const summaryRows = [
    ["Candidate name", "candidateName", d.candidateName, "700"],
    ["Work position", "workPosition", d.workPosition, "700"],
    ["Date of joining", "dateOfJoining", formatDate(d.dateOfJoining), "500"],
    ["Date of relieving", "dateOfRelieving", formatDate(d.dateOfRelieving), "500"],
    ["Experience", "experience", d.experience, "700"],
  ]
    .map(
      ([label, field, val, w]) => `
    <div style="display:grid;grid-template-columns:1fr 2fr;font-size:11px;padding:1px 0;">
      <span style="font-weight:600;color:#4b5563;">${label}</span>
      <span style="font-weight:${w};color:#111827;">: ${df(field, val)}</span>
    </div>`,
    )
    .join("");

  return `
    ${buildLetterHeader(d.refNumber, formatDate(d.date))}
    <div style="flex:1;display:flex;flex-direction:column;gap:14px;font-size:11.5px;line-height:1.5;color:#111827;">
      <div style="text-align:center;font-weight:700;font-size:15px;text-decoration:underline;text-transform:uppercase;margin:4px 0;">EXPERIENCE CERTIFICATE</div>
      <p style="margin:0;text-align:justify;">
        This is to certify that <strong>${df("candidateName", d.candidateName)}</strong>
        worked as an "<strong>${df("workPosition", d.workPosition)}</strong>"
        in our company from <strong>${df("dateOfJoining", formatDate(d.dateOfJoining))}</strong>
        to <strong>${df("dateOfRelieving", formatDate(d.dateOfRelieving))}</strong>
        with our entire satisfaction. During this working period, we found
        <span data-field="pronounHim">${him}</span>
        to be a sincere, honest, hardworking, dedicated employee with a professional attitude and very good job knowledge.
      </p>
      <p style="margin:0;">
        <span data-field="pronounHis">${His}</span> basic pay is
        <strong>Rs.&nbsp;${df("basicPay", d.basicPay)}</strong> only.
      </p>
      <div style="border:1px solid #d1d5db;padding:12px;border-radius:6px;background:#f9fafb;">
        <div style="font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:8px;">Employee Summary:</div>
        ${summaryRows}
      </div>
      <p style="margin:0;">We wish <span data-field="pronounHim2">${him}</span> all success in future endeavors.</p>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;">
        <div><p style="margin:0;">For</p><p style="margin:0;font-weight:700;">FISTO TECH PRIVATE LIMITED</p></div>
        ${SIG_HTML}
      </div>
    </div>
    ${FOOTER_HTML}`;
};

export const buildIncHTML = (d) => `
  ${buildLetterHeader(d.refNumber, formatDate(d.date))}
  <div style="flex:1;display:flex;flex-direction:column;gap:12px;font-size:11.5px;line-height:1.5;color:#111827;">
    <div style="text-align:center;font-weight:700;font-size:15px;text-decoration:underline;text-transform:uppercase;margin:4px 0;">INCREMENT LETTER</div>
    <p style="font-weight:700;font-size:13px;text-transform:uppercase;margin:0;">To,<br>${df("candidateName", d.candidateName)}</p>
    <p style="color:#374151;white-space:pre-wrap;line-height:1.3;margin:0;">${df("address", d.address)}</p>
    <p style="margin:0;font-weight:500;">Dear ${df("candidateName2", d.candidateName)},</p>
    <p style="margin:0;text-align:justify;">
      In appreciation of your performance and contribution to the company, we are pleased to revise your salary as
      "<strong style="color:#111827;">${df("designation", d.designation)}</strong>"
      with effect from <strong>${df("effectiveDate", formatDate(d.effectiveDate))}</strong>.
    </p>
    <div style="border:1px solid #d1d5db;padding:12px;border-radius:6px;background:#f9fafb;">
      <div style="font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:8px;">Revised Compensation Structure:</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        <div><span style="color:#4b5563;">Current Monthly Salary:</span> <strong>INR ${df("currentSalary", d.currentSalary)}</strong></div>
        <div><span style="color:#4b5563;">Revised Monthly Salary:</span> <strong style="color:#16a34a;">INR ${df("revisedSalary", d.revisedSalary)}</strong></div>
        <div><span style="color:#4b5563;">Revised CTC (Annual):</span> <strong style="color:#2563eb;">INR ${df("revisedCtc", d.revisedCtc)}</strong></div>
      </div>
    </div>
    <p style="margin:0;">All other terms and conditions of your employment contract remain unchanged.</p>
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;">
      <div><p style="margin:0;">Sincerely,</p><p style="margin:0;font-weight:700;">FISTO TECH PRIVATE LIMITED</p></div>
      ${SIG_HTML}
    </div>
  </div>
  ${FOOTER_HTML}`;

export const buildPayslipHTML = (d) => {
  const basic = Number(d.basic) || 0;
  const hra = Number(d.hra) || 0;
  const da = Number(d.da) || 0;
  const conv = Number(d.conveyance) || 0;
  const med = Number(d.medical) || 0;
  const spec = Number(d.specialAllowance) || 0;
  const gross = basic + hra + da + conv + med + spec;

  const pf = Number(d.pf) || 0;
  const esi = Number(d.esi) || 0;
  const pt = Number(d.pt) || 0;
  const tds = Number(d.tds) || 0;
  const leave = Number(d.leaveDeduction) || 0;
  const totalDed = pf + esi + pt + tds + leave;

  const net = Math.max(0, gross - totalDed);

  return `
    <div style="width:100%;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:12px;">
      <div>
        <div style="font-weight:800;font-size:16px;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">FISTO TECH PRIVATE LIMITED</div>
        <div style="font-size:9px;color:#4b5563;margin-top:2px;">PAYSLIP FOR THE MONTH OF <span style="font-weight:700;color:#111827;">${df("monthYear", d.monthYear.toUpperCase())}</span></div>
      </div>
      <img src="${fistoLogo}" alt="Fisto" style="height:32px;object-fit:contain;">
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:10px;font-size:11px;color:#111827;">
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px;background:#f8fafc;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div><span style="color:#64748b;font-weight:600;">Employee ID:</span> <strong>${df("employeeId", d.employeeId)}</strong></div>
        <div><span style="color:#64748b;font-weight:600;">Employee Name:</span> <strong>${df("employeeName", d.employeeName)}</strong></div>
        <div><span style="color:#64748b;font-weight:600;">Designation:</span> <strong>${df("designation", d.designation)}</strong></div>
        <div><span style="color:#64748b;font-weight:600;">Department:</span> <strong>${df("department", d.department)}</strong></div>
        <div><span style="color:#64748b;font-weight:600;">Working / Paid Days:</span> <strong>${df("workingDays", d.workingDays)} / ${df("paidDays", d.paidDays)}</strong></div>
        <div><span style="color:#64748b;font-weight:600;">LOP Days:</span> <strong>${df("lop", d.lop)}</strong></div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:10.5px;">
        <thead>
          <tr style="background:#e2e8f0;color:#1e293b;">
            <th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">EARNINGS</th>
            <th style="border:1px solid #cbd5e1;padding:6px;text-align:right;">AMOUNT (₹)</th>
            <th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">DEDUCTIONS</th>
            <th style="border:1px solid #cbd5e1;padding:6px;text-align:right;">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Basic Salary</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("basic", basic)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Provident Fund (PF)</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("pf", pf)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">House Rent Allowance (HRA)</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("hra", hra)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">ESI</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("esi", esi)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Dearness Allowance (DA)</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("da", da)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Professional Tax (PT)</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("pt", pt)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Conveyance</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("conveyance", conv)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">TDS / Income Tax</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("tds", tds)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Medical Allowance</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("medical", med)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Leave Deduction</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("leaveDeduction", leave)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">Special Allowance</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${df("specialAllowance", spec)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">-</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">-</td>
          </tr>
          <tr style="font-weight:700;background:#f1f5f9;">
            <td style="border:1px solid #cbd5e1;padding:6px;">GROSS EARNINGS</td>
            <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;color:#16a34a;">${df("grossEarnings", gross)}</td>
            <td style="border:1px solid #cbd5e1;padding:6px;">TOTAL DEDUCTIONS</td>
            <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;color:#dc2626;">${df("totalDeductions", totalDed)}</td>
          </tr>
        </tbody>
      </table>

      <div style="border:1.5px solid #2563eb;background:#eff6ff;border-radius:6px;padding:8px;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span style="font-weight:700;font-size:12px;color:#1e3a8a;">NET SALARY PAYABLE</span>
        <span style="font-weight:800;font-size:14px;color:#1d4ed8;">₹ ${df("netSalary", net.toLocaleString("en-IN"))}</span>
      </div>

      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;">
        <div><p style="margin:0;">Employer Signature</p><p style="margin:0;font-weight:700;">FISTO TECH PRIVATE LIMITED</p></div>
        ${SIG_HTML}
      </div>
    </div>
    ${FOOTER_HTML}`;
};

export const buildLedgerRowsHTML = (items) => {
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = items
    .map((item) => {
      const d = Number(item.debit) || 0;
      const c = Number(item.credit) || 0;
      totalDebit += d;
      totalCredit += c;

      return `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;">${formatDate(item.date)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;">${item.voucher || ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;">${item.particulars || ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${d > 0 ? d : ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${c > 0 ? c : ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;font-weight:600;">${item.balance || ""}</td>
      </tr>`;
    })
    .join("");

  return `
    ${rows}
    <tr style="font-weight:700;background:#f1f5f9;">
      <td colspan="3" style="border:1px solid #cbd5e1;padding:6px;text-align:right;">TOTAL:</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;color:#2563eb;">${totalDebit}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;color:#dc2626;">${totalCredit}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">-</td>
    </tr>`;
};

export const buildLedgerHTML = (d) => `
  <div style="width:100%;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;">
    <div>
      <div style="font-weight:800;font-size:16px;color:#0f172a;text-transform:uppercase;">FISTO TECH PRIVATE LIMITED</div>
      <div style="font-size:10px;color:#475569;">GENERAL LEDGER STATEMENT - ${df("financialYear", d.financialYear)}</div>
    </div>
    <img src="${fistoLogo}" alt="Fisto" style="height:32px;object-fit:contain;">
  </div>
  <div style="flex:1;display:flex;flex-direction:column;gap:8px;font-size:11px;color:#111827;">
    <div style="border:1px solid #cbd5e1;padding:6px 8px;border-radius:6px;background:#f8fafc;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
      <div><span style="color:#64748b;">Ledger Name:</span> <strong>${df("ledgerName", d.ledgerName)}</strong></div>
      <div><span style="color:#64748b;">Account Type:</span> <strong>${df("accountType", d.accountType)}</strong></div>
      <div><span style="color:#64748b;">Statement Date:</span> <strong>${df("date", formatDate(d.date))}</strong></div>
      <div><span style="color:#64748b;">Page No:</span> <strong>${df("pageNo", d.pageNo)}</strong></div>
    </div>

    <table className="ledger-table" style="width:100%;border-collapse:collapse;margin:4px 0;font-size:10px;">
      <thead>
        <tr style="background:#0f172a;color:#ffffff;">
          <th style="border:1px solid #334155;padding:5px;">DATE</th>
          <th style="border:1px solid #334155;padding:5px;">VOUCHER</th>
          <th style="border:1px solid #334155;padding:5px;">PARTICULARS</th>
          <th style="border:1px solid #334155;padding:5px;text-align:right;">DEBIT (₹)</th>
          <th style="border:1px solid #334155;padding:5px;text-align:right;">CREDIT (₹)</th>
          <th style="border:1px solid #334155;padding:5px;text-align:right;">BALANCE (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${buildLedgerRowsHTML(d.items || [])}
      </tbody>
    </table>

    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <p style="margin:0;font-size:10px;color:#475569;">Prepared By: <strong>${df("preparedBy", d.preparedBy)}</strong></p>
        <p style="margin:0;font-size:10px;color:#475569;">Reviewed By: <strong>${df("reviewedBy", d.reviewedBy)}</strong></p>
      </div>
      ${SIG_HTML}
    </div>
  </div>
  ${FOOTER_HTML}`;

export const buildDocHTML = (tab, data) => {
  switch (tab) {
    case "offer":
      return buildOfferHTML(data.offerData);
    case "experience":
      return buildExpHTML(data.expData);
    case "increment":
      return buildIncHTML(data.incData);
    case "payslip":
      return buildPayslipHTML(data.payslipData);
    case "ledger":
      return buildLedgerHTML(data.ledgerData);
    default:
      return "";
  }
};

export const syncDrawerToDoc = (container, tab, data) => {
  if (!container) return;
  const updateText = (field, val) => {
    const el = container.querySelector(`[data-field="${field}"]`);
    if (el) el.textContent = val ?? "";
  };

  if (tab === "offer") {
    const d = data.offerData;
    updateText("refNumber", d.refNumber);
    updateText("date", formatDate(d.date));
    updateText("candidateName", d.candidateName);
    updateText("candidateName2", d.candidateName);
    updateText("address", d.address);
    updateText("designation", d.designation);
    updateText("joiningDate", formatDate(d.joiningDate));
    updateText("salary", d.salary);
    updateText("salaryWords", d.salaryWords);
    updateText("probationMonths", d.probationMonths);
    updateText("noticePeriod", d.noticePeriod);
  } else if (tab === "experience") {
    const d = data.expData;
    const isFemale = d.gender === "Female";
    updateText("refNumber", d.refNumber);
    updateText("date", formatDate(d.date));
    updateText("candidateName", d.candidateName);
    updateText("workPosition", d.workPosition);
    updateText("dateOfJoining", formatDate(d.dateOfJoining));
    updateText("dateOfRelieving", formatDate(d.dateOfRelieving));
    updateText("experience", d.experience);
    updateText("basicPay", d.basicPay);
    updateText("pronounHim", isFemale ? "her" : "him");
    updateText("pronounHim2", isFemale ? "her" : "him");
    updateText("pronounHis", isFemale ? "Her" : "His");
  } else if (tab === "increment") {
    const d = data.incData;
    updateText("refNumber", d.refNumber);
    updateText("date", formatDate(d.date));
    updateText("candidateName", d.candidateName);
    updateText("candidateName2", d.candidateName);
    updateText("address", d.address);
    updateText("designation", d.designation);
    updateText("effectiveDate", formatDate(d.effectiveDate));
    updateText("currentSalary", d.currentSalary);
    updateText("revisedSalary", d.revisedSalary);
    updateText("revisedCtc", d.revisedCtc);
  } else if (tab === "payslip") {
    const d = data.payslipData;
    const basic = Number(d.basic) || 0;
    const hra = Number(d.hra) || 0;
    const da = Number(d.da) || 0;
    const conv = Number(d.conveyance) || 0;
    const med = Number(d.medical) || 0;
    const spec = Number(d.specialAllowance) || 0;
    const gross = basic + hra + da + conv + med + spec;

    const pf = Number(d.pf) || 0;
    const esi = Number(d.esi) || 0;
    const pt = Number(d.pt) || 0;
    const tds = Number(d.tds) || 0;
    const leave = Number(d.leaveDeduction) || 0;
    const totalDed = pf + esi + pt + tds + leave;

    const net = Math.max(0, gross - totalDed);

    updateText("financialYear", d.financialYear);
    updateText("monthYear", d.monthYear.toUpperCase());
    updateText("employeeId", d.employeeId);
    updateText("employeeName", d.employeeName);
    updateText("designation", d.designation);
    updateText("department", d.department);
    updateText("workingDays", d.workingDays);
    updateText("paidDays", d.paidDays);
    updateText("lop", d.lop);

    updateText("basic", basic);
    updateText("hra", hra);
    updateText("da", da);
    updateText("conveyance", conv);
    updateText("medical", med);
    updateText("specialAllowance", spec);

    updateText("pf", pf);
    updateText("esi", esi);
    updateText("pt", pt);
    updateText("tds", tds);
    updateText("leaveDeduction", leave);

    updateText("grossEarnings", gross);
    updateText("totalDeductions", totalDed);
    updateText("netSalary", net.toLocaleString("en-IN"));
  } else if (tab === "ledger") {
    const d = data.ledgerData;
    updateText("financialYear", d.financialYear);
    updateText("ledgerName", d.ledgerName);
    updateText("accountType", d.accountType);
    updateText("date", formatDate(d.date));
    updateText("preparedBy", d.preparedBy);
    updateText("reviewedBy", d.reviewedBy);
    updateText("pageNo", d.pageNo);
  }
};
