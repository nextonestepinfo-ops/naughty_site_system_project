const STORAGE_KEY = "naughty.siteData.v1";
const DATA_URL = "../03_system_seed/naughty_site_data.json";
const ASSET_ROOT = "../01_existing_site/";

const statusLabel = {
  working: "出勤中",
  scheduled: "出勤予定",
  off: "休み",
  hidden: "非表示"
};

const heroFallbackPhotos = [
  "uploads/girl1_black_hair.png",
  "uploads/girl2_silver_hair.png",
  "uploads/girl3_dark_center.png",
  "uploads/girl4_blonde.png",
  "uploads/girl5_pink_hair.png"
];

let siteData = null;
let heroOrder = [0, 1, 2, 3, 4];

const heroLayout = [
  { slot: 0, scale: 1.03, mobileScale: 1, z: 2, depth: "-36px", x: "-12px", y: "8px" },
  { slot: 1, scale: 1, mobileScale: 1, z: 3, depth: "-18px", x: "-5px", y: "4px" },
  { slot: 2, scale: .8, mobileScale: .82, z: 5, depth: "28px", x: "0px", y: "0px" },
  { slot: 3, scale: 1.04, mobileScale: 1.06, z: 4, depth: "10px", x: "7px", y: "6px" },
  { slot: 4, scale: .88, mobileScale: .88, z: 3, depth: "-24px", x: "12px", y: "10px" }
];

async function loadData() {
  const fallback = await loadSeedData();
  const saved = localStorage.getItem(STORAGE_KEY);
  siteData = mergeSavedData(fallback, saved);
  render();
}

async function loadSeedData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Data load failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (window.NAUGHTY_SITE_DATA) {
      return JSON.parse(JSON.stringify(window.NAUGHTY_SITE_DATA));
    }
    throw error;
  }
}

function mergeSavedData(fallback, savedText) {
  if (!savedText) return fallback;
  const saved = JSON.parse(savedText);
  const merged = { ...fallback, ...saved };
  if (saved.assetVersion !== fallback.assetVersion) {
    const savedStaff = new Map((saved.staff || []).map((staff) => [staff.id, staff]));
    merged.shop = {
      ...fallback.shop,
      ...(saved.shop || {}),
      displayName: fallback.shop.displayName,
      concept: fallback.shop.concept
    };
    merged.staff = fallback.staff.map((seedStaff) => ({
      ...seedStaff,
      ...(savedStaff.get(seedStaff.id) || {}),
      photo: seedStaff.photo,
      heroPhoto: seedStaff.heroPhoto
    }));
    merged.materials = fallback.materials;
    merged.assetVersion = fallback.assetVersion;
  }
  return merged;
}

function asset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_ROOT}${path}`;
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getShift(date, staffId) {
  return siteData.shifts.find((shift) => shift.date === date && shift.staffId === staffId);
}

function getShiftDates() {
  const sorted = [...new Set(siteData.shifts.map((shift) => shift.date))].sort();
  const start = sorted[0] || dateKey(new Date());
  const startDate = new Date(`${start}T00:00:00`);
  return Array.from({ length: 14 }, (_, index) => {
    const next = new Date(startDate);
    next.setDate(startDate.getDate() + index);
    return dateKey(next);
  });
}

function visibleStaff() {
  return siteData.staff.filter((staff) => staff.publicVisible);
}

function renderHero() {
  document.getElementById("shop-name").textContent = siteData.shop.displayName;
  document.getElementById("shop-hours").textContent = `OPEN ${siteData.shop.hours}`;
  document.getElementById("shop-concept").textContent = siteData.shop.concept;

  const heroCast = document.getElementById("hero-cast");
  const people = visibleStaff().slice(0, 5);
  while (people.length < 5) {
    people.push({
      id: `fallback_${people.length}`,
      displayName: "",
      heroPhoto: heroFallbackPhotos[people.length] || heroFallbackPhotos[0],
      photo: heroFallbackPhotos[people.length] || heroFallbackPhotos[0]
    });
  }

  heroCast.innerHTML = people.map((person, index) => {
    const layout = heroLayout[index] || heroLayout[0];
    return `
    <img
      class="hero-person"
      src="${asset(person.heroPhoto || person.photo)}"
      alt=""
      loading="eager"
      decoding="async"
      fetchpriority="${index === 2 ? "high" : "auto"}"
      style="--slot:${layout.slot}; --cast-scale:${layout.scale}; --cast-mobile-scale:${layout.mobileScale}; --cast-z:${layout.z}; --cast-depth:${layout.depth}; --cast-shift-x:${layout.x}; --cast-y:${layout.y};"
    />
  `;
  }).join("");
}

function renderToday() {
  const todayList = document.getElementById("today-list");
  const date = getShiftDates()[0];
  const today = siteData.shifts
    .filter((shift) => shift.date === date && shift.status !== "off")
    .map((shift) => ({ ...shift, staff: siteData.staff.find((staff) => staff.id === shift.staffId) }))
    .filter((shift) => shift.staff && shift.staff.publicVisible);

  if (!today.length) {
    todayList.innerHTML = `<p>本日の公開出勤は未登録です。</p>`;
    return;
  }

  todayList.innerHTML = today.map((shift) => `
    <article class="today-pill">
      <img src="${asset(shift.staff.photo)}" alt="${shift.staff.displayName}" loading="lazy" decoding="async" />
      <div>
        <strong>${shift.staff.displayName}</strong>
        <span>${dateLabel(shift.date)} ${shift.start || ""}-${shift.end || ""} / ${statusLabel[shift.status]}</span>
      </div>
    </article>
  `).join("");
}

function renderCast() {
  const grid = document.getElementById("cast-grid");
  grid.innerHTML = visibleStaff().map((staff) => `
    <article class="cast-card">
      <div class="cast-photo">
        <img src="${asset(staff.photo)}" alt="${staff.displayName}" loading="lazy" decoding="async" />
      </div>
      <div class="cast-meta">
        <span class="status-badge ${staff.workStatus}">${statusLabel[staff.workStatus] || staff.workStatus}</span>
        <h3>${staff.displayName}<small> / ${staff.romanName || ""}</small></h3>
        <p>${staff.profileText}</p>
        <div class="cast-tags">
          ${(staff.tags || []).map((tag) => `<span>${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

function renderMaterials() {
  const grid = document.getElementById("material-grid");
  if (!grid) return;
  const materials = siteData.materials || [];
  grid.innerHTML = materials.map((item, index) => `
    <article class="material-card ${item.kind === "lineup" ? "wide" : ""}">
      <div class="material-photo ${item.kind}">
        <img src="${asset(item.image)}" alt="${item.title}" loading="lazy" decoding="async" />
      </div>
      <div class="material-meta">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <h3>${item.title}</h3>
        <p>${item.caption}</p>
      </div>
    </article>
  `).join("");
}

function renderShift() {
  const table = document.getElementById("shift-table");
  const dates = getShiftDates();
  table.style.gridTemplateColumns = `160px repeat(${dates.length}, minmax(92px, 1fr))`;

  const header = [
    `<div class="shift-cell head">CAST</div>`,
    ...dates.map((date) => `<div class="shift-cell head"><b>${dateLabel(date)}</b><span>${date.slice(0, 4)}</span></div>`)
  ].join("");

  const rows = visibleStaff().map((staff) => {
    const cells = dates.map((date) => {
      const shift = getShift(date, staff.id);
      if (!shift || shift.status === "off") {
        return `<div class="shift-cell off">休み</div>`;
      }
      return `
        <div class="shift-cell on">
          <b>${statusLabel[shift.status]}</b>
          <span>${shift.start}-${shift.end}</span>
          <small>${shift.publicNote || ""}</small>
        </div>
      `;
    }).join("");
    return `<div class="shift-cell cast-head"><b>${staff.displayName}</b><span>${staff.romanName || ""}</span></div>${cells}`;
  }).join("");

  table.innerHTML = header + rows;
}

function renderMenu() {
  const menu = document.getElementById("menu-grid");
  menu.innerHTML = siteData.products.filter((product) => product.active).map((product) => `
    <article class="menu-item">
      <h3>${product.name}</h3>
      <p>${product.category}</p>
      <strong>${yen(product.salePrice)}</strong>
      <div class="menu-tags">
        ${product.eventOnly ? "<span>EVENT ONLY</span>" : "<span>REGULAR</span>"}
      </div>
    </article>
  `).join("");
}

function renderEvents() {
  const events = document.getElementById("event-list");
  const visible = siteData.events.filter((event) => event.publicVisible);
  events.innerHTML = visible.map((event) => `
    <article class="event-item">
      <p class="section-kicker">${event.date}</p>
      <h3>${event.title}</h3>
      <p>${event.summary}</p>
    </article>
  `).join("");
}

function renderAccess() {
  document.getElementById("access-hours").textContent = siteData.shop.hours;
  document.getElementById("access-address").textContent = siteData.shop.address;
  document.getElementById("access-instagram").textContent = `@${siteData.shop.instagram}`;
}

function render() {
  renderHero();
  renderToday();
  renderCast();
  renderMaterials();
  renderShift();
  renderMenu();
  renderEvents();
  renderAccess();
  observeRevealTargets();
}

function shuffleHero() {
  heroOrder = heroOrder
    .map((slot) => ({ slot, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.slot);

  const heroCast = document.getElementById("hero-cast");
  heroCast.classList.add("is-glitching");
  setTimeout(() => {
    renderHero();
  }, 360);
  setTimeout(() => {
    heroCast.classList.remove("is-glitching");
  }, 760);
}

function bindHeroParallax() {
  const stage = document.getElementById("hero-stage");
  if (!stage) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frameId = 0;

  function tick() {
    currentX += (targetX - currentX) * .08;
    currentY += (targetY - currentY) * .08;
    stage.style.setProperty("--mx", currentX.toFixed(3));
    stage.style.setProperty("--my", currentY.toFixed(3));
    if (Math.abs(targetX - currentX) > .002 || Math.abs(targetY - currentY) > .002) {
      frameId = requestAnimationFrame(tick);
    } else {
      frameId = 0;
    }
  }

  function startTick() {
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    targetX = (((event.clientX - rect.left) / rect.width - .5) * 2) * .55;
    targetY = (((event.clientY - rect.top) / rect.height - .5) * 2) * .42;
    startTick();
  });
  window.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
    startTick();
  });
}

function startMotionCanvas() {
  const canvas = document.getElementById("motion-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dots = Array.from({ length: 34 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    r: index % 5 === 0 ? 1.7 : .9,
    vx: (Math.random() - .5) * .00022,
    vy: (Math.random() - .5) * .00018,
    phase: Math.random() * Math.PI * 2
  }));

  let width = 0;
  let height = 0;
  function resize() {
    const scale = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function frame(time) {
    const pink = "rgba(255, 62, 126, .2)";
    const alt = "rgba(255, 255, 255, .08)";
    const pale = "rgba(146, 230, 209, .1)";
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    dots.forEach((dot, index) => {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < -.05) dot.x = 1.05;
      if (dot.x > 1.05) dot.x = -.05;
      if (dot.y < -.05) dot.y = 1.05;
      if (dot.y > 1.05) dot.y = -.05;
      const x = dot.x * width;
      const y = dot.y * height + Math.sin(time * .00045 + dot.phase) * 7;
      ctx.fillStyle = index % 3 === 0 ? pink : pale;
      ctx.beginPath();
      ctx.arc(x, y, dot.r, 0, Math.PI * 2);
      ctx.fill();
      if (index % 4 === 0) {
        const next = dots[(index + 7) % dots.length];
        ctx.strokeStyle = alt;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(next.x * width, next.y * height);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = "rgba(255, 62, 126, .14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = height * (.2 + i * .22) + Math.sin(time * .00035 + i) * 8;
      ctx.moveTo(-40, y);
      ctx.bezierCurveTo(width * .24, y - 46, width * .58, y + 42, width + 40, y - 12);
    }
    ctx.stroke();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

let revealObserver = null;

function observeRevealTargets() {
  const targets = document.querySelectorAll(
    ".section-head, .today-pill, .concept-points span, .material-card, .cast-card, .shift-wrap, .menu-item, .event-item, .flow-list article, .map-panel, .shop-info"
  );
  if (!("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .16 });
  }
  targets.forEach((target) => {
    if (!target.classList.contains("is-visible")) revealObserver.observe(target);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    loadData();
  }
});

bindHeroParallax();
document.body.dataset.design = "vspark";
startMotionCanvas();
loadData();
