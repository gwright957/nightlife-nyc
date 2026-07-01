export function formatBirthdayInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDate(month: number, day: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  return true;
}

export function parseBirthdayToIso(formatted: string): string | null {
  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (!isValidDate(month, day, year)) return null;

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

export function validateBirthdayInput(formatted: string): string | null {
  if (formatted.replace(/\D/g, "").length !== 8) {
    return "Enter your birthday as MM/DD/YYYY";
  }
  if (!parseBirthdayToIso(formatted)) {
    return "Enter a valid birthday (MM/DD/YYYY)";
  }
  return null;
}
