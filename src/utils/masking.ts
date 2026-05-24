/**
 * Utility functions for masking sensitive data.
 */

/**
 * Masks a phone number (e.g. Libyan format 0912345678 -> 0912***678)
 * for unauthorized users to prevent lead stealing and preserve client privacy.
 * 
 * @param phone The raw phone number string
 * @returns The masked phone number
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const clean = phone.trim();
  if (clean.length < 6) return '*******';
  
  // For standard Libyan phone numbers (usually 10 digits starting with 09)
  // or international format, we keep the first 4 characters and the last 3 characters,
  // masking whatever is in between.
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-3);
  const maskLength = Math.max(3, clean.length - 7);
  return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
}
