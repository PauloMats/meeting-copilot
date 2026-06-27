export const languages = [
  { value: "pt", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "ru", label: "Русский" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" }
] as const;

export type UiLanguage = (typeof languages)[number]["value"];

type Messages = {
  appTitle: string;
  hero: string;
  overlayHero: string;
  holdToListen: string;
  hold: string;
  meetingAudioSource: string;
  language: string;
  hotkey: string;
  accuracy: string;
  intelligence: string;
  intelligenceBasic: string;
  intelligenceBalanced: string;
  intelligenceAdvanced: string;
  fastest: string;
  fast: string;
  balanced: string;
  accurate: string;
  mostAccurate: string;
  includeMicrophone: string;
  reviewBeforeSending: string;
  overlayMode: string;
  settings: string;
  overlayOpacity: string;
  overlayText: string;
  lightText: string;
  darkText: string;
  overlayTextShadow: string;
  exitOverlay: string;
  micIncluded: string;
  meetingAudioOnly: string;
  audioNotSaved: string;
  transcript: string;
  answerPlaceholderTitle: string;
  answerPlaceholderBody: string;
  holdPlaceholder: (hotkey: string) => string;
  cancel: string;
  sendAnswer: string;
  pushToTalkOnly: string;
  ephemeralCredentials: string;
  localSettings: string;
  answer: string;
  why: string;
  example: string;
  assumptions: string;
  confidence: (value: string) => string;
  states: Record<string, string>;
};

const messages: Record<UiLanguage, Messages> = {
  pt: {
    appTitle: "MEETING COPILOT",
    hero: "Respostas técnicas sem interromper a conversa.",
    overlayHero: "Overlay da reunião",
    holdToListen: "Segure para ouvir",
    hold: "Segure",
    meetingAudioSource: "Fonte do áudio",
    language: "Idioma",
    hotkey: "Atalho",
    accuracy: "Precisão",
    intelligence: "Inteligência",
    intelligenceBasic: "Básico",
    intelligenceBalanced: "Médio",
    intelligenceAdvanced: "Avançado",
    fastest: "Mais rápido",
    fast: "Rápido",
    balanced: "Balanceado",
    accurate: "Preciso",
    mostAccurate: "Mais preciso",
    includeMicrophone: "Incluir microfone",
    reviewBeforeSending: "Revisar antes de enviar",
    overlayMode: "Modo overlay",
    settings: "Configurações",
    overlayOpacity: "Opacidade do overlay",
    overlayText: "Texto do overlay",
    lightText: "Texto claro",
    darkText: "Texto escuro",
    overlayTextShadow: "Sombra no texto do overlay",
    exitOverlay: "Sair do overlay",
    micIncluded: "Microfone incluído",
    meetingAudioOnly: "Só áudio da reunião",
    audioNotSaved: "Áudio não salvo",
    transcript: "Transcrição",
    answerPlaceholderTitle: "A resposta aparecerá aqui",
    answerPlaceholderBody: "Resposta direta primeiro, explicação e exemplo abaixo.",
    holdPlaceholder: (hotkey) => `Segure ${hotkey} enquanto alguém faz uma pergunta técnica…`,
    cancel: "Cancelar",
    sendAnswer: "Enviar resposta",
    pushToTalkOnly: "Push-to-talk",
    ephemeralCredentials: "Credenciais temporárias",
    localSettings: "Configurações locais",
    answer: "Resposta",
    why: "Por quê",
    example: "Exemplo",
    assumptions: "Suposições e riscos",
    confidence: (value) => `confiança ${value}`,
    states: {
      idle: "Pronto",
      listening: "Ouvindo",
      transcribing: "Transcrevendo",
      ready_to_send: "Revisar",
      thinking: "Pensando",
      answering: "Respondendo",
      error: "Atenção"
    }
  },
  en: {
    appTitle: "MEETING COPILOT",
    hero: "Technical answers, without breaking the conversation.",
    overlayHero: "Live meeting overlay",
    holdToListen: "Hold to listen",
    hold: "Hold",
    meetingAudioSource: "Meeting audio source",
    language: "Language",
    hotkey: "Hotkey",
    accuracy: "Accuracy",
    intelligence: "Intelligence",
    intelligenceBasic: "Basic",
    intelligenceBalanced: "Balanced",
    intelligenceAdvanced: "Advanced",
    fastest: "Fastest",
    fast: "Fast",
    balanced: "Balanced",
    accurate: "Accurate",
    mostAccurate: "Most accurate",
    includeMicrophone: "Include microphone",
    reviewBeforeSending: "Review before sending",
    overlayMode: "Overlay mode",
    settings: "Settings",
    overlayOpacity: "Overlay opacity",
    overlayText: "Overlay text",
    lightText: "Light text",
    darkText: "Dark text",
    overlayTextShadow: "Overlay text shadow",
    exitOverlay: "Exit overlay",
    micIncluded: "Mic included",
    meetingAudioOnly: "Meeting audio only",
    audioNotSaved: "Audio is not saved",
    transcript: "Transcript",
    answerPlaceholderTitle: "Your answer will appear here",
    answerPlaceholderBody: "Direct response first, explanation and example underneath.",
    holdPlaceholder: (hotkey) => `Hold ${hotkey} while someone asks a technical question…`,
    cancel: "Cancel",
    sendAnswer: "Send answer",
    pushToTalkOnly: "Push-to-talk only",
    ephemeralCredentials: "Ephemeral transcription credentials",
    localSettings: "Local settings",
    answer: "Answer",
    why: "Why",
    example: "Example",
    assumptions: "Assumptions and risks",
    confidence: (value) => `${value} confidence`,
    states: {
      idle: "Ready",
      listening: "Listening",
      transcribing: "Transcribing",
      ready_to_send: "Review",
      thinking: "Thinking",
      answering: "Answering",
      error: "Needs attention"
    }
  },
  es: {
    appTitle: "MEETING COPILOT",
    hero: "Respuestas técnicas sin interrumpir la conversación.",
    overlayHero: "Overlay de reunión",
    holdToListen: "Mantén para escuchar",
    hold: "Mantén",
    meetingAudioSource: "Fuente de audio",
    language: "Idioma",
    hotkey: "Atajo",
    accuracy: "Precisión",
    intelligence: "Inteligencia",
    intelligenceBasic: "Básico",
    intelligenceBalanced: "Medio",
    intelligenceAdvanced: "Avanzado",
    fastest: "Más rápido",
    fast: "Rápido",
    balanced: "Balanceado",
    accurate: "Preciso",
    mostAccurate: "Más preciso",
    includeMicrophone: "Incluir micrófono",
    reviewBeforeSending: "Revisar antes de enviar",
    overlayMode: "Modo overlay",
    settings: "Configuración",
    overlayOpacity: "Opacidad del overlay",
    overlayText: "Texto del overlay",
    lightText: "Texto claro",
    darkText: "Texto oscuro",
    overlayTextShadow: "Sombra del texto",
    exitOverlay: "Salir del overlay",
    micIncluded: "Micrófono incluido",
    meetingAudioOnly: "Solo audio de reunión",
    audioNotSaved: "Audio no guardado",
    transcript: "Transcripción",
    answerPlaceholderTitle: "Tu respuesta aparecerá aquí",
    answerPlaceholderBody: "Respuesta directa primero, explicación y ejemplo debajo.",
    holdPlaceholder: (hotkey) => `Mantén ${hotkey} mientras alguien hace una pregunta técnica…`,
    cancel: "Cancelar",
    sendAnswer: "Enviar respuesta",
    pushToTalkOnly: "Solo push-to-talk",
    ephemeralCredentials: "Credenciales temporales",
    localSettings: "Configuración local",
    answer: "Respuesta",
    why: "Por qué",
    example: "Ejemplo",
    assumptions: "Suposiciones y riesgos",
    confidence: (value) => `confianza ${value}`,
    states: {
      idle: "Listo",
      listening: "Escuchando",
      transcribing: "Transcribiendo",
      ready_to_send: "Revisar",
      thinking: "Pensando",
      answering: "Respondiendo",
      error: "Atención"
    }
  },
  ru: {
    appTitle: "MEETING COPILOT",
    hero: "Технические ответы, не прерывая разговор.",
    overlayHero: "Оверлей встречи",
    holdToListen: "Удерживайте для записи",
    hold: "Удерживайте",
    meetingAudioSource: "Источник аудио",
    language: "Язык",
    hotkey: "Горячая клавиша",
    accuracy: "Точность",
    intelligence: "Интеллект",
    intelligenceBasic: "Базовый",
    intelligenceBalanced: "Средний",
    intelligenceAdvanced: "Продвинутый",
    fastest: "Самый быстрый",
    fast: "Быстро",
    balanced: "Баланс",
    accurate: "Точно",
    mostAccurate: "Максимально точно",
    includeMicrophone: "Включить микрофон",
    reviewBeforeSending: "Проверить перед отправкой",
    overlayMode: "Режим оверлея",
    settings: "Настройки",
    overlayOpacity: "Прозрачность оверлея",
    overlayText: "Текст оверлея",
    lightText: "Светлый текст",
    darkText: "Тёмный текст",
    overlayTextShadow: "Тень текста",
    exitOverlay: "Выйти из оверлея",
    micIncluded: "Микрофон включён",
    meetingAudioOnly: "Только аудио встречи",
    audioNotSaved: "Аудио не сохраняется",
    transcript: "Транскрипт",
    answerPlaceholderTitle: "Ответ появится здесь",
    answerPlaceholderBody: "Сначала прямой ответ, затем объяснение и пример.",
    holdPlaceholder: (hotkey) => `Удерживайте ${hotkey}, пока задают технический вопрос…`,
    cancel: "Отмена",
    sendAnswer: "Отправить ответ",
    pushToTalkOnly: "Только push-to-talk",
    ephemeralCredentials: "Временные учётные данные",
    localSettings: "Локальные настройки",
    answer: "Ответ",
    why: "Почему",
    example: "Пример",
    assumptions: "Предположения и риски",
    confidence: (value) => `уверенность ${value}`,
    states: {
      idle: "Готово",
      listening: "Слушаю",
      transcribing: "Транскрипция",
      ready_to_send: "Проверить",
      thinking: "Думаю",
      answering: "Отвечаю",
      error: "Требует внимания"
    }
  },
  fr: {
    appTitle: "MEETING COPILOT",
    hero: "Des réponses techniques sans interrompre la conversation.",
    overlayHero: "Overlay de réunion",
    holdToListen: "Maintenir pour écouter",
    hold: "Maintenir",
    meetingAudioSource: "Source audio",
    language: "Langue",
    hotkey: "Raccourci",
    accuracy: "Précision",
    intelligence: "Intelligence",
    intelligenceBasic: "Basique",
    intelligenceBalanced: "Moyen",
    intelligenceAdvanced: "Avancé",
    fastest: "Le plus rapide",
    fast: "Rapide",
    balanced: "Équilibré",
    accurate: "Précis",
    mostAccurate: "Le plus précis",
    includeMicrophone: "Inclure le micro",
    reviewBeforeSending: "Relire avant l’envoi",
    overlayMode: "Mode overlay",
    settings: "Paramètres",
    overlayOpacity: "Opacité de l’overlay",
    overlayText: "Texte de l’overlay",
    lightText: "Texte clair",
    darkText: "Texte sombre",
    overlayTextShadow: "Ombre du texte",
    exitOverlay: "Quitter l’overlay",
    micIncluded: "Micro inclus",
    meetingAudioOnly: "Audio réunion seulement",
    audioNotSaved: "Audio non enregistré",
    transcript: "Transcription",
    answerPlaceholderTitle: "La réponse apparaîtra ici",
    answerPlaceholderBody: "Réponse directe d’abord, puis explication et exemple.",
    holdPlaceholder: (hotkey) =>
      `Maintenez ${hotkey} pendant qu’une question technique est posée…`,
    cancel: "Annuler",
    sendAnswer: "Envoyer la réponse",
    pushToTalkOnly: "Push-to-talk uniquement",
    ephemeralCredentials: "Identifiants temporaires",
    localSettings: "Paramètres locaux",
    answer: "Réponse",
    why: "Pourquoi",
    example: "Exemple",
    assumptions: "Hypothèses et risques",
    confidence: (value) => `confiance ${value}`,
    states: {
      idle: "Prêt",
      listening: "Écoute",
      transcribing: "Transcription",
      ready_to_send: "Relire",
      thinking: "Réflexion",
      answering: "Réponse",
      error: "Attention"
    }
  },
  it: {
    appTitle: "MEETING COPILOT",
    hero: "Risposte tecniche senza interrompere la conversazione.",
    overlayHero: "Overlay riunione",
    holdToListen: "Tieni premuto",
    hold: "Tieni",
    meetingAudioSource: "Fonte audio",
    language: "Lingua",
    hotkey: "Scorciatoia",
    accuracy: "Precisione",
    intelligence: "Intelligenza",
    intelligenceBasic: "Base",
    intelligenceBalanced: "Medio",
    intelligenceAdvanced: "Avanzato",
    fastest: "Più veloce",
    fast: "Veloce",
    balanced: "Bilanciato",
    accurate: "Preciso",
    mostAccurate: "Più preciso",
    includeMicrophone: "Includi microfono",
    reviewBeforeSending: "Rivedi prima di inviare",
    overlayMode: "Modalità overlay",
    settings: "Impostazioni",
    overlayOpacity: "Opacità overlay",
    overlayText: "Testo overlay",
    lightText: "Testo chiaro",
    darkText: "Testo scuro",
    overlayTextShadow: "Ombra del testo",
    exitOverlay: "Esci dall’overlay",
    micIncluded: "Microfono incluso",
    meetingAudioOnly: "Solo audio riunione",
    audioNotSaved: "Audio non salvato",
    transcript: "Trascrizione",
    answerPlaceholderTitle: "La risposta apparirà qui",
    answerPlaceholderBody: "Prima risposta diretta, poi spiegazione ed esempio.",
    holdPlaceholder: (hotkey) => `Tieni premuto ${hotkey} mentre fanno una domanda tecnica…`,
    cancel: "Annulla",
    sendAnswer: "Invia risposta",
    pushToTalkOnly: "Solo push-to-talk",
    ephemeralCredentials: "Credenziali temporanee",
    localSettings: "Impostazioni locali",
    answer: "Risposta",
    why: "Perché",
    example: "Esempio",
    assumptions: "Ipotesi e rischi",
    confidence: (value) => `confidenza ${value}`,
    states: {
      idle: "Pronto",
      listening: "Ascolto",
      transcribing: "Trascrizione",
      ready_to_send: "Revisione",
      thinking: "Elaborazione",
      answering: "Risposta",
      error: "Attenzione"
    }
  }
};

export function normalizeLanguage(language: string): UiLanguage {
  const normalized = language.split("-")[0] as UiLanguage;
  return normalized in messages ? normalized : "en";
}

export function getMessages(language: string): Messages {
  return messages[normalizeLanguage(language)];
}
