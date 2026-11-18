// Loads ExcelJS (~260 KB gzipped) only when a user actually exports a BOQ,
// instead of with every page that shows an Export button.
import type { ExportBoqOptions } from './exportBoqExcel';

export async function exportBoqToExcel(options: ExportBoqOptions) {
  const mod = await import('./exportBoqExcel');
  return mod.exportBoqToExcel(options);
}
