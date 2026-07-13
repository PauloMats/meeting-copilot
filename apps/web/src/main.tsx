import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const links = {
  releases: "https://github.com/PauloMats/meeting-copilot/releases/latest",
  github: "https://github.com/PauloMats/meeting-copilot",
  contact: "mailto:pm.mats98@gmail.com?subject=Meeting%20Copilot"
};

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

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
            demanda e gera respostas rápidas com IA para entrevistas, calls técnicas e discussões de
            arquitetura.
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
          <h2>Escolha o ritmo certo para suas reuniões.</h2>
          <p>
            Comece no Trial e faça upgrade quando precisar de mais áudio, dispositivos e modelos. Os
            valores ainda fazem parte do piloto comercial.
          </p>
        </div>
        <div className="pricing-grid">
          {[
            ["Basic", "R$59", "3 horas/mês", "basic"],
            ["Pro", "R$149", "8 horas/mês", "pro"],
            ["Advanced", "R$299", "20 horas/mês", "advanced"]
          ].map(([name, price, allowance, code]) => (
            <article className="price-card" key={code}>
              <span>{name}</span>
              <strong>{price}</strong>
              <small>{allowance}</small>
              <a className="secondary compact" href={`/account?plan=${code}`}>
                Começar
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
};

function AccountApp() {
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem("mc_access_token"));
  const [user, setUser] = useState<SessionUser | null>(() => {
    const value = sessionStorage.getItem("mc_user");
    return value ? (JSON.parse(value) as SessionUser) : null;
  });
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [devices, setDevices] = useState<
    Array<{ id: string; name: string; platform: string; revokedAt: string | null }>
  >([]);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      apiRequest("/api/account/billing", { accessToken }),
      apiRequest("/api/account/devices", { accessToken })
    ])
      .then(([billingSummary, accountDevices]) => {
        setSummary(billingSummary);
        setDevices(
          accountDevices as Array<{
            id: string;
            name: string;
            platform: string;
            revokedAt: string | null;
          }>
        );
      })
      .catch((cause: Error) => setError(cause.message));
  }, [accessToken]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const session = (await apiRequest(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          email: formString(data, "email"),
          password: formString(data, "password"),
          ...(mode === "register" ? { displayName: formString(data, "displayName") } : {})
        }
      })) as { accessToken: string; user: SessionUser };
      sessionStorage.setItem("mc_access_token", session.accessToken);
      sessionStorage.setItem("mc_user", JSON.stringify(session.user));
      setAccessToken(session.accessToken);
      setUser(session.user);
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      if (returnTo?.startsWith("/")) window.location.assign(returnTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível autenticar");
    }
  }

  async function billing(action: "checkout" | "portal", plan?: string) {
    if (!accessToken) return;
    try {
      const response = (await apiRequest(`/api/billing/${action}`, {
        method: "POST",
        accessToken,
        body: action === "checkout" ? { plan } : {}
      })) as { url: string };
      window.location.assign(response.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Billing indisponível");
    }
  }

  async function revokeDevice(deviceId: string) {
    if (!accessToken) return;
    try {
      await apiRequest(`/api/account/devices/${deviceId}`, {
        method: "DELETE",
        accessToken
      });
      setDevices((current) => current.filter((device) => device.id !== deviceId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível revogar o dispositivo");
    }
  }

  async function logout() {
    if (accessToken) {
      await apiRequest("/api/auth/logout", { method: "POST", accessToken }).catch(() => undefined);
    }
    sessionStorage.removeItem("mc_access_token");
    sessionStorage.removeItem("mc_user");
    setAccessToken(null);
    setUser(null);
  }

  if (!accessToken || !user) {
    return (
      <main className="account-shell">
        <a className="brand" href="/">
          <span className="brand-mark">✦</span>Meeting Copilot
        </a>
        <section className="auth-card">
          <p className="eyebrow">SUA CONTA</p>
          <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
          <form onSubmit={(event) => void submit(event)}>
            {mode === "register" && <input name="displayName" placeholder="Seu nome" required />}
            <input name="email" type="email" placeholder="E-mail" required />
            <input
              name="password"
              type="password"
              placeholder="Senha (mín. 12 caracteres)"
              required
            />
            {error && <p className="form-error">{error}</p>}
            <button className="primary" type="submit">
              Continuar
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
          </button>
        </section>
      </main>
    );
  }

  const selectedPlan = new URLSearchParams(window.location.search).get("plan");
  return (
    <main className="account-shell">
      <a className="brand" href="/">
        <span className="brand-mark">✦</span>Meeting Copilot
      </a>
      <section className="account-card">
        <p className="eyebrow">CONTA</p>
        <h1>Olá, {user.displayName ?? user.email}.</h1>
        <pre>{summary ? JSON.stringify(summary, null, 2) : "Carregando plano e créditos…"}</pre>
        <div className="device-list">
          <h2>Dispositivos</h2>
          {devices
            .filter((device) => !device.revokedAt)
            .map((device) => (
              <div className="device-row" key={device.id}>
                <span>
                  <strong>{device.name}</strong>
                  <small>{device.platform}</small>
                </span>
                <button className="text-button" onClick={() => void revokeDevice(device.id)}>
                  Revogar
                </button>
              </div>
            ))}
          {devices.every((device) => device.revokedAt) && <p>Nenhum desktop conectado.</p>}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="hero-actions">
          {selectedPlan && selectedPlan !== "trial" && (
            <button className="primary" onClick={() => void billing("checkout", selectedPlan)}>
              Assinar {selectedPlan}
            </button>
          )}
          <button className="secondary" onClick={() => void billing("portal")}>
            Gerenciar assinatura
          </button>
          <button className="text-button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </section>
    </main>
  );
}

function DeviceApp() {
  const [message, setMessage] = useState("");
  async function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = sessionStorage.getItem("mc_access_token");
    if (!accessToken) {
      window.location.assign(`/account?returnTo=${encodeURIComponent("/device")}`);
      return;
    }
    const code = formString(new FormData(event.currentTarget), "code");
    try {
      await apiRequest("/api/auth/device/approve", {
        method: "POST",
        accessToken,
        body: { userCode: code }
      });
      setMessage("Dispositivo autorizado. Você pode voltar ao aplicativo.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível autorizar");
    }
  }
  return (
    <main className="account-shell">
      <section className="auth-card">
        <p className="eyebrow">AUTORIZAR DESKTOP</p>
        <h1>Conecte seu dispositivo.</h1>
        <form onSubmit={(event) => void approve(event)}>
          <input
            name="code"
            placeholder="ABCD-1234"
            defaultValue={new URLSearchParams(window.location.search).get("code") ?? ""}
            required
          />
          <button className="primary" type="submit">
            Autorizar
          </button>
        </form>
        {message && <p>{message}</p>}
      </section>
    </main>
  );
}

async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown; accessToken?: string } = {},
  retryAuth = true
) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  if (response.status === 401 && options.accessToken && retryAuth) {
    const refreshed = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    if (refreshed.ok) {
      const session = (await refreshed.json()) as { accessToken: string; user: SessionUser };
      sessionStorage.setItem("mc_access_token", session.accessToken);
      sessionStorage.setItem("mc_user", JSON.stringify(session.user));
      return apiRequest(path, { ...options, accessToken: session.accessToken }, false);
    }
  }
  const value = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(value.message ?? `Request failed (${response.status})`);
  return value;
}

function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

const CurrentApp = window.location.pathname.startsWith("/account")
  ? AccountApp
  : window.location.pathname.startsWith("/device")
    ? DeviceApp
    : App;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CurrentApp />
  </React.StrictMode>
);
