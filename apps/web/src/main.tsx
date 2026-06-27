import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const links = {
  releases: "https://github.com/PauloMats/meeting-copilot/releases/latest",
  github: "https://github.com/PauloMats/meeting-copilot",
  contact: "mailto:pm.mats98@gmail.com?subject=Meeting%20Copilot"
};

const features = [
  {
    title: "Push-to-talk",
    body: "O app escuta somente enquanto você segura a hotkey. Menos ruído, menos custo e mais controle durante a reunião."
  },
  {
    title: "Áudio da reunião + microfone",
    body: "Captura o áudio da tela/janela e pode incluir o microfone quando você quiser mandar também o seu lado da conversa."
  },
  {
    title: "Overlay discreto",
    body: "Use por cima do Teams, Meet ou Zoom com uma interface compacta para transcrição, status e resposta da IA."
  },
  {
    title: "Respostas rápidas",
    body: "Resposta direta primeiro, depois contexto curto e exemplo prático. Feito para desbloquear conversas, não escrever TCC."
  }
];

const steps = [
  "Instale o app Windows e configure a URL da API.",
  "Segure a hotkey enquanto alguém faz uma pergunta técnica.",
  "Solte a tecla e receba uma resposta curta para usar na conversa."
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
          <a href="#features">Recursos</a>
          <a href="#download">Download</a>
          <a href="#security">Privacidade</a>
        </div>
        <a className="nav-cta" href={links.releases}>
          Baixar app
        </a>
      </nav>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI COPILOT PARA REUNIÕES TÉCNICAS</p>
          <h1>Responda perguntas técnicas sem travar a conversa.</h1>
          <p className="hero-text">
            Meeting Copilot é um app desktop para Windows que transcreve áudio da reunião sob
            demanda e gera respostas rápidas com IA para entrevistas, calls técnicas e discussões
            de arquitetura.
          </p>
          <div className="hero-actions">
            <a className="primary" href={links.releases}>
              Download para Windows
            </a>
            <a className="secondary" href={links.github}>
              Ver no GitHub
            </a>
          </div>
          <div className="proof">
            <span>Windows desktop</span>
            <span>Transcrição em tempo real</span>
            <span>Modo overlay</span>
            <span>Backend na nuvem</span>
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
        <p className="eyebrow">O QUE ELE FAZ</p>
        <h2>Um copiloto focado em velocidade, não em virar mais um bot de reunião.</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="download" className="section download">
        <div>
          <p className="eyebrow">DOWNLOAD</p>
          <h2>Instale o app desktop e conecte na API hospedada.</h2>
          <p>
            Os instaladores ficam no GitHub Releases. Para produção, o desktop usa apenas a URL da
            API e uma chave de acesso; a chave da OpenAI permanece protegida no backend.
          </p>
        </div>
        <div className="download-card">
          <span className="platform">Windows x64</span>
          <h3>Meeting Copilot Desktop</h3>
          <p>Use o instalador padrão ou a versão portable para testes rápidos em outro PC.</p>
          <div className="download-actions">
            <a className="primary" href={links.releases}>
              Abrir downloads
            </a>
            <a className="secondary compact" href={links.github}>
              Código-fonte
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section split">
        <div>
          <p className="eyebrow">FLUXO</p>
          <h2>Feito para assistência rápida e silenciosa durante calls ao vivo.</h2>
        </div>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section id="security" className="section security">
        <p className="eyebrow">PRIVACIDADE</p>
        <h2>Arquitetura explícita, controlável e simples de operar.</h2>
        <p>
          O desktop usa push-to-talk, mantém credenciais sensíveis no backend, solicita credenciais
          temporárias para transcrição e não salva áudio por padrão.
        </p>
      </section>

      <section id="pricing" className="section pricing">
        <div>
          <p className="eyebrow">SAAS</p>
          <h2>Pronto para piloto privado.</h2>
          <p>
            A versão atual já separa desktop, API e banco. O próximo passo comercial é adicionar
            autenticação por usuário, billing e controle de limite por workspace.
          </p>
        </div>
        <a className="primary" href={links.contact}>
          Falar sobre piloto
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
