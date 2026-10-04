// =============================================================================
// Sky-Lite Web — Ultra-Modern & Styled BOQ Excel Exporter (ExcelJS)
// Creates an executive-grade, beautifully formatted .xlsx spreadsheet with
// custom color schemes, typography, borders, badges, section headers & sign-offs
// =============================================================================

import ExcelJS from 'exceljs';

export interface ExportBoqOptions {
  lead: any;
  boqIndex: number;
  currencySymbol?: string;
  currencyCode?: string;
}

export async function exportBoqToExcel({
  lead,
  boqIndex,
  currencySymbol = 'QAR',
  currencyCode = 'QAR',
}: ExportBoqOptions) {
  if (!lead || !lead.boqs || !lead.boqs[boqIndex]) {
    console.error('BOQ data not found for export');
    return;
  }

  const boq = lead.boqs[boqIndex];
  const versionNumber = boq.version || boqIndex + 1;
  const statusLabel =
    boq.status === 'approved'
      ? 'APPROVED'
      : boq.status === 'pending_approval'
      ? 'PENDING APPROVAL'
      : boq.status === 'rejected'
      ? 'CHANGES REQUESTED'
      : 'DRAFT ESTIMATION';

  // Retrieve Organization Details
  let orgName = 'SKYSTRUCT INTERIOR ARCHITECTURE & DESIGN STUDIO';
  let orgAddress = '';
  let orgContact = '';
  let orgEmail = '';
  let orgTaxId = '';

  if (typeof window !== 'undefined') {
    try {
      const rawOrg = localStorage.getItem('interiorOrganization') || localStorage.getItem('organization');
      const rawUser = localStorage.getItem('interiorUser') || localStorage.getItem('user');

      let org: any = null;
      let user: any = null;

      if (rawOrg) {
        try { org = JSON.parse(rawOrg); } catch {}
      }
      if (rawUser) {
        try { user = JSON.parse(rawUser); } catch {}
      }

      orgName =
        org?.name ||
        org?.companyName ||
        org?.organizationName ||
        user?.organization?.name ||
        user?.organizationName ||
        orgName;

      const addr = org?.address || user?.organization?.address;
      if (addr) {
        if (typeof addr === 'string') {
          orgAddress = addr;
        } else {
          orgAddress = [addr.street, addr.city, addr.state, addr.country, addr.postalCode || addr.zipCode]
            .filter(Boolean)
            .join(', ');
        }
      }

      orgContact = org?.phone || org?.contactNumber || user?.phone || '';
      orgEmail = org?.email || user?.email || '';
      orgTaxId = org?.taxId || org?.crNumber || org?.gstNumber || org?.vatNumber || '';
    } catch (e) {
      console.warn('Could not read organization data from storage', e);
    }
  }

  // Structure sections and items
  let structuredSections: any[] = [];
  if (boq.sections && Array.isArray(boq.sections) && boq.sections.length > 0) {
    structuredSections = boq.sections.map((sec: any, idx: number) => {
      const secItems = (boq.items || []).filter(
        (it: any) =>
          it.sectionId === (sec.sectionId || sec.id) ||
          it.sectionTitle === sec.sectionTitle ||
          it.category === sec.sectionTitle
      );
      const secSubtotal = secItems.reduce(
        (sum: number, it: any) =>
          sum + (Number(it.amount) || Number(it.quantity || 0) * Number(it.rate || 0) || 0),
        0
      );
      return {
        sectionNumber: sec.sectionNumber || String(idx + 1),
        sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
        scopeDescription: sec.scopeDescription || sec.sectionScope || secItems[0]?.sectionScope || '',
        items: secItems,
        subTotal: secSubtotal,
      };
    });
  } else {
    // Group by category fallback
    const categories: string[] = Array.from(
      new Set<string>((boq.items || []).map((it: any) => (it.category || 'General Works') as string))
    );
    structuredSections = categories.map((cat, idx) => {
      const catItems = (boq.items || []).filter((it: any) => (it.category || 'General Works') === cat);
      const subTotal = catItems.reduce(
        (sum: number, it: any) =>
          sum + (Number(it.amount) || Number(it.quantity || 0) * Number(it.rate || 0) || 0),
        0
      );
      return {
        sectionNumber: String(idx + 1),
        sectionTitle: cat,
        scopeDescription: catItems[0]?.sectionScope || '',
        items: catItems,
        subTotal,
      };
    });
  }

  const grandTotal =
    boq.totalAmount ||
    structuredSections.reduce((sum, sec) => sum + sec.subTotal, 0);

  const totalItemsCount =
    boq.items?.length || structuredSections.reduce((sum, s) => sum + s.items.length, 0);
  const totalCategoriesCount = structuredSections.length;

  // Initialize ExcelJS Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = orgName;
  workbook.lastModifiedBy = 'Interior-OS';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(`BOQ v${versionNumber}`, {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 20 },
  });

  // Set precise 7-column widths (without Make/Brand)
  worksheet.columns = [
    { key: 'colA', width: 14 }, // Sr. No / Item Code
    { key: 'colB', width: 56 }, // Description & Technical Specifications
    { key: 'colC', width: 12 }, // Unit
    { key: 'colD', width: 14 }, // Quantity
    { key: 'colE', width: 18 }, // Rate
    { key: 'colF', width: 22 }, // Amount
    { key: 'colG', width: 34 }, // Remarks / Scope Notes
  ];

  // Helper styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const mediumBorderBottom: Partial<ExcelJS.Borders> = {
    ...thinBorder,
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
  };

  const doubleBorderBottom: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
  };

  let currentRow = 1;

  // =========================================================================
  // 1. BRAND HEADER BANNER
  // =========================================================================
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = orgName.toUpperCase();
  titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Sleek Slate 900
  worksheet.getRow(currentRow).height = 36;
  currentRow++;

  // Subtitle with Address, Contact, Email, Tax ID
  const subInfo = [
    orgAddress ? `📍 ${orgAddress}` : null,
    orgContact ? `📞 ${orgContact}` : null,
    orgEmail ? `✉️ ${orgEmail}` : null,
    orgTaxId ? `Tax/CR: ${orgTaxId}` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const subTitleCell = worksheet.getCell(`A${currentRow}`);
  subTitleCell.value = subInfo || 'Interior Architecture & High-End Estimations';
  subTitleCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  // Spacer
  worksheet.addRow([]);
  worksheet.getRow(currentRow).height = 8;
  currentRow++;

  // =========================================================================
  // 2. DOCUMENT TITLE & SUMMARY HERO BANNER
  // =========================================================================
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const docTitleCell = worksheet.getCell(`A${currentRow}`);
  docTitleCell.value = 'BILL OF QUANTITIES (BOQ) & ESTIMATION';
  docTitleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  docTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  const docStatusCell = worksheet.getCell(`E${currentRow}`);
  docStatusCell.value = `VERSION ${versionNumber}  •  ${statusLabel}`;
  docStatusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  docStatusCell.alignment = { horizontal: 'center', vertical: 'middle' };
  docStatusCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb:
        boq.status === 'approved'
          ? 'FF059669' // Emerald
          : boq.status === 'pending_approval'
          ? 'FFD97706' // Amber
          : boq.status === 'rejected'
          ? 'FFE11D48' // Rose
          : 'FF4F46E5', // Indigo
    },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  // Spacer
  worksheet.addRow([]);
  worksheet.getRow(currentRow).height = 6;
  currentRow++;

  // =========================================================================
  // 3. CLIENT, PROJECT & SPECIFICATION METRICS CARD
  // =========================================================================
  const cardStartRow = currentRow;

  // Header row for metadata card
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const clientCardTitle = worksheet.getCell(`A${currentRow}`);
  clientCardTitle.value = '📋  CLIENT & PROPERTY SPECIFICATIONS';
  clientCardTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  clientCardTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  clientCardTitle.alignment = { vertical: 'middle', indent: 1 };

  worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
  const summaryCardTitle = worksheet.getCell(`D${currentRow}`);
  summaryCardTitle.value = '💰  EXECUTIVE ESTIMATION SUMMARY';
  summaryCardTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  summaryCardTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  summaryCardTitle.alignment = { vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  // Row 1 of Data
  const leadCode = lead.leadCode || lead.customLeadId || (lead._id ? `LD-${lead._id.slice(-4).toUpperCase()}` : 'LD-1001');
  
  worksheet.getCell(`A${currentRow}`).value = 'Client Name:';
  worksheet.getCell(`B${currentRow}`).value = lead.name || 'N/A';
  worksheet.getCell(`C${currentRow}`).value = `Ref: ${leadCode}`;

  worksheet.getCell(`D${currentRow}`).value = 'Total Valuation:';
  worksheet.getCell(`E${currentRow}`).value = `${currencySymbol} ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  worksheet.getCell(`F${currentRow}`).value = 'Target Budget:';
  worksheet.getCell(`G${currentRow}`).value = lead.budgetRange || lead.estimatedBudget || 'Not Specified';
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Row 2 of Data
  worksheet.getCell(`A${currentRow}`).value = 'Contact Phone:';
  worksheet.getCell(`B${currentRow}`).value = lead.phone || 'N/A';
  worksheet.getCell(`C${currentRow}`).value = lead.email || '';

  worksheet.getCell(`D${currentRow}`).value = 'Scope Categories:';
  worksheet.getCell(`E${currentRow}`).value = `${totalCategoriesCount} Categories`;
  worksheet.getCell(`F${currentRow}`).value = 'Total Line Items:';
  worksheet.getCell(`G${currentRow}`).value = `${totalItemsCount} Items`;
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Row 3 of Data
  worksheet.getCell(`A${currentRow}`).value = 'Property Scope:';
  worksheet.getCell(`B${currentRow}`).value = lead.propertyType || 'Interior Fitout';
  worksheet.getCell(`C${currentRow}`).value = lead.location || lead.address || '';

  worksheet.getCell(`D${currentRow}`).value = 'Export Date:';
  worksheet.getCell(`E${currentRow}`).value = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  worksheet.getCell(`F${currentRow}`).value = 'Reviewer:';
  worksheet.getCell(`G${currentRow}`).value = boq.assignedReviewerName || (boq.status === 'approved' ? 'Approved by Manager' : 'Pending Assignment');
  worksheet.getRow(currentRow).height = 20;

  // Style the metadata card cells
  for (let r = cardStartRow + 1; r <= currentRow; r++) {
    ['A', 'D', 'F'].forEach((col) => {
      const cell = worksheet.getCell(`${col}${r}`);
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF64748B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      cell.border = thinBorder;
    });
    ['B', 'C', 'E', 'G'].forEach((col) => {
      const cell = worksheet.getCell(`${col}${r}`);
      cell.font = { name: 'Segoe UI', size: 9.5, bold: col === 'E', color: { argb: col === 'E' ? 'FF059669' : 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = thinBorder;
    });
  }
  currentRow++;

  // Spacer
  worksheet.addRow([]);
  worksheet.getRow(currentRow).height = 14;
  currentRow++;

  // =========================================================================
  // 4. ITEM-BY-ITEM DETAILED SPECIFICATION SECTIONS (NO MAKE/BRAND COLUMN)
  // =========================================================================
  const colHeaders = [
    'Item No.',
    'Item Description & Technical Specifications',
    'Unit',
    'Quantity',
    `Rate (${currencySymbol})`,
    `Amount (${currencySymbol})`,
    'Remarks / Scope Notes',
  ];

  structuredSections.forEach((section, secIdx) => {
    // 4A. Section Banner Row
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const secTitleCell = worksheet.getCell(`A${currentRow}`);
    secTitleCell.value = `SECTION ${section.sectionNumber}:  ${section.sectionTitle.toUpperCase()}`;
    secTitleCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    secTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Royal Blue
    secTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
    const secSubtotalCell = worksheet.getCell(`E${currentRow}`);
    secSubtotalCell.value = `Section Subtotal:  ${currencySymbol} ${section.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    secSubtotalCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    secSubtotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Darker Blue
    secSubtotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    worksheet.getRow(currentRow).height = 26;
    currentRow++;

    // 4B. Scope of Work Overview Note (if present)
    if (section.scopeDescription) {
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const scopeCell = worksheet.getCell(`A${currentRow}`);
      scopeCell.value = `📝 Scope Note:  ${section.scopeDescription}`;
      scopeCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF1E3A8A' } };
      scopeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Ice Blue
      scopeCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
      scopeCell.border = thinBorder;
      worksheet.getRow(currentRow).height = 24;
      currentRow++;
    }

    // 4C. Table Column Headers
    const headerRow = worksheet.addRow(colHeaders);
    headerRow.height = 24;
    headerRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF334155' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = mediumBorderBottom;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 || colNum === 3 || colNum === 4 ? 'center' : colNum === 5 || colNum === 6 ? 'right' : 'left',
        indent: colNum === 2 || colNum === 7 ? 1 : 0,
      };
    });
    currentRow++;

    // 4D. Table Item Rows
    if (section.items && section.items.length > 0) {
      section.items.forEach((item: any, itIdx: number) => {
        // Accurate visual height calculation so long technical specifications are completely visible with no cut-off
        const titleLines = Math.max(1, Math.ceil((item.itemName || '').length / 46));
        const descText = item.description || '';
        let descVisualLines = 0;
        if (descText) {
          const paragraphs = descText.split('\n');
          paragraphs.forEach((p: string) => {
            descVisualLines += Math.max(1, Math.ceil(p.length / 46));
          });
        }
        const totalVisualLines = titleLines + descVisualLines;
        const computedHeight = Math.max(28, totalVisualLines * 16 + 12);

        const itemCode = item.itemCode || item.serialNumber || `${section.sectionNumber}.${itIdx + 1}`;
        const unit = (item.unit || 'Nos').toUpperCase();
        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const amount = Number(item.amount || qty * rate || 0);
        const remarks = item.remarks || item.disposal || '—';

        const row = worksheet.addRow([
          itemCode,
          '', // will be populated with richText
          unit,
          qty,
          rate,
          amount,
          remarks,
        ]);

        row.height = computedHeight;

        const isEven = itIdx % 2 === 1;
        const rowBgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
          cell.border = thinBorder;

          if (colNum === 1) {
            // Item code
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
            cell.alignment = { vertical: 'top', horizontal: 'center' };
          } else if (colNum === 2) {
            // Description & Technical Specifications (Rich Text: Bold Headline + Medium Full Description)
            if (descText) {
              cell.value = {
                richText: [
                  {
                    text: `${item.itemName.trim()}\n`,
                    font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } },
                  },
                  {
                    text: descText.trim(),
                    font: { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } },
                  },
                ],
              };
            } else {
              cell.value = item.itemName || 'Unnamed Item';
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            }
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
          } else if (colNum === 3) {
            // Unit
            cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF64748B' } };
            cell.alignment = { vertical: 'top', horizontal: 'center' };
          } else if (colNum === 4) {
            // Quantity
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            cell.alignment = { vertical: 'top', horizontal: 'center' };
            cell.numFmt = '#,##0';
          } else if (colNum === 5) {
            // Rate
            cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
            cell.alignment = { vertical: 'top', horizontal: 'right' };
            cell.numFmt = '#,##0.00';
          } else if (colNum === 6) {
            // Amount
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            cell.alignment = { vertical: 'top', horizontal: 'right' };
            cell.numFmt = '#,##0.00';
          } else if (colNum === 7) {
            // Remarks
            cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
          }
        });
        currentRow++;
      });
    }

    // 4E. Section Subtotal Footer Row
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const subLabelCell = worksheet.getCell(`A${currentRow}`);
    subLabelCell.value = `SUBTOTAL — ${section.sectionTitle.toUpperCase()}`;
    subLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    subLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    subLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    subLabelCell.border = thinBorder;

    const subValCell = worksheet.getCell(`F${currentRow}`);
    subValCell.value = section.subTotal;
    subValCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    subValCell.alignment = { vertical: 'middle', horizontal: 'right' };
    subValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    subValCell.numFmt = `"${currencySymbol} " #,##0.00`;
    subValCell.border = thinBorder;

    const emptySubCell = worksheet.getCell(`G${currentRow}`);
    emptySubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    emptySubCell.border = thinBorder;

    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    // Section Spacer
    worksheet.addRow([]);
    worksheet.getRow(currentRow).height = 10;
    currentRow++;
  });

  // =========================================================================
  // 5. GRAND TOTAL VALUATION BANNER
  // =========================================================================
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const grandLabelCell = worksheet.getCell(`A${currentRow}`);
  grandLabelCell.value = '👑  GRAND TOTAL ESTIMATED VALUATION';
  grandLabelCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  grandLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Emerald 600
  grandLabelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  grandLabelCell.border = doubleBorderBottom;

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  const grandValCell = worksheet.getCell(`E${currentRow}`);
  grandValCell.value = grandTotal;
  grandValCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  grandValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }; // Emerald 700
  grandValCell.alignment = { vertical: 'middle', horizontal: 'right' };
  grandValCell.numFmt = `"${currencySymbol} " #,##0.00`;
  grandValCell.border = doubleBorderBottom;

  worksheet.getRow(currentRow).height = 32;
  currentRow++;

  // Spacer
  worksheet.addRow([]);
  worksheet.getRow(currentRow).height = 14;
  currentRow++;

  // =========================================================================
  // 6. FORMAL SIGN-OFF & AUTHORIZATION BLOCK
  // =========================================================================
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const signTitle1 = worksheet.getCell(`A${currentRow}`);
  signTitle1.value = 'PREPARED BY (ESTIMATOR / DESIGNER)';
  signTitle1.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF475569' } };
  signTitle1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  signTitle1.alignment = { vertical: 'middle', indent: 1 };
  signTitle1.border = thinBorder;

  worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
  const signTitle2 = worksheet.getCell(`D${currentRow}`);
  signTitle2.value = 'VERIFIED & APPROVED BY (MANAGER / CLIENT)';
  signTitle2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF475569' } };
  signTitle2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  signTitle2.alignment = { vertical: 'middle', indent: 1 };
  signTitle2.border = thinBorder;
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Signatures
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const prepNameCell = worksheet.getCell(`A${currentRow}`);
  prepNameCell.value = `Name: ${boq.createdBy?.name || 'Lead Estimator'}\nSignature: _______________________________\nDate: ${new Date().toLocaleDateString()}`;
  prepNameCell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
  prepNameCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
  prepNameCell.border = thinBorder;

  worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
  const appNameCell = worksheet.getCell(`D${currentRow}`);
  appNameCell.value = `Name: ${boq.assignedReviewerName || (boq.status === 'approved' ? 'Design Director' : 'Pending Authorization')}\nSignature: _______________________________\nDate: ${boq.approvedAt ? new Date(boq.approvedAt).toLocaleDateString() : '________________________'}`;
  appNameCell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
  appNameCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
  appNameCell.border = thinBorder;
  worksheet.getRow(currentRow).height = 54;
  currentRow++;

  // Generate binary Excel buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Download Trigger
  const sanitizedClient = (lead.name || 'Lead').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedLeadCode = (lead.leadCode || lead.customLeadId || 'BOQ').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `BOQ_v${versionNumber}_${sanitizedClient}_${sanitizedLeadCode}_${dateStr}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
