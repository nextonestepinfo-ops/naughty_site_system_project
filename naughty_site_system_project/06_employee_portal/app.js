const STORAGE_KEY = "naughty.siteData.v1";
const SESSION_KEY = "naughty.employee.session.v1";
const DATA_URL = "../03_system_seed/naughty_site_data.json";
const ASSET_ROOT = "../01_existing_site/";
const INTERNAL_EMAIL_DOMAIN = "naughty.local";
const DEFAULT_EMPLOYEE_PASSWORD = "0000";
const BUSINESS_DAY_START_HOUR = 5;
const ROUNDING_MINUTES = 15;
const RECENT_PUNCH_MINUTES = 3;

const $ = (selector) => document.querySelector(selector);

let data = null;
let session = null;
let activeTab = "attendance";
let pendingQrCode = "";
let cameraStream = null;
let scanActive = false;

const statusLabel = {
  working: "出勤中",
  scheduled: "予定",
  off: "退勤済"
};

init();

async function init() {
  data = normalizeData(mergeSavedData(await loadSeedData(), readSavedData()));
  session = readSession();
  pendingQrCode = new URL(location.href).searchParams.get("qr") || "";
  bindEvents();
  render();
  if (session && pendingQrCode) {
    setTimeout(() => handleQrCode(pendingQrCode), 250);
  }
}

async function loadSeedData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Data load failed: ${response.status}`);
    return await response.json();
  } catch {
    return JSON.parse(JSON.stringify(window.NAUGHTY_SITE_DATA || {}));
  }
}

function readSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeSavedData(seed, saved) {
  if (!saved || typeof saved !== "object") return seed;
  return {
    ...seed,
    ...saved,
    shop: { ...(seed.shop || {}), ...(saved.shop || {}) },
    staff: Array.isArray(saved.staff) ? saved.staff : seed.staff,
    products: Array.isArray(saved.products) ? saved.products : seed.products,
    shifts: Array.isArray(saved.shifts) ? saved.shifts : seed.shifts,
    sales: Array.isArray(saved.sales) ? saved.sales : seed.sales,
    punches: Array.isArray(saved.punches) ? saved.punches : seed.punches,
    accounts: Array.isArray(saved.accounts) ? saved.accounts : seed.accounts,
    qrCheckpoints: Array.isArray(saved.qrCheckpoints) ? saved.qrCheckpoints : seed.qrCheckpoints
  };
}

function normalizeData(next) {
  const staff = Array.isArray(next.staff) ? next.staff : [];
  const accounts = normalizeAccounts(next.accounts || [], staff);
  return {
    ...next,
    staff,
    accounts: accounts.length ? accounts : previewAccounts(staff),
    products: Array.isArray(next.products) ? next.products : [],
    shifts: Array.isArray(next.shifts) ? next.shifts : [],
    sales: Array.isArray(next.sales) ? next.sales : [],
    punches: Array.isArray(next.punches) ? next.punches : [],
    qrCheckpoints: normalizeQrCheckpoints(next.qrCheckpoints || []),
    shop: next.shop || {}
  };
}

function normalizeAccounts(accounts, staff) {
  const staffIds = new Set(staff.map((item) => item.id));
  return accounts
    .filter((account) => account && account.loginId)
    .map((account) => {
      const loginId = normalizeLoginId(account.loginId);
      return {
        id: account.id || id("acct"),
        role: account.role || "employee",
        staffId: staffIds.has(account.staffId) ? account.staffId : (staff[0]?.id || ""),
        displayName: account.displayName || staff.find((item) => item.id === account.staffId)?.displayName || loginId,
        loginId,
        internalEmail: account.internalEmail || internalEmailForLogin(loginId),
        password: normalizeAccountPassword(account.password),
        isActive: account.isActive !== false,
        createdAt: account.createdAt || new Date().toISOString(),
        lastPasswordResetAt: account.lastPasswordResetAt || ""
      };
    });
}

function previewAccounts(staff) {
  return staff.slice(0, 5).map((member, index) => {
    const loginId = `${normalizeLoginId(member.romanName || member.displayName || "staff")}${String(index + 1).padStart(3, "0")}`;
    return {
      id: `preview_${member.id || index}`,
      role: "employee",
      staffId: member.id,
      displayName: member.displayName || loginId,
      loginId,
      internalEmail: internalEmailForLogin(loginId),
      password: DEFAULT_EMPLOYEE_PASSWORD,
      isActive: true,
      previewOnly: true
    };
  });
}

function normalizeQrCheckpoints(checkpoints) {
  const list = checkpoints.filter((item) => item && item.code).map((item) => ({
    id: item.id || id("qr"),
    label: item.label || "店舗共通QR",
    code: String(item.code),
    isActive: true
  }));
  const primary = list.find((item) => item.isActive) || list[0] || {
    id: "qr_main",
    label: "店舗共通QR",
    code: "NTY-HQ-2026",
    isActive: true
  };
  return [{ ...primary, id: primary.id || "qr_main", label: "店舗共通QR", isActive: true }];
}

function bindEvents() {
  $("#login-form").addEventListener("submit", login);
  $("#logout-button").addEventListener("click", logout);
  $("#scan-qr").addEventListener("click", scanQr);
  $("#submit-qr").addEventListener("click", () => handleQrCode($("#qr-code-input").value));
  $("#demo-punch").addEventListener("click", () => {
    const checkpoint = data.qrCheckpoints.find((item) => item.isActive) || data.qrCheckpoints[0];
    handleQrCode(checkpoint?.code || "NTY-HQ-2026");
  });
  $("#order-form").addEventListener("submit", createSale);
  $("#order-product").addEventListener("change", renderOrderPreview);
  $("#order-qty").addEventListener("input", renderOrderPreview);
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderTabs();
    });
  });
  window.addEventListener("beforeunload", stopScanner);
}

function login(event) {
  event.preventDefault();
  const loginId = normalizeLoginId($("#login-id").value);
  const password = $("#login-password").value;
  const account = data.accounts.find((item) => item.loginId === loginId && item.password === password);
  if (!account || !account.isActive) {
    setStatus("#login-status", "ログインIDまたはパスワードを確認してください。", true);
    return;
  }
  session = { accountId: account.id, loginId: account.loginId, signedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setStatus("#login-status", "");
  render();
  if (pendingQrCode) handleQrCode(pendingQrCode);
}

function logout() {
  stopScanner();
  session = null;
  localStorage.removeItem(SESSION_KEY);
  render();
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const nextSession = raw ? JSON.parse(raw) : null;
    if (!nextSession) return null;
    const account = data?.accounts?.find((item) => item.id === nextSession.accountId || item.loginId === nextSession.loginId);
    return account?.isActive ? nextSession : null;
  } catch {
    return null;
  }
}

function render() {
  const account = currentAccount();
  $("#login-view").hidden = Boolean(account);
  $("#portal-view").hidden = !account;
  if (!account) {
    const preview = data.accounts.find((item) => item.previewOnly);
    setStatus("#login-status", preview ? `プレビューID: ${preview.loginId} / 0000` : "");
    return;
  }
  const staff = currentStaff();
  $("#portal-name").textContent = account.displayName || staff?.displayName || account.loginId;
  renderAttendance();
  renderOrder();
  renderSales();
  renderProfile();
  renderTabs();
}

function renderTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${activeTab}`);
  });
}

function renderAttendance() {
  const staff = currentStaff();
  const date = businessDateKey(new Date());
  const shift = getShift(date, staff?.id);
  const punches = data.punches
    .filter((punch) => punch.staffId === staff?.id && (punch.businessDate || punch.date) === date)
    .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  const last = punches[punches.length - 1];
  $("#attendance-status").textContent = statusText(shift?.status || staff?.workStatus || "off");
  $("#attendance-date").textContent = `営業日 ${date}`;
  $("#attendance-times").innerHTML = [
    ["出勤", shift?.start || "-"],
    ["退勤", shift?.end || "-"],
    ["最終", last ? `${last.actualTime || timeKey(new Date(last.at))} → ${last.roundedTime || timeKey(floorDateToQuarter(last.at))}` : "-"]
  ].map(([label, value]) => `<span>${label}: ${value}</span>`).join("");
}

function renderOrder() {
  const products = data.products.filter((item) => item.active !== false);
  $("#order-product").innerHTML = products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("");
  $("#order-date").textContent = businessDateKey(new Date());
  renderOrderPreview();
}

function renderOrderPreview() {
  const product = currentProduct();
  const qty = Math.max(1, Number($("#order-qty").value || 1));
  $("#order-preview").innerHTML = product ? `
    <div><span>単価</span><strong>${yen(product.salePrice)}</strong></div>
    <div><span>数量</span><strong>${qty}</strong></div>
    <div><span>合計</span><strong>${yen(Number(product.salePrice || 0) * qty)}</strong></div>
  ` : `<div><span>商品</span><strong>未登録</strong></div>`;
}

function renderSales() {
  const staff = currentStaff();
  const businessDate = businessDateKey(new Date());
  const sales = data.sales
    .filter((sale) => sale.staffId === staff?.id)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const todaySales = sales.filter((sale) => (sale.businessDate || businessDateKey(sale.createdAt)) === businessDate);
  const total = todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const back = todaySales.reduce((sum, sale) => sum + Number(sale.backTotal || 0), 0);
  $("#sales-total").textContent = yen(total);
  $("#back-total").textContent = yen(back);
  $("#sales-count").textContent = `${todaySales.length}件`;
  $("#sales-range").textContent = `営業日 ${businessDate}`;
  $("#sale-list").innerHTML = sales.length ? sales.slice(0, 12).map((sale) => {
    const product = data.products.find((item) => item.id === sale.productId);
    return `
      <div class="sale-row">
        <div>
          <strong>${product?.name || "商品"}</strong>
          <small>${formatDateTime(sale.createdAt)} / ${sale.qty}点</small>
        </div>
        <b>${yen(sale.total)}</b>
      </div>
    `;
  }).join("") : `<div class="sale-row"><strong>伝票なし</strong><small>登録するとここに表示されます。</small></div>`;
}

function renderProfile() {
  const staff = currentStaff();
  $("#profile-photo").src = asset(staff?.photo || staff?.heroPhoto || "");
  $("#profile-name").textContent = staff?.displayName || currentAccount()?.displayName || "";
  $("#profile-text").textContent = staff?.profileText || staff?.shortComment || "";
  $("#profile-tags").innerHTML = (staff?.tags || []).map((tag) => `<span>${tag}</span>`).join("");
}

async function scanQr() {
  setStatus("#qr-status", "");
  if (!("BarcodeDetector" in window)) {
    setStatus("#qr-status", "この端末ではカメラ読み取りが使えません。QRコード入力で打刻してください。", true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("#qr-status", "カメラを起動できません。", true);
    return;
  }
  try {
    stopScanner();
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    const video = $("#qr-video");
    video.srcObject = cameraStream;
    video.hidden = false;
    await video.play();
    scanActive = true;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!scanActive) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length) {
          stopScanner();
          handleQrCode(codes[0].rawValue);
          return;
        }
      } catch {
        stopScanner();
        setStatus("#qr-status", "QRを読み取れませんでした。", true);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  } catch {
    setStatus("#qr-status", "カメラの使用が許可されていません。", true);
  }
}

function stopScanner() {
  scanActive = false;
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  const video = $("#qr-video");
  if (video) {
    video.pause();
    video.removeAttribute("srcObject");
    video.srcObject = null;
    video.hidden = true;
  }
}

function handleQrCode(rawCode) {
  const account = currentAccount();
  const staff = currentStaff();
  if (!account || !staff) return;
  const qrCode = extractQrCode(rawCode);
  const checkpoint = data.qrCheckpoints.find((item) => item.isActive && item.code === qrCode);
  if (!checkpoint) {
    setStatus("#qr-status", "店舗QRを確認してください。", true);
    return;
  }
  const now = new Date();
  const businessDate = businessDateKey(now);
  const recent = lastPunch(staff.id);
  if (recent && (now - new Date(recent.at)) / 60000 < RECENT_PUNCH_MINUTES) {
    if (!confirm("直前に打刻があります。もう一度登録しますか？")) return;
  }
  const shift = getOrCreateShift(businessDate, staff.id);
  const rounded = floorDateToQuarter(now);
  const actualTime = timeKey(now);
  const roundedTime = timeKey(rounded);
  const nextStatus = shift.status === "working" ? "off" : "working";
  staff.workStatus = nextStatus;
  shift.status = nextStatus;
  if (nextStatus === "working") {
    shift.start = shift.start || roundedTime;
    shift.publicNote = "出勤中";
  } else {
    shift.end = roundedTime;
    shift.publicNote = "退勤済";
  }
  data.punches.push({
    id: id("punch"),
    staffId: staff.id,
    accountId: account.id,
    status: nextStatus,
    at: now.toISOString(),
    roundedAt: rounded.toISOString(),
    actualTime,
    roundedTime,
    date: businessDate,
    businessDate,
    source: "employee",
    method: "qr",
    checkpointId: checkpoint.id,
    qrCode: checkpoint.code
  });
  saveData();
  setStatus("#qr-status", `${statusText(nextStatus)} ${actualTime} → ${roundedTime}`);
  toast("打刻しました");
  renderAttendance();
}

function createSale(event) {
  event.preventDefault();
  const staff = currentStaff();
  const account = currentAccount();
  const product = currentProduct();
  if (!staff || !account || !product) return;
  const qty = Math.max(1, Number($("#order-qty").value || 1));
  data.sales.push({
    id: id("sale"),
    createdAt: new Date().toISOString(),
    businessDate: businessDateKey(new Date()),
    staffId: staff.id,
    accountId: account.id,
    productId: product.id,
    qty,
    salePrice: Number(product.salePrice || 0),
    backAmount: Number(product.backAmount || 0),
    total: Number(product.salePrice || 0) * qty,
    backTotal: Number(product.backAmount || 0) * qty,
    source: "employee"
  });
  saveData();
  $("#order-qty").value = "1";
  setStatus("#order-status", "伝票を登録しました。");
  toast("伝票を登録しました");
  renderOrderPreview();
  renderSales();
}

function currentAccount() {
  if (!session) return null;
  return data.accounts.find((account) => (account.id === session.accountId || account.loginId === session.loginId) && account.isActive);
}

function currentStaff() {
  const account = currentAccount();
  return data.staff.find((staff) => staff.id === account?.staffId) || data.staff[0];
}

function currentProduct() {
  const productId = $("#order-product")?.value;
  return data.products.find((product) => product.id === productId && product.active !== false)
    || data.products.find((product) => product.active !== false);
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

function lastPunch(staffId) {
  return data.punches
    .filter((punch) => punch.staffId === staffId)
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))[0];
}

function extractQrCode(rawCode) {
  const text = String(rawCode || "").trim();
  try {
    const url = new URL(text);
    return url.searchParams.get("qr") || text;
  } catch {
    return text;
  }
}

function saveData() {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function businessDateKey(value = new Date()) {
  const date = new Date(value);
  if (date.getHours() < BUSINESS_DAY_START_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  return dateKey(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function floorDateToQuarter(value = new Date()) {
  const date = new Date(value);
  date.setMinutes(Math.floor(date.getMinutes() / ROUNDING_MINUTES) * ROUNDING_MINUTES, 0, 0);
  return date;
}

function timeKey(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

function normalizeLoginId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

function internalEmailForLogin(loginId) {
  return `${normalizeLoginId(loginId) || "staff"}@${INTERNAL_EMAIL_DOMAIN}`;
}

function normalizeAccountPassword(value) {
  const password = String(value || "").trim();
  if (!password || password === "1234" || /^\d{4}-\d{4}$/.test(password)) return DEFAULT_EMPLOYEE_PASSWORD;
  return password;
}

function statusText(status) {
  return statusLabel[status] || "未打刻";
}

function asset(path) {
  const value = String(path || "").trim();
  if (!value) return "../04_site_rebuild/assets/cast/cast-01.webp";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("../") || value.startsWith("/")) return value;
  return `${ASSET_ROOT}${value}`;
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function setStatus(selector, message, isError = false) {
  const target = $(selector);
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("is-error", Boolean(isError));
}

function toast(message) {
  const box = $("#toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("show"), 2200);
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
