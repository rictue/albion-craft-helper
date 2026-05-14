/**
 * Tiny CSV builder + downloader used by the calculator export buttons.
 *
 * Handles cells that contain quotes, commas or newlines per RFC 4180 by
 * wrapping them in double quotes and doubling any embedded quotes.
 */

export type CsvCell = string | number | null | undefined;

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map(row => row.map(csvCell).join(','));
  return lines.join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const cell = String(value);
  if (!/[",\n]/.test(cell)) return cell;
  return `"${cell.split('"').join('""')}"`;
}
