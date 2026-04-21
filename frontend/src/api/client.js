const BASE = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// HEADERS
// ---------------------------------------------------------------------------

function getHeaders() {
  const token = localStorage.getItem("access");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ---------------------------------------------------------------------------
// SAFE JSON PARSER
// ---------------------------------------------------------------------------

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// ---------------------------------------------------------------------------
// AUTH FETCH (AUTO REFRESH FIXED)
// ---------------------------------------------------------------------------

async function authFetch(url, options = {}) {
  let res = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });

  if (res.status === 401) {
    const refresh = localStorage.getItem("refresh");

    if (refresh) {
      const r = await fetch(`${BASE}/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (r.ok) {
        const d = await r.json();
        localStorage.setItem("access", d.access);

        res = await fetch(url, {
          ...options,
          headers: getHeaders(),
        });
      }
    }
  }

  return res;
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function login(username, password) {
  const res = await fetch(`${BASE}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.detail || data.error || "Login failed");
  }

  return data;
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// ---------------------------------------------------------------------------
// PROFILE
// ---------------------------------------------------------------------------

export async function fetchProfile() {
  const res = await authFetch(`${BASE}/profile/`);
  const data = await safeJson(res);

  if (!res.ok) throw new Error(data.error || "Failed to fetch profile");

  return data;
}

// ---------------------------------------------------------------------------
// QUOTA
// ---------------------------------------------------------------------------

export async function fetchQuota() {
  try {
    const res = await authFetch(`${BASE}/quota/`);
    const data = await safeJson(res);

    if (!res.ok) {
      return { used: 0, limit: 10, remaining: 10 };
    }

    return data;
  } catch {
    return { used: 0, limit: 10, remaining: 10 };
  }
}

// ---------------------------------------------------------------------------
// SONGS
// ---------------------------------------------------------------------------

export async function fetchSongs(params = {}) {
  const q = new URLSearchParams(params).toString();

  const res = await authFetch(`${BASE}/songs/${q ? "?" + q : ""}`);
  const data = await safeJson(res);

  if (!res.ok) throw new Error(data.error || "Failed to fetch songs");

  return data;
}

export async function updateSong(id, data) {
  const res = await authFetch(`${BASE}/songs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Update failed");

  return json;
}

export async function deleteSong(id) {
  const res = await authFetch(`${BASE}/songs/${id}/`, {
    method: "DELETE",
  });

  if (res.status === 204) return true;

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Delete failed");

  return json;
}

// ---------------------------------------------------------------------------
// PRIVACY
// ---------------------------------------------------------------------------

export async function setSongPrivacy(id, privacy_status) {
  const res = await authFetch(`${BASE}/songs/${id}/privacy/`, {
    method: "POST",
    body: JSON.stringify({ privacy_status }),
  });

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Failed");

  return json;
}

// ---------------------------------------------------------------------------
// GENERATION (FIXED CONTRACT)
// ---------------------------------------------------------------------------

export async function generateSong(data) {
  const res = await authFetch(`${BASE}/generate/`, {
    method: "POST",
    body: JSON.stringify(data), // MUST include mode: "mock" | "suno"
  });

  const json = await safeJson(res);

  if (!res.ok) {
    throw new Error(json.error || json.detail || "Generation failed");
  }

  return json;
}

// ---------------------------------------------------------------------------
// POLLING (SAFE + NO CRASH)
// ---------------------------------------------------------------------------

export async function pollStatus(taskId, signal) {
  if (!taskId) throw new Error("Missing taskId");

  const res = await authFetch(`${BASE}/status/${taskId}/`, {
    signal,
  });

  const json = await safeJson(res);

  if (!res.ok) {
    throw new Error(json.error || "Failed to poll status");
  }

  return json;
}

// ---------------------------------------------------------------------------
// DOWNLOAD
// ---------------------------------------------------------------------------

export function getDownloadUrl(songId) {
  const token = localStorage.getItem("access");
  return `${BASE}/download/${songId}/?token=${token}`;
}

// ---------------------------------------------------------------------------
// SHARE
// ---------------------------------------------------------------------------

export async function shareSong(songId, makePublic = false) {
  const res = await authFetch(`${BASE}/share/${songId}/`, {
    method: "POST",
    body: JSON.stringify({ make_public: makePublic }),
  });

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Share failed");

  return json;
}

// ---------------------------------------------------------------------------
// INVITE
// ---------------------------------------------------------------------------

export async function inviteByEmail(songId, email) {
  const res = await authFetch(`${BASE}/invite/`, {
    method: "POST",
    body: JSON.stringify({ song_id: songId, email }),
  });

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Invite failed");

  return json;
}

// ---------------------------------------------------------------------------
// ALBUMS
// ---------------------------------------------------------------------------

export async function fetchAlbums() {
  const res = await authFetch(`${BASE}/albums/`);
  const json = await safeJson(res);

  if (!res.ok) throw new Error("Failed");

  return json;
}

export async function createAlbum(title) {
  const res = await authFetch(`${BASE}/albums/`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Failed");

  return json;
}

export async function deleteAlbum(id) {
  const res = await authFetch(`${BASE}/albums/${id}/`);

  if (res.status === 204) return true;

  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Delete failed");

  return json;
}