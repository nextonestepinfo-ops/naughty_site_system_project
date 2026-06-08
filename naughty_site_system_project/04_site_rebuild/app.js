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

// Prefer optimized .webp for the transparent hero portraits.
// Source data points at .png (e.g. "assets/transparent/real_01.png?v=...");
// the build pipeline produces a matching .webp next to it.
function heroPhoto(person) {
  const raw = person.heroRealPhoto || person.photo || person.heroPhoto || "";
  const webp = raw.replace(/\.png(\?|$)/i, ".webp$1");
  return asset(webp);
}

function siteAsset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `assets/${path}`;
}

function staffChibiIcon(staff) {
  return siteAsset(`chibi/${staff.id}-chibi.webp`, asset(staff.photo));
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

  $("#hero-cast").innerHTML = visibleStaff().slice(0, 5).map((person, index) => `
      <span class="fv-cast-girl fv-cast-girl-${index + 1}" style="--slot:${index}">
        <img
          class="fv-cast-img fv-cast-real"
          src="${heroPhoto(person)}"
          alt=""
          loading="${index <= 1 ? "eager" : "lazy"}"
          decoding="async"
          fetchpriority="${index === 1 ? "high" : "auto"}"
        />
      </span>
    `).join("");
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
  section.style.setProperty("--talent-bg-image", `url("${asset(person.photo || person.heroPhoto)}")`);
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
    }, 310);

    transitionTimer = window.setTimeout(() => {
      transition.classList.remove("is-active");
      document.documentElement.classList.remove("is-section-transitioning");
    }, 1120);
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
  window.clearTimeout(scrollMoodTimer);
  flash.dataset.label = sectionLabels[sectionId] || "NAUGHTY";
  flash.classList.remove("is-active");
  flash.getBoundingClientRect();
  flash.classList.add("is-active");
  scrollMoodTimer = window.setTimeout(() => flash.classList.remove("is-active"), 760);
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
