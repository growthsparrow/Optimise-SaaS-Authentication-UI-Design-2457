export function getPublicBusinessPageUrl(slug) {
  return `${window.location.origin}/#/book/${encodeURIComponent(slug)}`;
}

export function getPublicBookingUrl(slug) {
  return `${window.location.origin}/#/${encodeURIComponent(slug)}/book`;
}