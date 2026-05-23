export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidPhone(value) {
  return /^[+]?[\d\s()-]{7,20}$/.test(String(value || '').trim());
}

export function isPositiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function isNonNegativeDecimal(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

export function isValidUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBudgetField(value, fieldName = 'Amount') {
  if (value === '' || value === null || value === undefined) {
    return `${fieldName} is required`;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
    return `${fieldName} must be a valid number (max 2 decimals)`;
  }
  const num = Number(value);
  if (num < 0) return `${fieldName} cannot be negative`;
  if (num > 999999) return `${fieldName} is too large`;
  return null;
}

export function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter';
  if (!/[0-9]/.test(value)) return 'Include at least one number';
  return null;
}

const FILE_EXT_BY_KIND = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  pdf: ['.pdf'],
  doc: ['.doc', '.docx'],
};

export function validateFile(file, { maxBytes = 10 * 1024 * 1024, allowedTypes = [] } = {}) {
  if (!file) return 'File is required';
  if (file.size > maxBytes) return `File must be under ${Math.round(maxBytes / (1024 * 1024))}MB`;
  if (allowedTypes.length === 0) return null;

  const mime = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();

  const mimeOk = allowedTypes.some((type) => mime && mime.includes(type));
  const extOk = allowedTypes.some((type) => {
    const extensions = FILE_EXT_BY_KIND[type] || [];
    return extensions.some((ext) => name.endsWith(ext));
  });

  if (!mimeOk && !extOk) return 'File type is not allowed';
  return null;
}
