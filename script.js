/***********************
 * script.js
 * Recipe Inventory (API-driven, auth removed)
 *
 * Endpoints (GET):
 * - /api/inventory : { ok, headers, data }
 * - /api/recipes   : { ok, headers, data }
 * - /api/likes     : { ok, headers, data }    (Name column)
 * - /api/dislikes  : { ok, headers, data }    (Name column)
 *
 * Data is loaded from repo-root JSON on GitHub via /api/* (not functions/*.json copies).
 * Unlock → edit → Save commits JSON back to the repo root via /api/save/:kind
 * (Pages Function or standalone Worker → GitHub Contents API).
 *
 * UI:
 * - Recipes to Try: saved links (Instagram, etc.)
 * - Ingredients: dropdowns by Location -> Category -> pills
 * - Likes & Dislikes: add + show/hide + download (client-side download only)
 * - Shopping List: auto from out-of-stock + manual add with autocomplete + qty stepper
 * - Cookable Recipes: based on inventory + likes weighting
 * - Full Recipes: option groups via Label{a|b|c} per subset column
 ***********************/

/***********************
 * CONFIG
 ***********************/
const API = {
  inventory: "/api/inventory",
  recipes: "/api/recipes",
  recipesToTry: "/api/recipes_to_try",
  likes: "/api/likes",
  dislikes: "/api/dislikes",
  used: "/api/used",
  unlock: "/api/unlock",
  lock: "/api/lock",
  save: (kind) => `/api/save/${kind}`,
  saveAllBatch: "/api/save/all",
};

const DEFAULT_RESTOCK_QTY = 1;
const RECIPE_SUBSET_COLS = ["Meats", "Vegetables", "Fillers", "Spices", "Condiments", "Other"];

const INVENTORY_CATEGORY_DEFAULTS = [
  "Condiments",
  "Dairy",
  "Drinks",
  "Fillers",
  "Flavours",
  "Fruits",
  "Meats",
  "Other",
  "Snacks",
  "Spices",
  "Spreads",
  "Vegetables",
];

const RECIPES_TO_TRY_FALLBACK = [
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZdS-R5mhT7/" },
  { Title: "@thegoodbite", URL: "https://www.instagram.com/thegoodbite/reel/DZsxKE_MHy-/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZkfx68myCR/" },
  { Title: "@eatinghealthytoday", URL: "https://www.instagram.com/eatinghealthytoday/reel/C4eI6VJPxHi/" },
  { Title: "@eatinghealthytoday", URL: "https://www.instagram.com/eatinghealthytoday/p/DZgIIU5jkHZ/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZuuJSSG766/" },
  { Title: "@eatinghealthytoday", URL: "https://www.instagram.com/eatinghealthytoday/p/DZ0AIqoG9CE/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZw3x7FAXLp/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZ2VSYKg0Wb/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZYrdXSmtef/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZXqKpjg7HX/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DWeqUGuvzoy/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DW7UrZ7khqw/" },
  { Title: "Instagram post", URL: "https://www.instagram.com/p/DZchZQim2hK/" },
];

/***********************
 * DOM
 ***********************/
const els = {
  invStatus: document.getElementById("invStatus"),
  recStatus: document.getElementById("recStatus"),
  likesStatus: document.getElementById("likesStatus"),

  recipesToTry: document.getElementById("recipesToTry"),
  recipesToTryAddWrap: document.getElementById("recipesToTryAddWrap"),
  tryLinkUrlInput: document.getElementById("tryLinkUrlInput"),
  tryLinkTitleInput: document.getElementById("tryLinkTitleInput"),
  addTryLinkBtn: document.getElementById("addTryLinkBtn"),
  saveRecipesToTryBtn: document.getElementById("saveRecipesToTryBtn"),

  // legacy ingredient lists (not used now, but safe)
  ingredientsFreezer: document.getElementById("ingredientsFreezer"),
  ingredientsFridge: document.getElementById("ingredientsFridge"),
  ingredientsPantry: document.getElementById("ingredientsPantry"),

  // new ingredients dropdown container
  ingredientsDropdowns: document.getElementById("ingredientsDropdowns"),
  ingredientNameInput: document.getElementById("ingredientNameInput"),
  ingredientLocationSelect: document.getElementById("ingredientLocationSelect"),
  ingredientCategorySelect: document.getElementById("ingredientCategorySelect"),
  ingredientCountInput: document.getElementById("ingredientCountInput"),
  addIngredientBtn: document.getElementById("addIngredientBtn"),
  ingredientAddSuggestions: document.getElementById("ingredientAddSuggestions"),
  ingredientPopup: document.getElementById("ingredientPopup"),
  ingredientPopupBackdrop: document.getElementById("ingredientPopupBackdrop"),
  ingredientPopupTitle: document.getElementById("ingredientPopupTitle"),
  ingredientPopupMeta: document.getElementById("ingredientPopupMeta"),
  ingredientUsedBtn: document.getElementById("ingredientUsedBtn"),
  ingredientPopupClose: document.getElementById("ingredientPopupClose"),
  usedChips: document.getElementById("usedChips"),

  // Likes UI
  likeInput: document.getElementById("likeInput"),
  addLikeBtn: document.getElementById("addLikeBtn"),
  toggleLikesBtn: document.getElementById("toggleLikesBtn"),
  downloadLikesBtn: document.getElementById("downloadLikesBtn"),
  likeSuggestions: document.getElementById("likeSuggestions"),
  likesWrap: document.getElementById("likesWrap"),
  likesChips: document.getElementById("likesChips"),

  // Dislikes UI
  dislikeInput: document.getElementById("dislikeInput"),
  addDislikeBtn: document.getElementById("addDislikeBtn"),
  toggleDislikesBtn: document.getElementById("toggleDislikesBtn"),
  downloadDislikesBtn: document.getElementById("downloadDislikesBtn"),
  dislikeSuggestions: document.getElementById("dislikeSuggestions"),
  dislikesWrap: document.getElementById("dislikesWrap"),
  dislikesChips: document.getElementById("dislikesChips"),

  // Shopping
  shoppingList: document.getElementById("shoppingList"),
  shoppingInput: document.getElementById("shoppingInput"),
  shoppingSuggestions: document.getElementById("shoppingSuggestions"),

  // Recipes
  throwTogether: document.getElementById("throwTogether"),
  cookableRecipes: document.getElementById("cookableRecipes"),
  recipesTitle: document.getElementById("recipesTitle"),
  fullRecipes: document.getElementById("fullRecipes"),

  reloadBtn: document.getElementById("reloadBtn"),
  downloadInventoryBtn: document.getElementById("downloadInventoryBtn"),

  unlockBtn: document.getElementById("unlockBtn"),
  lockBtn: document.getElementById("lockBtn"),
  saveAllBtn: document.getElementById("saveAllBtn"),
  saveInventoryBtn: document.getElementById("saveInventoryBtn"),
  saveLikesBtn: document.getElementById("saveLikesBtn"),
  saveDislikesBtn: document.getElementById("saveDislikesBtn"),
  saveStatus: document.getElementById("saveStatus"),
};

/***********************
 * STATE
 ***********************/
let state = {
  inventoryHeaders: [],
  inventoryRows: [],
  recipesRows: [],
  recipesToTryRows: [],
  likes: new Map(),      // norm -> display
  likeRecords: [],       // { Name, Category }
  dislikes: new Map(),   // norm -> display
  dislikeRecords: [],    // { Name }
  used: new Map(),       // norm -> display
  usedRecords: [],       // { Name }
  shopping: new Map(),   // norm -> { displayName, qty }
  ui: {
    likesOpen: false,
    dislikesOpen: false,
    authed: false,
    ingredientFocus: null, // { loc, cat } one-shot after add
  }
};

function parseIngredientAmountAndName(raw) {
  const s = String(raw || "").trim();
  if (!s) return { amount: "", name: "" };

  let m = s.match(/^([\d.]+(?:\s*(?:g|kg|ml|l|mg))+)\s+(.+)$/i);
  if (m) return { amount: m[1].replace(/\s+/g, ""), name: m[2].trim() };

  m = s.match(/^(\d+)\s+(.+)$/);
  if (m) return { amount: m[1], name: m[2].trim() };

  return { amount: "", name: stripQtyLikeText(s) };
}

function formatRecipeAmount(item) {
  if (item.amount) return item.amount;
  if (item.count > 1) return String(item.count);
  return "";
}

function aggregateRecipeIngredientItems(items) {
  const map = new Map();
  const order = [];

  for (const item of items) {
    if (!item.nameNorm) continue;

    if (!map.has(item.nameNorm)) {
      map.set(item.nameNorm, {
        matchName: item.matchName,
        nameNorm: item.nameNorm,
        amount: item.amount || "",
        count: 0,
      });
      order.push(item.nameNorm);
    }

    const entry = map.get(item.nameNorm);
    entry.count += 1;
    if (item.amount && !entry.amount) entry.amount = item.amount;
  }

  return order.map((key) => map.get(key));
}

function getRecipeIngredientItems(rec) {
  const items = [];

  for (const f of rec.fixedRequirements) {
    const parsed = parseIngredientAmountAndName(f.name);
    const matchName = recipePartToMatchName(f.name);
    items.push({
      matchName,
      nameNorm: normName(matchName),
      amount: parsed.amount,
    });
  }

  for (const g of rec.optionGroups) {
    const pick = g.options[g.selectedIndex] || g.options[0];
    if (!pick) continue;

    items.push({
      matchName: pick.matchName,
      nameNorm: pick.nameNorm,
      amount: parseIngredientAmountAndName(g.label).amount,
    });
  }

  return aggregateRecipeIngredientItems(items);
}

function extractFirstUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : "";
}

function findStockForIngredient(nameNorm, inventoryIdx) {
  if (!nameNorm) return null;
  if (inventoryIdx.has(nameNorm)) return inventoryIdx.get(nameNorm);

  let best = null;
  for (const [key, entry] of inventoryIdx.entries()) {
    if (key.includes(nameNorm) || nameNorm.includes(key)) {
      if (!best || key.length < best.key.length) best = { key, entry };
    }
  }
  return best?.entry || null;
}

function makeRecipeIngredientButton(item, inventoryIdx) {
  const inv = findStockForIngredient(item.nameNorm, inventoryIdx);
  const inStock = !!(inv && inv.totalQty > 0);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `chip chip-recipe ${inStock ? "chip-recipe--in" : "chip-recipe--out"}`;
  btn.textContent = item.matchName;
  btn.title = inStock
    ? `${item.matchName}: in stock (${inv.totalQty})`
    : `${item.matchName}: not in stock`;
  btn.dataset.matchName = item.matchName;
  btn.dataset.nameNorm = item.nameNorm;
  return btn;
}

/***********************
 * NETWORK
 ***********************/
async function fetchJSON(url, opts) {
  const res = await fetch(url, {
  cache: "no-store",  
  credentials: "include", // This sends the cookies (like the session cookie) with the request
  ...(opts || {})
});
  
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    const hint = ct.includes("text/html") ? text.slice(0, 200) : text.slice(0, 400);
    throw new Error(`${url} -> ${res.status} ${hint}`);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`${url} -> expected JSON, got ${ct || "unknown"}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text);
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include", // This sends the cookies (like the session cookie) with the request
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  // Try to parse JSON if present
  const data = ct.includes("application/json") ? JSON.parse(text || "{}") : null;

  if (!res.ok || !data?.ok) {
    const hint = data?.error || text.slice(0, 200) || res.status;
    throw new Error(`${url} POST failed: ${hint}`);
  }
  return data;
}

/***********************
 * JSON HELPERS (for downloads)
 ***********************/
function toJsonStore(headers, records) {
  return JSON.stringify({ headers, data: records }, null, 2);
}

function downloadJsonFile(filename, headers, records) {
  const text = toJsonStore(headers, records);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/***********************
 * HELPERS
 ***********************/
function normName(s) { return String(s || "").trim().toLowerCase(); }
function clear(el) { if (el) el.innerHTML = ""; }

function num(v) {
  const n = Number(String(v || "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeLocationForUI(locRaw) {
  const loc = normName(locRaw);

  if (loc === "cupboard") return "pantry";
  if (loc === "cabinet") return "pantry";

  if (loc === "freezer cooked") return "freezer";
  if (loc === "fridge cooked") return "fridge";

  if (loc === "freezer") return "freezer";
  if (loc === "fridge") return "fridge";
  if (loc === "pantry") return "pantry";

  return loc;
}

function isCookedRow(r) {
  const loc = normName(r["Location"] || "");
  return loc === "freezer cooked" || loc === "fridge cooked";
}

function stripQtyLikeText(s) {
  const raw = String(s || "").trim();
  if (!raw) return "";

  let out = raw.replace(/\s*\([^)]*\)\s*$/g, "").trim();

  const tokens = out.split(/\s+/);
  const unitToken = /^(?:g|kg|mg|ml|l|tbsp|tbs|tsp|cups?|pinch|cloves?)$/i;

  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (/^[0-9¼½¾]/.test(last) || unitToken.test(last)) {
      tokens.pop();
      out = tokens.join(" ").trim();
      continue;
    }
    break;
  }
  return out;
}

function recipePartToMatchName(part) {
  const parsed = parseIngredientAmountAndName(part);
  return stripQtyLikeText(parsed.name || part);
}

function splitRequiredCommaList(cellText) {
  const raw = String(cellText || "").trim();
  if (!raw) return [];
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

function parseOptionGroupToken(token) {
  const t = String(token || "").trim();
  if (!t) return null;

  const m = t.match(/^(.+?)\{(.+?)\}$/);
  if (!m) return null;

  const label = m[1].trim();
  const inner = m[2].trim();

  const options = inner
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const matchName = stripQtyLikeText(x);
      return { name: x, matchName, nameNorm: normName(matchName) };
    });

  if (!label || options.length === 0) return null;

  return { label, options, selectedIndex: 0 };
}

/***********************
 * LOADERS
 ***********************/
function normalizeTryRows(raw) {
  const rows = Array.isArray(raw) ? raw : (raw?.data || []);
  return rows
    .map((r) => ({
      Title: String(r.Title || r["Recipe Name"] || "").trim(),
      URL: String(r.URL || r.Link || "").trim(),
    }))
    .filter((r) => r.URL);
}

async function loadJsonStoreRows(apiUrl, staticPath, label) {
  try {
    const res = await fetchJSON(apiUrl);
    if (res.ok) return res.data || [];
  } catch (err) {
    console.warn(`${label} API unavailable`, err);
  }

  try {
    const res = await fetch(staticPath, { cache: "no-store" });
    if (res.ok) {
      const parsed = await res.json();
      const rows = Array.isArray(parsed) ? parsed : (parsed.data || []);
      if (rows.length) {
        console.warn(`${label} using bundled static copy — may be stale vs repo root`);
        return rows;
      }
    }
  } catch (err) {
    console.warn(`${label} static file unavailable`, err);
  }

  return null;
}

async function loadRecipesToTryRows() {
  const rows = await loadJsonStoreRows(
    API.recipesToTry,
    "/recipes_to_try.json",
    "recipes_to_try"
  );
  if (rows) {
    const normalized = normalizeTryRows(rows);
    if (normalized.length) return normalized;
  }

  return normalizeTryRows(RECIPES_TO_TRY_FALLBACK);
}

async function loadAll() {
  els.invStatus && (els.invStatus.textContent = "Loading…");
  els.recStatus && (els.recStatus.textContent = "Loading…");
  els.likesStatus && (els.likesStatus.textContent = "Loading…");

  try {
    const [invRes, recRes, likesRes, dislikesRes] = await Promise.all([
      fetchJSON(API.inventory),
      fetchJSON(API.recipes),
      fetchJSON(API.likes),
      fetchJSON(API.dislikes),
    ]);

    if (!invRes.ok) throw new Error(invRes.error || "inventory failed");
    if (!recRes.ok) throw new Error(recRes.error || "recipes failed");
    if (!likesRes.ok) throw new Error(likesRes.error || "likes failed");
    if (!dislikesRes.ok) throw new Error(dislikesRes.error || "dislikes failed");

    state.inventoryHeaders = invRes.headers || [];
    state.inventoryRows = invRes.data || [];
    state.recipesRows = recRes.data || [];
    state.recipesToTryRows = await loadRecipesToTryRows();

    const usedData = await loadUsedRows();

    state.likeRecords = (likesRes.data || [])
      .map((r) => ({
        Name: stripQtyLikeText((r["Name"] || r["Food"] || "").trim()),
        Category: String(r["Category"] || "").trim(),
      }))
      .filter((r) => r.Name);

    state.likes = new Map();
    for (const r of state.likeRecords) {
      const n = normName(r.Name);
      if (!n) continue;
      if (!state.likes.has(n)) state.likes.set(n, r.Name);
    }

    state.dislikeRecords = (dislikesRes.data || [])
      .map((r) => ({
        Name: stripQtyLikeText((r["Name"] || r["Food"] || "").trim()),
      }))
      .filter((r) => r.Name);

    state.dislikes = new Map();
    for (const r of state.dislikeRecords) {
      const n = normName(r.Name);
      if (!n) continue;
      if (!state.dislikes.has(n)) state.dislikes.set(n, r.Name);
    }

    state.usedRecords = (usedData || [])
      .map((r) => ({
        Name: stripQtyLikeText((r["Name"] || "").trim()),
      }))
      .filter((r) => r.Name);

    state.used = new Map();
    for (const r of state.usedRecords) {
      const n = normName(r.Name);
      if (!n) continue;
      if (!state.used.has(n)) state.used.set(n, r.Name);
    }

    state.shopping = new Map();

    els.invStatus && (els.invStatus.textContent = `Loaded ${state.inventoryRows.length} rows`);
    els.recStatus && (els.recStatus.textContent = `Loaded ${state.recipesRows.length} rows`);
    els.likesStatus && (els.likesStatus.textContent = `Loaded ${state.likes.size} likes / ${state.dislikes.size} dislikes`);

    populateIngredientCategorySelect();
    renderAll();
  } catch (err) {
    console.error(err);
    els.invStatus && (els.invStatus.textContent = "Load failed (check console)");
    els.recStatus && (els.recStatus.textContent = "Load failed (check console)");
    els.likesStatus && (els.likesStatus.textContent = "Load failed (check console)");
  }
}

/***********************
 * DERIVED: inventory index (raw ingredients only)
 ***********************/
function getInventoryIndex() {
  const idx = new Map();
  for (const r of state.inventoryRows) {
    if (isCookedRow(r)) continue;

    const matchName = stripQtyLikeText(r["Name"]);
    const nameNorm = normName(matchName);
    if (!nameNorm) continue;

    const q = (r["Count"] !== undefined && String(r["Count"]).trim() !== "")
      ? num(r["Count"])
      : num(r["Quantity"]);

    if (!idx.has(nameNorm)) idx.set(nameNorm, { totalQty: 0, rows: [] });
    const entry = idx.get(nameNorm);
    entry.totalQty += q;
    entry.rows.push(r);
  }
  return idx;
}

/***********************
 * RECIPES
 ***********************/
function parseRecipeRow(r) {
  const name = (r["Recipe Name"] || "").trim();
  if (!name) return null;

  const fixedRequirements = [];
  const optionGroups = [];

  for (const subset of RECIPE_SUBSET_COLS) {
    const cell = String(r[subset] || "").trim();
    if (!cell) continue;

    const parts = splitRequiredCommaList(cell);

    for (const part of parts) {
      const group = parseOptionGroupToken(part);
      if (group) {
        optionGroups.push({ subset, ...group });
        continue;
      }

      const display = part;
      const matchName = recipePartToMatchName(display);
      const nameNorm = normName(matchName);
      if (!nameNorm) continue;

      fixedRequirements.push({ subset, name: display, matchName, nameNorm });
    }
  }

  return {
    name,
    fixedRequirements,
    optionGroups,
    instructions: (r["Instructions"] || "").trim(),
    notes: (r["Notes"] || "").trim(),
  };
}

function setDefaultGroupSelectionsFromInventory(rec, inventoryIdx) {
  for (const g of rec.optionGroups) {
    let best = 0;
    for (let i = 0; i < g.options.length; i++) {
      const opt = g.options[i];
      const inv = inventoryIdx.get(opt.nameNorm);
      const have = inv ? inv.totalQty : 0;
      if (have > 0) { best = i; break; }
    }
    g.selectedIndex = best;
  }
}

function getResolvedIngredientsForRecipe(rec) {
  const resolved = [];
  for (const f of rec.fixedRequirements) {
    resolved.push({ name: f.name, matchName: f.matchName, nameNorm: f.nameNorm });
  }
  for (const g of rec.optionGroups) {
    const pick = g.options[g.selectedIndex] || g.options[0];
    if (pick?.nameNorm) {
      resolved.push({ name: pick.name, matchName: pick.matchName, nameNorm: pick.nameNorm });
    }
  }
  return resolved;
}

function computeCookableRecipes(inventoryIdx) {
  const results = [];

  for (const raw of state.recipesRows) {
    const rec = parseRecipeRow(raw);
    if (!rec) continue;

    let missing = 0;
    let likedHits = 0;

    for (const f of rec.fixedRequirements) {
      const inv = inventoryIdx.get(f.nameNorm);
      const have = inv ? inv.totalQty : 0;
      if (have <= 0) missing++;
      if (state.likes.has(f.nameNorm)) likedHits++;
    }

    for (const g of rec.optionGroups) {
      let anyHave = false;
      let anyLiked = false;

      for (const opt of g.options) {
        const inv = inventoryIdx.get(opt.nameNorm);
        const have = inv ? inv.totalQty : 0;
        if (have > 0) anyHave = true;
        if (state.likes.has(opt.nameNorm)) anyLiked = true;
      }

      if (!anyHave) missing++;
      if (anyLiked) likedHits++;
    }

    if (missing === 0) results.push({ ...rec, likedHits });
  }

  results.sort((a, b) => (b.likedHits - a.likedHits) || a.name.localeCompare(b.name));
  return results;
}

/***********************
 * SHOPPING LIST
 ***********************/
function getAllKnownIngredientDisplayNames() {
  const seen = new Map();
  for (const r of state.inventoryRows) {
    if (isCookedRow(r)) continue;
    const matchName = stripQtyLikeText(r["Name"]);
    const n = normName(matchName);
    if (!n) continue;
    if (!seen.has(n)) seen.set(n, matchName);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

function addShoppingItem(displayName, qty = 1) {
  const raw = String(displayName || "").trim();
  const matchName = stripQtyLikeText(raw);
  const n = normName(matchName);
  if (!n) return;

  const existing = state.shopping.get(n);
  if (existing) existing.qty = Math.max(1, existing.qty + qty);
  else state.shopping.set(n, { displayName: matchName, qty: Math.max(1, qty) });

  renderAll();
}

function seedShoppingFromOutOfStock(inventoryIdx) {
  for (const [nameNorm, entry] of inventoryIdx.entries()) {
    if (entry.totalQty <= 0) {
      const displayName = stripQtyLikeText(entry.rows[0]?.["Name"] || nameNorm);
      if (!state.shopping.has(nameNorm)) {
        state.shopping.set(nameNorm, { displayName, qty: 1 });
      }
    }
  }
}

function getInventoryCategories() {
  const set = new Set(INVENTORY_CATEGORY_DEFAULTS);
  for (const r of state.inventoryRows) {
    const c = String(r["Category"] || "").trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function populateIngredientCategorySelect() {
  if (!els.ingredientCategorySelect) return;

  const prev = els.ingredientCategorySelect.value;
  const categories = getInventoryCategories();

  els.ingredientCategorySelect.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Category…";
  els.ingredientCategorySelect.appendChild(blank);

  for (const cat of categories) {
    const op = document.createElement("option");
    op.value = cat;
    op.textContent = cat;
    els.ingredientCategorySelect.appendChild(op);
  }

  if (prev && categories.includes(prev)) els.ingredientCategorySelect.value = prev;
}

function addOrStackInventoryRow({ name, location, category, countAdd, notes }) {
  const displayName = stripQtyLikeText(name) || String(name || "").trim();
  if (!displayName) return null;

  const nameNorm = normName(displayName);
  const locNorm = normName(location || "Cupboard");
  const addQty = Math.max(1, num(countAdd));

  const existing = state.inventoryRows.find((r) => {
    if (isCookedRow(r)) return false;
    const rowName = normName(stripQtyLikeText(r["Name"] || ""));
    return rowName === nameNorm && normName(r["Location"] || "") === locNorm;
  });

  if (existing) {
    const hasCount = existing["Count"] !== undefined && String(existing["Count"]).trim() !== "";
    if (hasCount) {
      existing["Count"] = String(num(existing["Count"]) + addQty);
    } else {
      existing["Count"] = String(addQty);
    }
    if (category && !String(existing["Category"] || "").trim()) {
      existing["Category"] = category;
    }
    return existing;
  }

  const row = {
    Name: displayName,
    Quantity: "",
    Count: String(addQty),
    Location: location || "Cupboard",
    Category: category || "",
    "Expiry Date": "",
    Notes: notes || "",
  };
  state.inventoryRows.push(row);
  return row;
}

function addInventoryFromForm() {
  const name = String(els.ingredientNameInput?.value || "").trim();
  if (!name) return;

  const location = String(els.ingredientLocationSelect?.value || "Cupboard").trim();
  const category = String(els.ingredientCategorySelect?.value || "").trim();
  const countRaw = String(els.ingredientCountInput?.value ?? "1").trim();
  const count = countRaw === "" ? "1" : countRaw;

  addOrStackInventoryRow({ name, location, category, countAdd: count });

  if (els.ingredientNameInput) els.ingredientNameInput.value = "";
  if (els.ingredientAddSuggestions) els.ingredientAddSuggestions.innerHTML = "";

  state.ui.ingredientFocus = {
    loc: normalizeLocationForUI(location),
    cat: category.trim() || "Uncategorised",
  };

  renderAll();
}

function renderIngredientAddSuggestions() {
  if (!els.ingredientAddSuggestions || !els.ingredientNameInput) return;
  els.ingredientAddSuggestions.innerHTML = "";

  const q = String(els.ingredientNameInput.value || "").trim().toLowerCase();
  if (!q) return;

  const options = getAllKnownIngredientDisplayNames()
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 8);

  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      els.ingredientNameInput.value = opt;
      els.ingredientAddSuggestions.innerHTML = "";
    });
    els.ingredientAddSuggestions.appendChild(btn);
  }
}

let ingredientPopupRow = null;

function removeInventoryRow(row) {
  const idx = state.inventoryRows.indexOf(row);
  if (idx >= 0) state.inventoryRows.splice(idx, 1);
}

function openIngredientPopup(row) {
  if (!els.ingredientPopup || !row) return;

  ingredientPopupRow = row;
  const name = row["Name"] || "(Unnamed)";
  const hasCount = row["Count"] !== undefined && String(row["Count"]).trim() !== "";
  const qtyLine = hasCount
    ? `Count: ${row["Count"]}`
    : `Quantity: ${row["Quantity"] || "0"}`;
  const meta = [
    qtyLine,
    row["Location"] ? `Location: ${row["Location"]}` : "",
    row["Category"] ? `Category: ${row["Category"]}` : "",
    row["Expiry Date"] ? `Expiry: ${row["Expiry Date"]}` : "",
    row["Notes"] ? `Notes: ${row["Notes"]}` : "",
  ].filter(Boolean).join(" · ");

  if (els.ingredientPopupTitle) els.ingredientPopupTitle.textContent = name;
  if (els.ingredientPopupMeta) els.ingredientPopupMeta.textContent = meta;

  els.ingredientPopup.classList.remove("hidden");
}

function closeIngredientPopup() {
  ingredientPopupRow = null;
  els.ingredientPopup?.classList.add("hidden");
}

function markIngredientUsed() {
  const row = ingredientPopupRow;
  if (!row) return;

  const displayName = stripQtyLikeText(row["Name"] || "");
  const nameNorm = normName(displayName);
  if (!nameNorm) {
    closeIngredientPopup();
    return;
  }

  const hasCount = row["Count"] !== undefined && String(row["Count"]).trim() !== "";
  const count = hasCount ? num(row["Count"]) : 1;

  if (count > 1) {
    row["Count"] = String(count - 1);
  } else {
    removeInventoryRow(row);
  }

  if (!state.used.has(nameNorm)) {
    state.used.set(nameNorm, displayName);
    state.usedRecords.push({ Name: displayName });
    state.usedRecords.sort((a, b) => a.Name.localeCompare(b.Name));
  }

  closeIngredientPopup();
  renderAll();
}

function renderUsed() {
  if (!els.usedChips) return;
  renderChips(state.used, els.usedChips);

  const summary = document.getElementById("usedSummary");
  if (summary) summary.textContent = `Used (${state.used.size})`;
}

async function loadUsedRows() {
  const rows = await loadJsonStoreRows(API.used, "/used.json", "used");
  return rows || [];
}

/***********************
 * UI: Pills
 ***********************/
function makePill(container, r) {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "pill";

  const name = document.createElement("span");
  name.textContent = r["Name"] || "(Unnamed)";

  const qty = document.createElement("span");
  qty.className = "qty";
  const hasCount = r["Count"] !== undefined && String(r["Count"]).trim() !== "";
  qty.textContent = hasCount ? String(r["Count"]).trim() : (String(r["Quantity"] || "").trim() || "0");

  pill.appendChild(name);
  pill.appendChild(qty);

  const exp = String(r["Expiry Date"] || "").trim();
  if (exp) {
    const expEl = document.createElement("span");
    expEl.className = "exp";
    expEl.textContent = exp;
    pill.appendChild(expEl);
  }

  pill.addEventListener("click", () => {
    openIngredientPopup(r);
  });

  container.appendChild(pill);
}

/***********************
 * SECTION: Recipes to Try
 ***********************/
function tryLinkLabel(row) {
  const title = String(row.Title || "").trim();
  const url = String(row.URL || "").trim();
  if (/reel\//i.test(url)) {
    return title ? `${title} · reel` : "Instagram reel";
  }
  if (/instagram\.com\/[^/]+\/p\//i.test(url)) {
    return title || "Instagram post";
  }
  if (/youtube\.com\/shorts\//i.test(url)) {
    return title || "YouTube Short";
  }
  if (/youtube\.com\/watch/i.test(url) || /youtu\.be\//i.test(url)) {
    return title || "YouTube";
  }
  return title || url;
}

function defaultTryLinkTitle(url) {
  if (/youtube\.com\/shorts\//i.test(url)) return "YouTube Short";
  if (/youtube\.com\/watch/i.test(url) || /youtu\.be\//i.test(url)) return "YouTube";
  if (/reel\//i.test(url)) return "Instagram reel";
  if (/instagram\.com\/[^/]+\/p\//i.test(url)) return "Instagram post";
  return "Link";
}

function addTryLinkFromForm() {
  if (!state.ui.authed) {
    alert("Unlock first to add links.");
    return;
  }

  const url = String(els.tryLinkUrlInput?.value || "").trim();
  if (!url) return;

  if (!/^https?:\/\//i.test(url)) {
    alert("Enter a full URL starting with https://");
    return;
  }

  const titleRaw = String(els.tryLinkTitleInput?.value || "").trim();
  const title = titleRaw || defaultTryLinkTitle(url);

  const exists = state.recipesToTryRows.some((r) => String(r.URL || "").trim() === url);
  if (!exists) {
    state.recipesToTryRows.push({ Title: title, URL: url });
  }

  if (els.tryLinkUrlInput) els.tryLinkUrlInput.value = "";
  if (els.tryLinkTitleInput) els.tryLinkTitleInput.value = "";
  renderRecipesToTry();
}

function renderRecipesToTry() {
  if (!els.recipesToTry) return;
  clear(els.recipesToTry);

  const rows = state.recipesToTryRows || [];
  if (rows.length === 0) {
    els.recipesToTry.innerHTML = `<div class="muted small">No links saved yet.</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "tryLinkList";

  for (const row of rows) {
    const a = document.createElement("a");
    a.className = "tryLink";
    a.href = row.URL;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = tryLinkLabel(row);
    list.appendChild(a);
  }

  els.recipesToTry.appendChild(list);
}

/***********************
 * SECTION: Ingredients dropdowns
 ***********************/
function buildIngredientsTree() {
  const tree = new Map(); // tree[loc][cat] = rows[]

  for (const r of state.inventoryRows) {
    if (isCookedRow(r)) continue;

    const loc = normalizeLocationForUI(r["Location"]);
    if (!["freezer", "fridge", "pantry"].includes(loc)) continue;

    const cat = String(r["Category"] || "").trim() || "Uncategorised";

    if (!tree.has(loc)) tree.set(loc, new Map());
    const locMap = tree.get(loc);

    if (!locMap.has(cat)) locMap.set(cat, []);
    locMap.get(cat).push(r);
  }

  for (const [, locMap] of tree.entries()) {
    for (const [cat, arr] of locMap.entries()) {
      arr.sort((a, b) => (a["Name"] || "").localeCompare(b["Name"] || ""));
      locMap.set(cat, arr);
    }
  }

  return tree;
}

function makeDetailsDropdown(titleText, bodyNode, open = false) {
  const d = document.createElement("details");
  d.className = "dd";
  if (open) d.open = true;

  const s = document.createElement("summary");
  s.textContent = titleText;

  const body = document.createElement("div");
  body.className = "ddBody";
  body.appendChild(bodyNode);

  d.appendChild(s);
  d.appendChild(body);
  return d;
}

function parseCategorySummary(text) {
  return String(text || "").replace(/\s*\(\d+\)\s*$/, "").trim();
}

function captureIngredientsOpenState() {
  const locs = new Set();
  const cats = new Set();
  const locKeys = ["freezer", "fridge", "pantry"];

  const locDds = els.ingredientsDropdowns?.querySelectorAll(".dropdownRow > .dd") || [];
  locDds.forEach((locDD, idx) => {
    if (locDD.open && locKeys[idx]) locs.add(locKeys[idx]);

    locDD.querySelectorAll(".locBody > .dd").forEach((catDD) => {
      if (!catDD.open) return;
      const cat = parseCategorySummary(catDD.querySelector("summary")?.textContent);
      if (cat) cats.add(cat);
    });
  });

  return { locs, cats };
}

function renderIngredientsDropdowns() {
  if (!els.ingredientsDropdowns) return;

  const openState = captureIngredientsOpenState();
  const focus = state.ui.ingredientFocus;
  if (focus) {
    openState.locs.add(focus.loc);
    openState.cats.add(focus.cat);
    state.ui.ingredientFocus = null;
  }

  clear(els.ingredientsDropdowns);

  const tree = buildIngredientsTree();

  const row1 = document.createElement("div");
  row1.className = "dropdownRow";

  const locs = [
    { key: "freezer", label: "Freezer" },
    { key: "fridge", label: "Fridge" },
    { key: "pantry", label: "Pantry" },
  ];

  for (const loc of locs) {
    const locMap = tree.get(loc.key) || new Map();

    const locBody = document.createElement("div");
    locBody.className = "locBody";

    const catNames = Array.from(locMap.keys()).sort((a, b) => a.localeCompare(b));

    if (catNames.length === 0) {
      locBody.innerHTML = `<div class="muted small">No ingredients in ${loc.label.toLowerCase()}.</div>`;
    } else {
      for (const cat of catNames) {
        const rows = locMap.get(cat) || [];

        const catGrid = document.createElement("div");
        catGrid.className = "pillGrid";
        for (const r of rows) makePill(catGrid, r);

        const catDD = makeDetailsDropdown(
          `${cat} (${rows.length})`,
          catGrid,
          openState.cats.has(cat)
        );
        locBody.appendChild(catDD);
      }
    }

    const totalInLoc = catNames.reduce((n, cat) => n + (locMap.get(cat)?.length || 0), 0);
    const locDD = makeDetailsDropdown(
      `${loc.label} (${totalInLoc})`,
      locBody,
      openState.locs.has(loc.key)
    );
    row1.appendChild(locDD);
  }

  els.ingredientsDropdowns.appendChild(row1);
}

/***********************
 * Likes & Dislikes
 ***********************/
function setPrefVisibility(which, open) {
  const isOpen = !!open;

  if (which === "likes") {
    state.ui.likesOpen = isOpen;
    els.likesWrap?.classList.toggle("hidden", !isOpen);
    if (els.toggleLikesBtn) els.toggleLikesBtn.textContent = isOpen ? "Hide" : "Show";
  }

  if (which === "dislikes") {
    state.ui.dislikesOpen = isOpen;
    els.dislikesWrap?.classList.toggle("hidden", !isOpen);
    if (els.toggleDislikesBtn) els.toggleDislikesBtn.textContent = isOpen ? "Hide" : "Show";
  }
}

function renderChips(map, container) {
  if (!container) return;
  container.innerHTML = "";

  const entries = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  if (entries.length === 0) {
    container.innerHTML = `<div class="muted small">None yet.</div>`;
    return;
  }

  for (const name of entries) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = name;
    container.appendChild(chip);
  }
}

function renderLikes() {
  renderChips(state.likes, els.likesChips);
  const summary = document.getElementById("likesSummary");
  if (summary) summary.textContent = `Likes (${state.likes.size})`;
  setPrefVisibility("likes", state.ui.likesOpen);
}

function renderDislikes() {
  renderChips(state.dislikes, els.dislikesChips);
  const summary = document.getElementById("dislikesSummary");
  if (summary) summary.textContent = `Dislikes (${state.dislikes.size})`;
  setPrefVisibility("dislikes", state.ui.dislikesOpen);
}

function getLikeAutocompleteOptions(mapToExclude) {
  const known = getAllKnownIngredientDisplayNames();
  return known.filter((x) => !mapToExclude.has(normName(x)));
}

function renderSuggestions(inputEl, suggestionsEl, excludeMap, onPick) {
  if (!inputEl || !suggestionsEl) return;
  suggestionsEl.innerHTML = "";

  const q = String(inputEl.value || "").trim().toLowerCase();
  if (!q) return;

  const options = getLikeAutocompleteOptions(excludeMap)
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 8);

  if (options.length === 0) return;

  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion";
    btn.textContent = opt;
    btn.addEventListener("click", () => onPick(opt));
    suggestionsEl.appendChild(btn);
  }
}

function addFromInput(inputEl, suggestionsEl, map, autoOpenWhich, records, buildRecord) {
  if (!inputEl) return;
  const raw = String(inputEl.value || "").trim();
  if (!raw) return;

  const clean = stripQtyLikeText(raw);
  const n = normName(clean);
  if (!n) return;

  if (map.has(n)) {
    inputEl.value = "";
    suggestionsEl && (suggestionsEl.innerHTML = "");
    return;
  }

  map.set(n, clean);
  if (records && buildRecord) {
    records.push(buildRecord(clean));
    records.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  }

  inputEl.value = "";
  suggestionsEl && (suggestionsEl.innerHTML = "");

  if (autoOpenWhich) setPrefVisibility(autoOpenWhich, true);

  renderAll();
}

/***********************
 * SECTION: Shopping List
 ***********************/
function renderStepper(initialQty, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "stepper";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "btn tiny";
  minus.textContent = "–";

  const val = document.createElement("div");
  val.className = "stepperVal";
  val.textContent = String(initialQty);

  const plus = document.createElement("button");
  plus.type = "button";
  plus.className = "btn tiny";
  plus.textContent = "+";

  let qty = initialQty;

  const setQty = (n) => {
    qty = Math.max(1, n);
    val.textContent = String(qty);
    onChange(qty);
  };

  minus.addEventListener("click", () => setQty(qty - 1));
  plus.addEventListener("click", () => setQty(qty + 1));

  wrap.appendChild(minus);
  wrap.appendChild(val);
  wrap.appendChild(plus);

  return wrap;
}

function buildShoppingRow(it) {
  const row = document.createElement("div");
  row.className = "row row--compact";

  const left = document.createElement("div");
  left.className = "left";

  const t = document.createElement("div");
  t.className = "title";
  t.textContent = it.displayName;

  left.appendChild(t);

  const right = document.createElement("div");
  right.className = "right";

  const stepper = renderStepper(it.qty, (newQty) => {
    const cur = state.shopping.get(it.nameNorm);
    if (cur) cur.qty = newQty;
  });

  const wrap = document.createElement("label");
  wrap.className = "checkbox";

  const cb = document.createElement("input");
  cb.type = "checkbox";

  const span = document.createElement("span");
  span.textContent = "Bought";

  wrap.appendChild(cb);
  wrap.appendChild(span);

  cb.addEventListener("change", () => {
    if (!cb.checked) return;

    addOrStackInventoryRow({
      name: it.displayName,
      location: "Cupboard",
      category: "",
      countAdd: it.qty || DEFAULT_RESTOCK_QTY,
      notes: "restocked from shopping list",
    });

    state.shopping.delete(it.nameNorm);
    renderAll();
  });

  right.appendChild(stepper);
  right.appendChild(wrap);

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function renderShoppingList(inventoryIdx) {
  if (!els.shoppingList) return;
  clear(els.shoppingList);

  seedShoppingFromOutOfStock(inventoryIdx);

  const entries = Array.from(state.shopping.entries())
    .map(([nameNorm, obj]) => ({ nameNorm, ...obj }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (entries.length === 0) {
    els.shoppingList.innerHTML = `<div class="muted small">Shopping list is empty.</div>`;
    return;
  }

  const listEl = document.createElement("div");
  listEl.className = "list list--compact";
  for (const it of entries) listEl.appendChild(buildShoppingRow(it));

  const area = document.createElement("div");
  area.className = "dropdownArea shoppingDropdowns";

  const rowWrap = document.createElement("div");
  rowWrap.className = "dropdownRow shoppingDropdownRow";
  rowWrap.appendChild(makeDetailsDropdown(`Items (${entries.length})`, listEl));

  area.appendChild(rowWrap);
  els.shoppingList.appendChild(area);
}

/***********************
 * SHOPPING AUTOCOMPLETE
 ***********************/
function renderShoppingSuggestions() {
  if (!els.shoppingSuggestions || !els.shoppingInput) return;
  clear(els.shoppingSuggestions);

  const query = String(els.shoppingInput.value || "").trim().toLowerCase();
  if (!query) return;

  const options = getAllKnownIngredientDisplayNames()
    .filter((n) => n.toLowerCase().includes(query))
    .slice(0, 8);

  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion";
    btn.textContent = opt;

    btn.addEventListener("click", () => {
      addShoppingItem(opt, 1);
      els.shoppingInput.value = "";
      clear(els.shoppingSuggestions);
    });

    els.shoppingSuggestions.appendChild(btn);
  }
}

function handleShoppingEnter() {
  if (!els.shoppingInput) return;
  const raw = String(els.shoppingInput.value || "").trim();
  if (!raw) return;
  addShoppingItem(raw, 1);
  els.shoppingInput.value = "";
  clear(els.shoppingSuggestions);
}

/***********************
 * SECTION: Cookable Recipes
 ***********************/
function renderCookableRecipes(inventoryIdx) {
  if (!els.cookableRecipes) return;
  clear(els.cookableRecipes);

  const cookable = computeCookableRecipes(inventoryIdx);
  if (cookable.length === 0) {
    els.cookableRecipes.innerHTML = `<div class="muted small">No recipes fully supported by current inventory.</div>`;
    return;
  }

  for (const rec of cookable) {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "left";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = rec.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    if (rec.likedHits > 0) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = `${rec.likedHits} liked`;
      meta.appendChild(b);
    }

    left.appendChild(t);
    if (meta.childNodes.length) left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "right";

    const view = document.createElement("button");
    view.className = "btn";
    view.textContent = "View";

    view.addEventListener("click", () => {
      const fixed = rec.fixedRequirements.map((x) => `- ${x.name}`).join("\n");
      const groups = rec.optionGroups.map((g) => {
        const opts = g.options.map((o) => o.name).join(" | ");
        return `- ${g.subset}: ${g.label}{${opts}}`;
      }).join("\n");

      alert(
        `${rec.name}\n\n` +
        `Fixed:\n${fixed || "(none)"}\n\n` +
        `Options:\n${groups || "(none)"}\n\n` +
        `Instructions:\n${rec.instructions || "(none)"}\n\n` +
        `Notes:\n${rec.notes || "(none)"}`
      );
    });

    right.appendChild(view);

    row.appendChild(left);
    row.appendChild(right);
    els.cookableRecipes.appendChild(row);
  }
}

/***********************
 * SECTION: Full Recipes
 ***********************/
function renderFullRecipes() {
  if (!els.fullRecipes) return;
  clear(els.fullRecipes);

  const inventoryIdx = getInventoryIndex();

  const recipes = state.recipesRows
    .map(parseRecipeRow)
    .filter(Boolean);

  if (recipes.length === 0) {
    els.fullRecipes.innerHTML = `<div class="muted small">No recipes found.</div>`;
    return;
  }

  for (const rec of recipes) {
    setDefaultGroupSelectionsFromInventory(rec, inventoryIdx);

    const body = document.createElement("div");
    body.className = "recipeBody";

    const ingredients = document.createElement("div");
    ingredients.className = "recipeIngredientGrid";

    for (const item of getRecipeIngredientItems(rec)) {
      const cell = document.createElement("div");
      cell.className = "recipeIngredientCell";

      const amount = document.createElement("div");
      amount.className = "recipeAmount";
      amount.textContent = formatRecipeAmount(item);

      cell.appendChild(amount);
      cell.appendChild(makeRecipeIngredientButton(item, inventoryIdx));
      ingredients.appendChild(cell);
    }

    body.appendChild(ingredients);

    if (rec.instructions) {
      const instructions = document.createElement("div");
      instructions.className = "recipeInstructions";
      instructions.textContent = rec.instructions;
      body.appendChild(instructions);
    }

    const sourceUrl = extractFirstUrl(rec.notes);
    if (sourceUrl) {
      const sourceWrap = document.createElement("div");
      sourceWrap.className = "recipeSourceWrap";
      const link = document.createElement("a");
      link.href = sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "recipeSource";
      link.textContent = "Source";
      sourceWrap.appendChild(link);
      body.appendChild(sourceWrap);
    } else if (rec.notes) {
      const notes = document.createElement("div");
      notes.className = "recipeNotes muted small";
      notes.textContent = rec.notes;
      body.appendChild(notes);
    }

    const dd = makeDetailsDropdown(rec.name, body);
    dd.classList.add("dd--recipe");
    els.fullRecipes.appendChild(dd);
  }
}

/***********************
 * DOWNLOADS
 ***********************/
function downloadUpdatedInventory() {
  const headers = (state.inventoryHeaders && state.inventoryHeaders.length)
    ? state.inventoryHeaders
    : ["Name", "Quantity", "Count", "Location", "Category", "Expiry Date", "Notes"];

  downloadJsonFile("inventory.json", headers, state.inventoryRows);
}

/***********************
 * SAVE TO GITHUB (via /api/save → Worker or Pages Function)
 ***********************/
function setSaveStatus(text) {
  if (els.saveStatus) els.saveStatus.textContent = text || "";
}

async function saveStore(kind, headers, data, message) {
  if (!state.ui.authed) {
    throw new Error("Unlock first to save changes.");
  }

  await postJSON(API.save(kind), { headers, data, message });
}

function inventorySaveHeaders() {
  return (state.inventoryHeaders && state.inventoryHeaders.length)
    ? state.inventoryHeaders.slice()
    : ["Name", "Quantity", "Count", "Location", "Category", "Expiry Date", "Notes"];
}

function inventorySaveRows() {
  return state.inventoryRows.map((r) => ({ ...r }));
}

function likesSavePayload() {
  return {
    headers: ["Name", "Category"],
    data: state.likeRecords.slice().sort((a, b) => a.Name.localeCompare(b.Name)),
  };
}

function dislikesSavePayload() {
  return {
    headers: ["Name"],
    data: state.dislikeRecords.slice().sort((a, b) => a.Name.localeCompare(b.Name)),
  };
}

function usedSavePayload() {
  return {
    headers: ["Name"],
    data: state.usedRecords.slice().sort((a, b) => a.Name.localeCompare(b.Name)),
  };
}

function recipesToTrySavePayload() {
  return {
    headers: ["Title", "URL"],
    data: state.recipesToTryRows.slice(),
  };
}

async function saveInventory() {
  await saveStore(
    "inventory",
    inventorySaveHeaders(),
    inventorySaveRows(),
    "Update inventory from GUI"
  );
}

async function saveLikes() {
  const { headers, data } = likesSavePayload();
  await saveStore("likes", headers, data, "Update likes from GUI");
}

async function saveDislikes() {
  const { headers, data } = dislikesSavePayload();
  await saveStore("dislikes", headers, data, "Update dislikes from GUI");
}

async function saveUsed() {
  const { headers, data } = usedSavePayload();
  await saveStore("used", headers, data, "Update used ingredients from GUI");
}

async function saveRecipesToTry() {
  const { headers, data } = recipesToTrySavePayload();
  await saveStore("recipes_to_try", headers, data, "Update recipes to try from GUI");
}

async function saveAll() {
  if (!state.ui.authed) {
    alert("Unlock first to save changes.");
    return;
  }

  setSaveStatus("Saving…");
  try {
    await postJSON(API.saveAllBatch, {
      stores: {
        inventory: {
          headers: inventorySaveHeaders(),
          data: inventorySaveRows(),
        },
        likes: likesSavePayload(),
        dislikes: dislikesSavePayload(),
        used: usedSavePayload(),
        recipes_to_try: recipesToTrySavePayload(),
      },
      message: "Update from GUI",
    });
    setSaveStatus("Saved to GitHub. Pages will redeploy shortly.");
    setTimeout(() => setSaveStatus(""), 8000);
  } catch (err) {
    console.error(err);
    setSaveStatus("");
    alert(String(err?.message || err));
  }
}

async function saveOne(kind) {
  setSaveStatus("Saving…");
  try {
    if (kind === "inventory") await saveInventory();
    else if (kind === "likes") await saveLikes();
    else if (kind === "dislikes") await saveDislikes();
    else if (kind === "used") await saveUsed();
    else if (kind === "recipes_to_try") await saveRecipesToTry();
    setSaveStatus(`Saved ${kind}. Pages will redeploy shortly.`);
    setTimeout(() => setSaveStatus(""), 8000);
  } catch (err) {
    console.error(err);
    setSaveStatus("");
    alert(String(err?.message || err));
  }
}

/***********************
 * MAIN RENDER
 ***********************/
function renderAll() {
  const idx = getInventoryIndex();

  if (els.recipesTitle) els.recipesTitle.textContent = "Cookable Recipes";

  renderRecipesToTry();
  renderIngredientsDropdowns();
  renderUsed();

  renderLikes();
  renderDislikes();

  renderShoppingList(idx);
  renderCookableRecipes(idx);
  renderFullRecipes();

  renderShoppingSuggestions();

  // Suggestions for likes/dislikes
  renderSuggestions(els.likeInput, els.likeSuggestions, state.likes, (opt) => {
    els.likeInput.value = opt;
    clear(els.likeSuggestions);
  });
  renderSuggestions(els.dislikeInput, els.dislikeSuggestions, state.dislikes, (opt) => {
    els.dislikeInput.value = opt;
    clear(els.dislikeSuggestions);
  });
}

/***********************
 * EVENTS
 ***********************/
els.reloadBtn?.addEventListener("click", loadAll);
els.downloadInventoryBtn?.addEventListener("click", downloadUpdatedInventory);
els.saveInventoryBtn?.addEventListener("click", () => saveOne("inventory"));
els.saveAllBtn?.addEventListener("click", saveAll);

els.addTryLinkBtn?.addEventListener("click", addTryLinkFromForm);
els.tryLinkUrlInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTryLinkFromForm();
  }
});
els.saveRecipesToTryBtn?.addEventListener("click", () => saveOne("recipes_to_try"));

els.addIngredientBtn?.addEventListener("click", addInventoryFromForm);
els.ingredientNameInput?.addEventListener("input", renderIngredientAddSuggestions);
els.ingredientNameInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addInventoryFromForm();
  }
});

els.ingredientUsedBtn?.addEventListener("click", markIngredientUsed);
els.ingredientPopupClose?.addEventListener("click", closeIngredientPopup);
els.ingredientPopupBackdrop?.addEventListener("click", closeIngredientPopup);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ingredientPopupRow) closeIngredientPopup();
});

// Likes
els.toggleLikesBtn?.addEventListener("click", () => {
  setPrefVisibility("likes", !state.ui.likesOpen);
});

els.addLikeBtn?.addEventListener("click", () => {
  addFromInput(
    els.likeInput,
    els.likeSuggestions,
    state.likes,
    "likes",
    state.likeRecords,
    (name) => ({ Name: name, Category: "" })
  );
});

els.likeInput?.addEventListener("input", () =>
  renderSuggestions(els.likeInput, els.likeSuggestions, state.likes, (opt) => {
    els.likeInput.value = opt;
    clear(els.likeSuggestions);
  })
);
els.likeInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addFromInput(
      els.likeInput,
      els.likeSuggestions,
      state.likes,
      "likes",
      state.likeRecords,
      (name) => ({ Name: name, Category: "" })
    );
  }
});
els.saveLikesBtn?.addEventListener("click", () => saveOne("likes"));
els.downloadLikesBtn?.addEventListener("click", () => {
  const data = state.likeRecords.slice().sort((a, b) => a.Name.localeCompare(b.Name));
  downloadJsonFile("likes.json", ["Name", "Category"], data);
});

// Dislikes event listeners
els.toggleDislikesBtn?.addEventListener("click", () => {
  setPrefVisibility("dislikes", !state.ui.dislikesOpen);
});

els.addDislikeBtn?.addEventListener("click", () => {
  addFromInput(
    els.dislikeInput,
    els.dislikeSuggestions,
    state.dislikes,
    "dislikes",
    state.dislikeRecords,
    (name) => ({ Name: name })
  );
});

els.dislikeInput?.addEventListener("input", () =>
  renderSuggestions(els.dislikeInput, els.dislikeSuggestions, state.dislikes, (opt) => {
    els.dislikeInput.value = opt;
    clear(els.dislikeSuggestions);
  })
);
els.dislikeInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addFromInput(
      els.dislikeInput,
      els.dislikeSuggestions,
      state.dislikes,
      "dislikes",
      state.dislikeRecords,
      (name) => ({ Name: name })
    );
  }
});
els.saveDislikesBtn?.addEventListener("click", () => saveOne("dislikes"));
els.downloadDislikesBtn?.addEventListener("click", () => {
  const data = state.dislikeRecords.slice().sort((a, b) => a.Name.localeCompare(b.Name));
  downloadJsonFile("dislikes.json", ["Name"], data);
});

// Shopping event listeners
els.shoppingInput?.addEventListener("input", renderShoppingSuggestions);
els.shoppingInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleShoppingEnter();
  }
});

/***********************
 * UNLOCK / LOCK
 ***********************/
function setAuthUI(authed) {
  state.ui.authed = !!authed;
  els.unlockBtn?.classList.toggle("hidden", authed);
  els.lockBtn?.classList.toggle("hidden", !authed);
  els.saveAllBtn?.classList.toggle("hidden", !authed);
  els.saveInventoryBtn?.classList.toggle("hidden", !authed);
  els.saveLikesBtn?.classList.toggle("hidden", !authed);
  els.saveDislikesBtn?.classList.toggle("hidden", !authed);
  els.recipesToTryAddWrap?.classList.toggle("hidden", !authed);
  els.saveRecipesToTryBtn?.classList.toggle("hidden", !authed);
}

async function refreshAuthState() {
  try {
    const res = await fetchJSON(API.unlock);
    setAuthUI(!!res.authed);
  } catch {
    setAuthUI(false);
  }
}

async function unlockEditMode() {
  const password = window.prompt("Enter edit password:");
  if (password === null) return;

  try {
    await postJSON(API.unlock, { password });
    setAuthUI(true);
  } catch (err) {
    console.error(err);
    alert(String(err?.message || err));
  }
}

async function lockEditMode() {
  try {
    await postJSON(API.lock, {});
    setAuthUI(false);
  } catch (err) {
    console.error(err);
    alert(String(err?.message || err));
  }
}

els.unlockBtn?.addEventListener("click", unlockEditMode);
els.lockBtn?.addEventListener("click", lockEditMode);

/***********************
 * BOOT
 ***********************/
refreshAuthState();
loadAll();
