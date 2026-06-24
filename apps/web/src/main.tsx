import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const features = [
  {
    title: "Push-to-talk, not continuous recording",
    body: "Capture only when you hold the hotkey. Audio is processed in memory and is not saved by default."
  },
  {
    title: "Desktop audio + optional microphone",
    body: "Listen to the meeting audio and optionally mix your microphone when you need both sides of the conversation."
  },
  {
    title: "Invisible meeting overlay",
    body: "Keep a compact transparent overlay over Teams, Meet, Zoom or any technical discussion."
  },
  {
    title: "Structured technical answers",
    body: "Direct answer first, then explanation, example, assumptions and confidence."
  }
];

const steps = [
  "Hold the hotkey while someone asks a question.",
  "Meeting Copilot transcribes the audio in realtime.",
  "Release the key and receive a short, useful answer."
];

function App() {
  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="Meeting Copilot home">
          <span className="brand-mark">✦</span>
          Meeting Copilot
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a className="nav-cta" href="mailto:pm.mats98@gmail.com?subject=Meeting%20Copilot">
          Request access
        </a>
      </nav>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">PRIVATE AI COPILOT FOR TECHNICAL MEETINGS</p>
          <h1>Answer technical questions without breaking the conversation.</h1>
          <p className="hero-text">
            Meeting Copilot is a Windows desktop assistant that listens only while you hold a
            hotkey, transcribes meeting audio, and returns concise AI-generated technical answers.
          </p>
          <div className="hero-actions">
            <a className="primary" href="mailto:pm.mats98@gmail.com?subject=Meeting%20Copilot%20demo">
              Book a demo
            </a>
            <a className="secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="proof">
            <span>Windows desktop</span>
            <span>Realtime transcription</span>
            <span>Overlay mode</span>
          </div>
        </div>

        <div className="product-card" aria-label="Product preview">
          <div className="window-top">
            <span />
            <span />
            <span />
            <strong>Meeting Copilot</strong>
          </div>
          <div className="status-pill">
            <span className="dot" />
            Listening
          </div>
          <div className="overlay-preview">
            <p className="label">Transcript</p>
            <p>“How would you handle retries and idempotency in this payment flow?”</p>
          </div>
          <div className="answer-preview">
            <p className="label">AI answer</p>
            <h2>Use idempotency keys plus bounded retries.</h2>
            <p>
              Store a request key per operation, retry only transient failures, and make the
              downstream write safe to execute more than once.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <p className="eyebrow">WHAT IT DOES</p>
        <h2>A focused copilot for people who need speed, not another meeting bot.</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section split">
        <div>
          <p className="eyebrow">FLOW</p>
          <h2>Built for fast, silent assistance during live calls.</h2>
        </div>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section id="security" className="section security">
        <p className="eyebrow">SECURITY DEFAULTS</p>
        <h2>Designed to be explicit, private and controllable.</h2>
        <p>
          The desktop app uses push-to-talk, keeps provider credentials in the backend, requests
          short-lived transcription credentials, and does not persist audio by default.
        </p>
      </section>

      <section id="pricing" className="section pricing">
        <div>
          <p className="eyebrow">EARLY ACCESS</p>
          <h2>Start with a private pilot.</h2>
          <p>
            We are validating the desktop workflow with engineering teams and technical operators.
            Pricing can be per-seat or private deployment depending on data requirements.
          </p>
        </div>
        <a className="primary" href="mailto:pm.mats98@gmail.com?subject=Meeting%20Copilot%20pilot">
          Talk about a pilot
        </a>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
