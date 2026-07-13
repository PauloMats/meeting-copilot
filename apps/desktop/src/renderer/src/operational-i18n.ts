import { normalizeLanguage, type UiLanguage } from "./i18n";

export interface OperationalMessages {
  nav: {
    meeting: string;
    history: string;
    context: string;
    audio: string;
    settings: string;
    diagnostics: string;
  };
  visualStates: Record<string, string>;
  sayThis: string;
  supportPoints: string;
  detectedQuestion: string;
  normalizedQuestion: string;
  copy: string;
  copied: string;
  pin: string;
  unpin: string;
  discard: string;
  minimize: string;
  expand: string;
  compact: string;
  returnToApp: string;
  pause: string;
  resume: string;
  retry: string;
  currentAnswer: string;
  pinnedAnswers: string;
  recentHistory: string;
  noHistory: string;
  noAnswer: string;
  captureActive: string;
  captureInactive: string;
  reviewTitle: string;
  reviewHint: string;
  details: string;
  followUps: string;
  model: string;
  localOnly: string;
  apiStatus: string;
  pendingBackend: string;
  safeDiagnostics: string;
  theme: string;
  themeSystem: string;
  themeDark: string;
  themeLight: string;
  overlaySize: string;
  alwaysOnTop: string;
  clickThrough: string;
  partialTranscript: string;
}

const sharedEnglish: OperationalMessages = {
  nav: {
    meeting: "Meeting",
    history: "History",
    context: "Context",
    audio: "Audio",
    settings: "Settings",
    diagnostics: "Diagnostics"
  },
  visualStates: {
    idle: "Ready",
    listening: "Listening",
    transcribing: "Transcribing",
    question_detected: "Review question",
    thinking: "Thinking",
    answer_ready: "Answer ready",
    paused: "Paused",
    offline: "Offline",
    no_audio: "No audio",
    error: "Needs attention"
  },
  sayThis: "Say this",
  supportPoints: "Support points",
  detectedQuestion: "Detected question",
  normalizedQuestion: "Normalized",
  copy: "Copy answer",
  copied: "Copied",
  pin: "Pin answer",
  unpin: "Unpin answer",
  discard: "Discard",
  minimize: "Minimize overlay",
  expand: "Expand overlay",
  compact: "Compact overlay",
  returnToApp: "Return to main app",
  pause: "Pause assisted listening",
  resume: "Resume assisted listening",
  retry: "Try again",
  currentAnswer: "Current answer",
  pinnedAnswers: "Pinned answers",
  recentHistory: "Recent session",
  noHistory: "No answered questions in this local session.",
  noAnswer: "Hold the configured key while a question is asked.",
  captureActive: "Capture active",
  captureInactive: "Capture inactive",
  reviewTitle: "Review before sending",
  reviewHint: "Edit the suggested question. Nothing is sent until you confirm.",
  details: "Details",
  followUps: "Follow-ups",
  model: "Model",
  localOnly: "Available in memory for this app session only.",
  apiStatus: "API status",
  pendingBackend: "Requires backend runtime persistence before it can show saved sessions.",
  safeDiagnostics: "Safe diagnostics never include transcript or answer content.",
  theme: "Theme",
  themeSystem: "System",
  themeDark: "Dark",
  themeLight: "Light",
  overlaySize: "Overlay size",
  alwaysOnTop: "Always on top",
  clickThrough: "Click-through",
  partialTranscript: "Show partial transcript"
};

const operational: Record<UiLanguage, OperationalMessages> = {
  en: sharedEnglish,
  pt: {
    ...sharedEnglish,
    nav: {
      meeting: "Reunião",
      history: "Histórico",
      context: "Contexto",
      audio: "Áudio",
      settings: "Configurações",
      diagnostics: "Diagnóstico"
    },
    visualStates: {
      idle: "Pronto",
      listening: "Ouvindo",
      transcribing: "Transcrevendo",
      question_detected: "Revisar pergunta",
      thinking: "Pensando",
      answer_ready: "Resposta pronta",
      paused: "Pausado",
      offline: "Offline",
      no_audio: "Sem áudio",
      error: "Atenção"
    },
    sayThis: "Fale isto",
    supportPoints: "Pontos de apoio",
    detectedQuestion: "Pergunta detectada",
    normalizedQuestion: "Normalizada",
    copy: "Copiar resposta",
    copied: "Copiado",
    pin: "Fixar resposta",
    unpin: "Desafixar resposta",
    discard: "Descartar",
    minimize: "Minimizar overlay",
    expand: "Expandir overlay",
    compact: "Compactar overlay",
    returnToApp: "Voltar ao aplicativo",
    pause: "Pausar escuta assistida",
    resume: "Retomar escuta assistida",
    retry: "Tentar novamente",
    currentAnswer: "Resposta atual",
    pinnedAnswers: "Respostas fixadas",
    recentHistory: "Sessão recente",
    noHistory: "Nenhuma pergunta respondida nesta sessão local.",
    noAnswer: "Segure a tecla configurada enquanto uma pergunta é feita.",
    captureActive: "Captura ativa",
    captureInactive: "Captura inativa",
    reviewTitle: "Revisar antes de enviar",
    reviewHint: "Edite a pergunta sugerida. Nada será enviado até você confirmar.",
    details: "Detalhes",
    followUps: "Próximas perguntas",
    model: "Modelo",
    localOnly: "Disponível apenas na memória desta sessão do app.",
    apiStatus: "Status da API",
    pendingBackend: "Requer persistência no backend para exibir sessões salvas.",
    safeDiagnostics: "O diagnóstico seguro nunca inclui transcrição nem resposta.",
    theme: "Tema",
    themeSystem: "Sistema",
    themeDark: "Escuro",
    themeLight: "Claro",
    overlaySize: "Tamanho do overlay",
    alwaysOnTop: "Sempre no topo",
    clickThrough: "Ignorar cliques",
    partialTranscript: "Mostrar transcrição parcial"
  },
  es: translated(sharedEnglish, {
    nav: ["Reunión", "Historial", "Contexto", "Audio", "Ajustes", "Diagnóstico"],
    sayThis: "Di esto",
    supportPoints: "Puntos de apoyo",
    detectedQuestion: "Pregunta detectada"
  }),
  fr: translated(sharedEnglish, {
    nav: ["Réunion", "Historique", "Contexte", "Audio", "Paramètres", "Diagnostic"],
    sayThis: "Dites ceci",
    supportPoints: "Points d’appui",
    detectedQuestion: "Question détectée"
  }),
  it: translated(sharedEnglish, {
    nav: ["Riunione", "Cronologia", "Contesto", "Audio", "Impostazioni", "Diagnostica"],
    sayThis: "Di' questo",
    supportPoints: "Punti di supporto",
    detectedQuestion: "Domanda rilevata"
  }),
  ru: translated(sharedEnglish, {
    nav: ["Встреча", "История", "Контекст", "Аудио", "Настройки", "Диагностика"],
    sayThis: "Скажите это",
    supportPoints: "Опорные пункты",
    detectedQuestion: "Обнаруженный вопрос"
  })
};

function translated(
  base: OperationalMessages,
  values: {
    nav: [string, string, string, string, string, string];
    sayThis: string;
    supportPoints: string;
    detectedQuestion: string;
  }
): OperationalMessages {
  return {
    ...base,
    nav: {
      meeting: values.nav[0],
      history: values.nav[1],
      context: values.nav[2],
      audio: values.nav[3],
      settings: values.nav[4],
      diagnostics: values.nav[5]
    },
    sayThis: values.sayThis,
    supportPoints: values.supportPoints,
    detectedQuestion: values.detectedQuestion
  };
}

export function getOperationalMessages(language: string): OperationalMessages {
  return operational[normalizeLanguage(language)];
}
