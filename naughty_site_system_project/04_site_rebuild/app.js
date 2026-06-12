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
let patternShiftTimer = 0;
let heroGroups = [];
let heroGroupIndex = 0;
let heroTimer = 0;
let heroLayoutMode = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const CAST_PORTRAITS = [
  "assets/cast/cast-01.webp",
  "assets/cast/cast-02.webp",
  "assets/cast/cast-03.webp",
  "assets/cast/cast-04.webp",
  "assets/cast/cast-05.webp",
  "assets/cast/cast-06.webp",
  "assets/cast/cast-07.webp"
];

const HERO_CAST_NAMES = ["なの", "お嬢", "みやび", "れい", "あこやえん", "めあ", "めしあ"];

function castPortrait(index) {
  return CAST_PORTRAITS[index % CAST_PORTRAITS.length];
}

const CAST_FIT = {
  "cast-01.webp": { mobileScale: .94, desktopScale: 1.02 },
  "cast-02.webp": { mobileScale: .9, desktopScale: 1 },
  "cast-03.webp": { mobileScale: .92, desktopScale: 1.02 },
  "cast-04.webp": { mobileScale: .92, desktopScale: 1.02 },
  "cast-05.webp": { mobileScale: .94, desktopScale: 1.03 },
  "cast-06.webp": { mobileScale: .9, desktopScale: 1 },
  "cast-07.webp": { mobileScale: .95, desktopScale: 1.03 }
};

function heroCastFit(src) {
  const filename = String(src).split("/").pop();
  return CAST_FIT[filename] || { mobileScale: .94, desktopScale: 1 };
}

const sectionLabels = {
  top: "TOP",
  now: "TODAY",
  schedule: "SCHEDULE",
  cast: "CAST",
  inside: "INSIDE",
  events: "EVENT",
  access: "ACCESS",
};

const SITE_PINK = "#ff2f78";

const sectionMoods = {
  top: [SITE_PINK, SITE_PINK, SITE_PINK, "-8deg"],
  now: [SITE_PINK, SITE_PINK, SITE_PINK, "4deg"],
  schedule: [SITE_PINK, SITE_PINK, SITE_PINK, "10deg"],
  cast: [SITE_PINK, SITE_PINK, SITE_PINK, "-14deg"],
  inside: [SITE_PINK, SITE_PINK, SITE_PINK, "8deg"],
  events: [SITE_PINK, SITE_PINK, SITE_PINK, "-4deg"],
  access: [SITE_PINK, SITE_PINK, SITE_PINK, "12deg"],
};

const sectionShiftVectors = {
  top: ["320px", "-180px", "-2deg"],
  now: ["-280px", "210px", "2deg"],
  schedule: ["360px", "160px", "-1.5deg"],
  cast: ["-340px", "-220px", "2.5deg"],
  inside: ["300px", "-260px", "-2deg"],
  events: ["-360px", "180px", "1.5deg"],
  access: ["280px", "240px", "-1deg"],
};

async function loadData() {
  const fallback = await loadSeedData();
  const saved = localStorage.getItem(STORAGE_KEY);
  siteData = mergeSavedData(fallback, saved);
  activeScheduleDate = getTodayDate();
  render();
  startTalentAuto();
  restoreHashTarget();
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

// Prefer optimized .webp for the transparent hero portraits.
// Source data points at .png (e.g. "assets/transparent/real_01.png?v=...");
// the build pipeline produces a matching .webp next to it.
function heroPhoto(person) {
  const raw = person.heroRealPhoto || person.photo || person.heroPhoto || "";
  if (raw.startsWith("assets/cast/") || raw.startsWith("assets/portraits/")) return raw;
  const webp = raw.replace(/\.png(\?|$)/i, ".webp$1");
  return asset(webp);
}

function siteAsset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `assets/${path}`;
}

function staffPortraitIcon(staff) {
  const raw = staff.portraitIcon || "";
  if (/^https?:\/\//.test(raw) || raw.startsWith("assets/")) return raw;
  if (raw) return siteAsset(raw);
  return heroPhoto(staff);
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

function restoreHashTarget() {
  if (!location.hash) return;
  let target = null;
  try {
    target = document.querySelector(location.hash);
  } catch {
    return;
  }
  if (!target) return;
  const align = () => {
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  };
  window.setTimeout(align, 120);
  let attempts = 0;
  const timer = window.setInterval(() => {
    align();
    attempts += 1;
    if (attempts >= 14) window.clearInterval(timer);
  }, 420);
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

function heroMode() {
  return window.matchMedia("(max-width:720px)").matches ? "mobile" : "desktop";
}

function shuffleItems(items) {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildHeroCast() {
  const stage = $("#hero-cast");
  if (!stage) return;

  const people = CAST_PORTRAITS.map((src, index) => ({
    name: HERO_CAST_NAMES[index] || "",
    roman: "",
    src,
    fit: heroCastFit(src)
  }));
  const mode = heroMode();
  const target = mode === "mobile" ? 2 : 3;
  const shuffled = shuffleItems(people);

  heroLayoutMode = mode;
  heroGroups = [];

  if (people.length <= target) {
    heroGroups = [shuffled];
  } else {
    for (let i = 0; i < shuffled.length; i += target) {
      const group = shuffled.slice(i, i + target);
      if (group.length < target) {
        const used = new Set(group.map((person) => person.src));
        const pool = shuffleItems(people.filter((person) => !used.has(person.src)));
        while (group.length < target && pool.length) group.push(pool.shift());
      }
      heroGroups.push(group);
    }
  }

  if (!heroGroups.length) heroGroups = [[]];

  stage.innerHTML = heroGroups.map((group, groupIndex) => {
    const count = group.length;
    const slots = mode === "mobile"
      ? { 1: [50], 2: [30, 70], 3: [24, 50, 76] }
      : { 1: [50], 2: [36, 64], 3: [29, 50, 71], 4: [20, 40, 60, 80] };
    const figures = group.map((person, index) => {
      const slot = (slots[count] && slots[count][index]) || 50;
      const middle = (count - 1) / 2;
      const depth = Math.abs(index - middle) < 1 ? "is-front" : "is-back";
      const scale = mode === "mobile" ? person.fit.mobileScale : person.fit.desktopScale;
      return `
        <span class="fv-cast-girl ${depth}" style="--x:${slot.toFixed(2)}%; --cast-scale:${scale}; --i:${index}">
          <img
            class="fv-cast-img"
            src="${person.src}"
            alt=""
            loading="${groupIndex === 0 ? "eager" : "lazy"}"
            decoding="async"
            ${groupIndex === 0 ? 'fetchpriority="high"' : ""}
          />
        </span>`;
    }).join("");
    return `<div class="fv-cast-group ${groupIndex === 0 ? "is-active" : ""}" data-group="${groupIndex}" data-n="${count}">${figures}</div>`;
  }).join("");

  heroGroupIndex = 0;
  renderHeroMeta();
  startHeroRotate();
}

function renderHeroMeta() {
  const dots = $("#hero-dots");
  if (dots) {
    dots.innerHTML = heroGroups.map((_, groupIndex) =>
      `<button class="hero-dot ${groupIndex === 0 ? "is-active" : ""}" data-go="${groupIndex}" aria-label="cast group ${groupIndex + 1}"></button>`
    ).join("");
    dots.querySelectorAll(".hero-dot").forEach((button) => {
      button.addEventListener("click", () => goHeroGroup(Number(button.dataset.go), true));
    });
  }
  updateHeroNames();
}

function updateHeroNames() {
  const label = $("#hero-names");
  if (label) label.innerHTML = "";
}

function goHeroGroup(index, manual) {
  if (!heroGroups.length) return;
  heroGroupIndex = (index + heroGroups.length) % heroGroups.length;

  $$("#hero-cast .fv-cast-group").forEach((group) => {
    const active = Number(group.dataset.group) === heroGroupIndex;
    group.classList.toggle("is-active", active);
    if (active) {
      group.style.transform = "";
      group.querySelectorAll(".fv-cast-girl").forEach((figure) => {
        figure.style.animation = "none";
        void figure.offsetWidth;
        figure.style.animation = "";
      });
    }
  });

  $$("#hero-dots .hero-dot").forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.go) === heroGroupIndex);
  });

  const fx = $("#hero-switch-fx");
  if (fx) {
    fx.classList.remove("is-playing");
    void fx.offsetWidth;
    fx.classList.add("is-playing");
  }

  updateHeroNames();
  if (manual) startHeroRotate();
}

function startHeroRotate() {
  window.clearInterval(heroTimer);
  if (heroGroups.length < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = window.setInterval(() => goHeroGroup(heroGroupIndex + 1, false), 4600);
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
        <img src="${staffPortraitIcon(shift.staff)}" alt="${shift.staff.displayName}" loading="lazy" decoding="async" />
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
  const accentColors = [SITE_PINK];
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
      <img src="${staffPortraitIcon(candidate)}" alt="" loading="lazy" decoding="async" />
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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function targetFromLink(link) {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#") || href === "#") return null;
    try {
      return document.querySelector(href);
    } catch {
      return null;
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;

    const target = targetFromLink(link);
    if (!target) return;

    event.preventDefault();
    if (!reduceMotion.matches) triggerPatternShift(target.id || "top");

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target.id) history.pushState(null, "", `#${target.id}`);
    }, reduceMotion.matches ? 0 : 80);
  });
}

function triggerPatternShift(sectionId) {
  const vector = sectionShiftVectors[sectionId] || sectionShiftVectors.top;
  const root = document.documentElement;
  root.style.setProperty("--pattern-shift-x", vector[0]);
  root.style.setProperty("--pattern-shift-y", vector[1]);
  root.style.setProperty("--pattern-shift-rotate", vector[2]);
  window.clearTimeout(patternShiftTimer);
  root.classList.remove("is-pattern-shifting");
  root.getBoundingClientRect();
  root.classList.add("is-pattern-shifting");
  patternShiftTimer = window.setTimeout(() => {
    root.classList.remove("is-pattern-shifting");
  }, 1040);
}

function applyScrollMood(sectionId, shouldFlash = true) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mood = sectionMoods[sectionId] || sectionMoods.top;
  document.body.dataset.mood = sectionId;
  document.body.style.setProperty("--mood-a", mood[0]);
  document.body.style.setProperty("--mood-b", mood[1]);
  document.body.style.setProperty("--mood-c", mood[2]);
  document.body.style.setProperty("--mood-rotate", mood[3]);

  if (!shouldFlash || reduceMotion) return;
  window.clearTimeout(scrollMoodTimer);
  scrollMoodTimer = window.setTimeout(() => triggerPatternShift(sectionId), 20);
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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lines = stage.querySelector(".hero-lines");
  const bgtext = stage.querySelector(".hero-bgtext");

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frameId = 0;

  function updateFromPoint(x, y) {
    const rect = stage.getBoundingClientRect();
    targetX = ((x - rect.left) / rect.width - .5) * 2;
    targetY = ((y - rect.top) / rect.height - .5) * 2;
    startTick();
  }

  function tick() {
    currentX += (targetX - currentX) * .08;
    currentY += (targetY - currentY) * .08;
    stage.style.setProperty("--mx", currentX.toFixed(3));
    stage.style.setProperty("--my", currentY.toFixed(3));

    if (bgtext) {
      bgtext.style.transform =
        `perspective(1100px) translate3d(${(-currentX * 34).toFixed(1)}px, ${(-currentY * 22).toFixed(1)}px, -120px) ` +
        `rotateX(${(currentY * 4).toFixed(2)}deg) rotateY(${(-currentX * 6).toFixed(2)}deg) scale(1.06)`;
    }

    if (lines) {
      lines.style.transform =
        `perspective(1100px) translate3d(${(currentX * 12).toFixed(1)}px, ${(currentY * 8).toFixed(1)}px, -40px) ` +
        `rotateY(${(currentX * 2).toFixed(2)}deg)`;
    }

    const activeGroup = stage.querySelector(".fv-cast-group.is-active");
    if (activeGroup) {
      activeGroup.style.transform = `translate(${(currentX * 10).toFixed(1)}px, ${(currentY * 6).toFixed(1)}px)`;
    }

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

function bindHeroResize() {
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!siteData) return;
      const nextMode = heroMode();
      if (nextMode !== heroLayoutMode) buildHeroCast();
    }, 120);
  }, { passive: true });
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

window.addEventListener("hashchange", restoreHashTarget);

bindSectionTransitions();
bindTabs();
bindScrollMood();
bindTalentSwipe();
bindHeroMotion();
bindHeroResize();
loadData();
