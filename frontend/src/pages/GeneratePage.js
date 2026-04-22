import React, { useState, useEffect, useRef } from "react";
import { generateSong, pollStatus, downloadSong } from "../api/client";
import { useToast }  from "../context/ToastContext";
import { usePlayer } from "../context/PlayerContext";
import "../styles/GeneratePage.css";

const GENRES    = ["pop", "rock", "r&b", "jazz", "classical"];
const MOODS     = ["happy", "sad", "relaxed", "energetic", "chill"];
const OCCASIONS = ["study", "party", "sleep", "workout"];

// Status pipeline steps for Suno
const PIPELINE = [
  { status: "PENDING",        label: "Request submitted to Suno" },
  { status: "TEXT_SUCCESS",   label: "Lyrics generated" },
  { status: "FIRST_SUCCESS",  label: "First audio clip ready" },
  { status: "SUCCESS",        label: "Generation complete ✓" },
];

function stepIndex(status) {
  const i = PIPELINE.findIndex(p => p.status === status);
  return i === -1 ? 0 : i;
}

export default function GeneratePage() {
  const { addToast } = useToast();
  const { play }     = usePlayer();

  // ── form state ──────────────────────────────────────────────
  const [step, setStep]       = useState(0); // 0=form 1=review 2=generating 3=done
  const [strategy, setStrategy] = useState("mock");
  const [form, setForm]       = useState({
    title: "", prompt: "", genre: "pop",
    mood: "happy", occasion: "study", duration: 30,
  });

  // ── generation state ────────────────────────────────────────
  const [result,    setResult]    = useState(null);
  const [genStatus, setGenStatus] = useState("PENDING");
  const [audioUrl,  setAudioUrl]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── handlers ────────────────────────────────────────────────
  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.title.trim())  { addToast("Title is required", "error"); return; }
    if (!form.prompt.trim()) { addToast("Prompt is required", "error"); return; }
    setStep(1);
  };

  const handleConfirm = async () => {
    setStep(2);
    setLoading(true);
    setGenStatus("PENDING");

    try {
      // Send strategy as part of the body — backend picks it per-request
      const res = await generateSong({ ...form, strategy });
      setResult(res);

      // Mock returns SUCCESS immediately
      if (res.job.status === "SUCCESS") {
        setAudioUrl(res.job.audio_url || null);
        setStep(3);
        setLoading(false);
        addToast("🎉 Song generated!", "success");
        return;
      }

      // Suno returns PENDING — start polling every 5 s
      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollStatus(res.job.task_id);
          const st   = poll.job.status;
          setGenStatus(st);

          if (st === "SUCCESS") {
            clearInterval(pollRef.current);
            setAudioUrl(poll.job.audio_url || null);
            setResult(r => ({ ...r, job: poll.job }));
            setStep(3);
            setLoading(false);
            addToast("🎉 Song generated!", "success");
          } else if (st === "FAILED") {
            clearInterval(pollRef.current);
            setLoading(false);
            setStep(0);
            addToast("Generation failed. Please try again.", "error");
          }
        } catch { /* ignore transient poll errors */ }
      }, 5000);

    } catch (err) {
      setLoading(false);
      setStep(0);
      addToast(err.message, "error");
    }
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    setStep(0); setResult(null);
    setAudioUrl(null); setLoading(false);
    setGenStatus("PENDING");
    setForm({ title: "", prompt: "", genre: "pop", mood: "happy", occasion: "study", duration: 30 });
  };

  const handleDownload = async () => {
    if (!result?.song) return;
    setDlLoading(true);
    try {
      await downloadSong(result.song.id, result.song.title);
      addToast("Download started!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setDlLoading(false);
    }
  };

  const pipelineIdx = stepIndex(genStatus);

  // ── render ──────────────────────────────────────────────────
  return (
    <div className="generate-page">
      <div className="generate-card">

        {/* HEADER */}
        <div className="generate-header">
          <h1>🎵 Generate Music</h1>
          <p>Describe your song and let AI create it</p>
        </div>

        {/* ─── STEP 0: FORM ─────────────────────────────────── */}
        {step === 0 && (
          <form className="generate-form" onSubmit={handleSubmit}>

            {/* Strategy selector */}
            <div className="strategy">
              <button
                type="button"
                className={strategy === "mock" ? "active" : ""}
                onClick={() => setStrategy("mock")}
              >
                🧪 Mock <span className="strat-sub">(offline, instant)</span>
              </button>
              <button
                type="button"
                className={strategy === "suno" ? "active" : ""}
                onClick={() => setStrategy("suno")}
              >
                🎵 Suno <span className="strat-sub">(real AI, ~2 min)</span>
              </button>
            </div>

            {/* Suno info banner */}
            {strategy === "suno" && (
              <div className="suno-banner">
                ⚡ Using Suno API — make sure <code>SUNO_API_KEY</code> is set in your <code>.env</code> file.
                Generation takes 1–2 minutes. Keep this tab open.
              </div>
            )}

            <input
              name="title"
              className="gen-input"
              placeholder="Song title *"
              value={form.title}
              onChange={handleChange}
              required
            />

            <textarea
              name="prompt"
              className="gen-input"
              placeholder="Describe your song... e.g. 'An upbeat summer pop song about adventures at the beach' *"
              value={form.prompt}
              onChange={handleChange}
              rows={4}
              required
            />

            <div className="form-row">
              <label>
                <span>Genre</span>
                <select name="genre" value={form.genre} onChange={handleChange}>
                  {GENRES.map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
                </select>
              </label>
              <label>
                <span>Mood</span>
                <select name="mood" value={form.mood} onChange={handleChange}>
                  {MOODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </label>
              <label>
                <span>Occasion</span>
                <select name="occasion" value={form.occasion} onChange={handleChange}>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                </select>
              </label>
            </div>

            <label className="duration-label">
              <span>Duration: <strong>{form.duration}s</strong></span>
              <input
                type="range" name="duration" min="15" max="180" step="15"
                value={form.duration} onChange={handleChange}
                className="duration-slider"
              />
            </label>

            <button type="submit" className="generate-btn">
              Review Details →
            </button>
          </form>
        )}

        {/* ─── STEP 1: REVIEW ───────────────────────────────── */}
        {step === 1 && (
          <div className="review-box">
            <h3>Review before generating</h3>

            <div className="review-grid">
              {[
                ["Strategy", strategy === "mock" ? "🧪 Mock (offline)" : "🎵 Suno API (real)"],
                ["Title",    form.title],
                ["Prompt",   form.prompt],
                ["Genre",    form.genre.toUpperCase()],
                ["Mood",     form.mood],
                ["Occasion", form.occasion],
                ["Duration", `${form.duration} seconds`],
              ].map(([k, v]) => (
                <div className="review-row" key={k}>
                  <span className="review-key">{k}</span>
                  <span className="review-val">{v}</span>
                </div>
              ))}
            </div>

            {strategy === "suno" && (
              <div className="suno-banner" style={{ marginTop: 16 }}>
                ⏱ Suno generation takes about 1–2 minutes. Status will auto-update.
              </div>
            )}

            <div className="review-actions">
              <button className="generate-btn secondary" onClick={() => setStep(0)}>
                ← Edit
              </button>
              <button className="generate-btn" onClick={handleConfirm}>
                ✅ Confirm &amp; Generate
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: GENERATING ───────────────────────────── */}
        {step === 2 && (
          <div className="generating-box">
            <div className="spinner" />
            <h3>
              {strategy === "mock"
                ? "Creating mock song..."
                : "Suno is composing your song..."}
            </h3>
            <p>
              {strategy === "mock"
                ? "This will finish instantly."
                : "Usually takes 1–2 minutes. Please keep this tab open."}
            </p>

            {/* Pipeline for Suno, simple message for mock */}
            {strategy === "suno" && (
              <div className="pipeline">
                {PIPELINE.map((p, i) => (
                  <div
                    key={p.status}
                    className={`pipeline-step ${
                      i < pipelineIdx ? "done" : i === pipelineIdx ? "active" : ""
                    }`}
                  >
                    <span className="pipeline-dot" />
                    <span>{p.label}</span>
                    {i < pipelineIdx && <span className="pipeline-check">✓</span>}
                  </div>
                ))}
              </div>
            )}

            {result?.job?.task_id && (
              <div className="task-chip">
                Task ID: <code>{result.job.task_id}</code>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: DONE ─────────────────────────────────── */}
        {step === 3 && result && (
          <div className="done-box">
            <div className="done-icon">🎉</div>
            <h2>"{result.song.title}" is ready!</h2>
            <p className="done-meta">
              Strategy: <strong>{result.job?.strategy}</strong>
              {result.job?.task_id && <> · Task: <code>{result.job.task_id.slice(0, 16)}…</code></>}
            </p>

            {/* Real audio player (Suno) */}
            {audioUrl && audioUrl.startsWith("http") && (
              <div className="audio-wrap">
                <audio controls src={audioUrl} style={{ width: "100%" }} />
              </div>
            )}

            {/* Mock notice */}
            {(!audioUrl || audioUrl.includes("mock-storage")) && (
              <div className="mock-notice">
                🧪 Mock mode — no real audio file. A silent MP3 with metadata
                will be downloaded when you click Download.
              </div>
            )}

            <div className="done-actions">
              {/* Play in player bar */}
              {audioUrl && audioUrl.startsWith("http") && (
                <button
                  className="generate-btn success"
                  onClick={() => play({ ...result.song, audio_url: audioUrl })}
                >
                  ▶ Play
                </button>
              )}

              {/* Download — works for both real and mock */}
              <button
                className="generate-btn secondary"
                onClick={handleDownload}
                disabled={dlLoading}
              >
                {dlLoading ? "⏳ Downloading…" : "⬇ Download MP3"}
              </button>

              <button className="generate-btn" onClick={handleReset}>
                + Generate Another
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}