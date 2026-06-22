import {
  EMPTY_STORES,
  createSessionToken,
  isEditAuthed,
  json,
  jsonError,
  normalizeDislikesData,
  normalizeLikesData,
  readJsonStore,
} from "../../_lib/server.js";

const STORE_ROUTES = new Set([
  "inventory",
  "likes",
  "dislikes",
  "recipes",
  "recipes_to_try",
  "used",
]);

function routeName(params) {
  const raw = params?.route;
  if (Array.isArray(raw)) return String(raw[0] || "");
  return String(raw || "");
}

async function handleStoreGet(context, route) {
  const label = `${route}.json`;

  try {
    const store = await readJsonStore(context, route);

    if (route === "likes") {
      return json({
        ok: true,
        headers: ["Name", "Category"],
        data: normalizeLikesData(store.data),
      });
    }

    if (route === "dislikes") {
      return json({
        ok: true,
        headers: store.headers,
        data: normalizeDislikesData(store.data),
      });
    }

    return json({ ok: true, headers: store.headers, data: store.data });
  } catch (err) {
    if (route === "dislikes" && String(err?.message || err).includes("404")) {
      const empty = EMPTY_STORES.dislikes;
      return json({ ok: true, headers: empty.headers, data: empty.data });
    }
    return jsonError(500, `Failed to load ${label}`, String(err?.message || err));
  }
}

async function handleUnlockGet(context) {
  const authed = await isEditAuthed(context.request, context.env);
  return json({ ok: true, authed });
}

async function handleUnlockPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const password = String(body?.password || "");

  if (!context.env.AUTH) {
    return json({ ok: false, error: "AUTH not configured" }, 500);
  }
  if (password !== context.env.AUTH) {
    return json({ ok: false, error: "Incorrect password" }, 401);
  }

  const token = await createSessionToken(context.env);
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  headers.append(
    "Set-Cookie",
    `edit_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function handleLockPost() {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", "edit_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function onRequestGet(context) {
  const route = routeName(context.params);

  if (route === "unlock") return handleUnlockGet(context);
  if (STORE_ROUTES.has(route)) return handleStoreGet(context, route);

  return jsonError(404, "Not found");
}

export async function onRequestPost(context) {
  const route = routeName(context.params);

  if (route === "unlock") return handleUnlockPost(context);
  if (route === "lock") return handleLockPost();

  return jsonError(404, "Not found");
}
