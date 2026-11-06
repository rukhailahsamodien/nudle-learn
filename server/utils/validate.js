// Small, dependency-free validation helpers. Each returns a clean value or throws a 400.
const { badRequest } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const v = {
  id(value, label = 'id') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw badRequest(`Invalid ${label}`);
    return n;
  },
  string(value, label, { min = 0, max = 500, required = true } = {}) {
    if (value == null || value === '') {
      if (required && min > 0) throw badRequest(`${label} is required`);
      return '';
    }
    if (typeof value !== 'string' && typeof value !== 'number') throw badRequest(`${label} must be text`);
    const s = String(value).trim();
    if (s.length < min) throw badRequest(`${label} must be at least ${min} characters`);
    if (s.length > max) throw badRequest(`${label} must be at most ${max} characters`);
    return s;
  },
  email(value) {
    const s = v.string(value, 'Email', { min: 3, max: 254 }).toLowerCase();
    if (!EMAIL_RE.test(s)) throw badRequest('A valid email is required');
    return s;
  },
  password(value, { required = true } = {}) {
    if (!required && (value == null || value === '')) return null;
    if (typeof value !== 'string' || value.length < 6) throw badRequest('Password must be at least 6 characters');
    if (value.length > 128) throw badRequest('Password must be at most 128 characters');
    return value;
  },
  int(value, label, { min, max, fallback } = {}) {
    if ((value == null || value === '') && fallback !== undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) throw badRequest(`${label} must be a whole number`);
    if (min != null && n < min) throw badRequest(`${label} must be at least ${min}`);
    if (max != null && n > max) throw badRequest(`${label} must be at most ${max}`);
    return n;
  },
  number(value, label, { min, max } = {}) {
    const n = Number(value);
    if (value == null || value === '' || !Number.isFinite(n)) throw badRequest(`${label} must be a number`);
    if (min != null && n < min) throw badRequest(`${label} must be at least ${min}`);
    if (max != null && n > max) throw badRequest(`${label} must be at most ${max}`);
    return n;
  },
  date(value, label = 'Date') {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value + 'T00:00:00Z'))) throw badRequest(`${label} must be a valid date (YYYY-MM-DD)`);
    return value;
  },
  oneOf(value, label, options) {
    if (!options.includes(value)) throw badRequest(`${label} must be one of: ${options.join(', ')}`);
    return value;
  },
  object(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest(`${label} must be an object`);
    return value;
  },
};

module.exports = v;
