// =============================================================================
// Sky-Lite Web — Daily Progress Report (DPR) PDF Generator
// Generates official DPR sheets matching the standard Veelee Creations format.
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

  // Ensure minimum 10 rows for Labour section
  const totalLabourRows = Math.max(10, labourRows.length);
  const paddedLabourRows = Array.from({ length: totalLabourRows }, (_, i) => labourRows[i] || {});

  // Material Receipts (min 5 rows)
  const materialReceipts = dpr.materialReceipts && dpr.materialReceipts.length > 0
    ? [...dpr.materialReceipts]
    : [];
  const totalMaterialReceiptRows = Math.max(5, materialReceipts.length);
  const paddedMaterialReceipts = Array.from({ length: totalMaterialReceiptRows }, (_, i) => materialReceipts[i] || {});

  // Tomorrow's Planning (min 5 rows)
  const tomorrowPlanning = dpr.tomorrowPlanning && dpr.tomorrowPlanning.length > 0
    ? [...dpr.tomorrowPlanning]
    : [];
  const totalTomorrowRows = Math.max(5, tomorrowPlanning.length);
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

  // Site Instructions / MOMs
  const siteInstructions = dpr.siteInstructions || (dpr.activities?.map(a => a.remarks).filter(Boolean).join('; ') || '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>DPR - ${projectName} - ${formattedDate}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
          background-color: #ffffff;
          padding: 8px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .dpr-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #000000;
          background: #ffffff;
        }
        .table-grid {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .table-grid th, .table-grid td {
          border: 1px solid #000000;
          padding: 3px 4px;
          font-size: 10px;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .table-grid th {
          font-weight: 700;
          text-align: center;
          background-color: #ffffff;
        }
        .sec-title {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 6px;
          border-top: 1.5px solid #000000;
          border-bottom: 1px solid #000000;
          background-color: #ffffff;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-table td {
          border: 1px solid #000000;
          vertical-align: middle;
        }
        .logo-col {
          width: 28%;
          padding: 6px 8px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .logo-symbol {
          font-size: 26px;
          font-weight: 900;
          font-family: Georgia, serif;
          line-height: 1;
          color: #000;
          display: inline-block;
          transform: scale(1.1, 1.2);
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }
        .brand-sub {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-top: 1px;
          color: #222;
        }
        .brand-slogan {
          font-size: 5.5px;
          font-weight: 800;
          letter-spacing: 0.8px;
          margin-top: 2px;
          color: #444;
        }
        .title-col {
          width: 48%;
          text-align: center;
          padding: 6px 4px;
        }
        .main-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .date-col {
          width: 24%;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 700;
        }
        .project-row {
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 700;
          border-top: 1px solid #000000;
          border-bottom: 1px solid #000000;
        }
        .project-name {
          font-weight: 600;
          margin-left: 4px;
        }
        .text-center {
          text-align: center;
        }
        .text-left {
          text-align: left;
        }
        .row-cell {
          height: 18px;
          font-size: 9.5px;
        }
        .notes-box {
          min-height: 48px;
          padding: 6px 8px;
          font-size: 9.5px;
          line-height: 1.35;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <div class="dpr-container">
        <!-- TOP HEADER -->
        <table class="header-table">
          <tr>
            <td class="logo-col">
              <div class="logo-box">
                <span class="logo-symbol">V</span>
                <div class="brand-text">
                  <span class="brand-name">VEELEE</span>
                  <span class="brand-sub">CREATIONS</span>
                  <span class="brand-slogan">DESIGN. BUILD. INSPIRE.</span>
                </div>
              </div>
            </td>
            <td class="title-col">
              <div class="main-title">DAILY PROGRESS REPORT</div>
            </td>
            <td class="date-col">
              <span>DATE :- </span><span style="font-weight: 600;">${formattedDate}</span>
            </td>
          </tr>
        </table>

        <!-- PROJECT NAME -->
        <div class="project-row">
          Name of The Project :- <span class="project-name">${projectName}</span>
        </div>

        <!-- 1. LABOUR REPORT & ONGOING WORK STATUS -->
        <div class="sec-title" style="border-top: none;">Labour Report & Ongoing Work Status</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
              <th rowspan="2" style="width: 27%;">Agency - Activity</th>
              <th colspan="2" style="width: 16%;">Manpower</th>
              <th colspan="2" style="width: 52%;">Work Status</th>
            </tr>
            <tr>
              <th style="width: 8%; font-size: 9px; padding: 2px;">Skilled</th>
              <th style="width: 8%; font-size: 9px; padding: 2px;">Unskilled</th>
              <th style="width: 32%; font-size: 9px; padding: 2px;">Current ongoing work</th>
              <th style="width: 20%; font-size: 9px; padding: 2px;">Status as per Bar Chart</th>
            </tr>
          </thead>
          <tbody>
            ${paddedLabourRows.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center">${idx + 1}</td>
                <td>${row.agencyActivity || ''}</td>
                <td class="text-center">${row.skilled !== undefined && row.skilled !== null ? row.skilled : ''}</td>
                <td class="text-center">${row.unskilled !== undefined && row.unskilled !== null ? row.unskilled : ''}</td>
                <td>${row.currentWork || ''}</td>
                <td>${row.statusAsPerBarChart || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 2. MATERIAL RECEIPT DETAILS -->
        <div class="sec-title">Material Receipt Details</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th style="width: 5%;">Sr.<br/>No.</th>
              <th style="width: 25%;">Name of Supplier</th>
              <th style="width: 12%; font-size: 8.5px; padding: 2px;">Delivery<br/>Challan<br/>No</th>
              <th style="width: 12%; font-size: 8.5px; padding: 2px;">Material<br/>Receipt<br/>No</th>
              <th style="width: 30%;">Material Details</th>
              <th style="width: 8%;">UOM</th>
              <th style="width: 8%;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${paddedMaterialReceipts.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center">${idx + 1}</td>
                <td>${row.supplierName || ''}</td>
                <td class="text-center">${row.challanNo || ''}</td>
                <td class="text-center">${row.receiptNo || ''}</td>
                <td>${row.materialDetails || ''}</td>
                <td class="text-center">${row.uom || ''}</td>
                <td class="text-center">${row.qty !== undefined && row.qty !== null ? row.qty : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 3. TOMORROW'S PLANNING -->
        <div class="sec-title">Tomorrow's Planning</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
              <th rowspan="2" style="width: 27%;">Agency - Activity</th>
              <th colspan="2" style="width: 16%;">Manpower<br/>Requirement</th>
              <th rowspan="2" style="width: 32%;">Targeted Works</th>
              <th rowspan="2" style="width: 20%;">Remark /<br/>Concern</th>
            </tr>
            <tr>
              <th style="width: 8%; font-size: 9px; padding: 2px;">Skilled</th>
              <th style="width: 8%; font-size: 9px; padding: 2px;">Unskilled</th>
            </tr>
          </thead>
          <tbody>
            ${paddedTomorrowPlanning.map((row, idx) => `
              <tr class="row-cell">
                <td class="text-center">${idx + 1}</td>
                <td>${row.agencyActivity || ''}</td>
                <td class="text-center">${row.skilled !== undefined && row.skilled !== null ? row.skilled : ''}</td>
                <td class="text-center">${row.unskilled !== undefined && row.unskilled !== null ? row.unskilled : ''}</td>
                <td>${row.targetedWorks || ''}</td>
                <td>${row.remarkConcern || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 4. MATERIAL REQUIREMENT -->
        <div class="sec-title">Material Requirement</div>
        <table class="table-grid">
          <thead>
            <tr>
              <th style="width: 5%;">Sr. No.</th>
              <th style="width: 29%;">Material Description</th>
              <th style="width: 8%;">UOM</th>
              <th style="width: 8%;">Qty</th>
              <th style="width: 5%;">Sr. No.</th>
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
                  <td class="text-center">${leftIndex}</td>
                  <td>${leftRow.materialDescription || ''}</td>
                  <td class="text-center">${leftRow.uom || ''}</td>
                  <td class="text-center">${leftRow.qty !== undefined && leftRow.qty !== null ? leftRow.qty : ''}</td>
                  <td class="text-center">${rightIndex}</td>
                  <td>${rightRow.materialDescription || ''}</td>
                  <td class="text-center">${rightRow.uom || ''}</td>
                  <td class="text-center">${rightRow.qty !== undefined && rightRow.qty !== null ? rightRow.qty : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- 5. SITE INSTRUCTIONS / MOMS -->
        <div class="sec-title">Site Instructions / MOMs</div>
        <div class="notes-box">
          ${siteInstructions ? siteInstructions.replace(/\n/g, '<br/>') : '&nbsp;'}
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
