const BASE = "http://localhost:8000/api";

// ─────────────────────────────────────────────────────────────────────────────
// HEADERS
// ─────────────────────────────────────────────────────────────────────────────
function getHeaders() {
  const token = localStorage.getItem("access");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE JSON PARSER (FIXED)
// ─────────────────────────────────────────────────────────────────────────────
async function safeJson(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("JSON parse error:", e);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH FETCH (auto refresh)
// ─────────────────────────────────────────────────────────────────────────────
async function authFetch(url, options = {}) {
  try {
    let res = await fetch(url, { ...options, headers: getHeaders() });

    if (res.status === 401) {
      const refresh = localStorage.getItem("refresh");
      if (!refresh) throw new Error("No refresh token");

      const refreshRes = await fetch(`${BASE}/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!refreshRes.ok) {
        logout();
        throw new Error("Session expired");
      }

      const data = await refreshRes.json();
      localStorage.setItem("access", data.access);

      res = await fetch(url, { ...options, headers: getHeaders() });
    }

    return res;
  } catch (err) {
    console.error("API ERROR:", err);
    throw new Error("Network error. Is backend running?");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const res = await fetch(`${BASE}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.detail || data.error || "Login failed");
  return data;
}

export async function googleAuth(idToken) {
  const res = await fetch(`${BASE}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Google login failed");
  return data;
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// ─────────────────────────────────────────────────────────────────────────────
// SONGS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchSongs(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/songs/${q ? "?" + q : ""}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch songs");
  return data;
}

export async function deleteSong(id) {
  const res = await authFetch(`${BASE}/songs/${id}/`, {
    method: "DELETE",
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Delete failed");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadSong(songId, songTitle) {
  const res = await authFetch(`${BASE}/download/${songId}/`);

  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error("Empty audio file");

  const contentType = res.headers.get("Content-Type") || "audio/mpeg";
  const ext = contentType.includes("wav")
    ? "wav"
    : contentType.includes("ogg")
    ? "ogg"
    : "mp3";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${(songTitle || "song").replace(/[/\\?%*:|"<>]/g, "_")}.${ext}`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSong(data) {
  const res = await authFetch(`${BASE}/generate/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error || "Generation failed");
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// POLLING
// ─────────────────────────────────────────────────────────────────────────────
export async function pollStatus(taskId) {
  if (!taskId) throw new Error("Missing taskId");

  const res = await authFetch(`${BASE}/status/${taskId}/`);
  const json = await safeJson(res);

  if (!res.ok) throw new Error(json.error || "Polling failed");
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTA
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchQuota() {
  try {
    const res = await authFetch(`${BASE}/quota/`);
    const data = await safeJson(res);

    if (!res.ok) return { used: 0, limit: 10, remaining: 10 };
    return data;
  } catch (err) {
    console.error("Quota fetch failed:", err);
    return { used: 0, limit: 10, remaining: 10 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARE
// ─────────────────────────────────────────────────────────────────────────────
export async function createShareLink(songId, emails = []) {
  const res = await authFetch(`${BASE}/share/${songId}/`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to create share link");

  return data;
}

export async function updatePrivacy(songId, privacy) {
  const res = await authFetch(`${BASE}/songs/${songId}/`, {
    method: "PATCH",
    body: JSON.stringify({ privacy_status: privacy }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to update privacy");

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALBUMS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAlbums() {
  const res = await authFetch(`${BASE}/albums/`);
  const data = await safeJson(res);

  if (!res.ok) throw new Error(data.error || "Failed to fetch albums");
  return data;
}

export async function createAlbum(title) {
  const res = await authFetch(`${BASE}/albums/`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Create album failed");
  return data;
}

export async function addSongToAlbum(albumId, songId) {
  const res = await authFetch(`${BASE}/albums/${albumId}/songs/`, {
    method: "POST",
    body: JSON.stringify({ song_id: songId }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Add to album failed");
  return data;
}

export async function fetchAlbumSongs(albumId) {
  const res = await authFetch(`${BASE}/albums/${albumId}/songs/`);
  const data = await safeJson(res);

  if (!res.ok) throw new Error(data.error || "Failed to fetch album songs");

  return data;
}

export async function removeSongFromAlbum(albumId, songId) {
  const res = await authFetch(`${BASE}/albums/${albumId}/songs/`, {
    method: "DELETE",
    body: JSON.stringify({ song_id: songId }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Remove from album failed");
  return data;
}

export async function updateAlbum(albumId, title) {
  const res = await authFetch(`${BASE}/albums/${albumId}/`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Update album failed");
  return data;
}

export async function deleteAlbum(albumId) {
  const res = await authFetch(`${BASE}/albums/${albumId}/`, {
    method: "DELETE",
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Delete album failed");
  return data;
}

export async function createAlbumShare(albumId, emails = []) {
  const res = await authFetch(`${BASE}/albums/${albumId}/share/`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });

  const data = await safeJson(res);

  if (!res.ok) throw new Error(data.error || "Share failed");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERS
// ─────────────────────────────────────────────────────────────────────────────
const COVER_STORAGE_KEY = "song_covers";

export const getSavedCovers = () => {
  return JSON.parse(localStorage.getItem(COVER_STORAGE_KEY) || "{}");
};

export const saveCover = (songId, imageUrl) => {
  const covers = getSavedCovers();
  covers[songId] = imageUrl;
  localStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(covers));
};

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONAL (only if you want reuse outside file)
// ─────────────────────────────────────────────────────────────────────────────
export { authFetch };