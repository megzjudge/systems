/**
 * Food inventory save Worker (self-contained — no extra modules)
 *
 * POST /save/:kind  — commit JSON store to GitHub
 *
 * Secrets: AUTH, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 * Optional: GITHUB_BRANCH (default main), ALLOWED_ORIGIN (default *)
 */

const FILE_MAP = {
  inventory: "inventory.json",
  likes: "likes.json",
  dislikes: "dislikes.json",
  recipes: "recipes.json",
  recipes_to_try: "recipes_to_try.json",
  used: "used.json",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response("food save worker OK", { status: 200 });
    }

    const match = url.pathname.match(/^\/save\/([a-zA-Z0-9_-]+)$/);
    if (!match || request.method !== "POST") {
      return json({ ok: false, error: "Not found" }, 404, env);
    }

    const kind = match[1];
    const relativePath = FILE_MAP[kind];
    if (!relativePath) {
      return json({ ok: false, error: `Unknown kind: ${kind}` }, 400, env);
    }

    try {
      const secret = request.headers.get("x-save-secret") || "";
      if (!env.AUTH || secret !== env.AUTH) {
        return json({ ok: false, error: "Unauthorized" }, 401, env);
      }

      const body = await request.json().catch(() => null);
      if (!body) return json({ ok: false, error: "Invalid JSON body" }, 400, env);

      const { headers, data, message } = body;
      if (!Array.isArray(headers) || !Array.isArray(data)) {
        return json({ ok: false, error: "Expected { headers, data } arrays" }, 400, env);
      }

      await updateGitHubFile(
        env,
        relativePath,
        { headers, data },
        message || `Update ${kind} via Worker`
      );

      return json({ ok: true }, 200, env);
    } catch (err) {
      return json({ ok: false, error: String(err?.message || err) }, 500, env);
    }
  },
};

function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(env),
    },
  });
}

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-save-secret",
  };
}

function dataPath(env, relativePath) {
  const prefix = String(env.GITHUB_PATH_PREFIX || "").replace(/\/$/, "");
  const file = String(relativePath || "").replace(/^\//, "");
  return prefix ? `${prefix}/${file}` : file;
}

function repoConfig(env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || "main";
  const token = env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error("GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN must be set");
  }

  return { owner, repo, branch, token };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "food-inventory-save",
    Accept: "application/vnd.github+json",
  };
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function updateGitHubFile(env, relativePath, obj, commitMessage) {
  const { owner, repo, branch, token } = repoConfig(env);
  const path = dataPath(env, relativePath);

  const apiBase = "https://api.github.com";
  const headers = authHeaders(token);

  const getUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;

  let sha;
  const getRes = await fetch(getUrl, { headers });
  if (getRes.status === 200) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`GitHub GET ${path} failed: ${getRes.status} ${await getRes.text()}`);
  }

  const text = JSON.stringify(obj, null, 2) + "\n";
  const body = {
    message: commitMessage || `Update ${relativePath}`,
    content: toBase64Utf8(text),
    branch,
  };
  if (sha) body.sha = sha;

  const putUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      ...headers,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    throw new Error(`GitHub PUT ${path} failed: ${putRes.status} ${await putRes.text()}`);
  }

  return putRes.json();
}
