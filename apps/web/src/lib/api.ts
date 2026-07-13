const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
};

export type Session = {
  accessToken: string;
  user: SessionUser;
};

export type BillingSummary = {
  entitlements: {
    plan: "trial" | "basic" | "pro" | "advanced";
    answerTier: "basic" | "balanced" | "advanced";
    transcriptionSecondsPerPeriod: number;
    maxActiveDevices: number;
    contextProfilesLimit: number;
    documentRetrievalEnabled: boolean;
    historyRetentionDays: number;
  };
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  credits: {
    balanceMicrocredits: number;
    reservedMicrocredits: number;
  };
};

export type AccountDevice = {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type ApiOptions = { method?: string; body?: unknown; accessToken?: string };

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
  retryAuth = true
): Promise<T> {
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
      const session = (await refreshed.json()) as Session;
      persistSession(session);
      return apiRequest<T>(path, { ...options, accessToken: session.accessToken }, false);
    }
  }

  const value = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok)
    throw new Error(value.message ?? `Não foi possível concluir (${response.status}).`);
  return value;
}

export function persistSession(session: Session): void {
  sessionStorage.setItem("mc_access_token", session.accessToken);
  sessionStorage.setItem("mc_user", JSON.stringify(session.user));
}

export function readSession(): Session | null {
  const accessToken = sessionStorage.getItem("mc_access_token");
  const user = sessionStorage.getItem("mc_user");
  if (!accessToken || !user) return null;
  try {
    return { accessToken, user: JSON.parse(user) as SessionUser };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem("mc_access_token");
  sessionStorage.removeItem("mc_user");
}
