/* StockRig scroll-world — one continuous forward camera take through four connected worlds.
   No cuts: supply house exterior -> parts aisle -> van cargo -> billing monuments. Scroll scrubs time. */
gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ORANGE = 0xf25c05, INK = 0x1c1e22, PAPER = 0xf7f5f2, STEEL = 0x8a9199;

/* ---------- loader ---------- */
const loadNum = document.getElementById("loadNum");
const prog = { v: 0 };
gsap.to(prog, { v: 100, duration: reduced ? 0.3 : 1.5, ease: "power2.inOut",
  onUpdate: () => loadNum.textContent = String(Math.round(prog.v)).padStart(2, "0"),
  onComplete: () => gsap.to("#loader", { opacity: 0, duration: 0.7, onComplete: () => document.getElementById("loader").remove() }),
});

/* ---------- cursor ---------- */
const cursor = document.getElementById("cursor");
addEventListener("mousemove", e => gsap.to(cursor, { x: e.clientX - 7, y: e.clientY - 7, duration: 0.35, ease: "power3.out" }));
document.querySelectorAll("a").forEach(el => {
  el.addEventListener("mouseenter", () => cursor.classList.add("big"));
  el.addEventListener("mouseleave", () => cursor.classList.remove("big"));
});

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(INK);
scene.fog = new THREE.Fog(INK, 8, 42);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 160);

scene.add(new THREE.AmbientLight(0xffffff, 0.32));
const key = new THREE.DirectionalLight(0xfff3e8, 1.15); key.position.set(5, 12, 4); scene.add(key);
const rimO = new THREE.PointLight(ORANGE, 26, 34); rimO.position.set(-5, 3, -110); scene.add(rimO);
const rimO2 = new THREE.PointLight(ORANGE, 22, 30); rimO2.position.set(4, 2, -172); scene.add(rimO2);
const rimB = new THREE.PointLight(0x4a7dff, 16, 44); rimB.position.set(0, 6, -215); scene.add(rimB);

function makePanel(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w * 100; c.height = h * 100;
  const g = c.getContext("2d"); draw(g, c.width, c.height);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
}

/* ---------- ground ---------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.position.z = -120; scene.add(ground);

/* ---------- world 0: floating sign ---------- */
const sign = makePanel(11, 2.4, (g, W, H) => {
  g.fillStyle = "#F25C05"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#F7F5F2"; g.font = `900 ${H * 0.52}px 'Arial Black',sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("STOCKRIG", W / 2, H * 0.54);
});
sign.position.set(0, 5, -40); scene.add(sign);
gsap.to(sign.position, { y: 5.5, duration: 3, yoyo: true, repeat: Infinity, ease: "sine.inOut" });

/* ---------- world 1: supply house facade ---------- */
const shellMat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.85 });
function box(w, h, d, x, y, z, mat = shellMat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); scene.add(m); return m;
}
box(9.5, 7, 1, -7.25, 3.5, -94);           // facade left of doorway
box(9.5, 7, 1, 7.25, 3.5, -94);            // facade right
box(5, 2, 1, 0, 6, -94);                   // header above doorway
box(15, 0.5, 60, 0, 7.2, -124);            // roof
box(1, 7, 60, -7.5, 3.5, -123);            // side wall L
box(1, 7, 60, 7.5, 3.5, -123);             // side wall R
box(13, 7, 1, -6.5, 3.5, -152);            // back wall L
box(13, 7, 1, 6.5, 3.5, -152);             // back wall R
const coSign = makePanel(7, 1.1, (g, W, H) => {
  g.fillStyle = "#F7F5F2"; g.font = `900 ${H * 0.62}px 'Arial Black',sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SUPPLY CO.", W / 2, H * 0.55);
});
coSign.position.set(0, 5.6, -93.3); scene.add(coSign);

/* ---------- world 2: parts aisle (instanced bins) ---------- */
const binGeo = new THREE.BoxGeometry(0.95, 0.62, 0.85);
const binMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.12 });
const COLS = 14, LEVELS = 3;
const count = 2 * COLS * LEVELS;
const bins = new THREE.InstancedMesh(binGeo, binMat, count);
const dummy = new THREE.Object3D(); let idx = 0;
const cPaper = new THREE.Color(PAPER), cSteel = new THREE.Color(STEEL), cOrange = new THREE.Color(ORANGE);
for (let side = 0; side < 2; side++) for (let lvl = 0; lvl < LEVELS; lvl++) for (let cI = 0; cI < COLS; cI++) {
  dummy.position.set(side ? 4.4 : -4.4, 0.28 + lvl * 0.85, -101 - cI * 3.3);
  dummy.updateMatrix(); bins.setMatrixAt(idx, dummy.matrix);
  bins.setColorAt(idx, Math.random() > 0.9 ? cOrange : Math.random() > 0.4 ? cPaper : cSteel);
  idx++;
}
scene.add(bins);
for (let lvl = 0; lvl < LEVELS; lvl++) { box(1.4, 0.08, 48, -4.4, 0.62 + lvl * 0.85, -124); box(1.4, 0.08, 48, 4.4, 0.62 + lvl * 0.85, -124); }

/* ---------- world 3: the van ---------- */
box(3.6, 0.12, 17, 0, 0, -173.5);                 // floor
box(3.6, 0.12, 17, 0, 2.75, -173.5);              // roof
box(0.12, 2.75, 17, -1.74, 1.37, -173.5);         // wall L
box(0.12, 2.75, 17, 1.74, 1.37, -173.5);          // wall R
/* interior shelf on right wall + bins */
box(0.9, 0.07, 12, 1.2, 0.62, -172); box(0.9, 0.07, 12, 1.2, 1.5, -172);
const vBinMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
[[1.2, 0.97], [1.2, 1.85]].forEach(([x, y]) => {
  for (let i = 0; i < 6; i++) {
    if (Math.random() > 0.82 && y > 1.4) continue; // gaps read as used stock
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.8), vBinMat.clone());
    m.material.color.setHex(Math.random() > 0.75 ? STEEL : PAPER);
    m.position.set(x, y, -167.5 - i * 1.05); scene.add(m);
  }
});
/* the par line — dashed orange strip */
const parGroup = new THREE.Group();
for (let i = 0; i < 9; i++) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true }));
  seg.position.set(-1.5 + i * 0.375, 1.18, -175.5); parGroup.add(seg);
}
scene.add(parGroup);
/* the low bin — below the line, pulsing */
const lowBin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.8),
  new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.4, roughness: 0.35 }));
lowBin.position.set(-0.9, 0.33, -175.5); scene.add(lowBin);

/* ---------- world 4: monuments ---------- */
const restockPanel = makePanel(3.4, 4.4, (g, W, H) => {
  g.fillStyle = "#22252b"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#F25C05"; g.font = `900 ${H * 0.06}px 'Arial Black',sans-serif`;
  g.fillText("RESTOCK LIST", W * 0.08, H * 0.12);
  g.fillStyle = "#F7F5F2"; g.font = `${H * 0.05}px Inter,sans-serif`;
  ["Van 12 — Reyes", "", "CAP-45-5   ×6", "CAP-35-5   ×3", "CONT-30    ×4", "WAX-RING   ×6"].forEach((l, i) => g.fillText(l, W * 0.09, H * (0.26 + i * 0.1)));
});
restockPanel.position.set(4.5, 3, -206); scene.add(restockPanel);
const csvPanel = makePanel(3.4, 4.4, (g, W, H) => {
  g.fillStyle = "#22252b"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#F25C05"; g.font = `900 ${H * 0.06}px 'Arial Black',sans-serif`;
  g.fillText("BILLABLE.CSV", W * 0.08, H * 0.12);
  g.fillStyle = "#F7F5F2"; g.font = `${H * 0.045}px monospace`;
  ['"J-1041","CAP-45-5","$68"', '"J-1043","TSTAT-P","$89"', '"J-1044","BALL-34","$39"'].forEach((l, i) => g.fillText(l, W * 0.07, H * (0.28 + i * 0.12)));
});
csvPanel.position.set(-4.5, 3.4, -218); scene.add(csvPanel);
const freePanel = makePanel(9, 2.2, (g, W, H) => {
  g.fillStyle = "#F25C05"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#1C1E22"; g.font = `900 ${H * 0.42}px 'Arial Black',sans-serif`;
  g.textAlign = "center"; g.fillText("FREE FOREVER", W / 2, H * 0.56);
});
freePanel.position.set(0, 4.2, -234); scene.add(freePanel);

/* ---------- particles ---------- */
const N = 320, pos = new Float32Array(N * 3);
for (let i = 0; i < N * 3; i += 3) { pos[i] = (Math.random() - 0.5) * 34; pos[i + 1] = Math.random() * 9; pos[i + 2] = 8 - Math.random() * 250; }
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: STEEL, size: 0.05, transparent: true, opacity: 0.5 })));

/* ---------- the continuous take ---------- */
const camPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 2.4, 12), new THREE.Vector3(0, 2.3, -18), new THREE.Vector3(0, 2.1, -42),
  new THREE.Vector3(0, 1.9, -68), new THREE.Vector3(0, 1.65, -86), new THREE.Vector3(0, 1.6, -98),
  new THREE.Vector3(0, 1.6, -114), new THREE.Vector3(0, 1.7, -132), new THREE.Vector3(0, 1.6, -148),
  new THREE.Vector3(0, 1.5, -163), new THREE.Vector3(0, 1.38, -170), new THREE.Vector3(0, 1.38, -177),
  new THREE.Vector3(0, 1.5, -183), new THREE.Vector3(0, 2.0, -194), new THREE.Vector3(2.6, 2.9, -207),
  new THREE.Vector3(-2.4, 3.3, -219), new THREE.Vector3(0, 4.2, -231), new THREE.Vector3(0, 6.5, -244),
]);
const tgtPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 3.5, -20), new THREE.Vector3(0, 2.6, -46), new THREE.Vector3(0, 2.0, -72),
  new THREE.Vector3(0, 1.8, -90), new THREE.Vector3(0, 1.6, -100), new THREE.Vector3(0, 1.6, -116),
  new THREE.Vector3(0, 1.7, -136), new THREE.Vector3(0, 1.6, -150), new THREE.Vector3(0, 1.45, -165),
  new THREE.Vector3(0, 1.38, -172), new THREE.Vector3(0, 1.42, -178), new THREE.Vector3(0, 1.7, -188),
  new THREE.Vector3(0, 2.4, -204), new THREE.Vector3(0, 3.1, -216), new THREE.Vector3(0, 3.8, -230),
  new THREE.Vector3(0, 4.4, -238), new THREE.Vector3(0, 5, -246), new THREE.Vector3(0, 5.4, -252),
]);
const V3a = new THREE.Vector3(), V3b = new THREE.Vector3();

let p = 0;
ScrollTrigger.create({
  trigger: "#world-pin", start: "top top", end: "bottom bottom", scrub: true,
  onUpdate: self => (p = self.progress),
});

/* mouse drift */
const mouse = { x: 0, y: 0 };
addEventListener("pointermove", e => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2; mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* captions + rail */
const caps = [...document.querySelectorAll(".cap")];
const rail = document.getElementById("rail");
caps.forEach(() => rail.appendChild(document.createElement("i")));
const ticks = [...rail.children];
const F = 0.03;

let T = 0;
function tick() {
  requestAnimationFrame(tick);
  T += 0.008;
  const amp = reduced ? 0 : 1;
  const t = gsap.utils.clamp(0.001, 0.999, p);
  camPath.getPointAt(t, V3a);
  tgtPath.getPointAt(t, V3b);
  camera.position.lerp(V3a, 0.9);
  camera.lookAt(V3b.x + mouse.x * 0.35, V3b.y - mouse.y * 0.25, V3b.z);
  caps.forEach((cap, i) => {
    const a = +cap.dataset.a, b = +cap.dataset.b;
    const o = gsap.utils.clamp(0, 1, Math.min((p - a) / F, (b - p) / F, 1));
    cap.style.opacity = o;
    if (cap.classList.contains("end")) cap.style.pointerEvents = o > 0.5 ? "auto" : "none";
    ticks[i].classList.toggle("on", p >= a && p <= b);
  });
  lowBin.material.emissiveIntensity = 0.35 + Math.sin(T * 3) * 0.25 * (amp || 0.4);
  parGroup.children.forEach((s, i) => s.material.opacity = 0.6 + Math.sin(T * 2.4 + i) * 0.3);
  renderer.render(scene, camera);
}
tick();

/* interview Q&As */
const QA = [
  ["Why does StockRig exist?", "Small trades shops run two inventories — the one in their software and the one rusting in the van. Jobber ships no native parts inventory at all; Housecall Pro's own help center suggests QuickBooks as the workaround."],
  ["How do you know the pain is real?", "We documented it instead of inventing it. A Jobber community thread describes our exact product; a plumbing owner told eTurns their FSM \u201Cdoesn't manage what's physically on your trucks very well.\u201D"],
  ["What does this pain cost?", "~$285 per stockout-driven return trip; missing parts are the top repeat-visit driver for 41% of service leaders (IFS via Simpro — vendor-mediated, labeled)."],
  ["In one sentence, what does it do?", "Every van becomes a tracked location; parts get par levels per truck; used parts land on jobs; restock lists write themselves."],
  ["Who else does this?", "Ply — free up to 15 people, integrated into Jobber/HCP. Our own red team made us read their pricing page out loud, and we changed our business model because of it."],
  ["Then why pick you?", "Different shape: self-serve with zero demo calls, FSM-agnostic, data you own and can export anytime, and a $99 concierge setup instead of a subscription."],
  ["Why free forever?", "Because van-stock shouldn't need a demo call — and because a competitor's free tier made $29/mo indefensible. Free is the honest price for v1."],
  ["You attacked your own business?", "Two adversarial agents: one broke into the code, one tried to kill the company. Both reports ship in the package. The subscription died; the product survived."],
  ["What did the code attack find?", "A silent data-wipe path, par levels that were hardcoded fiction, negative quantities increasing stock. All fixed and re-verified the same day."],
  ["What's it built with?", "Node's built-in http module, vanilla JS, JSON-file storage. Zero npm packages, zero build step, zero paid APIs. You can read the whole backend in one sitting."],
  ["Who built this, really?", "Autonomous AI agents — researchers, judge panels, builders, red-teamers, a completeness critic. A human set guardrails and never answered a question mid-run."],
  ["What would make you shut it down?", "If twenty paid setups show nobody values convenience either — then we write the postmortem honestly, like everything else here."],
];
document.getElementById("qa-holder").innerHTML = QA.map(([q, a]) =>
  `<div class="qa"><div class="q">${q}</div><div class="a">${a}</div></div>`).join("");
gsap.utils.toArray(".qa").forEach(el => {
  gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 85%" } });
});
