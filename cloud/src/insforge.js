/* InsForge REST adapter — thin boundary so tests inject fakes.
   Uses client_type=server everywhere: refresh tokens come back in the body
   (rotation per call), no cookie handling needed for an API service. */
"use strict";

function createInsForgeClient({ baseUrl, apiKey, fetchImpl = globalThis.fetch }) {
  if (!baseUrl || !apiKey) throw new Error("[insforge] baseUrl and apiKey are required");

  async function request(path, { method = "GET", body, auth } = {}) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth || apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  return {
    signup: (email, password, name) =>
      request("/api/auth/users?client_type=server", {
        method: "POST",
        body: { email, password, ...(name ? { name } : {}) },
      }),
    login: (email, password) =>
      request("/api/auth/sessions?client_type=server", {
        method: "POST",
        body: { method: "password", email, password },
      }),
    // InsForge rotates refresh tokens: response carries a NEW refreshToken;
    // replaying the old one must fail server-side.
    refresh: (refreshToken) =>
      request("/api/auth/refresh?client_type=server", {
        method: "POST",
        body: { refreshToken },
      }),
    logout: () => request("/api/auth/logout", { method: "POST" }),
    currentUser: (accessToken) =>
      request("/api/auth/sessions/current", { auth: accessToken }),

    // Email flows (SR-C05). OTPs are single-use, 5-min expiry, consumed after
    // 3 failed attempts — enforced upstream by InsForge.
    sendVerification: (email) =>
      request("/api/auth/email/send-verification", { method: "POST", body: { email } }),
    verifyEmail: (email, otp) =>
      request("/api/auth/email/verify?client_type=server", {
        method: "POST",
        body: { email, otp },
      }),
    sendResetEmail: (email) =>
      request("/api/auth/email/send-reset-password", { method: "POST", body: { email } }),
    exchangeResetToken: (email, code) =>
      request("/api/auth/email/exchange-reset-password-token", {
        method: "POST",
        body: { email, code },
      }),
    resetPassword: (otp, newPassword) =>
      request("/api/auth/email/reset-password", {
        method: "POST",
        body: { otp, newPassword },
      }),
  };
}

module.exports = { createInsForgeClient };
