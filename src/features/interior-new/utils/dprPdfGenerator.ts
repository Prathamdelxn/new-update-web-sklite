// =============================================================================
// Sky-Lite Web — Daily Progress Report (DPR) PDF Generator
// Generates official DPR sheets matching the standard SkyStruct Creations format.
// =============================================================================

export interface DPRData {
  _id?: string;
  date: string | Date;
  weather?: string;
  projectName?: string;
  labourReports?: Array<{
    agencyActivity?: string;
    skilled?: number | string;
    unskilled?: number | string;
    currentWork?: string;
    statusAsPerBarChart?: string;
  }>;
  materialReceipts?: Array<{
    supplierName?: string;
    challanNo?: string;
    receiptNo?: string;
    materialDetails?: string;
    uom?: string;
    qty?: number | string;
  }>;
  tomorrowPlanning?: Array<{
    agencyActivity?: string;
    skilled?: number | string;
    unskilled?: number | string;
    targetedWorks?: string;
    remarkConcern?: string;
  }>;
  materialRequirements?: Array<{
    materialDescription?: string;
    uom?: string;
    qty?: number | string;
  }>;
  siteInstructions?: string;
  // Legacy / fallback arrays
  manpower?: Array<{
    trade?: string;
    count?: number;
    contractor?: string;
  }>;
  activities?: Array<{
    category?: string;
    description?: string;
    plannedProgress?: number;
    actualProgress?: number;
    remarks?: string;
  }>;
}

export function generateDprHtml(dpr: DPRData, project?: any): string {
  const projectName = project?.name || (typeof dpr.projectName === 'string' ? dpr.projectName : '') || 'Site Project';
  const clientName = project?.clientName || project?.client?.name || 'Valued Client';
  const location = project?.location || 'Site Location';
  
  let formattedDate = '';
  if (dpr.date) {
    const d = new Date(dpr.date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    }
  }

  // Normalize Labour Reports (Support new structured array & legacy manpower/activities)
  let labourRows = dpr.labourReports && dpr.labourReports.length > 0
    ? [...dpr.labourReports]
    : [];

  if (labourRows.length === 0) {
    if (dpr.activities && dpr.activities.length > 0) {
      labourRows = dpr.activities.map((act, i) => {
        const mp = dpr.manpower && dpr.manpower[i];
        return {
          agencyActivity: mp ? `${mp.contractor ? mp.contractor + ' - ' : ''}${mp.trade || act.category}` : act.category,
          skilled: mp ? mp.count : '',
          unskilled: '',
          currentWork: act.description,
          statusAsPerBarChart: act.actualProgress !== undefined ? `${act.actualProgress}%` : (act.plannedProgress ? `Target ${act.plannedProgress}%` : ''),
        };
      });
    } else if (dpr.manpower && dpr.manpower.length > 0) {
      labourRows = dpr.manpower.map((mp) => ({
        agencyActivity: `${mp.contractor ? mp.contractor + ' - ' : ''}${mp.trade}`,
        skilled: mp.count,
        unskilled: '',
        currentWork: 'Daily site task',
        statusAsPerBarChart: 'In Progress',
      }));
    }
  }

  // Ensure minimum 8 rows for Labour section
  const totalLabourRows = Math.max(8, labourRows.length);
  const paddedLabourRows = Array.from({ length: totalLabourRows }, (_, i) => labourRows[i] || {});

  // Material Receipts (min 4 rows)
  const materialReceipts = dpr.materialReceipts && dpr.materialReceipts.length > 0
    ? [...dpr.materialReceipts]
    : [];
  const totalMaterialReceiptRows = Math.max(4, materialReceipts.length);
  const paddedMaterialReceipts = Array.from({ length: totalMaterialReceiptRows }, (_, i) => materialReceipts[i] || {});

  // Tomorrow's Planning (min 4 rows)
  const tomorrowPlanning = dpr.tomorrowPlanning && dpr.tomorrowPlanning.length > 0
    ? [...dpr.tomorrowPlanning]
    : [];
  const totalTomorrowRows = Math.max(4, tomorrowPlanning.length);
  const paddedTomorrowPlanning = Array.from({ length: totalTomorrowRows }, (_, i) => tomorrowPlanning[i] || {});

  // Material Requirements (min 6 items split into 2 sets of 3)
  const materialRequirements = dpr.materialRequirements && dpr.materialRequirements.length > 0
    ? [...dpr.materialRequirements]
    : [];
  const totalRequirementSlots = Math.max(6, Math.ceil(materialRequirements.length / 2) * 2);
  const paddedMaterialReqs = Array.from({ length: totalRequirementSlots }, (_, i) => materialRequirements[i] || {});
  const halfCount = Math.max(3, Math.ceil(paddedMaterialReqs.length / 2));
  const leftMaterialReqs = paddedMaterialReqs.slice(0, halfCount);
  const rightMaterialReqs = paddedMaterialReqs.slice(halfCount, halfCount * 2);

  // Minutes of Meeting (MOM) / Directives
  const momData = dpr.siteInstructions || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>DPR - ${projectName} - ${formattedDate}</title>
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
        .dpr-container {
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
        .table-grid {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .table-grid th, .table-grid td {
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          font-size: 9.5px;
          color: #1e293b;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .table-grid th {
          font-weight: 700;
          text-align: center;
          background-color: #f8fafc;
          color: #0f172a;
          text-transform: uppercase;
          font-size: 8.5px;
          letter-spacing: 0.3px;
        }
        .sec-title {
          font-size: 10.5px;
          font-weight: 800;
          padding: 4px 8px;
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
          width: 44%;
          text-align: center;
          padding: 8px 6px;
        }
        .main-title {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #0f172a;
          text-transform: uppercase;
        }
        .date-col {
          width: 26%;
          padding: 8px 10px;
          font-size: 10px;
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
          font-size: 9.5px;
        }
        .text-center {
          text-align: center;
        }
        .text-left {
          text-align: left;
        }
        .row-cell {
          height: 18px;
          font-size: 9px;
        }
        .row-cell:nth-child(even) {
          background-color: #fbfcfe;
        }
        .mom-box {
          min-height: 52px;
          padding: 8px 10px;
          font-size: 9.5px;
          line-height: 1.45;
          color: #1e293b;
          word-break: break-word;
          background: #ffffff;
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

      <div class="dpr-container">
        <!-- TOP HEADER -->
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
              <div class="main-title">DAILY PROGRESS REPORT</div>
            </td>
            <td class="date-col">
              <span style="color: #64748b;">DATE:</span> <span style="font-weight: 800; color: #0f172a;">${formattedDate}</span>
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
            <span class="meta-tag">WEATHER:</span> <span style="font-weight: 700; color: #0f172a;">${dpr.weather || 'Clear / Sunny'}</span>
          </div>
        </div>

        <!-- 1. LABOUR REPORT & ONGOING WORK STATUS -->
        <div class="sec-title" style="border-top: none;">1. Labour Report & Ongoing Work Status</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
              <th rowspan="2" style="width: 28%;">Agency - Activity</th>
              <th colspan="2" style="width: 15%;">Manpower</th>
              <th colspan="2" style="width: 52%;">Work Status</th>
            </tr>
            <tr>
              <th style="width: 7.5%;">Skilled</th>
              <th style="width: 7.5%;">Unskilled</th>
              <th style="width: 32%;">Current Ongoing Work</th>
              <th style="width: 20%;">Status as per Bar Chart</th>
            </tr>
          </thead>
          <tbody>
            ${paddedLabourRows.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="font-weight: 500;">${row.agencyActivity || ''}</td>
                <td class="text-center">${row.skilled !== undefined && row.skilled !== null ? row.skilled : ''}</td>
                <td class="text-center">${row.unskilled !== undefined && row.unskilled !== null ? row.unskilled : ''}</td>
                <td>${row.currentWork || ''}</td>
                <td style="font-weight: 600; color: #2563eb;">${row.statusAsPerBarChart || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 2. MATERIAL RECEIPT DETAILS -->
        <div class="sec-title">2. Material Receipt Details</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th style="width: 5%;">Sr.<br/>No.</th>
              <th style="width: 25%;">Name of Supplier</th>
              <th style="width: 12%;">Delivery<br/>Challan No</th>
              <th style="width: 12%;">Material<br/>Receipt No</th>
              <th style="width: 30%;">Material Details</th>
              <th style="width: 8%;">UOM</th>
              <th style="width: 8%;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${paddedMaterialReceipts.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td>${row.supplierName || ''}</td>
                <td class="text-center font-mono">${row.challanNo || ''}</td>
                <td class="text-center font-mono">${row.receiptNo || ''}</td>
                <td style="font-weight: 500;">${row.materialDetails || ''}</td>
                <td class="text-center">${row.uom || ''}</td>
                <td class="text-center" style="font-weight: 700;">${row.qty !== undefined && row.qty !== null ? row.qty : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 3. TOMORROW'S PLANNING -->
        <div class="sec-title">3. Tomorrow's Planning</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
              <th rowspan="2" style="width: 28%;">Agency - Activity</th>
              <th colspan="2" style="width: 15%;">Manpower<br/>Requirement</th>
              <th rowspan="2" style="width: 32%;">Targeted Works</th>
              <th rowspan="2" style="width: 20%;">Remark / Concern</th>
            </tr>
            <tr>
              <th style="width: 7.5%;">Skilled</th>
              <th style="width: 7.5%;">Unskilled</th>
            </tr>
          </thead>
          <tbody>
            ${paddedTomorrowPlanning.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="font-weight: 500;">${row.agencyActivity || ''}</td>
                <td class="text-center">${row.skilled !== undefined && row.skilled !== null ? row.skilled : ''}</td>
                <td class="text-center">${row.unskilled !== undefined && row.unskilled !== null ? row.unskilled : ''}</td>
                <td>${row.targetedWorks || ''}</td>
                <td style="color: #475569;">${row.remarkConcern || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 4. MATERIAL REQUIREMENT -->
        <div class="sec-title">4. Material Requirement / Indents</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th style="width: 5%;">Sr.</th>
              <th style="width: 29%;">Material Description</th>
              <th style="width: 8%;">UOM</th>
              <th style="width: 8%;">Qty</th>
              <th style="width: 5%;">Sr.</th>
              <th style="width: 29%;">Material Description</th>
              <th style="width: 8%;">UOM</th>
              <th style="width: 8%;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${leftMaterialReqs.map((leftRow, idx) => {
              const rightRow = rightMaterialReqs[idx] || {};
              const leftIndex = idx + 1;
              const rightIndex = idx + 1 + halfCount;
              return `
                <tr class="row-cell">
                  <td class="text-center" style="font-weight: 600; color: #64748b;">${leftIndex}</td>
                  <td style="font-weight: 500;">${leftRow.materialDescription || ''}</td>
                  <td class="text-center">${leftRow.uom || ''}</td>
                  <td class="text-center" style="font-weight: 700;">${leftRow.qty !== undefined && leftRow.qty !== null ? leftRow.qty : ''}</td>
                  <td class="text-center" style="font-weight: 600; color: #64748b;">${rightIndex}</td>
                  <td style="font-weight: 500;">${rightRow.materialDescription || ''}</td>
                  <td class="text-center">${rightRow.uom || ''}</td>
                  <td class="text-center" style="font-weight: 700;">${rightRow.qty !== undefined && rightRow.qty !== null ? rightRow.qty : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- 5. MINUTES OF MEETING (MOM) -->
        <div class="sec-title">5. Minutes of Meeting (MOM) & Site Directives</div>
        <div class="mom-box">
          ${momData ? momData.replace(/\n/g, '<br/>') : '<span style="color: #94a3b8; font-style: italic;">No specific Minutes of Meeting recorded for this date. Site progress execution conforms to active baseline schedule.</span>'}
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
            <div class="sign-title">Approved By (Client / Architect)</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function downloadDprPdf(dpr: DPRData, project?: any): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const html = generateDprHtml(dpr, project);

  const projectName = project?.name || (typeof dpr.projectName === 'string' ? dpr.projectName : '') || 'Project';
  const cleanName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  let dateStr = 'Report';
  if (dpr.date) {
    const d = new Date(dpr.date);
    if (!isNaN(d.getTime())) {
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const opt = {
    margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
    filename: `DPR_${cleanName}_${dateStr}.pdf`,
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

export function printDpr(dpr: DPRData, project?: any): void {
  const html = generateDprHtml(dpr, project);
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
