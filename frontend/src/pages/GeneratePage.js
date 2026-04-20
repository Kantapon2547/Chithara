import React, { useState, useEffect, useRef } from "react";
import { generateSong, pollStatus } from "../api/client";
import { useToast } from "../context/ToastContext";
import { usePlayer } from "../context/PlayerContext";
import "../styles/GeneratePage.css";

const GENRES = ["pop","rock","r&b","jazz","classical"];
const MOODS = ["happy","sad","relaxed","energetic","chill"];
const OCCASIONS = ["study","party","sleep","workout"];
const STRATEGIES = ["mock","suno"];

export default function GeneratePage() {
  const { addToast } = useToast();
  const { play } = usePlayer();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    prompt: "",
    genre: "pop",
    mood: "happy",
    occasion: "study",
    duration: 30,
    strategy: "mock",
  });

  const [result, setResult] = useState(null);
  const [genStatus, setGenStatus] = useState("PENDING");
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) {
      addToast("Title and prompt are required", "error");
      return;
    }
    setStep(1);
  };

  const handleConfirm = async () => {
    setStep(2);
    setLoading(true);
    setGenStatus("PENDING");

    try {
      const res = await generateSong(form);
      setResult(res);

      if (res.job.status === "SUCCESS") {
        setAudioUrl(res.job.audio_url);
        setStep(3);
        setLoading(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollStatus(res.job.task_id);
          setGenStatus(poll.job.status);

          if (poll.job.status === "SUCCESS") {
            clearInterval(pollRef.current);
            setAudioUrl(poll.job.audio_url);
            setStep(3);
            setLoading(false);
            addToast("🎉 Song generated!", "success");
          }

          if (poll.job.status === "FAILED") {
            clearInterval(pollRef.current);
            setLoading(false);
            setStep(0);
            addToast("Generation failed", "error");
          }
        } catch {}
      }, 5000);

    } catch (err) {
      setLoading(false);
      setStep(0);
      addToast(err.message, "error");
    }
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    setStep(0);
    setResult(null);
    setAudioUrl(null);
    setLoading(false);
  };

  return (
    <div className="generate-page">
      <div className="generate-card">

        {/* HEADER */}
        <div className="generate-header">
          <h1>🎵 Generate Music</h1>
          <p>Create your AI song in seconds</p>
        </div>

        {/* STEP 0 — FORM */}
        {step === 0 && (
          <form className="generate-form" onSubmit={handleSubmit}>

            {/* STRATEGY */}
            <div className="strategy">
              {STRATEGIES.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={form.strategy === s ? "active" : ""}
                  onClick={() => setForm((f) => ({ ...f, strategy: s }))}
                >
                  {s === "mock" ? "🧪 Mock" : "🎵 Suno"}
                </button>
              ))}
            </div>

            <input
              name="title"
              placeholder="Song title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <textarea
              name="prompt"
              placeholder="Describe your song..."
              value={form.prompt}
              onChange={handleChange}
              rows={4}
              required
            />

            <div className="form-row">
              <select name="genre" value={form.genre} onChange={handleChange}>
                {GENRES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>

              <select name="mood" value={form.mood} onChange={handleChange}>
                {MOODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <button className={`generate-btn ${loading ? "loading" : ""}`}>
              Review →
            </button>
          </form>
        )}

        {/* STEP 1 — REVIEW */}
        {step === 1 && (
          <div className="generate-result">
            <h3>Review your song</h3>

            <p><strong>Title:</strong> {form.title}</p>
            <p><strong>Prompt:</strong> {form.prompt}</p>
            <p><strong>Genre:</strong> {form.genre}</p>
            <p><strong>Mood:</strong> {form.mood}</p>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="generate-btn" onClick={() => setStep(0)}>
                Back
              </button>

              <button className="generate-btn" onClick={handleConfirm}>
                Generate
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — LOADING */}
        {step === 2 && (
          <div className="generate-result">
            ⏳ Generating your song...
            <br />
            <small>Status: {genStatus}</small>
          </div>
        )}

        {/* STEP 3 — DONE */}
        {step === 3 && result && (
          <div className="generate-result">
            <h3>🎉 Song Ready!</h3>

            <p><strong>{result.song.title}</strong></p>

            {audioUrl && (
              <audio controls src={audioUrl} />
            )}

            {!audioUrl && (
              <p>(Mock mode — no real audio)</p>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              {audioUrl && (
                <button
                  className="generate-btn"
                  onClick={() => play({ ...result.song, audio_url: audioUrl })}
                >
                  ▶ Play
                </button>
              )}

              <button className="generate-btn" onClick={handleReset}>
                + New Song
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}