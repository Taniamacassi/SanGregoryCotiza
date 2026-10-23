/**
 * Robust date utilities for CotizaPro
 * Handles Excel serial dates (e.g. 46315), ISO strings, DD/MM/YYYY, Date objects,
 * and formats clean, user-friendly dates in Spanish.
 */

/**
 * Normalizes any date representation (Excel serial number, timestamp, DD/MM/YYYY, etc.)
 * into a strict YYYY-MM-DD ISO date string.
 */
export function parseAnyDateToISO(value: any, fallbackDate?: string): string {
  if (value === undefined || value === null || value === '') {
    return fallbackDate || new Date().toISOString().split('T')[0];
  }

  // If already a valid Date instance
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  const str = String(value).trim();
  if (!str) {
    return fallbackDate || new Date().toISOString().split('T')[0];
  }

  // Check if it's an Excel serial date number (typically between 20000 and 90000)
  // e.g., 46315 = Oct 2026, 45200 = 2023, etc.
  const num = Number(str);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Excel date epoch offset is 25569 days from Unix epoch (1970-01-01)
    // Using UTC methods prevents local timezone shifts
    const utcDate = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(utcDate.getTime())) {
      const y = utcDate.getUTCFullYear();
      const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(utcDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Check for DD/MM/YYYY or DD-MM-YYYY (common in Latin America & Spain)
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Check for YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard Date parsing as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallbackDate || new Date().toISOString().split('T')[0];
}

const MONTHS_SPANISH = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Formats a date into natural Spanish: e.g. "20 de octubre de 2026"
 */
export function formatDateToSpanish(dateValue: any): string {
  const iso = parseAnyDateToISO(dateValue);
  if (!iso || !iso.includes('-')) return String(dateValue || '');

  const parts = iso.split('-');
  if (parts.length < 3) return iso;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12) {
    return iso;
  }

  return `${day} de ${MONTHS_SPANISH[month - 1]} de ${year}`;
}

/**
 * Formats a date into concise DD/MM/YYYY: e.g. "20/10/2026"
 */
export function formatDateShort(dateValue: any): string {
  const iso = parseAnyDateToISO(dateValue);
  if (!iso || !iso.includes('-')) return String(dateValue || '');

  const parts = iso.split('-');
  if (parts.length < 3) return iso;

  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');

  return `${day}/${month}/${year}`;
}

/**
 * Calculates a future validUntil date by adding days to a base date.
 * Returns clean YYYY-MM-DD.
 */
export function computeValidUntilDate(baseDate: any, days: number): string {
  const isoBase = parseAnyDateToISO(baseDate);
  const parts = isoBase.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + (Number(days) || 15));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return isoBase;
}
