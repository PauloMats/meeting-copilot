import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import {
  apiRequest,
  clearSession,
  persistSession,
  readSession,
  type AccountDevice,
  type BillingSummary,
  type Session,
  type SessionUser
} from "./lib/api.js";
import { useTheme } from "./lib/theme.js";

const links = {
  releases: "https://github.com/PauloMats/meeting-copilot/releases/latest",
  github: "https://github.com/PauloMats/meeting-copilot"
};

type MarketingPlan = {
  code: "basic" | "pro" | "advanced";
  name: string;
  price: string;
  allowance: string;
  description: string;
  features: readonly string[];
  featured?: boolean;
};

const plans: readonly MarketingPlan[] = [
  {
    code: "basic",
    name: "Basic",
    price: "R$59",
    allowance: "3 horas por mês",
    description: "Para entrevistas e reuniões pontuais.",
    features: ["Respostas rápidas", "1 dispositivo", "3 perfis de contexto"]
  },
  {
    code: "pro",
    name: "Pro",
    price: "R$149",
    allowance: "8 horas por mês",
    description: "Para quem participa de calls técnicas toda semana.",
    features: ["Modelo equilibrado", "3 dispositivos", "Documentos e contexto"],
    featured: true
  },
  {
    code: "advanced",
    name: "Advanced",
    price: "R$299",
    allowance: "20 horas por mês",
    description: "Para uso intenso e respostas mais elaboradas.",
    features: ["Modelo avançado", "5 dispositivos", "Retenção ampliada"]
  }
];

export function WebApp() {
  const path = window.location.pathname;
  if (path.startsWith("/account")) return <AccountPage />;
  if (path.startsWith("/device")) return <DevicePage />;
  return <LandingPage />;
}

function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="site-shell">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content">
        <section id="top" className="hero section-shell">
          <div className="hero-copy">
            <p className="eyebrow">Copiloto de IA para reuniões técnicas</p>
            <h1>Tenha a resposta certa sem sair da conversa.</h1>
            <p className="hero-text">
              O Meeting Copilot escuta apenas quando você pede, transcreve a pergunta e prepara uma
              resposta curta para entrevistas, reuniões e decisões de arquitetura.
            </p>
            <div className="hero-actions">
              <a className="button button-primary button-lg" href={links.releases}>
                Baixar para Windows
              </a>
              <a className="button button-secondary button-lg" href="#how-it-works">
                Ver como funciona
              </a>
            </div>
            <ul className="trust-list" aria-label="Destaques do produto">
              <li>Push-to-talk</li>
              <li>Áudio não salvo</li>
              <li>Overlay discreto</li>
            </ul>
          </div>
          <ProductPreview />
        </section>

        <section
          id="features"
          className="content-section section-shell"
          aria-labelledby="features-title"
        >
          <SectionHeading
            eyebrow="Feito para calls ao vivo"
            title="Menos interface. Mais clareza no momento certo."
            description="O fluxo prioriza o que você precisa dizer agora e mantém detalhes disponíveis sem ocupar a reunião."
            id="features-title"
          />
          <div className="feature-list">
            <Feature number="01" title="Você controla quando escutar">
              Segure a hotkey durante a pergunta. O app não fica gravando a reunião inteira.
            </Feature>
            <Feature number="02" title="A resposta começa pelo essencial">
              Primeiro vem uma frase pronta para falar. Contexto e exemplo ficam logo abaixo.
            </Feature>
            <Feature number="03" title="Permanece visível sem atrapalhar">
              O overlay compacto fica sobre Teams, Meet ou Zoom e pode ignorar cliques.
            </Feature>
            <Feature number="04" title="Adapta-se ao seu contexto">
              Idioma, nível de inteligência e contexto técnico acompanham cada situação.
            </Feature>
          </div>
        </section>

        <section id="how-it-works" className="content-section section-shell split-section">
          <SectionHeading
            eyebrow="Fluxo simples"
            title="Da pergunta à resposta em três passos."
            description="Sem bot entrando na chamada, sem atas automáticas e sem interromper quem está falando."
            id="flow-title"
          />
          <ol className="step-list" aria-labelledby="flow-title">
            <li>
              <span>1</span>
              <div>
                <strong>Segure a hotkey</strong>
                <p>Capture o trecho relevante da conversa.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Revise se precisar</strong>
                <p>Veja a pergunta transcrita antes de enviar.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Use a resposta</strong>
                <p>Leia a frase principal e aprofunde apenas se necessário.</p>
              </div>
            </li>
          </ol>
        </section>

        <section id="security" className="content-section section-shell privacy-section">
          <div>
            <p className="eyebrow">Privacidade por padrão</p>
            <h2>Controle explícito sobre áudio e credenciais.</h2>
          </div>
          <div className="privacy-points">
            <p>
              <strong>O áudio não é salvo.</strong> A captura existe apenas durante o push-to-talk.
            </p>
            <p>
              <strong>A chave da OpenAI fica no backend.</strong> O desktop recebe credenciais
              temporárias.
            </p>
            <p>
              <strong>Você revoga dispositivos.</strong> Cada instalação é vinculada à sua conta.
            </p>
          </div>
        </section>

        <section
          id="pricing"
          className="content-section section-shell"
          aria-labelledby="pricing-title"
        >
          <SectionHeading
            eyebrow="Planos"
            title="Comece pequeno e aumente quando precisar."
            description="Todos os planos incluem o app Windows e o modo overlay. Valores de lançamento sujeitos à validação do piloto."
            id="pricing-title"
          />
          <div className="pricing-grid">
            {plans.map((plan) => (
              <PlanCard key={plan.code} plan={plan} />
            ))}
          </div>
        </section>

        <section className="content-section section-shell faq-section" aria-labelledby="faq-title">
          <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" id="faq-title" />
          <div className="faq-list">
            <details>
              <summary>Ele entra na reunião como um bot?</summary>
              <p>
                Não. O Meeting Copilot é um app local e captura apenas o áudio que você seleciona.
              </p>
            </details>
            <details>
              <summary>Posso usar em outro computador?</summary>
              <p>Sim. Instale o app e autorize o novo dispositivo pela sua conta no navegador.</p>
            </details>
            <details>
              <summary>O áudio ou a conversa ficam salvos?</summary>
              <p>
                O áudio não é salvo. Recursos de histórico terão controles explícitos de retenção
                antes do lançamento público.
              </p>
            </details>
          </div>
        </section>

        <section className="final-cta section-shell">
          <div>
            <p className="eyebrow">Disponível para Windows</p>
            <h2>Entre na próxima reunião mais preparado.</h2>
          </div>
          <a className="button button-primary button-lg" href={links.releases}>
            Baixar o app
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader({
  theme,
  onToggleTheme
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  return (
    <header className="site-header">
      <nav className="header-inner section-shell" aria-label="Principal">
        <Brand />
        <div className="header-links">
          <a href="#features">Recursos</a>
          <a href="#pricing">Planos</a>
          <a href="#security">Privacidade</a>
        </div>
        <div className="header-actions">
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          <a className="account-link" href="/account">
            Entrar
          </a>
          <a className="button button-primary header-download" href={links.releases}>
            Baixar app
          </a>
        </div>
      </nav>
    </header>
  );
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Prévia do Meeting Copilot">
      <div className="preview-titlebar">
        <span className="window-controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>Meeting Copilot</strong>
      </div>
      <div className="live-status">
        <span aria-hidden="true" />
        Escutando <kbd>F9</kbd>
      </div>
      <div className="preview-transcript">
        <span>Pergunta detectada</span>
        <p>“Como você evitaria processar o mesmo pagamento duas vezes?”</p>
      </div>
      <div className="preview-answer">
        <span>Você pode dizer</span>
        <h2>“Eu usaria uma chave de idempotência por operação.”</h2>
        <ul>
          <li>Persistir o resultado pela chave</li>
          <li>Repetir apenas falhas transitórias</li>
        </ul>
      </div>
      <div className="preview-footer">
        <span>Resposta pronta em 1,8 s</span>
        <button type="button" aria-label="Copiar resposta">
          Copiar
        </button>
      </div>
    </div>
  );
}

function Feature({
  number,
  title,
  children
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="feature-item">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

function PlanCard({ plan }: { plan: MarketingPlan }) {
  return (
    <article className={`plan-card${plan.featured ? " featured" : ""}`}>
      <header>
        <div>
          <h3>{plan.name}</h3>
          {plan.featured && <span className="badge">Mais escolhido</span>}
        </div>
        <p>{plan.description}</p>
      </header>
      <div className="plan-price">
        <strong>{plan.price}</strong>
        <span>/mês</span>
      </div>
      <p className="plan-allowance">{plan.allowance}</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <a
        className={`button ${plan.featured ? "button-primary" : "button-secondary"}`}
        href={`/account?plan=${plan.code}`}
      >
        Escolher {plan.name}
      </a>
    </article>
  );
}

function AccountPage() {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(readSession);
  return (
    <div className="product-shell">
      <ProductHeader theme={theme} onToggleTheme={toggleTheme} user={session?.user ?? null} />
      <main className="product-main">
        {session ? (
          <AccountDashboard session={session} onSessionChange={setSession} />
        ) : (
          <AuthPanel
            onAuthenticated={(next) => {
              persistSession(next);
              setSession(next);
            }}
          />
        )}
      </main>
      <SiteFooter compact />
    </div>
  );
}

function AuthPanel({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const session = await apiRequest<Session>(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          email: formString(data, "email"),
          password: formString(data, "password"),
          ...(mode === "register" ? { displayName: formString(data, "displayName") } : {})
        }
      });
      onAuthenticated(session);
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      if (returnTo?.startsWith("/")) window.location.assign(returnTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-layout" aria-labelledby="auth-title">
      <div className="auth-context">
        <p className="eyebrow">Sua conta</p>
        <h1 id="auth-title">
          {mode === "login" ? "Bem-vindo de volta." : "Comece com 30 minutos grátis."}
        </h1>
        <p>Gerencie seu plano e conecte os computadores onde você usa o Meeting Copilot.</p>
        <ul>
          <li>Sem cartão no Trial</li>
          <li>Dispositivos revogáveis</li>
          <li>Áudio não salvo</li>
        </ul>
      </div>
      <div className="auth-card">
        <div className="segmented-control" aria-label="Tipo de acesso">
          <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
            Entrar
          </button>
          <button
            type="button"
            aria-pressed={mode === "register"}
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)} noValidate>
          {mode === "register" && (
            <Field id={nameId} label="Nome" name="displayName" autoComplete="name" />
          )}
          <Field id={emailId} label="E-mail" name="email" type="email" autoComplete="email" />
          <Field
            id={passwordId}
            label="Senha"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            {...(mode === "register"
              ? { hint: "Use pelo menos 12 caracteres.", minLength: 12 }
              : {})}
          />
          {error && (
            <div className="inline-alert danger" role="alert">
              <strong>Não foi possível continuar</strong>
              <span>{error}</span>
            </div>
          )}
          <button
            className="button button-primary button-lg button-block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Aguarde…" : mode === "login" ? "Entrar na conta" : "Criar conta grátis"}
          </button>
        </form>
        <p className="form-legal">
          Ao criar a conta, você concorda com os termos e a política de privacidade.
        </p>
      </div>
    </section>
  );
}

function AccountDashboard({
  session,
  onSessionChange
}: {
  session: Session;
  onSessionChange: (session: Session | null) => void;
}) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [devices, setDevices] = useState<AccountDevice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const selectedPlan = new URLSearchParams(window.location.search).get("plan");

  useEffect(() => {
    void Promise.all([
      apiRequest<BillingSummary>("/api/account/billing", { accessToken: session.accessToken }),
      apiRequest<AccountDevice[]>("/api/account/devices", { accessToken: session.accessToken })
    ])
      .then(([nextSummary, nextDevices]) => {
        setSummary(nextSummary);
        setDevices(nextDevices);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [session.accessToken]);

  async function openBilling(action: "checkout" | "portal", plan?: string) {
    setError("");
    try {
      const response = await apiRequest<{ url: string }>(`/api/billing/${action}`, {
        method: "POST",
        accessToken: session.accessToken,
        body: action === "checkout" ? { plan } : {}
      });
      window.location.assign(response.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Billing indisponível.");
    }
  }

  async function revokeDevice(deviceId: string) {
    try {
      await apiRequest(`/api/account/devices/${deviceId}`, {
        method: "DELETE",
        accessToken: session.accessToken
      });
      setDevices((current) => current.filter((device) => device.id !== deviceId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível revogar.");
    }
  }

  async function logout() {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      accessToken: session.accessToken
    }).catch(() => undefined);
    clearSession();
    onSessionChange(null);
  }

  const activeDevices = devices.filter((device) => !device.revokedAt);
  return (
    <div className="account-layout">
      <header className="account-heading">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Olá, {session.user.displayName?.split(" ")[0] ?? "bem-vindo"}.</h1>
          <p>Acompanhe seu uso, assinatura e dispositivos conectados.</p>
        </div>
        <button className="button button-ghost" type="button" onClick={() => void logout()}>
          Sair
        </button>
      </header>
      {error && (
        <div className="inline-alert danger" role="alert">
          <strong>Algo precisa da sua atenção</strong>
          <span>{error}</span>
        </div>
      )}
      {loading ? (
        <DashboardSkeleton />
      ) : (
        summary && (
          <>
            <section className="summary-grid" aria-label="Resumo da conta">
              <article className="summary-card primary-summary">
                <span>Plano atual</span>
                <strong>{capitalize(summary.entitlements.plan)}</strong>
                <small>
                  {summary.subscription?.status === "active"
                    ? "Assinatura ativa"
                    : "Período de avaliação"}
                </small>
              </article>
              <article className="summary-card">
                <span>Créditos disponíveis</span>
                <strong>{formatMinutes(summary.credits.balanceMicrocredits)}</strong>
                <small>tempo estimado de transcrição</small>
              </article>
              <article className="summary-card">
                <span>Dispositivos</span>
                <strong>
                  {activeDevices.length} de {summary.entitlements.maxActiveDevices}
                </strong>
                <small>instalações ativas</small>
              </article>
            </section>
            {selectedPlan && selectedPlan !== summary.entitlements.plan && (
              <section className="upgrade-banner">
                <div>
                  <span>Plano selecionado</span>
                  <h2>Assinar {capitalize(selectedPlan)}</h2>
                  <p>Você será redirecionado ao checkout seguro da Stripe.</p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => void openBilling("checkout", selectedPlan)}
                >
                  Ir para o checkout
                </button>
              </section>
            )}
            <div className="account-columns">
              <section className="account-section" aria-labelledby="devices-title">
                <header>
                  <div>
                    <h2 id="devices-title">Dispositivos</h2>
                    <p>Revogue instalações que você não reconhece ou não usa mais.</p>
                  </div>
                </header>
                {activeDevices.length ? (
                  <ul className="device-list">
                    {activeDevices.map((device) => (
                      <li key={device.id}>
                        <span className="device-icon" aria-hidden="true">
                          ▣
                        </span>
                        <div>
                          <strong>{device.name}</strong>
                          <small>
                            {device.platform} ·{" "}
                            {device.lastSeenAt
                              ? `visto ${formatDate(device.lastSeenAt)}`
                              : "ainda não utilizado"}
                          </small>
                        </div>
                        <button
                          className="button button-danger-quiet"
                          type="button"
                          onClick={() => void revokeDevice(device.id)}
                        >
                          Revogar
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="Nenhum desktop conectado"
                    description="Abra o app Windows e escolha “Connect account” no menu Tools."
                  />
                )}
              </section>
              <section className="account-section billing-section" aria-labelledby="billing-title">
                <header>
                  <div>
                    <h2 id="billing-title">Assinatura</h2>
                    <p>Faturas, forma de pagamento e cancelamento ficam no portal seguro.</p>
                  </div>
                </header>
                <dl>
                  <div>
                    <dt>Nível de resposta</dt>
                    <dd>{capitalize(summary.entitlements.answerTier)}</dd>
                  </div>
                  <div>
                    <dt>Perfis de contexto</dt>
                    <dd>Até {summary.entitlements.contextProfilesLimit}</dd>
                  </div>
                  <div>
                    <dt>Histórico</dt>
                    <dd>{summary.entitlements.historyRetentionDays} dias</dd>
                  </div>
                </dl>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void openBilling("portal")}
                >
                  Gerenciar assinatura
                </button>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}

function DevicePage() {
  const { theme, toggleTheme } = useTheme();
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeId = useId();
  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readSession();
    if (!session) {
      window.location.assign(
        `/account?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await apiRequest("/api/auth/device/approve", {
        method: "POST",
        accessToken: session.accessToken,
        body: { userCode: formString(new FormData(event.currentTarget), "code") }
      });
      setMessage({
        kind: "success",
        text: "Dispositivo autorizado. Você já pode voltar ao aplicativo."
      });
    } catch (cause) {
      setMessage({
        kind: "danger",
        text: cause instanceof Error ? cause.message : "Não foi possível autorizar."
      });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="product-shell">
      <ProductHeader theme={theme} onToggleTheme={toggleTheme} user={readSession()?.user ?? null} />
      <main className="device-page">
        <section className="device-auth-card" aria-labelledby="device-title">
          <span className="device-illustration" aria-hidden="true">
            ▣
          </span>
          <p className="eyebrow">Novo dispositivo</p>
          <h1 id="device-title">Autorize este computador.</h1>
          <p>
            Compare o código exibido no Meeting Copilot para garantir que é a instalação correta.
          </p>
          <form onSubmit={(event) => void approve(event)}>
            <Field
              id={codeId}
              label="Código do dispositivo"
              name="code"
              defaultValue={new URLSearchParams(window.location.search).get("code") ?? ""}
              placeholder="ABCD-1234"
              inputMode="text"
              autoCapitalize="characters"
            />
            <button
              className="button button-primary button-lg button-block"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Autorizando…" : "Autorizar dispositivo"}
            </button>
          </form>
          {message && (
            <div className={`inline-alert ${message.kind}`} role="status">
              <strong>
                {message.kind === "success" ? "Tudo certo" : "Não foi possível autorizar"}
              </strong>
              <span>{message.text}</span>
            </div>
          )}
          <small>O código expira em 10 minutos e só pode ser usado uma vez.</small>
        </section>
      </main>
      <SiteFooter compact />
    </div>
  );
}

function ProductHeader({
  theme,
  onToggleTheme,
  user
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  user: SessionUser | null;
}) {
  return (
    <header className="product-header">
      <div className="product-header-inner">
        <Brand />
        <div>
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          {user && <span className="user-chip">{user.email}</span>}
          <a className="button button-secondary" href={links.releases}>
            Baixar app
          </a>
        </div>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Meeting Copilot — página inicial">
      <span className="brand-mark" aria-hidden="true">
        ✦
      </span>
      <span>Meeting Copilot</span>
    </a>
  );
}
function ThemeButton({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      className="theme-button"
      type="button"
      onClick={onToggle}
      aria-label={`Usar tema ${theme === "dark" ? "claro" : "escuro"}`}
      title={`Usar tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
  id
}: {
  eyebrow: string;
  title: string;
  description?: string;
  id: string;
}) {
  return (
    <header className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}
function Field({
  id,
  label,
  hint,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} required {...inputProps} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">○</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Carregando dados da conta" aria-busy="true">
      <span />
      <span />
      <span />
      <div />
    </div>
  );
}
function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`site-footer${compact ? " compact" : ""}`}>
      <div className="section-shell">
        <Brand />
        <nav aria-label="Rodapé">
          <a href="/#security">Privacidade</a>
          <a href={links.github}>GitHub</a>
          <a href="mailto:pm.mats98@gmail.com">Suporte</a>
        </nav>
        <small>© 2026 Meeting Copilot</small>
      </div>
    </footer>
  );
}
function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatMinutes(microcredits: number): string {
  const minutes = Math.max(0, Math.floor(microcredits / 1_000 / 60));
  return `${minutes} min`;
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
