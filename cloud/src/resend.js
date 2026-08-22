/* Resend email adapter — invite delivery. Thin boundary, injectable for tests. */
"use strict";

function createResendSender({ apiKey, fromEmail, fromName = "StockRig", fetchImpl = globalThis.fetch }) {
  if (!apiKey) throw new Error("[resend] apiKey is required");

  return async function send({ to, subject, html }) {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };
}

module.exports = { createResendSender };
