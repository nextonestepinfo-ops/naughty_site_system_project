/* NAUGHTY V3 CMS adapter.
 * Reads the existing local CMS shape and exposes the handoff design's
 * window.NTY contract without changing the admin system data model.
 */
(function () {
  const STORAGE_KEY = "naughty.siteData.v1";

  const DEFAULT_CAST = [
    ["nano", "NANO", "なの", "静かに効く、いたずら担当。", "さりげなく隣に座るのに、気づけば目が離せない。", ["sweet", "counter"]],
    ["ojo", "OJO", "お嬢", "気高く、あまく。", "上品さと小悪魔さの両方。今夜はどうする？", ["elegant", "vip"]],
    ["miyabi", "MIYABI", "みやび", "夜のいちばん奥で待ってます。", "しっとりと雰囲気をつくる、長居したくなる存在。", ["mellow", "talk"]],
    ["rei", "REI", "れい", "クールで話しやすい雰囲気。", "クールでも話しやすい、カウンター映えする存在感。", ["cool", "bar"]],
    ["akoyaen", "AKOYAEN", "あこやえん", "笑わせる自信、あります。", "明るくてトーク上手。初めてでもすぐ打ち解けられる。", ["bright", "funny"]],
    ["mea", "MEA", "めあ", "甘えん坊、ときどき小悪魔。", "距離の詰め方が上手。気づけばペースに巻き込まれてる。", ["cute", "sweet"]],
    ["meshia", "MESHIA", "めしあ", "ふたりだけの秘密、つくりましょ。", "ミステリアスで目が離せない、今夜の主役。", ["mystery", "show"]]
  ];

  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const STATUS_TO_TODAY = {
    working: "now",
    soon: "soon",
    scheduled: "today",
    today: "today"
  };
  const STATUS_LABEL = {
    now: "出勤中",
    soon: "まもなく",
    today: "本日出勤",
    off: "休み"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function readData() {
    const fallback = clone(window.NAUGHTY_SITE_DATA || {});
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (error) {
      saved = null;
    }

    if (!saved || typeof saved !== "object") return normalizeRaw(fallback);

    return normalizeRaw({
      ...fallback,
      ...saved,
      shop: { ...(fallback.shop || {}), ...(saved.shop || {}) },
      staff: Array.isArray(saved.staff) ? saved.staff : fallback.staff,
      shifts: Array.isArray(saved.shifts) ? saved.shifts : fallback.shifts,
      events: Array.isArray(saved.events) ? saved.events : fallback.events,
      products: Array.isArray(saved.products) ? saved.products : fallback.products,
      materials: Array.isArray(saved.materials) ? saved.materials : fallback.materials
    });
  }

  function normalizeRaw(data) {
    return {
      ...data,
      shop: data.shop || {},
      staff: Array.isArray(data.staff) ? data.staff : [],
      shifts: Array.isArray(data.shifts) ? data.shifts : [],
      events: Array.isArray(data.events) ? data.events : [],
      products: Array.isArray(data.products) ? data.products : [],
      materials: Array.isArray(data.materials) ? data.materials : []
    };
  }

  function asset(path, fallback = "") {
    const value = String(path || "").trim();
    if (!value) return fallback;
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    if (value.startsWith("../")) return value;
    if (value.startsWith("/")) return value;
    if (value.startsWith("uploads/")) return `../01_existing_site/${value}`;
    if (value.startsWith("assets/transparent/")) return `../01_existing_site/${value}`;
    return value;
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDate(key) {
    const parsed = new Date(`${key}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function addDays(base, amount) {
    const next = new Date(base);
    next.setDate(base.getDate() + amount);
    return next;
  }

  function displayHours(hours) {
    const text = String(hours || "19:00-05:00").trim();
    return text.replace(/\s*[—-]\s*/g, " — ");
  }

  function compactHours(hours) {
    return displayHours(hours).replace(/\s*—\s*/g, "-");
  }

  function instagramHandle(raw) {
    const handle = String(raw || "naughty_hiroshima").trim().replace(/^@/, "");
    return handle || "naughty_hiroshima";
  }

  function instagramUrl(raw) {
    const handle = instagramHandle(raw);
    return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  }

  function mapUrl(address) {
    return `https://maps.google.com/?q=${encodeURIComponent(address || "広島市中区流川町")}`;
  }

  function visibleStaff(data) {
    const staff = data.staff.filter((item) => item.publicVisible !== false);
    if (staff.length) return staff;
    return DEFAULT_CAST.map((item, index) => ({
      id: item[0],
      romanName: item[1],
      displayName: item[2],
      shortComment: item[3],
      profileText: item[4],
      tags: item[5],
      publicVisible: true,
      photo: `assets/cast/cast-0${index + 1}.webp`,
      heroPhoto: `assets/cast/cast-0${index + 1}.webp`
    }));
  }

  function timeText(shift) {
    if (!shift || shift.status === "off") return "未定";
    if (!shift.start || !shift.end) return "未定";
    return `${shift.start} — ${shift.end}`;
  }

  function normalizeTodayStatus(shift) {
    if (!shift || shift.status === "off") return "off";
    return STATUS_TO_TODAY[shift.status] || "today";
  }

  function buildShop(data) {
    const shop = data.shop;
    const handle = instagramHandle(shop.instagram);
    const address = shop.address || "広島県広島市中区 流川町エリア";
    const open = displayHours(shop.hours);
    return {
      name: shop.displayName || shop.name || "NAUGHTY",
      reading: "ノーティ",
      tagline: "little-devil concept cafe",
      area: "HIROSHIMA / NAGAREKAWA",
      areaJp: shop.areaJp || "広島・流川",
      open,
      openShort: compactHours(shop.hours),
      address,
      addressNote: shop.accessNote || "詳しい場所は Instagram / DM でご案内します",
      instagram: `@${handle}`,
      instagramUrl: instagramUrl(handle),
      mail: shop.mail || "",
      mapUrl: mapUrl(address),
      pay: shop.payment || "現金 / 各種クレジット / 電子マネー",
      holiday: shop.holiday || "不定休",
      concept: shop.concept || "黒にピンクが一滴。広島・流川の小さなコンセプトカフェ「NAUGHTY」。"
    };
  }

  function buildCast(data, staffList, days) {
    return staffList.map((staff, index) => {
      const fallback = DEFAULT_CAST[index % DEFAULT_CAST.length];
      const img = asset(staff.heroPhoto || staff.photo, `assets/cast/cast-0${(index % 7) + 1}.webp`);
      const today = days[0]?.entries.find((entry) => entry.castId === staff.id);
      const next = nextShift(days, staff.id);
      const todayStatus = today ? today.status : "off";
      const badge = today
        ? {
            kind: "today",
            label: STATUS_LABEL[todayStatus] || "本日出勤",
            detail: `${days[0].month}/${days[0].d} ${days[0].dowEn} ${today.time.replace(" — ", "-")}`
          }
        : {
            kind: "next",
            label: "次回出勤",
            detail: next || "調整中"
          };

      return {
        id: staff.id || fallback[0],
        en: String(staff.romanName || fallback[1] || "CAST").toUpperCase(),
        jp: staff.displayName || fallback[2],
        img,
        real: img,
        card: asset(staff.photo || staff.portraitIcon || staff.heroPhoto, img),
        catch: staff.shortComment || fallback[3],
        comment: staff.profileText || staff.shortComment || fallback[4],
        tags: Array.isArray(staff.tags) && staff.tags.length ? staff.tags.slice(0, 4) : fallback[5],
        next: next || "調整中",
        todayState: todayStatus,
        todayTime: today ? today.time.replace(" — ", "-") : null,
        badge
      };
    });
  }

  function nextShift(days, staffId) {
    for (const day of days) {
      const entry = day.entries.find((item) => item.castId === staffId);
      if (!entry) continue;
      const when = day.isToday ? "本日" : `${day.month}/${day.d}(${day.dowJp})`;
      const time = entry.time === "未定" ? "時間未定" : `${entry.time.split(" — ")[0]}〜`;
      return `${when} ${time}`;
    }
    return "";
  }

  function buildDays(data, staffList) {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const byDate = new Map();
    data.shifts.forEach((shift) => {
      if (!shift || !shift.date) return;
      if (!byDate.has(shift.date)) byDate.set(shift.date, []);
      byDate.get(shift.date).push(shift);
    });

    return Array.from({ length: 14 }, (_, idx) => {
      const date = addDays(base, idx);
      const key = dateKey(date);
      const dow = date.getDay();
      const dateShifts = byDate.get(key) || [];
      const hasAnyShiftRecord = dateShifts.length > 0;
      const entries = [];

      staffList.forEach((staff, staffIndex) => {
        const shift = dateShifts.find((item) => item.staffId === staff.id);
        if (!shift && !hasAnyShiftRecord) {
          entries.push({
            castId: staff.id,
            cast: null,
            ci: staffIndex,
            time: "未定",
            status: "today"
          });
          return;
        }
        if (!shift || shift.status === "off") return;
        entries.push({
          castId: staff.id,
          cast: null,
          ci: staffIndex,
          time: timeText(shift),
          status: normalizeTodayStatus(shift)
        });
      });

      const tbd = entries.length > 0 && entries.every((entry) => entry.time === "未定");
      const closed = entries.length === 0;
      return {
        idx,
        date,
        key,
        d: date.getDate(),
        month: date.getMonth() + 1,
        dow,
        dowJp: DOW[dow],
        dowEn: DOW_EN[dow],
        isToday: idx === 0,
        weekend: dow === 0 || dow === 5 || dow === 6,
        entries,
        tbd,
        closed,
        state: closed ? "closed" : tbd ? "tbd" : "open"
      };
    });
  }

  function attachCast(days, cast) {
    const castByStaff = new Map(cast.map((item, index) => [item.id, { item, index }]));
    days.forEach((day) => {
      day.entries.forEach((entry) => {
        const found = castByStaff.get(entry.castId);
        if (found) {
          entry.cast = found.item;
          entry.ci = found.index;
        }
      });
      day.entries = day.entries.filter((entry) => entry.cast);
    });
  }

  function buildToday(days) {
    const order = { now: 0, soon: 1, today: 2 };
    const list = (days[0]?.entries || [])
      .filter((entry) => entry.status !== "off")
      .map((entry) => ({ cast: entry.cast, time: entry.time, status: entry.status }))
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    return {
      list,
      counts: {
        now: list.filter((item) => item.status === "now").length,
        soon: list.filter((item) => item.status === "soon").length,
        total: list.length
      }
    };
  }

  function buildEvents(data) {
    const items = data.events
      .filter((event) => event.publicVisible !== false)
      .slice(0, 3)
      .map((event) => ({
        date: event.date || "近日",
        tag: event.tag || "EVENT",
        title: event.title || "イベント",
        desc: event.summary || event.description || "詳細は近日公開します。"
      }));
    return {
      lead: "近日開催のイベント情報。",
      note: "最新の開催スケジュールは Instagram で先行告知します。",
      items
    };
  }

  function buildInside(data) {
    const materialImages = data.materials
      .map((item) => asset(item.image))
      .filter(Boolean);
    return [
      {
        no: "INSIDE 01 / COUNTER",
        title: "話せるカウンター席",
        body: "黒にピンクの光が浮かぶカウンターで、キャストとゆっくりお話ししながら夜を過ごせます。",
        tags: ["TALK", "COUNTER", "NIGHT"],
        slot: "inside-counter",
        placeholder: "カウンター写真をドロップ",
        image: materialImages[0] || "assets/interior/sample-interior-counter.webp"
      },
      {
        no: "INSIDE 02 / PLAY",
        title: "歌って、遊んで、写真を残す",
        body: "カラオケで盛り上がったり、ダーツで遊んだり、一緒に撮った写真をその日の記憶にできます。",
        tags: ["KARAOKE", "DARTS", "PHOTO"],
        slot: "inside-darts",
        placeholder: "ダーツ / フォトスポット写真をドロップ",
        image: materialImages[1] || "assets/interior/sample-interior-darts.webp"
      }
    ];
  }

  function buildGallery(data) {
    return data.materials
      .filter((item) => item.publicVisible !== false)
      .map((item, index) => ({
        id: item.id || `gallery-${index + 1}`,
        no: `GALLERY ${String(index + 1).padStart(2, "0")}`,
        title: item.title || "NAUGHTY GALLERY",
        caption: item.caption || "店内の雰囲気を切り取ったギャラリーです。",
        kind: item.kind || "photo",
        image: asset(item.image, "assets/interior/sample-interior-counter.webp")
      }));
  }

  function buildNty() {
    const data = readData();
    const shop = buildShop(data);
    const staffList = visibleStaff(data);
    const days = buildDays(data, staffList);
    const cast = buildCast(data, staffList, days);
    attachCast(days, cast);
    const today = buildToday(days);
    const events = buildEvents(data);
    const recruit = {
      kicker: "JOIN US — 一緒に夜をつくる仲間を募集",
      title: "いたずらっ子、募集中。",
      sub: "未経験・体験入店OK。流川の小さなコンセプトカフェで、あなたらしく働けます。",
      merits: [
        { t: "未経験OK", d: "ほとんどのキャストが未経験スタート。研修とサポートあり。" },
        { t: "自由シフト", d: "週1・短時間から相談可。学業や掛け持ちとも両立できます。" },
        { t: "日払い対応", d: "急な出費にも安心。頑張りはその日にしっかり還元。" },
        { t: "送り・衣装", d: "送りや衣装の貸し出しなど、働きやすい環境を用意。" }
      ],
      href: "recruit.html"
    };
    const sections = [
      { id: "top", num: "00", en: "TOP", jp: "トップ", tone: "ink" },
      { id: "today", num: "01", en: "TODAY", jp: "本日の出勤", tone: "pink" },
      { id: "schedule", num: "02", en: "SCHEDULE", jp: "出勤予定", tone: "panel" },
      { id: "cast", num: "03", en: "CAST", jp: "キャスト", tone: "ink" },
      { id: "gallery", num: "04", en: "GALLERY", jp: "店内ギャラリー", tone: "panel" },
      { id: "inside", num: "05", en: "INSIDE", jp: "店内紹介", tone: "panel" },
      { id: "event", num: "06", en: "EVENT", jp: "イベント", tone: "pink" },
      { id: "access", num: "07", en: "ACCESS", jp: "アクセス", tone: "ink" },
      { id: "recruit", num: "08", en: "RECRUIT", jp: "採用情報", tone: "panel" }
    ];

    return {
      shop,
      venue: shop,
      cast,
      shifts: days,
      schedule: { days },
      todayList: today.list,
      todayCounts: today.counts,
      events,
      event: events,
      gallery: buildGallery(data),
      inside: buildInside(data),
      recruit,
      sections,
      DOW,
      DOW_EN,
      raw: data
    };
  }

  window.NTY_SOURCE_DATA = readData();
  window.NTY = buildNty();

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) window.location.reload();
  });
})();
