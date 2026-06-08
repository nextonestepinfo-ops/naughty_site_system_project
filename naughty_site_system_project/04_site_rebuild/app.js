const STORAGE_KEY = "naughty.siteData.v1";
const DATA_URL = "../03_system_seed/naughty_site_data.json";
const ASSET_ROOT = "../01_existing_site/";

const statusLabel = {
  working: "出勤中",
  soon: "まもなく",
  scheduled: "本日出勤",
  off: "休み",
  hidden: "非表示"
};

const statusRank = {
  working: 0,
  soon: 1,
  scheduled: 2,
  off: 3
};

let siteData = null;
let activeScheduleDate = "";
let activeTalentIndex = 0;
let talentTimer = 0;
let revealObserver = null;
let activeScrollMood = "";
let scrollMoodTimer = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const sectionLabels = {
  top: "TOP",
  now: "TODAY",
  schedule: "SCHEDULE",
  cast: "CAST",
  inside: "INSIDE",
  events: "EVENT",
  access: "ACCESS",
};

const sectionMoods = {
  top: ["rgba(255, 62, 126, .28)", "rgba(84, 217, 232, .12)", "rgba(255, 248, 251, .06)", "-8deg"],
  now: ["rgba(255, 62, 126, .22)", "rgba(244, 211, 106, .14)", "rgba(84, 217, 232, .1)", "4deg"],
  schedule: ["rgba(84, 217, 232, .18)", "rgba(255, 122, 168, .16)", "rgba(255, 248, 251, .06)", "10deg"],
  cast: ["rgba(255, 62, 126, .32)", "rgba(84, 217, 232, .2)", "rgba(141, 232, 212, .12)", "-14deg"],
  inside: ["rgba(255, 122, 168, .18)", "rgba(244, 211, 106, .14)", "rgba(84, 217, 232, .12)", "8deg"],
  events: ["rgba(118, 100, 220, .2)", "rgba(255, 62, 126, .2)", "rgba(244, 211, 106, .12)", "-4deg"],
  access: ["rgba(84, 217, 232, .18)", "rgba(141, 232, 212, .16)", "rgba(255, 62, 126, .1)", "12deg"],
};

async function loadData() {
  const fallback = await loadSeedData();
  const saved = localStorage.getItem(STORAGE_KEY);
  siteData = mergeSavedData(fallback, saved);
  activeScheduleDate = getTodayDate();
  render();
  startTalentAuto();
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
  try {
    const saved = JSON.parse(savedText);
    if (saved.assetVersion !== fallback.assetVersion) return fallback;
    return { ...fallback, ...saved };
  } catch {
    return fallback;
  }
}

function asset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_ROOT}${path}`;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Resolve a cast portrait. New data uses site-relative "assets/cast/..."
// (served from this folder). Older data may use "assets/transparent/*.png".
function heroPhoto(person) {
  const raw = person.heroRealPhoto || person.photo || person.heroPhoto || "";
  if (!raw) return "";
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("assets/cast/")) return raw;            // site-relative, already correct
  const webp = raw.replace(/\.png(\?|$)/i, ".webp$1");
  if (webp.startsWith("assets/")) return webp;               // other site-relative assets
  return asset(webp);                                        // legacy ../01_existing_site/ assets
}

function siteAsset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `assets/${path}`;
}

function staffChibiIcon(staff) {
  const known = ["staff_001","staff_002","staff_003","staff_004","staff_005","staff_006","staff_007"];
  if (known.includes(staff.id)) return siteAsset(`chibi/${staff.id}-chibi.webp?v=chibi-20260609`, heroPhoto(staff));
  return heroPhoto(staff);
}

// vspo-style hero portraits: new full-body cast art in assets/cast/cast-0N.webp
const CAST_PORTRAITS = [
  "assets/cast/cast-01.webp","assets/cast/cast-02.webp","assets/cast/cast-03.webp",
  "assets/cast/cast-04.webp","assets/cast/cast-05.webp","assets/cast/cast-06.webp",
  "assets/cast/cast-07.webp"
];
function castPortrait(index) {
  return CAST_PORTRAITS[index % CAST_PORTRAITS.length];
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function dayName(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
}

function visibleStaff() {
  return (siteData.staff || []).filter((staff) => staff.publicVisible);
}

function getScheduleDates() {
  return [...new Set((siteData.shifts || []).map((shift) => shift.date))].sort();
}

function getTodayDate() {
  const dates = getScheduleDates();
  const today = dateKey(new Date());
  return dates.includes(today) ? today : dates.find((date) => date >= today) || dates[0] || today;
}

function staffById(id) {
  return siteData.staff.find((staff) => staff.id === id);
}

function shiftsForDate(date) {
  return (siteData.shifts || [])
    .filter((shift) => shift.date === date)
    .map((shift) => ({ ...shift, staff: staffById(shift.staffId) }))
    .filter((shift) => shift.staff && shift.staff.publicVisible)
    .sort((a, b) => {
      const rank = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      if (rank !== 0) return rank;
      return String(a.start || "99:99").localeCompare(String(b.start || "99:99"));
    });
}

function todayShifts() {
  return shiftsForDate(getTodayDate()).filter((shift) => shift.status !== "off");
}

function shiftForStaffToday(staffId) {
  return shiftsForDate(getTodayDate()).find((shift) => shift.staffId === staffId);
}

function upcomingShiftsForStaff(staffId, limit = 3) {
  const today = getTodayDate();
  return (siteData.shifts || [])
    .filter((shift) => shift.staffId === staffId && shift.date >= today && shift.status !== "off")
    .sort((a, b) => {
      const dateOrder = String(a.date).localeCompare(String(b.date));
      if (dateOrder !== 0) return dateOrder;
      return String(a.start || "99:99").localeCompare(String(b.start || "99:99"));
    })
    .slice(0, limit);
}

function shiftTimeText(shift) {
  if (!shift || shift.status === "off") return "NEXT SCHEDULE SOON";
  return `${dateLabel(shift.date)} ${dayName(shift.date)} ${shift.start || ""}-${shift.end || ""}`;
}

function compactText(text, maxLength = 58) {
  if (!text) return "";
  const normalized = String(text).replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function renderHero() {
  const hours = siteData.shop.hours || "19:00-05:00";
  $("#hero-hours").textContent = hours;
  $("#nav-hours").textContent = `OPEN ${hours}`;

  const counts = todayShifts().reduce((acc, shift) => {
    acc[shift.status] = (acc[shift.status] || 0) + 1;
    return acc;
  }, {});
  $("#hero-status-summary").textContent =
    `出勤中 ${counts.working || 0} / まもなく ${counts.soon || 0} / 本日 ${todayShifts().length}`;

  buildHeroCast();
}

/* ===== hero cast: 3 near-equal figures in front of the logo, rotated as groups ===== */
let heroGroups = [];
let heroGroupIndex = 0;
let heroTimer = null;
const HERO_PER_GROUP = 3;

function buildHeroCast() {
  const stage = $("#hero-cast");
  if (!stage) return;
  const cast = visibleStaff();
  const people = cast.length
    ? cast.map((p, i) => ({ name: p.displayName || "", roman: p.romanName || "", src: castPortrait(i) }))
    : CAST_PORTRAITS.map((src) => ({ name: "", roman: "", src }));

  // chunk into groups of 3
  heroGroups = [];
  for (let i = 0; i < people.length; i += HERO_PER_GROUP) heroGroups.push(people.slice(i, i + HERO_PER_GROUP));
  if (!heroGroups.length) heroGroups = [[]];

  // each group is a layer; figures positioned in near-equal slots
  stage.innerHTML = heroGroups.map((group, gi) => {
    const n = group.length;
    const figs = group.map((person, idx) => {
      // even horizontal distribution; center slot sits marginally forward (depth, not size)
      const slotPct = n === 1 ? 50 : 50 + (idx - (n - 1) / 2) * (74 / Math.max(1, n));
      const mid = (n - 1) / 2;
      const depth = idx === Math.round(mid) ? "is-front" : "is-back";
      return `
        <span class="fv-cast-girl ${depth}" style="--x:${slotPct.toFixed(2)}%; --i:${idx}">
          <img class="fv-cast-img" src="${person.src}" alt="${esc(person.name)}"
               loading="${gi === 0 ? "eager" : "lazy"}" decoding="async" ${gi === 0 ? 'fetchpriority="high"' : ""} />
        </span>`;
    }).join("");
    return `<div class="fv-cast-group ${gi === 0 ? "is-active" : ""}" data-group="${gi}">${figs}</div>`;
  }).join("");

  // name labels + dots live in a sibling overlay
  renderHeroMeta();

  heroGroupIndex = 0;
  startHeroRotate();
}

function renderHeroMeta() {
  const dots = $("#hero-dots");
  if (dots) {
    dots.innerHTML = heroGroups.map((_, gi) =>
      `<button class="hero-dot ${gi === 0 ? "is-active" : ""}" data-go="${gi}" aria-label="cast group ${gi + 1}"></button>`
    ).join("");
    dots.querySelectorAll(".hero-dot").forEach(b =>
      b.addEventListener("click", () => goHeroGroup(Number(b.dataset.go), true))
    );
  }
  updateHeroNames();
}

function updateHeroNames() {
  const label = $("#hero-names");
  if (!label) return;
  const group = heroGroups[heroGroupIndex] || [];
  label.innerHTML = group.filter(p => p.name).map(p =>
    `<span class="hero-name-chip"><b>${esc(p.name)}</b><i>${esc(p.roman)}</i></span>`
  ).join("");
}

function goHeroGroup(idx, manual) {
  if (!heroGroups.length) return;
  heroGroupIndex = (idx + heroGroups.length) % heroGroups.length;
  $$("#hero-cast .fv-cast-group").forEach(g => {
    const on = Number(g.dataset.group) === heroGroupIndex;
    g.classList.toggle("is-active", on);
    if (on) g.querySelectorAll(".fv-cast-girl").forEach(f => { f.style.animation = "none"; void f.offsetWidth; f.style.animation = ""; });
  });
  $$("#hero-dots .hero-dot").forEach(d => d.classList.toggle("is-active", Number(d.dataset.go) === heroGroupIndex));
  updateHeroNames();
  if (manual) startHeroRotate();
}

function startHeroRotate() {
  clearInterval(heroTimer);
  if (heroGroups.length < 2) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = setInterval(() => goHeroGroup(heroGroupIndex + 1, false), 4600);
}

function statusBadge(status) {
  return `<span class="status-badge ${status}">${statusLabel[status] || status}</span>`;
}

function renderNow() {
  const shifts = todayShifts();
  $("#now-count").textContent = `${shifts.length} CAST`;

  if (!shifts.length) {
    $("#now-grid").innerHTML = `
      <article class="now-card reveal">
        <div class="now-photo"></div>
        <div class="now-meta">
          ${statusBadge("off")}
          <h3>本日の出勤情報は準備中です</h3>
          <p>公開まで少しお待ちください。</p>
        </div>
      </article>
    `;
    return;
  }

  $("#now-grid").innerHTML = shifts.map((shift) => `
    <article class="now-card now-icon-card reveal">
      <div class="now-chibi">
        <img src="${staffChibiIcon(shift.staff)}" alt="${shift.staff.displayName}" loading="lazy" decoding="async" />
      </div>
      <div class="now-meta">
        ${statusBadge(shift.status)}
        <h3>${shift.staff.displayName}<small> / ${shift.staff.romanName || ""}</small></h3>
        <p>${shift.start || ""}-${shift.end || ""} ${shift.publicNote || ""}</p>
      </div>
    </article>
  `).join("");
}

function renderScheduleTabs() {
  const dates = getScheduleDates().slice(0, 7);
  $("#day-tabs").innerHTML = dates.map((date, index) => `
    <button class="${date === activeScheduleDate ? "active" : ""}" type="button" data-date="${date}" role="tab" aria-selected="${date === activeScheduleDate}">
      ${index === 0 ? "TODAY" : dateLabel(date)} ${dayName(date)}
    </button>
  `).join("");
}

function renderScheduleList() {
  const shifts = shiftsForDate(activeScheduleDate);
  $("#schedule-list").innerHTML = shifts.map((shift) => `
    <article class="schedule-item reveal">
      <div>
        ${statusBadge(shift.status)}
        <h3>${shift.staff.displayName}<small> / ${shift.staff.romanName || ""}</small></h3>
      </div>
      <span class="time">${shift.status === "off" ? "OFF" : `${shift.start}-${shift.end}`}</span>
      <p class="note">${shift.publicNote || shift.staff.shortComment || ""}</p>
    </article>
  `).join("");
}

function renderTalentShowcase() {
  const staff = visibleStaff();
  const section = $(".talent-section");
  const icons = $("#talent-icons");
  const visual = $("#talent-visual");
  const panel = $("#talent-panel");
  if (!section || !icons || !visual || !panel) return;

  if (!staff.length) {
    icons.innerHTML = "";
    visual.innerHTML = "";
    panel.innerHTML = `
      <div class="talent-panel-inner">
        ${statusBadge("off")}
        <h3>CAST DATA COMING SOON</h3>
        <p>Master data is not ready yet.</p>
      </div>
    `;
    return;
  }

  if (activeTalentIndex >= staff.length) activeTalentIndex = 0;
  const person = staff[activeTalentIndex];
  const todayShift = shiftForStaffToday(person.id);
  const status = todayShift?.status || person.workStatus || "off";
  const upcoming = upcomingShiftsForStaff(person.id, 1);
  const accentColors = ["#54d9e8", "#ff5f9c", "#f4d36a", "#8de8d4", "#b09cff"];
  section.style.setProperty("--talent-bg-image", `url("${heroPhoto(person)}")`);
  section.style.setProperty("--talent-accent", accentColors[activeTalentIndex % accentColors.length]);

  icons.innerHTML = staff.map((candidate, index) => `
    <button
      class="talent-icon ${index === activeTalentIndex ? "active" : ""}"
      type="button"
      data-talent-index="${index}"
      aria-label="${candidate.displayName || candidate.romanName || "cast"}"
      aria-selected="${index === activeTalentIndex}"
    >
      <img src="${staffChibiIcon(candidate)}" alt="" loading="lazy" decoding="async" />
      <span>${candidate.romanName || candidate.displayName || ""}</span>
    </button>
  `).join("");

  visual.innerHTML = `
    <div class="talent-roman-bg" aria-hidden="true">${person.romanName || person.displayName || "NAUGHTY"}</div>
    <div class="talent-portrait">
      <img class="talent-real-img" src="${heroPhoto(person)}" alt="${person.displayName}" loading="lazy" decoding="async" />
    </div>
  `;

  panel.innerHTML = `
    <div class="talent-panel-inner">
      <div class="talent-status-line">
        ${statusBadge(status)}
        <span>${shiftTimeText(todayShift)}</span>
      </div>
      <p class="talent-kana">${person.romanName || "CAST"}</p>
      <h3>${person.displayName || ""}</h3>
      <p class="talent-comment">${compactText(person.shortComment || "", 34)}</p>
      <p class="talent-profile">${compactText(person.profileText || "", 62)}</p>
      <div class="talent-tags">
        ${(person.tags || []).slice(0, 2).map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <div class="talent-shifts">
        <strong>NEXT</strong>
        ${
          upcoming.length
            ? upcoming.map((shift) => `<span>${shiftTimeText(shift)} ${statusLabel[shift.status] || shift.status}</span>`).join("")
            : "<span>NEXT SCHEDULE SOON</span>"
        }
      </div>
    </div>
  `;
}

function renderEvents() {
  const events = (siteData.events || []).filter((event) => event.publicVisible).slice(0, 3);
  $("#event-list").innerHTML = events.map((event) => `
    <article class="event-card reveal">
      <time>${event.date}</time>
      <h3>${event.title}</h3>
      <p>${event.summary}</p>
    </article>
  `).join("");
}

function renderMenu() {
  const wrap = $("#menu-cats");
  if (!wrap) return;
  const cats = siteData.productCategories || [];
  const products = (siteData.products || []).filter(p => p.active && p.menuVisible !== false);

  // fall back: if no category metadata, group by raw category string
  const groups = cats.length ? cats : [...new Set(products.map(p => p.category))].map(k => ({ key: k, label: k, en: "" }));

  wrap.innerHTML = groups.map((cat, gi) => {
    const items = products.filter(p => p.category === cat.key);
    if (!items.length) return "";
    return `
      <div class="menu-cat reveal" style="--d:${gi * 0.06}s">
        <div class="menu-cat-head">
          <span class="menu-cat-en">${esc(cat.en || "")}</span>
          <h3>${esc(cat.label)}</h3>
        </div>
        <ul class="menu-items">
          ${items.map(p => `
            <li class="menu-item">
              <span class="mi-name">${esc(p.name)}</span>
              <span class="mi-dot" aria-hidden="true"></span>
              <span class="mi-price">¥${Number(p.salePrice).toLocaleString("ja-JP")}</span>
            </li>`).join("")}
        </ul>
      </div>`;
  }).join("");
}

function renderAccess() {
  $("#access-hours").textContent = siteData.shop.hours || "";
  $("#access-address").textContent = siteData.shop.address || "";
  $("#access-instagram").textContent = siteData.shop.instagram ? `@${siteData.shop.instagram}` : "";
  $("#access-payment").textContent = siteData.shop.payment || "";
}

function render() {
  renderHero();
  renderNow();
  renderScheduleTabs();
  renderScheduleList();
  renderTalentShowcase();
  renderMenu();
  renderEvents();
  renderAccess();
  observeRevealTargets();
}

function bindTabs() {
  document.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (dayButton) {
      activeScheduleDate = dayButton.dataset.date;
      renderScheduleTabs();
      renderScheduleList();
      observeRevealTargets();
      return;
    }

    const talentButton = event.target.closest("[data-talent-index]");
    if (talentButton) {
      setActiveTalent(Number(talentButton.dataset.talentIndex || 0), true);
      return;
    }

    const talentPrev = event.target.closest("[data-talent-prev]");
    const talentNext = event.target.closest("[data-talent-next]");
    if (talentPrev || talentNext) {
      setActiveTalent(activeTalentIndex + (talentNext ? 1 : -1), true);
      observeRevealTargets();
    }
  });
}

function bindSectionTransitions() {
  const transition = $("#section-transition");
  const label = $("#section-transition-label");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!transition || !label || reduceMotion.matches) return;

  let transitionTimer = 0;

  function targetFromLink(link) {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#") || href === "#") return null;
    try {
      return document.querySelector(href);
    } catch {
      return null;
    }
  }

  function transitionLabel(target) {
    const idLabel = target.id ? sectionLabels[target.id] : "";
    const sectionLabel = target.dataset.screenLabel || target.querySelector(".section-kicker")?.textContent;
    return (idLabel || sectionLabel || "NAUGHTY").trim().toUpperCase();
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;

    const target = targetFromLink(link);
    if (!target) return;

    event.preventDefault();
    window.clearTimeout(transitionTimer);
    label.textContent = transitionLabel(target);
    transition.classList.remove("is-active");
    transition.getBoundingClientRect();
    document.documentElement.classList.add("is-section-transitioning");
    transition.classList.add("is-active");

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target.id) history.pushState(null, "", `#${target.id}`);
    }, 180);

    transitionTimer = window.setTimeout(() => {
      transition.classList.remove("is-active");
      document.documentElement.classList.remove("is-section-transitioning");
    }, 500);
  });
}

function applyScrollMood(sectionId, shouldFlash = true) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mood = sectionMoods[sectionId] || sectionMoods.top;
  const flash = $("#scroll-mood-flash");
  document.body.dataset.mood = sectionId;
  document.body.style.setProperty("--mood-a", mood[0]);
  document.body.style.setProperty("--mood-b", mood[1]);
  document.body.style.setProperty("--mood-c", mood[2]);
  document.body.style.setProperty("--mood-rotate", mood[3]);

  if (!shouldFlash || reduceMotion || !flash) return;
  // on-scroll flash disabled (too loud); color mood still applies above.
  return;
}

function bindScrollMood() {
  const sections = [...document.querySelectorAll(".fv, .now-section, .schedule-section, .talent-section, .inside-section, .event-section, .access-section")]
    .filter((section) => section.id);
  if (!sections.length) return;

  applyScrollMood("top", false);

  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const nextMood = entry.target.id || "top";
      if (nextMood === activeScrollMood) return;
      const shouldFlash = !!activeScrollMood;
      activeScrollMood = nextMood;
      applyScrollMood(nextMood, shouldFlash);
    });
  }, { rootMargin: "-44% 0px -44% 0px", threshold: 0 });

  sections.forEach((section) => observer.observe(section));
}

function bindTalentSwipe() {
  const stage = $("#talent-stage");
  if (!stage) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  stage.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
  }, { passive: true });

  stage.addEventListener("touchend", (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    setActiveTalent(activeTalentIndex + (dx < 0 ? 1 : -1), true);
  }, { passive: true });
}

function setActiveTalent(index, resetTimer = false) {
  const staff = visibleStaff();
  if (!staff.length) return;
  activeTalentIndex = (index + staff.length) % staff.length;
  renderTalentShowcase();
  if (resetTimer) startTalentAuto();
}

function startTalentAuto() {
  window.clearInterval(talentTimer);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (visibleStaff().length < 2) return;
  talentTimer = window.setInterval(() => {
    setActiveTalent(activeTalentIndex + 1);
  }, 5600);
}

function bindHeroMotion() {
  const stage = $("#hero-stage");
  if (!stage) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frameId = 0;

  function updateFromPoint(x, y) {
    const rect = stage.getBoundingClientRect();
    targetX = (((x - rect.left) / rect.width - .5) * 2) * .55;
    targetY = (((y - rect.top) / rect.height - .5) * 2) * .45;
    startTick();
  }

  function tick() {
    currentX += (targetX - currentX) * .09;
    currentY += (targetY - currentY) * .09;
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

  window.addEventListener("pointermove", (event) => updateFromPoint(event.clientX, event.clientY), { passive: true });
}

function observeRevealTargets() {
  const targets = document.querySelectorAll(".reveal, .section-head");
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
    }, { rootMargin: "0px 0px -10% 0px", threshold: .14 });
  }
  targets.forEach((target) => {
    target.classList.add("reveal");
    if (!target.classList.contains("is-visible")) revealObserver.observe(target);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) loadData();
});

bindSectionTransitions();
bindTabs();
bindScrollMood();
bindTalentSwipe();
bindHeroMotion();
loadData();
