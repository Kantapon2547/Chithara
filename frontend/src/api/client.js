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
// SAFE JSON PARSER (FIXED)
// ---------------------------------------------------------------------------

async function safeJson(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// AUTH FETCH (FULL SAFE VERSION)
// ---------------------------------------------------------------------------

async function authFetch(url, options = {}) {
  try {
    let res = await fetch(url, {
      ...options,
      headers: getHeaders(),
    });

    // 🔁 AUTO REFRESH TOKEN
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

      // 🔁 retry original request
      res = await fetch(url, {
        ...options,
        headers: getHeaders(),
      });
    }

    return res;

  } catch (err) {
    console.error("API ERROR:", err);
    throw new Error("Network error. Is backend running?");
  }
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
// SONGS
// ---------------------------------------------------------------------------

export async function fetchSongs(params = {}) {
  const q = new URLSearchParams(params).toString();

  const res = await authFetch(`${BASE}/songs/${q ? "?" + q : ""}`);
  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch songs");
  }

  return data;
}

export async function deleteSong(id) {
  const res = await authFetch(`${BASE}/songs/${id}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data.error || "Delete failed");
  }

  return true;
}

// ---------------------------------------------------------------------------
// GENERATION
// ---------------------------------------------------------------------------

export async function generateSong(data) {
  const res = await authFetch(`${BASE}/generate/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  const json = await safeJson(res);

  if (!res.ok) {
    throw new Error(json.error || "Generation failed");
  }

  return json;
}

// ---------------------------------------------------------------------------
// POLLING
// ---------------------------------------------------------------------------

export async function pollStatus(taskId) {
  if (!taskId) throw new Error("Missing taskId");

  const res = await authFetch(`${BASE}/status/${taskId}/`);
  const json = await safeJson(res);

  if (!res.ok) {
    throw new Error(json.error || "Polling failed");
  }

  return json;
}

// ---------------------------------------------------------------------------
// DOWNLOAD (FIXED SAFE)
// ---------------------------------------------------------------------------

export async function downloadSong(songId, songTitle) {
  const res = await authFetch(`${BASE}/download/${songId}/`);

  if (!res.ok) {
    throw new Error("Download failed");
  }

  const blob = await res.blob();

  // ❗ prevent empty file crash
  if (!blob || blob.size === 0) {
    throw new Error("Empty audio file");
  }

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${songTitle || "song"}.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// QUOTA (RESTORED)
// ---------------------------------------------------------------------------

export async function fetchQuota() {
  try {
    const res = await authFetch(`${BASE}/quota/`);
    const data = await safeJson(res);

    if (!res.ok) {
      return { used: 0, limit: 10, remaining: 10 };
    }

    return data;
  } catch (err) {
    console.error("Quota fetch failed:", err);

    // fallback so UI doesn't crash
    return { used: 0, limit: 10, remaining: 10 };
  }
}