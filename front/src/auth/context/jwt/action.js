import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

/** POST /api/auth/login → { data: { token, user } } */
export const signInWithPassword = async ({ email, password }) => {
  const res = await axios.post(endpoints.auth.signIn, { email, password });
  setSession(res.data.data.token);
  return res.data.data.user;
};

/** POST /api/auth/register → { data: { token, user } } (the user is signed in right away). */
export const signUp = async (payload) => {
  const res = await axios.post(endpoints.auth.signUp, payload);
  setSession(res.data.data.token);
  return res.data.data.user;
};

export const signOut = async () => {
  try {
    await axios.post(endpoints.auth.signOut);
  } finally {
    setSession(null);
  }
};
