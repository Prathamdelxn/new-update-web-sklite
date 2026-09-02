// =============================================================================
// Sky-Lite Web — Weekly Progress Report (WPR) PDF Generator
// Generates executive WPR sheets matching the official SkyStruct Lite design.
// =============================================================================

export interface WPRData {
  _id?: string;
  weekStart: string | Date;
  weekEnd: string | Date;
  completedActivities?: string[];
  delayedActivities?: string[];
  risks?: string[];
  nextWeekPlan?: string[];
  submittedBy?: any;
  createdAt?: string | Date;
}

export function generateWprHtml(report: WPRData, project?: any): string {
  const projectName = project?.name || 'Site Project';
  const clientName = project?.clientName || project?.client?.name || 'Valued Client';
  const location = project?.location || 'Site Location';

  let startDateFormatted = '';
  let endDateFormatted = '';
  if (report.weekStart) {
    const s = new Date(report.weekStart);
    if (!isNaN(s.getTime())) {
      startDateFormatted = `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}/${s.getFullYear()}`;
    }
  }
  if (report.weekEnd) {
    const e = new Date(report.weekEnd);
    if (!isNaN(e.getTime())) {
      endDateFormatted = `${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}/${e.getFullYear()}`;
    }
  }

  const completedList = report.completedActivities || [];
  const delayedList = report.delayedActivities || [];
  const risksList = report.risks || [];
  const nextPlanList = report.nextWeekPlan || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>WPR - ${projectName} (${startDateFormatted} to ${endDateFormatted})</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          padding: 10px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          position: relative;
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 76px;
          font-weight: 900;
          color: #0f172a;
          opacity: 0.038;
          letter-spacing: 8px;
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .wpr-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
        }
        .header-table td {
          border: 1px solid #0f172a;
          vertical-align: middle;
        }
        .logo-col {
          width: 30%;
          padding: 8px 10px;
          background: #fafafa;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brand-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0f172a;
          line-height: 1.1;
        }
        .brand-slogan {
          font-size: 6.5px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .title-col {
          width: 42%;
          text-align: center;
          padding: 8px 6px;
        }
        .main-title {
          font-size: 13.5px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #0f172a;
          text-transform: uppercase;
        }
        .date-col {
          width: 28%;
          padding: 8px 10px;
          font-size: 9.5px;
          font-weight: 700;
          background: #fafafa;
          text-align: right;
        }
        .project-meta-bar {
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 600;
          background: #f8fafc;
          border-bottom: 1px solid #0f172a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .project-name {
          font-weight: 800;
          color: #0f172a;
        }
        .meta-tag {
          color: #64748b;
          font-size: 9px;
        }
        .sec-title {
          font-size: 10.5px;
          font-weight: 800;
          padding: 5px 8px;
          border-top: 1.5px solid #0f172a;
          border-bottom: 1px solid #cbd5e1;
          background: linear-gradient(90deg, #f1f5f9 0%, #ffffff 100%);
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sec-title::before {
          content: "";
          display: inline-block;
          width: 3px;
          height: 11px;
          background-color: #2563eb;
          border-radius: 2px;
        }
        .content-box {
          padding: 8px 12px;
          font-size: 9.5px;
          line-height: 1.5;
          color: #1e293b;
          min-height: 48px;
        }
        .item-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .item-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 3px 0;
          border-bottom: 1px dashed #f1f5f9;
        }
        .item-row:last-child {
          border-bottom: none;
        }
        .bullet-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1.5px solid #0f172a;
          background: #f8fafc;
        }
        .sign-col {
          padding: 12px 10px 8px 10px;
          text-align: center;
          border-right: 1px solid #cbd5e1;
        }
        .sign-col:last-child {
          border-right: none;
        }
        .sign-line {
          width: 80%;
          margin: 18px auto 4px auto;
          border-bottom: 1px dashed #94a3b8;
        }
        .sign-title {
          font-size: 9px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">SKYSTRUCT LITE</div>

      <div class="wpr-container">
        <!-- HEADER TABLE -->
        <table class="header-table">
          <tr>
            <td class="logo-col">
              <div class="logo-box">
                <div class="brand-pill">SS</div>
                <div class="brand-text">
                  <span class="brand-name">SkyStruct Lite</span>
                  <span class="brand-slogan">Design • Build • Inspire</span>
                </div>
              </div>
            </td>
            <td class="title-col">
              <div class="main-title">WEEKLY PROGRESS REPORT</div>
            </td>
            <td class="date-col">
              <span style="color: #64748b;">PERIOD:</span><br/>
              <span style="font-weight: 800; color: #0f172a;">${startDateFormatted} - ${endDateFormatted}</span>
            </td>
          </tr>
        </table>

        <!-- PROJECT META ROW -->
        <div class="project-meta-bar">
          <div>
            <span class="meta-tag">PROJECT:</span> <span class="project-name">${projectName}</span>
          </div>
          <div>
            <span class="meta-tag">CLIENT:</span> <span style="font-weight: 700; color: #0f172a;">${clientName}</span>
            <span style="margin: 0 6px; color: #cbd5e1;">|</span>
            <span class="meta-tag">LOCATION:</span> <span style="font-weight: 700; color: #0f172a;">${location}</span>
          </div>
        </div>

        <!-- 1. COMPLETED ACTIVITIES -->
        <div class="sec-title" style="border-top: none;">1. Completed Activities & Milestones</div>
        <div class="content-box">
          ${completedList.length === 0 ? (
            '<span style="color: #94a3b8; font-style: italic;">No specific tasks finalized in this weekly cycle. Ongoing execution underway.</span>'
          ) : (
            `<ul class="item-list">
              ${completedList.map((item) => `
                <li class="item-row">
                  <span class="bullet-dot" style="background-color: #10b981;"></span>
                  <span style="font-weight: 500; color: #0f172a;">${item}</span>
                </li>
              `).join('')}
            </ul>`
          )}
        </div>

        <!-- 2. DELAYED TASKS & CRITICAL BLOCKERS -->
        <div class="sec-title">2. Delayed Tasks & Milestone Deviations</div>
        <div class="content-box">
          ${delayedList.length === 0 ? (
            '<span style="color: #10b981; font-weight: 600;">✓ Zero milestone delays logged. Project timeline strictly adheres to baseline schedule.</span>'
          ) : (
            `<ul class="item-list">
              ${delayedList.map((item) => `
                <li class="item-row">
                  <span class="bullet-dot" style="background-color: #ef4444;"></span>
                  <span style="font-weight: 600; color: #b91c1c;">${item}</span>
                </li>
              `).join('')}
            </ul>`
          )}
        </div>

        <!-- 3. IDENTIFIED RISKS -->
        <div class="sec-title">3. Identified Project Risks & Quality Concerns</div>
        <div class="content-box">
          ${risksList.length === 0 ? (
            '<span style="color: #10b981; font-weight: 600;">✓ No critical risks flagged. Site operations running smoothly without material or execution bottlenecks.</span>'
          ) : (
            `<ul class="item-list">
              ${risksList.map((item) => `
                <li class="item-row">
                  <span class="bullet-dot" style="background-color: #f59e0b;"></span>
                  <span style="font-weight: 500; color: #b45309;">${item}</span>
                </li>
              `).join('')}
            </ul>`
          )}
        </div>

        <!-- 4. NEXT WEEK TARGETS -->
        <div class="sec-title">4. Next Week Planned Target Scope</div>
        <div class="content-box">
          ${nextPlanList.length === 0 ? (
            '<span style="color: #94a3b8; font-style: italic;">Next week targets scheduled according to master project timeline.</span>'
          ) : (
            `<ul class="item-list">
              ${nextPlanList.map((item) => `
                <li class="item-row">
                  <span class="bullet-dot" style="background-color: #3b82f6;"></span>
                  <span style="font-weight: 500; color: #1d4ed8;">${item}</span>
                </li>
              `).join('')}
            </ul>`
          )}
        </div>

        <!-- EXECUTIVE SIGNATURES SECTION -->
        <div class="signatures-grid">
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">Prepared By (Site Engineer)</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">Verified By (Project Manager)</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">Approved By (Client / Consultant)</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function downloadWprPdf(report: WPRData, project?: any): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const html = generateWprHtml(report, project);

  const projectName = project?.name || 'Project';
  const cleanName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');

  let dateStr = 'Weekly_Report';
  if (report.weekStart) {
    const s = new Date(report.weekStart);
    if (!isNaN(s.getTime())) {
      dateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
    }
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const opt = {
    margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
    filename: `WPR_${cleanName}_${dateStr}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2.5, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

export function printWpr(report: WPRData, project?: any): void {
  const html = generateWprHtml(report, project);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }
}
