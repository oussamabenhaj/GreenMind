import { JWT_STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export function jwtDecode(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isValidToken(accessToken) {
  const decoded = accessToken ? jwtDecode(accessToken) : null;
  return !!decoded?.exp && decoded.exp > Date.now() / 1000;
}

let expiryTimer;

/** Stores (or clears) the JWT. The axios interceptor reads it on every request. */
export function setSession(accessToken) {
  clearTimeout(expiryTimer);
  if (accessToken) {
    localStorage.setItem(JWT_STORAGE_KEY, accessToken);
    const { exp } = jwtDecode(accessToken) ?? {};
    const timeLeft = exp ? exp * 1000 - Date.now() : 0;
    // setTimeout overflows above ~24.8 days; tokens last 7 days.
    if (timeLeft > 0 && timeLeft < 2 ** 31) {
      expiryTimer = setTimeout(() => {
        localStorage.removeItem(JWT_STORAGE_KEY);
        window.location.href = '/auth/jwt/sign-in';
      }, timeLeft);
    }
  } else {
    localStorage.removeItem(JWT_STORAGE_KEY);
  }
}
