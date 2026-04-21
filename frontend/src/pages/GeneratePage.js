import React, { useState, useEffect, useRef } from "react";
import { generateSong, pollStatus } from "../api/client";
import { useToast } from "../context/ToastContext";
import { usePlayer } from "../context/PlayerContext";
import "../styles/GeneratePage.css";

const GENRES = ["pop", "rock", "r&b", "jazz", "classical"];
const MOODS = ["happy", "sad", "relaxed", "energetic", "chill"];
const STRATEGIES = ["mock", "suno"];

export default function GeneratePage() {
  const { addToast } = useToast();
  const { play } = usePlayer();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    prompt: "",
    genre: "pop",
    mood: "happy",
    duration: 30,
    strategy: "mock",
  });

  const [job, setJob] = useState(null);
  const [song, setSong] = useState(null);
  const [genStatus, setGenStatus] = useState("PENDING");
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
      const payload = {
        title: form.title,
        prompt: form.prompt,
        genre: form.genre,
        mood: form.mood,
        duration: form.duration,
        strategy: form.strategy, // IMPORTANT: backend expects "strategy"
      };

      const res = await generateSong(payload);

      const createdJob = res.job;
      const createdSong = res.song;

      setJob(createdJob);
      setSong(createdSong);

      if (!createdJob?.task_id) {
        throw new Error("Missing task_id from backend");
      }

      // If already done
      if (createdJob.status === "SUCCESS") {
        setAudioUrl(createdJob.audio_url);
        setStep(3);
        setLoading(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollStatus(createdJob.task_id);

          const jobData = poll.job || poll;

          setGenStatus(jobData.status);

          if (jobData.status === "SUCCESS") {
            clearInterval(pollRef.current);

            setAudioUrl(jobData.audio_url);
            setStep(3);
            setLoading(false);

            addToast("🎉 Song generated!", "success");
          }

          if (jobData.status === "FAILED") {
            clearInterval(pollRef.current);
            setLoading(false);
            setStep(0);

            addToast(jobData.error || "Generation failed", "error");
          }
        } catch (err) {
          console.error(err);
        }
      }, 4000);

    } catch (err) {
      setLoading(false);
      setStep(0);
      addToast(err.message || "Error generating song", "error");
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);

    setStep(0);
    setJob(null);
    setSong(null);
    setAudioUrl(null);
    setLoading(false);
    setGenStatus("PENDING");
  };

  return (
    <div className="generate-page">
      <div className="generate-card">

        <div className="generate-header">
          <h1>🎵 Generate Music</h1>
          <p>Create your AI song in seconds</p>
        </div>

        {/* STEP 0 */}
        {step === 0 && (
          <form className="generate-form" onSubmit={handleSubmit}>

            <div className="strategy">
              {STRATEGIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={form.strategy === s ? "active" : ""}
                  onClick={() =>
                    setForm((f) => ({ ...f, strategy: s }))
                  }
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
            />

            <textarea
              name="prompt"
              placeholder="Describe your song..."
              value={form.prompt}
              onChange={handleChange}
              rows={4}
            />

            <div className="form-row">
              <select name="genre" value={form.genre} onChange={handleChange}>
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>

              <select name="mood" value={form.mood} onChange={handleChange}>
                {MOODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            <button className="generate-btn">
              Review →
            </button>
          </form>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="generate-result">
            <h3>Review your song</h3>

            <p><strong>Title:</strong> {form.title}</p>
            <p><strong>Prompt:</strong> {form.prompt}</p>
            <p><strong>Genre:</strong> {form.genre}</p>
            <p><strong>Mood:</strong> {form.mood}</p>
            <p><strong>Mode:</strong> {form.strategy}</p>

            <button onClick={() => setStep(0)}>Back</button>
            <button onClick={handleConfirm}>Generate</button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="generate-result">
            ⏳ Generating...
            <br />
            <small>Status: {genStatus}</small>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="generate-result">
            <h3>🎉 Ready!</h3>

            <p><strong>{song?.title}</strong></p>

            {audioUrl ? (
              <audio controls src={audioUrl} />
            ) : (
              <p>No audio available</p>
            )}

            <button
              onClick={() => play({ ...song, audio_url: audioUrl })}
            >
              ▶ Play
            </button>

            <button onClick={handleReset}>
              + New Song
            </button>
          </div>
        )}

      </div>
    </div>
  );
}