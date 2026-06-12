const STORAGE_KEY = "naughty.siteData.v1";
const DATA_URL = "../03_system_seed/naughty_site_data.json";
const ASSET_ROOT = "../01_existing_site/";

const statusLabel = {
  working: "出勤中",
  scheduled: "予定",
  off: "休み"
};

let data = null;
let selectedStaffId = "";
let selectedProductId = "";
let selectedEventId = "";
let selectedMaterialId = "";
let selectedDate = "";

const $ = (selector) => document.querySelector(selector);

async function loadData() {
  const fallback = await loadSeedData();
  const saved = localStorage.getItem(STORAGE_KEY);
  data = normalizeData(mergeSavedData(fallback, saved));
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

function saveData(message = "保存しました") {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
  toast(message);
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
        <small>${statusLabel[staff.workStatus] || staff.workStatus}</small>
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
      <span><strong>${staff.displayName}</strong><small>${staff.romanName || ""} / ${statusLabel[staff.workStatus]}</small></span>
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
  $("#material-preview").innerHTML = item.image
    ? `<img src="${asset(item.image)}" alt="" /><span>${item.title || ""}</span>`
    : `<span>画像パスを入力</span>`;
}

function renderMaterialPreviewOnly() {
  const item = getMaterial();
  if (!item) return;
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
  $("#shift-editor").innerHTML = data.staff.map((staff) => {
    const shift = getOrCreateShift(selectedDate, staff.id);
    return `
      <div class="shift-row" data-staff="${staff.id}">
        <strong>${staff.displayName}</strong>
        <label>状態
          <select data-shift-field="status">
            ${["working", "scheduled", "off"].map((status) => `<option value="${status}" ${shift.status === status ? "selected" : ""}>${statusLabel[status]}</option>`).join("")}
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

  if (!data.sales.length) {
    $("#sales-list").innerHTML = `<div class="sale-row"><strong>売上未登録</strong><small>CSV出力できます</small></div>`;
    return;
  }

  $("#sales-list").innerHTML = data.sales.slice().reverse().map((sale) => {
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
  const rows = computePayroll();
  $("#payroll-table").innerHTML = rows.map((row) => `
    <div class="pay-row">
      <strong>${row.staff.displayName}</strong>
      <span>${row.hours.toFixed(2)}h</span>
      <span>${yen(row.basePay)}</span>
      <span>${yen(row.backPay)}</span>
      <b>${yen(row.total)}</b>
    </div>
  `).join("");
}

function computePayroll() {
  return data.staff.map((staff) => {
    const hours = data.shifts
      .filter((shift) => shift.staffId === staff.id && shift.status !== "off")
      .reduce((sum, shift) => sum + shiftHours(shift), 0);
    const basePay = Math.floor(hours * Number(staff.hourlyWage || 0));
    const backPay = data.sales
      .filter((sale) => sale.staffId === staff.id)
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

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      $(`#view-${button.dataset.view}`).classList.add("active");
    });
  });
}

function bindActions() {
  $("#save-button").addEventListener("click", () => saveData("公開サイトへ反映しました"));

  document.addEventListener("click", (event) => {
    const staffButton = event.target.closest("[data-staff-select]");
    if (staffButton) {
      selectedStaffId = staffButton.dataset.staffSelect;
      renderStaff();
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
      return;
    }

    const eventButton = event.target.closest("[data-event-select]");
    if (eventButton) {
      selectedEventId = eventButton.dataset.eventSelect;
      renderEvents();
      return;
    }

    const materialButton = event.target.closest("[data-material-select]");
    if (materialButton) {
      selectedMaterialId = materialButton.dataset.materialSelect;
      renderMaterialsAdmin();
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
    const url = new URL("../04_site_rebuild/index.html?v=production-20", location.href).href;
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
  $("#download-backup").addEventListener("click", downloadBackupJson);
  $("#restore-backup").addEventListener("click", () => $("#backup-file").click());
  $("#backup-file").addEventListener("change", restoreBackupJson);

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
  saveData(`${staff.displayName}を${statusLabel[status]}にしました`);
}

function downloadSalesCsv() {
  const header = ["createdAt", "staff", "product", "qty", "salePrice", "backAmount", "total", "backTotal"];
  const rows = data.sales.map((sale) => {
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
  link.download = `naughty_sales_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

function restoreBackupJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      data = normalizeData(JSON.parse(String(reader.result || "{}")));
      selectedStaffId = data.staff[0]?.id || "";
      selectedProductId = data.products[0]?.id || "";
      selectedEventId = data.events[0]?.id || "";
      selectedMaterialId = data.materials[0]?.id || "";
      selectedDate = shiftDates()[0] || "";
      saveData("バックアップを復元しました");
    } catch {
      toast("復元できませんでした");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

bindNavigation();
bindActions();
bindForms();
loadData();
