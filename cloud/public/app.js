/* StockRig Cloud SPA — vanilla, no build step. Talks to the API on this origin. */
"use strict";

const $ = (s) => document.querySelector(s);
const store = {
  get access() { return localStorage.getItem("sr_access") || ""; },
  set access(v) { v ? localStorage.setItem("sr_access", v) : localStorage.removeItem("sr_access"); },
  get refresh() { return localStorage.getItem("sr_refresh") || ""; },
  set refresh(v) { v ? localStorage.setItem("sr_refresh", v) : localStorage.removeItem("sr_refresh"); },
};

let me = null;

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(store.access ? { Authorization: `Bearer ${store.access}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204 || res.status === 404 && path === "/x") return null;
  let data = {};
  try { data = await res.json(); } catch {}
  // Access token expired? One silent refresh attempt.
  if (res.status === 401 && store.refresh && !path.startsWith("/v1/auth/refresh")) {
    const r = await fetch("/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: store.refresh }),
    });
    if (r.ok) {
      const j = await r.json();
      store.access = j.accessToken; store.refresh = j.refreshToken;
      return api(method, path, body);
    }
    logout(false);
  }
  return { status: res.status, ok: res.ok, data };
}

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  ["signup", "login", "accept"].forEach((n) => $(`#card-${n}`).classList.toggle("active", n === name));
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

function flash(form, text, ok = false) {
  const el = form.querySelector(".msg");
  el.textContent = text;
  el.className = `msg ${ok ? "ok" : "err"}`;
}

function enterWorkspace() {
  $("#auth-tabs").style.display = "none";
  ["card-signup", "card-login", "card-accept"].forEach((id) => ($(`#${id}`).classList.remove("active")));
  $("#bar").style.display = "";
  $("#workspace").style.display = "";
  renderMe();
  loadMembers();
}

function logout(callApi = true) {
  if (callApi && store.refresh) api("POST", "/v1/auth/logout", { refreshToken: store.refresh });
  store.access = ""; store.refresh = ""; me = null;
  location.reload();
}

async function renderMe() {
  const r = await api("GET", "/v1/me");
  if (!r.ok) return logout(false);
  me = r.data;
  $("#whoami").innerHTML = `<b>${me.org ? escapeHtml(me.org.name) : "No shop yet"}</b> · ${escapeHtml(me.user.email)}${me.role ? ` · <span class="role-badge">${me.role}</span>` : ""}`;
  $("#invite-form").style.display = me.role === "tech" ? "none" : "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function loadMembers() {
  const r = await api("GET", "/v1/org/members");
  const ul = $("#members");
  ul.innerHTML = "";
  if (!r.ok) { ul.innerHTML = `<li>Could not load crew (${escapeHtml(r.data.error || "")})</li>`; return; }
  for (const m of r.data.members) {
    const li = document.createElement("li");
    li.className = m.role === "owner" ? "owner" : "";
    li.innerHTML = `<span>Member ${escapeHtml(m.id.slice(0, 8))}…</span><span class="role-badge">${m.role}</span>`;
    ul.appendChild(li);
  }
}

$("#card-signup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  flash(f, "Opening your workspace…");
  const r = await api("POST", "/v1/auth/signup", {
    shopName: f.shopName.value.trim(),
    name: f.name.value.trim(),
    email: f.email.value.trim(),
    password: f.password.value,
  });
  if (!r.ok) return flash(f, r.data.error || "Signup failed");
  store.access = r.data.accessToken || "";
  store.refresh = r.data.refreshToken || "";
  enterWorkspace();
});

$("#card-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  flash(f, "Logging in…");
  const r = await api("POST", "/v1/auth/login", { email: f.email.value.trim(), password: f.password.value });
  if (!r.ok) return flash(f, r.data.error || "Login failed");
  store.access = r.data.accessToken;
  store.refresh = r.data.refreshToken;
  enterWorkspace();
});

// Invite links arrive as /invite/<token>; surface the accept tab automatically.
if (location.pathname.startsWith("/invite/")) {
  history.replaceState(null, "", "/");
  showTab("accept");
  const tokenFromUrl = location.pathname.split("/invite/")[1];
  if (tokenFromUrl) document.querySelector("#card-accept input[name=token]").value = tokenFromUrl;
}

$("#card-accept").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  if (!store.access) return flash(f, "Log in or create an account with the invited email first.");
  const r = await api("POST", "/v1/org/invites/accept", { token: f.token.value.trim() });
  if (!r.ok) return flash(f, r.data.error || "Could not accept invite");
  flash(f, "Joined! Loading your shop…", true);
  setTimeout(enterWorkspace, 600);
});

$("#invite-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const r = await api("POST", "/v1/org/invites", { email: f.email.value.trim(), role: f.role.value });
  if (!r.ok) return alert(r.data.error || "Invite failed");
  $("#invite-result").style.display = "flex";
  $("#invite-url").textContent = r.data.acceptUrl;
  f.reset();
});

$("#copy-invite").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#invite-url").textContent);
  $("#copy-invite").textContent = "Copied!";
});
$("#logout-btn").addEventListener("click", () => logout());

// Boot: already logged in?
(async () => {
  if (store.access || store.refresh) {
    const probe = await api("GET", "/v1/me");
    if (probe.status !== 401) return enterWorkspace();
  }
})();
