const PHONE_DIGITS_LIMIT = 10;

export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, PHONE_DIGITS_LIMIT);
}

export function isValidPhone(value) {
  return /^\d{10}$/.test(normalizePhone(value));
}

export function phoneValidationMessage(label = 'Phone number') {
  return `${label} must contain exactly 10 digits.`;
}

export function getPhoneInputProps() {
  return {
    type: 'tel',
    inputMode: 'numeric',
    maxLength: PHONE_DIGITS_LIMIT,
    minLength: PHONE_DIGITS_LIMIT,
    pattern: '[0-9]{10}',
    title: 'Enter exactly 10 digits'
  };
}

export function normalizePhoneFields(values) {
  return Object.fromEntries(
    Object.entries(values || {}).map(([key, value]) => {
      const phoneKey = /phone|mobile|contact/i.test(key);
      return [key, phoneKey ? normalizePhone(value) : value];
    })
  );
}

export function validatePhoneFields(values) {
  const phoneEntry = Object.entries(values || {}).find(([key]) =>
    /phone|mobile|contact/i.test(key)
  );

  if (!phoneEntry || !String(phoneEntry[1] || '').trim()) {
    return null;
  }

  return isValidPhone(phoneEntry[1])
    ? null
    : phoneValidationMessage();
}