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
  };
}

module.exports = { createInsForgeClient };
