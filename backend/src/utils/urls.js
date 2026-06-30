const trimTrailingSlash = (url) => (url || '').replace(/\/+$/, '');

const appendPath = (baseUrl, path = '') => {
  const cleanBaseUrl = trimTrailingSlash(baseUrl);
  if (!path) return cleanBaseUrl;
  return `${cleanBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const getFrontendUrl = (path = '') => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return appendPath(baseUrl, path);
};

const getAdminFrontendUrl = (path = '') => {
  const baseUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174';
  return appendPath(baseUrl, path);
};

module.exports = {
  appendPath,
  getFrontendUrl,
  getAdminFrontendUrl
};
