const STORAGE_KEY = "naughty.siteData.v1";
const THEME_KEY = "naughty.admin.theme";
const BACKUP_KEY = "naughty.siteData.backups.v1";
const BACKUP_LIMIT = 5;
const DATA_URL = "../03_system_seed/naughty_site_data.json";
const ASSET_ROOT = "../04_site_rebuild/";
const LEGACY_ASSET_ROOT = "../01_existing_site/";
const MORE_VIEWS = new Set(["site", "gallery", "menu", "events", "payroll"]);
const IMAGE_MAX_SIDE = 1400;
const IMAGE_QUALITY = 0.86;

const statusLabel = {
  working: "出勤中",
  soon: "まもなく",
  scheduled: "予定",
  off: "休み"
};

let data = null;
let selectedStaffId = "";
let selectedProductId = "";
let selectedEventId = "";
let selectedMaterialId = "";
let selectedDate = "";
let lastSavedSnapshot = null;
let pendingPreviewMessage = "";

const $ = (selector) => document.querySelector(selector);

try {
  document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

async function loadData() {
  const fallback = await loadSeedData();
  const saved = localStorage.getItem(STORAGE_KEY);
  data = normalizeData(mergeSavedData(fallback, saved));
  lastSavedSnapshot = clone(data);
  selectedStaffId = data.staff[0]?.id || "";
  selectedProductId = data.products[0]?.id || "";
  selectedEventId = data.events[0]?.id || "";
  selectedMaterialId = data.materials[0]?.id || "";
  selectedDate = shiftDates()[0] || "";
  renderAll();
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
    const fallbackStaffIds = new Set((fallback.staff || []).map((staff) => staff.id));
    merged.staff = fallback.staff.map((seedStaff) => ({
      ...seedStaff,
      ...(savedStaff.get(seedStaff.id) || {}),
      photo: uploadedImage(savedStaff.get(seedStaff.id)?.photo) ? savedStaff.get(seedStaff.id).photo : seedStaff.photo,
      heroPhoto: uploadedImage(savedStaff.get(seedStaff.id)?.heroPhoto) ? savedStaff.get(seedStaff.id).heroPhoto : seedStaff.heroPhoto
    })).concat((saved.staff || []).filter((staff) => !fallbackStaffIds.has(staff.id)));
    merged.materials = (saved.materials || []).some((item) => uploadedImage(item.image))
      ? saved.materials
      : fallback.materials;
    merged.assetVersion = fallback.assetVersion;
  }
  return hydrateStaffImages(merged, fallback);
}

function hydrateStaffImages(next, fallback) {
  const seedStaff = new Map((fallback.staff || []).map((staff) => [staff.id, staff]));
  return {
    ...next,
    staff: (next.staff || []).map((staff) => {
      const seed = seedStaff.get(staff.id) || {};
      return {
        ...staff,
        photo: staff.photo || seed.photo || "",
        heroPhoto: staff.heroPhoto || seed.heroPhoto || staff.photo || seed.photo || ""
      };
    })
  };
}

function normalizeData(next) {
  return {
    ...next,
    staff: next.staff || [],
    products: next.products || [],
    events: next.events || [],
    materials: next.materials || [],
    shifts: next.shifts || [],
    sales: next.sales || [],
    punches: next.punches || [],
    shop: next.shop || {}
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function saveData(message = "保存しました", options = {}) {
  if (options.preview) {
    openPublishPreview(message);
    return;
  }
  commitData(message);
}

function commitData(message = "保存しました") {
  const stored = readStoredData();
  if (stored) {
    pushLocalBackup(stored, "自動保存前");
  }
  data.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    trimBackupsForSpace();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      toast("保存容量が不足しています。バックアップを書き出して画像を減らしてください。");
      return;
    }
  }
  lastSavedSnapshot = clone(data);
  renderAll();
  toast(message);
}

function statusText(status) {
  return statusLabel[status] || "休み";
}

function uploadedImage(value) {
  return /^data:image\//i.test(String(value || ""));
}

function toast(message) {
  const box = $("#toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("show"), 2200);
}

function asset(path) {
  if (!path) return "../01_existing_site/assets/cast/g1.png";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (String(path).startsWith("../") || String(path).startsWith("/")) return path;
  if (String(path).startsWith("uploads/") || String(path).startsWith("assets/transparent/")) return `${LEGACY_ASSET_ROOT}${path}`;
  return `${ASSET_ROOT}${path}`;
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function shiftDates() {
  const sorted = [...new Set(data.shifts.map((shift) => shift.date))].sort();
  const start = sorted[0] || dateKey(new Date());
  const startDate = new Date(`${start}T00:00:00`);
  return Array.from({ length: 14 }, (_, index) => {
    const next = new Date(startDate);
    next.setDate(startDate.getDate() + index);
    return dateKey(next);
  });
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

function getStaff() {
  return data.staff.find((staff) => staff.id === selectedStaffId) || data.staff[0];
}

function getProduct() {
  return data.products.find((product) => product.id === selectedProductId) || data.products[0];
}

function getEvent() {
  return data.events.find((event) => event.id === selectedEventId) || data.events[0];
}

function getMaterial() {
  return data.materials.find((item) => item.id === selectedMaterialId) || data.materials[0];
}

function getShift(date, staffId) {
  return data.shifts.find((shift) => shift.date === date && shift.staffId === staffId);
}

function getOrCreateShift(date, staffId) {
  let shift = getShift(date, staffId);
  if (!shift) {
    shift = { date, staffId, status: "off", start: "", end: "", publicNote: "お休み" };
    data.shifts.push(shift);
  }
  return shift;
}

function renderAll() {
  renderDashboard();
  renderOperations();
  renderSiteSettings();
  renderStaff();
  renderMaterialsAdmin();
  renderShift();
  renderProducts();
  renderEvents();
  renderSales();
  renderPayroll();
}

function renderDashboard() {
  const visibleStaff = data.staff.filter((staff) => staff.publicVisible).length;
  const working = data.staff.filter((staff) => staff.workStatus === "working").length;
  const activeProducts = data.products.filter((product) => product.active).length;
  const gallery = data.materials.length;
  const payroll = computePayroll().reduce((sum, row) => sum + row.total, 0);
  $("#metric-grid").innerHTML = [
    ["Web表示", visibleStaff],
    ["出勤中", working],
    ["商品/画像", `${activeProducts}/${gallery}`],
    ["未払目安", yen(payroll)]
  ].map(([label, value]) => `<article class="metric"><b>${value}</b><span>${label}</span></article>`).join("");
  $("#last-updated").textContent = data.updatedAt ? `更新 ${formatDateTime(data.updatedAt)}` : "";
  $("#quick-status-list").innerHTML = data.staff.map((staff) => `
    <div class="status-row">
      <div>
        <strong>${staff.displayName}</strong>
        <small>${statusText(staff.workStatus)}</small>
      </div>
      <div class="status-buttons" data-staff="${staff.id}">
        <button type="button" data-status="working">出勤中</button>
        <button type="button" data-status="scheduled">予定</button>
        <button type="button" data-status="off">休み</button>
      </div>
    </div>
  `).join("");
}

function renderOperations() {
  const operationDate = shiftDates()[0] || dateKey(new Date());
  $("#operation-date").textContent = `営業日 ${operationDate}`;
  $("#operation-staff").innerHTML = data.staff.map((staff) => `
    <option value="${staff.id}" ${staff.id === selectedStaffId ? "selected" : ""}>${staff.displayName}</option>
  `).join("");
  $("#site-sync-list").innerHTML = [
    ["Web表示スタッフ", `${data.staff.filter((staff) => staff.publicVisible).length}名`],
    ["公開メニュー", `${data.products.filter((product) => product.active).length}件`],
    ["ギャラリー", `${data.materials.length}件`],
    ["イベント", `${data.events.filter((event) => event.publicVisible).length}件`],
    ["売上登録", `${data.sales.length}件`],
    ["最終保存", data.updatedAt ? formatDateTime(data.updatedAt) : "未保存"]
  ].map(([label, value]) => `
    <div class="sync-row">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderSiteSettings() {
  $("#shop-display-name").value = data.shop.displayName || "";
  $("#shop-concept-input").value = data.shop.concept || "";
  $("#shop-hours-input").value = data.shop.hours || "";
  $("#shop-address-input").value = data.shop.address || "";
  $("#shop-instagram-input").value = data.shop.instagram || "";
  $("#preview-shop-name").textContent = data.shop.displayName || data.shop.name || "";
  $("#preview-shop-concept").textContent = data.shop.concept || "";
  $("#site-preview-list").innerHTML = [
    ["店名", data.shop.displayName || ""],
    ["営業時間", data.shop.hours || ""],
    ["住所", data.shop.address || ""],
    ["Instagram", data.shop.instagram ? `@${data.shop.instagram}` : ""]
  ].map(([label, value]) => `
    <div class="sync-row">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
  renderBackupStatus();
}

function renderSitePreviewOnly() {
  $("#preview-shop-name").textContent = data.shop.displayName || data.shop.name || "";
  $("#preview-shop-concept").textContent = data.shop.concept || "";
  $("#site-preview-list").innerHTML = [
    ["店名", data.shop.displayName || ""],
    ["営業時間", data.shop.hours || ""],
    ["住所", data.shop.address || ""],
    ["Instagram", data.shop.instagram ? `@${data.shop.instagram}` : ""]
  ].map(([label, value]) => `
    <div class="sync-row">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}


function renderStaff() {
  $("#staff-list").innerHTML = data.staff.map((staff) => `
    <button class="list-item ${staff.id === selectedStaffId ? "active" : ""}" type="button" data-staff-select="${staff.id}">
      <img class="thumb" src="${asset(staff.photo)}" alt="" />
      <span><strong>${staff.displayName}</strong><small>${staff.romanName || ""} / ${statusText(staff.workStatus)}</small></span>
      <small>${staff.publicVisible ? "表示" : "非表示"}</small>
    </button>
  `).join("");

  const staff = getStaff();
  if (!staff) return;
  $("#staff-visible").checked = Boolean(staff.publicVisible);
  $("#staff-name").value = staff.displayName || "";
  $("#staff-roman").value = staff.romanName || "";
  $("#staff-profile").value = staff.profileText || "";
  $("#staff-photo").value = staff.photo || "";
  $("#staff-hero-photo").value = staff.heroPhoto || "";
  $("#staff-wage").value = staff.hourlyWage || 0;
  $("#staff-tags").value = (staff.tags || []).join(", ");
  renderImagePreview("staff-photo", staff.photo);
  renderImagePreview("staff-hero-photo", staff.heroPhoto);
  document.querySelectorAll("#staff-status-buttons button").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === staff.workStatus);
  });
}

function renderMaterialsAdmin() {
  $("#material-list").innerHTML = data.materials.map((item) => `
    <button class="list-item ${item.id === selectedMaterialId ? "active" : ""}" type="button" data-material-select="${item.id}">
      <img class="thumb" src="${asset(item.image)}" alt="" />
      <span><strong>${item.title}</strong><small>${item.kind === "lineup" ? "集合" : "写真"}</small></span>
      <small>${item.image ? "画像あり" : "未設定"}</small>
    </button>
  `).join("");

  const item = getMaterial();
  if (!item) {
    $("#material-title").value = "";
    $("#material-caption").value = "";
    $("#material-image").value = "";
    $("#material-kind").value = "photo";
    $("#material-preview").innerHTML = "";
    return;
  }
  $("#material-title").value = item.title || "";
  $("#material-caption").value = item.caption || "";
  $("#material-image").value = item.image || "";
  $("#material-kind").value = item.kind || "photo";
  renderImagePreview("material-image", item.image);
  $("#material-preview").innerHTML = item.image
    ? `<img src="${asset(item.image)}" alt="" /><span>${item.title || ""}</span>`
    : `<span>画像パスを入力</span>`;
}

function renderMaterialPreviewOnly() {
  const item = getMaterial();
  if (!item) return;
  renderImagePreview("material-image", item.image);
  $("#material-preview").innerHTML = item.image
    ? `<img src="${asset(item.image)}" alt="" /><span>${item.title || ""}</span>`
    : `<span>画像パスを入力</span>`;
}


function renderShift() {
  const dates = shiftDates();
  if (!selectedDate) selectedDate = dates[0];
  $("#date-strip").innerHTML = dates.map((date) => `
    <button type="button" class="${date === selectedDate ? "active" : ""}" data-date="${date}">
      <b>${dateLabel(date)}</b><br /><small>${date.slice(0, 4)}</small>
    </button>
  `).join("");
  $("#selected-date-title").textContent = selectedDate;
  renderShiftTools(dates);
  $("#shift-editor").innerHTML = data.staff.map((staff) => {
    const shift = getOrCreateShift(selectedDate, staff.id);
    return `
      <div class="shift-row" data-staff="${staff.id}">
        <strong>${staff.displayName}</strong>
        <label>状態
          <select data-shift-field="status">
            ${["working", "scheduled", "off"].map((status) => `<option value="${status}" ${shift.status === status ? "selected" : ""}>${statusText(status)}</option>`).join("")}
          </select>
        </label>
        <label>開始<input data-shift-field="start" type="time" value="${shift.start || ""}" /></label>
        <label>終了<input data-shift-field="end" type="time" value="${shift.end || ""}" /></label>
        <label>表示メモ<input data-shift-field="publicNote" type="text" value="${shift.publicNote || ""}" /></label>
      </div>
    `;
  }).join("");
}

function renderProducts() {
  $("#product-list").innerHTML = data.products.map((product) => `
    <button class="list-item ${product.id === selectedProductId ? "active" : ""}" type="button" data-product-select="${product.id}">
      <span class="thumb"></span>
      <span><strong>${product.name}</strong><small>${yen(product.salePrice)} / back ${yen(product.backAmount)}</small></span>
      <small>${product.active ? "販売中" : "停止"}</small>
    </button>
  `).join("");

  const product = getProduct();
  if (!product) return;
  $("#product-active").checked = Boolean(product.active);
  $("#product-name").value = product.name || "";
  $("#product-category").value = product.category || "";
  $("#product-price").value = product.salePrice || 0;
  $("#product-back").value = product.backAmount || 0;
  $("#product-event-only").checked = Boolean(product.eventOnly);
}

function renderEvents() {
  $("#event-list").innerHTML = data.events.map((event) => `
    <button class="list-item ${event.id === selectedEventId ? "active" : ""}" type="button" data-event-select="${event.id}">
      <span class="thumb"></span>
      <span><strong>${event.title}</strong><small>${event.date}</small></span>
      <small>${event.publicVisible ? "表示" : "非表示"}</small>
    </button>
  `).join("");

  const event = getEvent();
  if (!event) return;
  $("#event-visible").checked = Boolean(event.publicVisible);
  $("#event-date").value = event.date || "";
  $("#event-title").value = event.title || "";
  $("#event-summary").value = event.summary || "";
}

function renderSales() {
  $("#sale-staff").innerHTML = data.staff.map((staff) => `<option value="${staff.id}">${staff.displayName}</option>`).join("");
  $("#sale-product").innerHTML = data.products
    .filter((product) => product.active)
    .map((product) => `<option value="${product.id}">${product.name} ${yen(product.salePrice)}</option>`).join("");

  const range = getFilterRange("sales");
  const sales = getSalesInRange(range);
  $("#sales-filter-summary").textContent = filterSummary(range, `${sales.length}件 / ${yen(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0))}`);

  if (!sales.length) {
    $("#sales-list").innerHTML = `<div class="sale-row"><strong>対象期間の売上なし</strong><small>期間を変えるか売上を登録してください</small></div>`;
    return;
  }

  $("#sales-list").innerHTML = sales.slice().reverse().map((sale) => {
    const staff = data.staff.find((item) => item.id === sale.staffId);
    const product = data.products.find((item) => item.id === sale.productId);
    return `
      <div class="sale-row">
        <div>
          <strong>${staff?.displayName || ""} / ${product?.name || ""}</strong>
          <small>${formatDateTime(sale.createdAt)} × ${sale.qty}</small>
        </div>
        <b>${yen(sale.total)}</b>
      </div>
    `;
  }).join("");
}

function renderPayroll() {
  const range = getFilterRange("payroll");
  const rows = computePayroll(range);
  $("#payroll-filter-summary").textContent = filterSummary(range, `合計 ${yen(rows.reduce((sum, row) => sum + row.total, 0))}`);
  $("#payroll-table").innerHTML = rows.map((row) => `
    <div class="pay-row">
      <strong>${row.staff.displayName}</strong>
      <span data-label="勤務時間">${row.hours.toFixed(2)}h</span>
      <span data-label="時給分">${yen(row.basePay)}</span>
      <span data-label="バック">${yen(row.backPay)}</span>
      <b data-label="合計">${yen(row.total)}</b>
    </div>
  `).join("");
}

function computePayroll(range = null) {
  return data.staff.map((staff) => {
    const hours = data.shifts
      .filter((shift) => shift.staffId === staff.id && shift.status !== "off" && inDateRange(shift.date, range))
      .reduce((sum, shift) => sum + shiftHours(shift), 0);
    const basePay = Math.floor(hours * Number(staff.hourlyWage || 0));
    const backPay = data.sales
      .filter((sale) => sale.staffId === staff.id && inDateRange(dateKeyFromValue(sale.createdAt), range))
      .reduce((sum, sale) => sum + Number(sale.backTotal || 0), 0);
    return { staff, hours, basePay, backPay, total: basePay + backPay };
  });
}

function shiftHours(shift) {
  if (!shift.start || !shift.end) return 0;
  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);
  if (end <= start) end += 24 * 60;
  const hours = (end - start) / 60;
  return Math.floor(hours * 4) / 4;
}

function timeToMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderImagePreview(fieldId, value) {
  const preview = $(`#${fieldId}-preview`);
  const label = $(`#${fieldId}-label`);
  if (preview) {
    if (value) {
      preview.src = asset(value);
    } else {
      preview.removeAttribute("src");
    }
  }
  if (label) label.textContent = imageLabel(value);
}

function imageLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "未設定";
  if (uploadedImage(text)) return "アップロード済み";
  return text.split("/").pop() || "設定済み";
}

function renderShiftTools(dates) {
  const source = $("#copy-shift-source");
  if (!source) return;
  const currentValue = source.value;
  source.innerHTML = dates.map((date) => `
    <option value="${date}" ${date === selectedDate ? "disabled" : ""}>${dateLabel(date)} ${date}</option>
  `).join("");
  const selectedIndex = dates.indexOf(selectedDate);
  const fallback = dates[selectedIndex - 1] || dates[selectedIndex + 1] || dates.find((date) => date !== selectedDate) || "";
  source.value = currentValue && currentValue !== selectedDate ? currentValue : fallback;
}

function dateKeyFromValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return dateKey(parsed);
}

function monthRange(monthValue) {
  if (!monthValue) return null;
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return null;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  return { from: start, to: dateKey(endDate) };
}

function getFilterRange(prefix) {
  const from = $(`#${prefix}-from`)?.value || "";
  const to = $(`#${prefix}-to`)?.value || "";
  if (from || to) return { from: from || "0000-01-01", to: to || "9999-12-31" };
  return monthRange($(`#${prefix}-month`)?.value || "");
}

function inDateRange(dateValue, range) {
  if (!range) return true;
  const key = dateKeyFromValue(dateValue);
  if (!key) return false;
  return key >= range.from && key <= range.to;
}

function filterSummary(range, suffix) {
  const prefix = range ? `${range.from} - ${range.to}` : "全期間";
  return `${prefix} / ${suffix}`;
}

function getSalesInRange(range = getFilterRange("sales")) {
  return data.sales.filter((sale) => inDateRange(dateKeyFromValue(sale.createdAt), range));
}

function initializeDateFilters() {
  const month = dateKey(new Date()).slice(0, 7);
  ["sales", "payroll"].forEach((prefix) => {
    const monthInput = $(`#${prefix}-month`);
    if (monthInput && !monthInput.value) monthInput.value = month;
  });
}

function readStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getLocalBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    const backups = raw ? JSON.parse(raw) : [];
    return Array.isArray(backups) ? backups : [];
  } catch {
    return [];
  }
}

function writeLocalBackups(backups) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, BACKUP_LIMIT)));
}

function pushLocalBackup(snapshot, label = "手動バックアップ") {
  if (!snapshot || !snapshot.staff) return false;
  const backup = {
    id: id("backup"),
    createdAt: new Date().toISOString(),
    label,
    data: clone(snapshot)
  };
  const backups = [backup, ...getLocalBackups()].slice(0, BACKUP_LIMIT);
  try {
    writeLocalBackups(backups);
    renderBackupStatus();
    return true;
  } catch {
    try {
      writeLocalBackups(backups.slice(0, 1));
      renderBackupStatus();
      return true;
    } catch {
      return false;
    }
  }
}

function trimBackupsForSpace() {
  const backups = getLocalBackups();
  try {
    writeLocalBackups(backups.slice(0, 1));
  } catch {
    try {
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      // ignore storage cleanup failure
    }
  }
}

function renderBackupStatus() {
  const select = $("#backup-history");
  const status = $("#backup-status");
  if (!select || !status) return;
  const backups = getLocalBackups();
  select.innerHTML = backups.length
    ? backups.map((backup) => `<option value="${backup.id}">${formatDateTime(backup.createdAt)} / ${backup.label}</option>`).join("")
    : `<option value="">履歴なし</option>`;
  status.textContent = backups.length
    ? `ブラウザ内に${backups.length}世代保存中。端末変更やブラウザ削除にはJSON書き出しで備えてください。`
    : "まだ自動バックアップ履歴はありません。保存時に自動で作成されます。";
}

function selectedLocalBackup() {
  const backupId = $("#backup-history")?.value;
  return getLocalBackups().find((backup) => backup.id === backupId);
}

function openPublishPreview(message) {
  pendingPreviewMessage = message;
  const modal = $("#publish-preview-modal");
  const list = $("#publish-diff-list");
  if (!modal || !list) {
    commitData(message);
    return;
  }
  const changes = summarizePublishChanges(lastSavedSnapshot || {}, data);
  list.innerHTML = changes.map((item) => `
    <div class="diff-item">
      <strong>${item.title}</strong>
      <span>${item.detail}</span>
    </div>
  `).join("");
  modal.hidden = false;
  document.body.classList.add("sheet-open");
}

function closePublishPreview() {
  $("#publish-preview-modal").hidden = true;
  document.body.classList.remove("sheet-open");
  pendingPreviewMessage = "";
}

function summarizePublishChanges(before, after) {
  const changes = [];
  const shopFields = ["displayName", "concept", "hours", "address", "instagram"];
  const changedShop = shopFields.filter((field) => !sameValue(before.shop?.[field], after.shop?.[field]));
  if (changedShop.length) {
    changes.push({ title: "店舗情報", detail: `${changedShop.length}項目を更新します` });
  }

  const staffDiff = diffById(before.staff || [], after.staff || [], ["displayName", "romanName", "profileText", "photo", "heroPhoto", "hourlyWage", "tags", "publicVisible", "workStatus"]);
  if (staffDiff.changed || staffDiff.added || staffDiff.removed) {
    changes.push({ title: "スタッフ", detail: `追加${staffDiff.added} / 更新${staffDiff.changed} / 削除${staffDiff.removed}` });
  }

  const materialDiff = diffById(before.materials || [], after.materials || [], ["title", "caption", "image", "kind"]);
  if (materialDiff.changed || materialDiff.added || materialDiff.removed) {
    changes.push({ title: "ギャラリー", detail: `追加${materialDiff.added} / 更新${materialDiff.changed} / 削除${materialDiff.removed}` });
  }

  const shiftDiff = diffByComposite(before.shifts || [], after.shifts || [], (item) => `${item.date}:${item.staffId}`, ["status", "start", "end", "publicNote"]);
  if (shiftDiff.changed || shiftDiff.added || shiftDiff.removed) {
    changes.push({ title: "シフト", detail: `追加${shiftDiff.added} / 更新${shiftDiff.changed} / 削除${shiftDiff.removed}` });
  }

  const eventDiff = diffById(before.events || [], after.events || [], ["date", "title", "summary", "publicVisible"]);
  if (eventDiff.changed || eventDiff.added || eventDiff.removed) {
    changes.push({ title: "イベント", detail: `追加${eventDiff.added} / 更新${eventDiff.changed} / 削除${eventDiff.removed}` });
  }

  const productDiff = diffById(before.products || [], after.products || [], ["name", "category", "salePrice", "backAmount", "eventOnly", "active"]);
  if (productDiff.changed || productDiff.added || productDiff.removed) {
    changes.push({ title: "メニュー", detail: `追加${productDiff.added} / 更新${productDiff.changed} / 削除${productDiff.removed}` });
  }

  if ((before.sales || []).length !== (after.sales || []).length) {
    changes.push({ title: "売上", detail: `${(before.sales || []).length}件から${(after.sales || []).length}件へ変更します` });
  }

  if (!changes.length) {
    changes.push({ title: "変更なし", detail: "公開サイトに見える変更はありません。バックアップだけ更新できます。" });
  }
  return changes;
}

function diffById(beforeItems, afterItems, fields) {
  return diffByComposite(beforeItems, afterItems, (item) => item.id, fields);
}

function diffByComposite(beforeItems, afterItems, keyFn, fields) {
  const before = new Map(beforeItems.map((item) => [keyFn(item), item]));
  const after = new Map(afterItems.map((item) => [keyFn(item), item]));
  let added = 0;
  let removed = 0;
  let changed = 0;
  after.forEach((item, key) => {
    if (!before.has(key)) {
      added += 1;
      return;
    }
    const prev = before.get(key);
    if (fields.some((field) => !sameValue(prev?.[field], item?.[field]))) changed += 1;
  });
  before.forEach((_, key) => {
    if (!after.has(key)) removed += 1;
  });
  return { added, removed, changed };
}

function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function bindNavigation() {
  document.querySelectorAll(".nav-item, .tab, .more-sheet [data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "more") {
        toggleMoreSheet();
        return;
      }
      setActiveView(button.dataset.view);
    });
  });

  $("#sheet-backdrop")?.addEventListener("click", () => {
    closeMoreSheet();
    closeEditSheet();
  });
}

function setActiveView(viewName) {
  const view = $(`#view-${viewName}`);
  if (!view) return;
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  view.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });
  document.querySelectorAll(".tab").forEach((item) => {
    const isMoreTab = item.dataset.view === "more" && MORE_VIEWS.has(viewName);
    item.classList.toggle("active", item.dataset.view === viewName || isMoreTab);
    if (item.dataset.view === "more") {
      item.setAttribute("aria-expanded", "false");
    }
  });
  closeMoreSheet();
  closeEditSheet();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMoreSheet() {
  const sheet = $("#more-sheet");
  if (!sheet) return;
  if (sheet.classList.contains("open")) {
    closeMoreSheet();
  } else {
    openMoreSheet();
  }
}

function openMoreSheet() {
  const sheet = $("#more-sheet");
  const backdrop = $("#sheet-backdrop");
  const moreTab = document.querySelector('.tab[data-view="more"]');
  if (!sheet || !backdrop) return;
  closeEditSheet();
  sheet.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    backdrop.classList.add("open");
  });
  moreTab?.classList.add("active");
  moreTab?.setAttribute("aria-expanded", "true");
}

function closeMoreSheet() {
  const sheet = $("#more-sheet");
  const backdrop = $("#sheet-backdrop");
  const moreTab = document.querySelector('.tab[data-view="more"]');
  if (!sheet || !backdrop) return;
  sheet.classList.remove("open");
  backdrop.classList.remove("open");
  sheet.hidden = true;
  backdrop.hidden = true;
  moreTab?.setAttribute("aria-expanded", "false");
  const activeView = document.querySelector(".view.active")?.id.replace("view-", "");
  if (activeView && !MORE_VIEWS.has(activeView)) {
    moreTab?.classList.remove("active");
  }
}

function bindThemeToggle() {
  const button = $("#theme-toggle");
  if (!button) return;
  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(THEME_KEY, nextTheme);
  });
}

function enhanceEditSheets() {
  document.querySelectorAll(".edit-form").forEach((form) => {
    form.classList.add("edit-sheet");
    if (!form.querySelector(".sheet-bar")) {
      const title = form.dataset.sheetTitle || "編集";
      form.insertAdjacentHTML("afterbegin", `
        <div class="sheet-bar">
          <button class="sheet-close" type="button" data-sheet-close>キャンセル</button>
          <strong class="sheet-title">${title}</strong>
          <span aria-hidden="true"></span>
        </div>
      `);
    }
    if (!form.querySelector(".sheet-save")) {
      form.insertAdjacentHTML("beforeend", `<button class="sheet-save" type="button" data-sheet-save>保存して公開サイトへ反映</button>`);
    }
  });
}

function openEditSheet(selector) {
  if (!window.matchMedia("(max-width: 820px)").matches) return;
  const form = typeof selector === "string" ? $(selector) : selector;
  if (!form) return;
  closeMoreSheet();
  document.querySelectorAll(".edit-form.open").forEach((item) => item.classList.remove("open"));
  form.classList.add("open");
  document.body.classList.add("sheet-open");
}

function closeEditSheet() {
  document.querySelectorAll(".edit-form.open").forEach((form) => form.classList.remove("open"));
  document.body.classList.remove("sheet-open");
}

function bindActions() {
  $("#save-button").addEventListener("click", () => saveData("✓ 公開サイトに反映しました", { preview: true }));

  $("#publish-preview-close").addEventListener("click", closePublishPreview);
  $("#publish-preview-cancel").addEventListener("click", closePublishPreview);
  $("#publish-preview-confirm").addEventListener("click", () => {
    const message = pendingPreviewMessage || "✓ 公開サイトに反映しました";
    closePublishPreview();
    commitData(message);
  });

  document.addEventListener("click", (event) => {
    const imageTrigger = event.target.closest("[data-image-trigger]");
    if (imageTrigger) {
      event.preventDefault();
      $(`#${imageTrigger.dataset.imageTrigger}`)?.click();
      return;
    }

    const imageClear = event.target.closest("[data-image-clear]");
    if (imageClear) {
      event.preventDefault();
      clearImageField(imageClear.dataset.imageClear);
      return;
    }

    const closeSheetButton = event.target.closest("[data-sheet-close]");
    if (closeSheetButton) {
      event.preventDefault();
      closeEditSheet();
      return;
    }

    const sheetSaveButton = event.target.closest("[data-sheet-save]");
    if (sheetSaveButton) {
      event.preventDefault();
      closeEditSheet();
      saveData("✓ 公開サイトに反映しました", { preview: true });
      return;
    }

    const staffButton = event.target.closest("[data-staff-select]");
    if (staffButton) {
      selectedStaffId = staffButton.dataset.staffSelect;
      renderStaff();
      openEditSheet("#staff-form");
      return;
    }

    const statusButton = event.target.closest("[data-status]");
    if (statusButton) {
      const row = statusButton.closest("[data-staff]");
      if (row) {
        const staff = data.staff.find((item) => item.id === row.dataset.staff);
        if (staff) {
          staff.workStatus = statusButton.dataset.status;
          saveData("勤務ステータスを更新しました");
        }
        return;
      }
    }

    const dateButton = event.target.closest("[data-date]");
    if (dateButton) {
      selectedDate = dateButton.dataset.date;
      renderShift();
      return;
    }

    const productButton = event.target.closest("[data-product-select]");
    if (productButton) {
      selectedProductId = productButton.dataset.productSelect;
      renderProducts();
      openEditSheet("#product-form");
      return;
    }

    const eventButton = event.target.closest("[data-event-select]");
    if (eventButton) {
      selectedEventId = eventButton.dataset.eventSelect;
      renderEvents();
      openEditSheet("#event-form");
      return;
    }

    const materialButton = event.target.closest("[data-material-select]");
    if (materialButton) {
      selectedMaterialId = materialButton.dataset.materialSelect;
      renderMaterialsAdmin();
      openEditSheet("#material-form");
    }
  });

  $("#add-staff").addEventListener("click", () => {
    const staff = {
      id: id("staff"),
      displayName: "新規スタッフ",
      romanName: "NEW",
      role: "cast",
      hourlyWage: 1300,
      profileText: "",
      shortComment: "",
      photo: "uploads/girl5_pink_hair.png",
      heroPhoto: "uploads/girl5_pink_hair.png",
      tags: ["new"],
      publicVisible: true,
      workStatus: "off",
      sns: ""
    };
    data.staff.push(staff);
    selectedStaffId = staff.id;
    renderAll();
    openEditSheet("#staff-form");
  });

  $("#add-product").addEventListener("click", () => {
    const product = {
      id: id("prod"),
      name: "新規商品",
      category: "drink",
      salePrice: 1000,
      backAmount: 0,
      eventOnly: false,
      active: true
    };
    data.products.push(product);
    selectedProductId = product.id;
    renderAll();
    openEditSheet("#product-form");
  });

  $("#add-event").addEventListener("click", () => {
    const eventItem = {
      id: id("event"),
      date: selectedDate || dateKey(new Date()),
      title: "新規イベント",
      summary: "",
      publicVisible: true
    };
    data.events.push(eventItem);
    selectedEventId = eventItem.id;
    renderAll();
    openEditSheet("#event-form");
  });

  $("#add-material").addEventListener("click", () => {
    const material = {
      id: id("mat"),
      title: "new visual",
      caption: "ノーティらしい雰囲気の画像です。",
      image: "uploads/589820627_17899106706346662_4066901980983006318_n.jpg",
      kind: "photo"
    };
    data.materials.push(material);
    selectedMaterialId = material.id;
    renderAll();
    openEditSheet("#material-form");
  });

  $("#delete-material").addEventListener("click", (event) => {
    event.preventDefault();
    const item = getMaterial();
    if (!item) return;
    if (!confirm(`${item.title || "この画像"}を削除しますか？`)) return;
    data.materials = data.materials.filter((material) => material.id !== item.id);
    selectedMaterialId = data.materials[0]?.id || "";
    saveData("ギャラリー画像を削除しました");
  });

  $("#copy-public-url").addEventListener("click", async () => {
  const url = new URL("../04_site_rebuild/index.html?v=v6", location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      toast("公開URLをコピーしました");
    } catch {
      toast(url);
    }
  });

  $("#fill-off").addEventListener("click", () => {
    data.staff.forEach((staff) => {
      const shift = getOrCreateShift(selectedDate, staff.id);
      shift.status = "off";
      shift.start = "";
      shift.end = "";
      shift.publicNote = "お休み";
    });
    renderShift();
  });

  $("#copy-shift-to-date").addEventListener("click", copyShiftToSelectedDate);
  $("#apply-bulk-shift").addEventListener("click", applyBulkShift);

  $("#add-sale").addEventListener("click", () => {
    const staffId = $("#sale-staff").value;
    const productId = $("#sale-product").value;
    const qty = Math.max(1, Number($("#sale-qty").value || 1));
    const product = data.products.find((item) => item.id === productId);
    if (!product) return;
    data.sales.push({
      id: id("sale"),
      createdAt: new Date().toISOString(),
      staffId,
      productId,
      qty,
      salePrice: Number(product.salePrice || 0),
      backAmount: Number(product.backAmount || 0),
      total: Number(product.salePrice || 0) * qty,
      backTotal: Number(product.backAmount || 0) * qty
    });
    saveData("売上を登録しました");
  });

  $("#download-sales").addEventListener("click", downloadSalesCsv);
  $("#download-payroll").addEventListener("click", downloadPayrollCsv);
  $("#download-backup").addEventListener("click", downloadBackupJson);
  $("#restore-backup").addEventListener("click", () => $("#backup-file").click());
  $("#backup-file").addEventListener("change", restoreBackupJson);
  $("#create-local-backup").addEventListener("click", () => {
    if (pushLocalBackup(data, "手動バックアップ")) {
      toast("ブラウザ内バックアップを作成しました");
    } else {
      toast("バックアップを作成できませんでした。JSONを書き出してください。");
    }
  });
  $("#restore-local-backup").addEventListener("click", restoreSelectedLocalBackup);
  $("#download-local-backup").addEventListener("click", downloadSelectedLocalBackup);

  $("#mark-paid").addEventListener("click", () => {
    if (!confirm("未払給与と売上バックの集計をリセットします。")) return;
    data.sales = [];
    data.lastPaidAt = new Date().toISOString();
    saveData("支払確定しました");
  });

  $("#operation-staff").addEventListener("change", (event) => {
    selectedStaffId = event.target.value;
    renderAll();
  });

  $("#clock-in").addEventListener("click", () => applyPunch("working"));
  $("#clock-scheduled").addEventListener("click", () => applyPunch("scheduled"));
  $("#clock-out").addEventListener("click", () => applyPunch("off"));
}

function bindForms() {
  $("#site-form").addEventListener("input", () => {
    data.shop.displayName = $("#shop-display-name").value;
    data.shop.concept = $("#shop-concept-input").value;
    data.shop.hours = $("#shop-hours-input").value;
    data.shop.address = $("#shop-address-input").value;
    data.shop.instagram = $("#shop-instagram-input").value.replace(/^@/, "");
    renderDashboard();
    renderOperations();
    renderSitePreviewOnly();
  });

  $("#staff-form").addEventListener("input", () => {
    const staff = getStaff();
    if (!staff) return;
    staff.publicVisible = $("#staff-visible").checked;
    staff.displayName = $("#staff-name").value;
    staff.romanName = $("#staff-roman").value;
    staff.profileText = $("#staff-profile").value;
    staff.photo = $("#staff-photo").value;
    staff.heroPhoto = $("#staff-hero-photo").value;
    staff.hourlyWage = Number($("#staff-wage").value || 0);
    staff.tags = $("#staff-tags").value.split(",").map((tag) => tag.trim()).filter(Boolean);
    renderDashboard();
  });

  $("#staff-visible").addEventListener("change", () => $("#staff-form").dispatchEvent(new Event("input")));
  $("#staff-status-buttons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    const staff = getStaff();
    staff.workStatus = button.dataset.status;
    renderAll();
  });

  $("#shift-editor").addEventListener("input", updateShiftFromInput);
  $("#shift-editor").addEventListener("change", updateShiftFromInput);

  $("#product-form").addEventListener("input", () => {
    const product = getProduct();
    if (!product) return;
    product.active = $("#product-active").checked;
    product.name = $("#product-name").value;
    product.category = $("#product-category").value;
    product.salePrice = Number($("#product-price").value || 0);
    product.backAmount = Number($("#product-back").value || 0);
    product.eventOnly = $("#product-event-only").checked;
    renderDashboard();
  });
  $("#product-active").addEventListener("change", () => $("#product-form").dispatchEvent(new Event("input")));
  $("#product-event-only").addEventListener("change", () => $("#product-form").dispatchEvent(new Event("input")));

  $("#event-form").addEventListener("input", () => {
    const eventItem = getEvent();
    if (!eventItem) return;
    eventItem.publicVisible = $("#event-visible").checked;
    eventItem.date = $("#event-date").value;
    eventItem.title = $("#event-title").value;
    eventItem.summary = $("#event-summary").value;
    renderDashboard();
  });
  $("#event-visible").addEventListener("change", () => $("#event-form").dispatchEvent(new Event("input")));

  $("#material-form").addEventListener("input", () => {
    const item = getMaterial();
    if (!item) return;
    item.title = $("#material-title").value;
    item.caption = $("#material-caption").value;
    item.image = $("#material-image").value;
    item.kind = $("#material-kind").value;
    renderDashboard();
    renderOperations();
    renderMaterialPreviewOnly();
  });

  bindImageUpload("staff-photo-file", "staff-photo", () => $("#staff-form").dispatchEvent(new Event("input", { bubbles: true })));
  bindImageUpload("staff-hero-photo-file", "staff-hero-photo", () => $("#staff-form").dispatchEvent(new Event("input", { bubbles: true })));
  bindImageUpload("material-image-file", "material-image", () => $("#material-form").dispatchEvent(new Event("input", { bubbles: true })));

  ["sales-month", "sales-from", "sales-to"].forEach((idName) => {
    $(`#${idName}`).addEventListener("input", renderSales);
  });
  ["payroll-month", "payroll-from", "payroll-to"].forEach((idName) => {
    $(`#${idName}`).addEventListener("input", renderPayroll);
  });
}

function bindImageUpload(fileInputId, targetInputId, onUpdate) {
  const input = $(`#${fileInputId}`);
  const target = $(`#${targetInputId}`);
  if (!input || !target) return;
  input.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      target.value = dataUrl;
      onUpdate();
      renderImagePreview(targetInputId, dataUrl);
      toast("画像を読み込みました。保存前プレビューで確認してください。");
    } catch {
      toast("画像を読み込めませんでした");
    } finally {
      event.target.value = "";
    }
  });
}

function clearImageField(targetInputId) {
  const target = $(`#${targetInputId}`);
  if (!target) return;
  target.value = "";
  const form = target.closest("form");
  target.dispatchEvent(new Event("input", { bubbles: true }));
  form?.dispatchEvent(new Event("input", { bubbles: true }));
  renderImagePreview(targetInputId, "");
  toast("画像を未設定にしました");
}

function fileToCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not image"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      });
      image.src = String(reader.result || "");
    });
    reader.readAsDataURL(file);
  });
}

function copyShiftToSelectedDate() {
  const sourceDate = $("#copy-shift-source").value;
  if (!sourceDate || !selectedDate || sourceDate === selectedDate) {
    toast("コピー元日を選んでください");
    return;
  }
  data.staff.forEach((staff) => {
    const source = getShift(sourceDate, staff.id) || { status: "off", start: "", end: "", publicNote: "お休み" };
    const target = getOrCreateShift(selectedDate, staff.id);
    target.status = source.status || "off";
    target.start = source.start || "";
    target.end = source.end || "";
    target.publicNote = source.publicNote || "";
  });
  renderShift();
  renderDashboard();
  renderPayroll();
  toast(`${dateLabel(sourceDate)}のシフトを${dateLabel(selectedDate)}へコピーしました`);
}

function applyBulkShift() {
  const status = $("#bulk-shift-status").value;
  const isOff = status === "off";
  const start = isOff ? "" : $("#bulk-shift-start").value;
  const end = isOff ? "" : $("#bulk-shift-end").value;
  const note = isOff ? "お休み" : ($("#bulk-shift-note").value || statusText(status));
  data.staff.forEach((staff) => {
    const shift = getOrCreateShift(selectedDate, staff.id);
    shift.status = status;
    shift.start = start;
    shift.end = end;
    shift.publicNote = note;
  });
  renderShift();
  renderDashboard();
  renderPayroll();
  toast(`${dateLabel(selectedDate)}の全員分を一括反映しました`);
}

function updateShiftFromInput(event) {
  const control = event.target.closest("[data-shift-field]");
  if (!control) return;
  const row = control.closest("[data-staff]");
  const shift = getOrCreateShift(selectedDate, row.dataset.staff);
  shift[control.dataset.shiftField] = control.value;
  if (control.dataset.shiftField === "status" && control.value === "off") {
    shift.start = "";
    shift.end = "";
    shift.publicNote = "お休み";
    row.querySelector('[data-shift-field="start"]').value = "";
    row.querySelector('[data-shift-field="end"]').value = "";
    row.querySelector('[data-shift-field="publicNote"]').value = "お休み";
  }
  renderDashboard();
  renderPayroll();
}

function applyPunch(status) {
  const staffId = $("#operation-staff").value || selectedStaffId;
  const staff = data.staff.find((item) => item.id === staffId);
  if (!staff) return;
  const operationDate = shiftDates()[0] || dateKey(new Date());
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, "0");
  const shift = getOrCreateShift(operationDate, staffId);
  staff.workStatus = status;
  shift.status = status;
  if (status === "working") {
    shift.start = shift.start || `${hh}:${mm}`;
    shift.publicNote = "出勤中";
  }
  if (status === "scheduled") {
    shift.start = shift.start || "19:00";
    shift.end = shift.end || "05:00";
    shift.publicNote = "出勤予定";
  }
  if (status === "off") {
    shift.end = `${hh}:${mm}`;
    shift.publicNote = "退勤済";
  }
  data.punches.push({
    id: id("punch"),
    staffId,
    status,
    at: now.toISOString(),
    date: operationDate
  });
  saveData(`${staff.displayName}を${statusText(status)}にしました`);
}

function downloadSalesCsv() {
  const header = ["createdAt", "staff", "product", "qty", "salePrice", "backAmount", "total", "backTotal"];
  const range = getFilterRange("sales");
  const rows = getSalesInRange(range).map((sale) => {
    const staff = data.staff.find((item) => item.id === sale.staffId);
    const product = data.products.find((item) => item.id === sale.productId);
    return [
      sale.createdAt,
      staff?.displayName || "",
      product?.name || "",
      sale.qty,
      sale.salePrice,
      sale.backAmount,
      sale.total,
      sale.backTotal
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naughty_sales_${rangeName(range)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPayrollCsv() {
  const range = getFilterRange("payroll");
  const header = ["staff", "hours", "basePay", "backPay", "total"];
  const rows = computePayroll(range).map((row) => [
    row.staff.displayName,
    row.hours.toFixed(2),
    row.basePay,
    row.backPay,
    row.total
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naughty_payroll_${rangeName(range)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function rangeName(range) {
  if (!range) return new Date().toISOString().slice(0, 10);
  return `${range.from}_${range.to}`;
}

function downloadBackupJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naughty_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("バックアップを書き出しました");
}

function downloadSelectedLocalBackup() {
  const backup = selectedLocalBackup();
  if (!backup) {
    toast("書き出す履歴がありません");
    return;
  }
  const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naughty_backup_${backup.createdAt.slice(0, 10)}_${backup.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("履歴バックアップを書き出しました");
}

function restoreSelectedLocalBackup() {
  const backup = selectedLocalBackup();
  if (!backup) {
    toast("復元する履歴がありません");
    return;
  }
  if (!confirm(`${formatDateTime(backup.createdAt)} のバックアップを復元しますか？`)) return;
  data = normalizeData(clone(backup.data));
  resetSelections();
  commitData("履歴バックアップを復元しました");
}

function restoreBackupJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      data = normalizeData(JSON.parse(String(reader.result || "{}")));
      resetSelections();
      saveData("バックアップを復元しました");
    } catch {
      toast("復元できませんでした");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function resetSelections() {
  selectedStaffId = data.staff[0]?.id || "";
  selectedProductId = data.products[0]?.id || "";
  selectedEventId = data.events[0]?.id || "";
  selectedMaterialId = data.materials[0]?.id || "";
  selectedDate = shiftDates()[0] || "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

bindThemeToggle();
enhanceEditSheets();
initializeDateFilters();
bindNavigation();
bindActions();
bindForms();
loadData();
