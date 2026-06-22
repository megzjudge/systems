import {
  FILE_MAP,
  json,
  jsonError,
  requireEditAuth,
  saveAllStores,
  updateGitHubFile,
} from "../../../_lib/server.js";

function kindName(params) {
  const raw = params?.kind;
  if (Array.isArray(raw)) return String(raw[0] || "");
  return String(raw || "");
}

export async function onRequestPost(context) {
  const { request, env, params } = context;

  const deny = await requireEditAuth(request, env);
  if (deny) return deny;

  if (!env.GITHUB_TOKEN) {
    return json({ ok: false, error: "GITHUB_TOKEN not configured" }, 503);
  }

  const kind = kindName(params);
  const body = await request.json().catch(() => ({}));

  if (kind === "all") {
    const { stores, message } = body;
    if (!stores || typeof stores !== "object") {
      return json({ ok: false, error: "Expected { stores: { kind: { headers, data } } }" }, 400);
    }

    try {
      await saveAllStores(env, stores, message || "Update from GUI");
      return json({ ok: true });
    } catch (err) {
      return jsonError(500, "Save failed", String(err?.message || err));
    }
  }

  const relativePath = FILE_MAP[kind];
  if (!relativePath) {
    return json({ ok: false, error: `Unknown kind: ${kind}` }, 400);
  }

  const { headers, data, message } = body;
  if (!Array.isArray(headers) || !Array.isArray(data)) {
    return json({ ok: false, error: "Expected { headers, data } arrays" }, 400);
  }

  try {
    await updateGitHubFile(
      env,
      relativePath,
      { headers, data },
      message || `Update ${kind} from GUI`
    );
    return json({ ok: true });
  } catch (err) {
    return jsonError(500, "Save failed", String(err?.message || err));
  }
}
