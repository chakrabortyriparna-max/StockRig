/* StockRig â€” prime experience: three.js hero + gsap scroll choreography */
gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ORANGE = 0xf25c05, INK = 0x1c1e22, PAPER = 0xf7f5f2, STEEL = 0x8a9199;

/* ---------------- loader ---------------- */
const loadNum = document.getElementById("loadNum");
let progress = { v: 0 };
gsap.to(progress, {
  v: 100, duration: reduced ? 0.3 : 1.6, ease: "power2.inOut",
  onUpdate: () => (loadNum.textContent = String(Math.round(progress.v)).padStart(2, "0")),
  onComplete: enter,
});
function enter() {
  gsap.timeline()
    .to("#loadNum", { yPercent: -120, opacity: 0, duration: 0.4, ease: "power2.in" })
    .to("#loader", { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, "-=0.1")
    .set("#loader", { display: "none" })
    .from(".hl span", { yPercent: 110, duration: 1, stagger: 0.12, ease: "expo.out" }, "-=0.45")
    .from(".kicker span, .lede span, .cta-row span", { y: 24, opacity: 0, stagger: 0.08, duration: 0.7, ease: "power3.out" }, "-=0.6")
    .from("#topbar", { y: -40, opacity: 0, duration: 0.6 }, "-=0.5");
}

/* ---------------- cursor ---------------- */
const cursor = document.getElementById("cursor");
addEventListener("mousemove", e => gsap.to(cursor, { x: e.clientX - 7, y: e.clientY - 7, duration: 0.35, ease: "power3.out" }));
document.querySelectorAll("a, button, .tilt").forEach(el => {
  el.addEventListener("mouseenter", () => cursor.classList.add("big"));
  el.addEventListener("mouseleave", () => cursor.classList.remove("big"));
});

/* ---------------- three.js scene ---------------- */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(INK, 10, 26);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.6, 11);

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xfff3e8, 1.1); key.position.set(6, 8, 6); scene.add(key);
const rim = new THREE.PointLight(ORANGE, 30, 40); rim.position.set(-7, 3, 5); scene.add(rim);
const rim2 = new THREE.PointLight(0x4a7dff, 14, 40); rim2.position.set(8, -4, -6); scene.add(rim2);

const group = new THREE.Group(); scene.add(group);
const geo = new THREE.BoxGeometry(1.15, 0.78, 0.9);
const bins = [];
const COLS = 7, ROWS = 4, DEPTH = 2;
for (let d = 0; d < DEPTH; d++) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const roll = Math.random();
  const isLow = d === 0 && r === ROWS - 1 && c === 3;
  const color = isLow ? ORANGE : roll > 0.82 ? ORANGE : roll > 0.62 ? STEEL : PAPER;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: isLow ? 0.35 : 0.62, metalness: 0.15 });
  const bin = new THREE.Mesh(geo, mat);
  bin.position.set((c - (COLS - 1) / 2) * 1.32 + (d ? 0.3 : 0), (r - (ROWS - 1) / 2) * 1.05, -d * 2.2);
  if (!isLow && Math.random() > 0.86) bin.rotation.z = 0.06 * Math.sign(Math.random() - 0.5);
  bin.userData = { baseY: bin.position.y, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.7 };
  group.add(bin); bins.push(bin);
}
/* the par line */
const lineGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-(COLS * 1.32) / 2 - 0.8, -0.52, 0.9),
  new THREE.Vector3((COLS * 1.32) / 2 + 0.8, -0.52, 0.9),
]);
const parLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: ORANGE, dashSize: 0.34, gapSize: 0.24, transparent: true, opacity: 0.9 }));
parLine.computeLineDistances(); scene.add(parLine);

/* particles */
const pGeo = new THREE.BufferGeometry(), N = 260, pos = new Float32Array(N * 3);
for (let i = 0; i < N * 3; i += 3) { pos[i] = (Math.random() - 0.5) * 30; pos[i + 1] = (Math.random() - 0.5) * 16; pos[i + 2] = (Math.random() - 0.5) * 14 - 2; }
pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: STEEL, size: 0.045, transparent: true, opacity: 0.55 })));

/* interaction state */
const mouse = { x: 0, y: 0 };
addEventListener("pointermove", e => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
renderer.setSize(innerWidth, innerHeight);

let clockT = 0;
function tick() {
  requestAnimationFrame(tick);
  clockT += 0.008;
  bins.forEach(b => {
    b.position.y = b.baseY + Math.sin(clockT * b.userData.speed * 2 + b.userData.phase) * 0.07;
    if (b.material.color.getHex() === ORANGE) {
      b.material.emissive = new THREE.Color(ORANGE);
      b.material.emissiveIntensity = 0.18 + Math.sin(clockT * 3 + b.userData.phase) * 0.14;
    }
  });
  parLine.position.y = Math.sin(clockT * 1.4) * 0.04;
  parLine.material.opacity = 0.65 + Math.sin(clockT * 2.2) * 0.25;
  group.rotation.y += ((mouse.x * 0.16 + scrollDolly.rotY) - group.rotation.y) * 0.04;
  group.rotation.x += ((mouse.y * 0.07) - group.rotation.x) * 0.04;
  camera.position.y += ((0.6 - mouse.y * 0.35 + scrollDolly.camY) - camera.position.y) * 0.05;
  camera.position.z += ((11 + scrollDolly.camZ) - camera.position.z) * 0.05;
  renderer.render(scene, camera);
}
/* scroll-driven camera state */
const scrollDolly = { camZ: 0, camY: 0, rotY: 0 };
if (!reduced) {
  ScrollTrigger.create({
    trigger: "#hero", start: "top top", end: "bottom top", scrub: true,
    onUpdate: self => { scrollDolly.camZ = self.progress * 3.5; scrollDolly.camY = self.progress * -1.4; scrollDolly.rotY = self.progress * 0.22; },
  });
}
tick();

/* ---------------- scroll choreography ---------------- */
/* hero copy drifts up + fades on leave */
gsap.to(".hero-copy", {
  yPercent: -30, opacity: 0, ease: "none",
  scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
});

/* manifesto word-by-word ignition */
const mText = document.getElementById("manifesto-text");
mText.innerHTML = mText.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ");
ScrollTrigger.create({
  trigger: "#manifesto", start: "top 75%", end: "center 40%", scrub: true,
  onUpdate: self => {
    const lit = Math.floor(self.progress * document.querySelectorAll("#manifesto-text .w").length);
    document.querySelectorAll("#manifesto-text .w").forEach((w, i) => w.classList.toggle("lit", i <= lit));
  },
});

/* horizontal loop */
const track = document.querySelector(".loop-track");
const getX = () => -(track.scrollWidth - innerWidth);
gsap.to(track, {
  x: getX,
  ease: "none",
  scrollTrigger: {
    trigger: "#loop-wrap", start: "top top",
    end: () => "+=" + (track.scrollWidth - innerWidth),
    scrub: 1, pin: true, invalidateOnRefresh: true,
  },
});
gsap.utils.toArray(".panel:not(.intro)").forEach(p => {
  gsap.from(p.querySelector(".num"), { scale: 0.4, opacity: 0, duration: 0.6 });
});

/* quotes + rows reveal */
gsap.utils.toArray(".q").forEach((q, i) => {
  gsap.from(q, { x: i % 2 ? 80 : -80, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: q, start: "top 82%" } });
});
gsap.from(".cmp .r", { y: 34, opacity: 0, stagger: 0.12, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: ".cmp", start: "top 80%" } });
gsap.from(".sec-title span", {
  yPercent: 110, duration: 0.9, ease: "expo.out", stagger: 0.1,
  scrollTrigger: { trigger: "#proof", start: "top 75%" },
});
gsap.from(".video-shell", { scale: 0.94, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: "#demo", start: "top 75%" } });
gsap.from(".plan", { y: 70, opacity: 0, rotateX: -12, stagger: 0.15, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: "#pricing", start: "top 70%" } });

/* pricing card tilt */
document.querySelectorAll(".tilt").forEach(card => {
  card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
    gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 800, duration: 0.4 });
  });
  card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6 }));
});

/* footer punch */
gsap.from(".foot-cta h2", { yPercent: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: "footer", start: "top 75%" } });

