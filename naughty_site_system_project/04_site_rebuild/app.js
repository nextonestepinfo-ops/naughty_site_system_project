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

const $ = (selector) => document.querySelector(selector);

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

function siteAsset(path, fallback = "") {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  return `assets/${path}`;
}

function staffChibiIcon(staff) {
  return siteAsset(`chibi/${staff.id}-chibi.png`, asset(staff.photo));
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
          class="fv-cast-img fv-cast-art"
          src="${asset(person.heroPhoto || person.photo)}"
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="${index === 1 ? "high" : "auto"}"
        />
        <img
          class="fv-cast-img fv-cast-real"
          src="${asset(person.heroRealPhoto || person.photo || person.heroPhoto)}"
          alt=""
          loading="eager"
          decoding="async"
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
  const upcoming = upcomingShiftsForStaff(person.id, 3);
  const accentColors = ["#54d9e8", "#ff7aa8", "#f4d36a", "#8de8d4", "#7664dc"];
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
      <img class="talent-real-img" src="${asset(person.heroRealPhoto || person.photo || person.heroPhoto)}" alt="${person.displayName}" loading="lazy" decoding="async" />
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
      <p class="talent-comment">${person.shortComment || ""}</p>
      <p class="talent-profile">${person.profileText || ""}</p>
      <div class="talent-tags">
        ${(person.tags || []).map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <div class="talent-shifts">
        <strong>UPCOMING SHIFT</strong>
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

  const labels = {
    top: "TOP",
    now: "TODAY",
    schedule: "SCHEDULE",
    cast: "CAST",
    inside: "INSIDE",
    events: "EVENT",
    access: "ACCESS",
  };
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
    const idLabel = target.id ? labels[target.id] : "";
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

function bindHeroNoise() {
  const stage = $("#hero-stage");
  const cast = $("#hero-cast");
  if (!stage || !cast) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let showReal = false;

  function fireNoise() {
    stage.classList.add("is-glitching");
    cast.classList.add("is-glitching");
    window.setTimeout(() => {
      showReal = !showReal;
      cast.classList.toggle("is-real", showReal);
    }, 240);
    window.setTimeout(() => {
      stage.classList.remove("is-glitching");
      cast.classList.remove("is-glitching");
    }, 760);
  }

  window.setTimeout(() => {
    fireNoise();
    window.setInterval(fireNoise, 6800);
  }, 1800);
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
bindHeroMotion();
bindHeroNoise();
loadData();
