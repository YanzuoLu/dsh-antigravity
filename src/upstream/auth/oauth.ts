import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { OAuthCredentials } from "@earendil-works/pi-ai";
import { loadCodeAssist } from "../client/client.js";
import type { AntigravityOAuthCredentials } from "../types/types.js";

export const REDIRECT_URI = "http://localhost:51121/oauth-callback";
export const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const OAUTH_REQUEST_TIMEOUT_MS = 15_000;
export const SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];
export interface OAuthClientParameters {
  clientId: string;
  clientSecret: string;
}

function resolveClient(client?: OAuthClientParameters): OAuthClientParameters {
  const parameters = client ?? {
    clientId: process.env.ANTIGRAVITY_CLIENT_ID,
    clientSecret: process.env.ANTIGRAVITY_CLIENT_SECRET,
  };
  if (typeof parameters.clientId !== "string" || !safeValue(parameters.clientId)
    || typeof parameters.clientSecret !== "string" || !safeValue(parameters.clientSecret)) {
    throw Object.assign(new Error("Antigravity OAuth application parameters are not configured."), {
      code: "OAUTH_CLIENT_NOT_CONFIGURED",
    });
  }
  return { clientId: parameters.clientId, clientSecret: parameters.clientSecret };
}

/** The extension callback shape is kept independent of any Pi extension registration. */
export interface OAuthLoginCallbacks {
  client?: OAuthClientParameters;
  onAuth(info: { url: string; instructions?: string }): void;
  onPrompt?(prompt: { message: string; placeholder?: string; allowEmpty?: boolean }): Promise<string>;
  onManualCodeInput?(): Promise<string>;
  signal?: AbortSignal;
}

const CALLBACK_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function operationSignal(signal?: AbortSignal, timeout = OAUTH_REQUEST_TIMEOUT_MS): AbortSignal {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
}

function safeValue(value: string | null): value is string {
  return value !== null && value.length > 0 && value.length <= 4096 && !/[\p{C}\s]/u.test(value);
}

/** Validate the same callback URL for both loopback and explicitly pasted responses. */
export function parsePastedCallback(raw: string, expectedState: string): { code: string; state: string } {
  const text = raw.trim();
  if (!text || text.length > 8192) throw new Error("Paste the complete OAuth callback URL");
  const url = text.startsWith("?") || text.startsWith("state=") || text.startsWith("code=")
    ? new URL(`${REDIRECT_URI}?${text.replace(/^\?/, "")}`)
    : new URL(text);
  if (url.protocol !== "http:" || url.username || url.password || url.hash
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.port !== "51121" || url.pathname !== "/oauth-callback") {
    throw new Error("The OAuth callback URL is not the expected loopback address");
  }
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (seen.has(key) || !safeValue(key) || value.length > 4096 || /[\p{C}]/u.test(value)) {
      throw new Error("The OAuth callback parameters are invalid");
    }
    seen.add(key);
  }
  const state = url.searchParams.get("state");
  if (state !== expectedState) throw new Error("OAuth state mismatch");
  if (url.searchParams.has("error")) throw new Error("Google rejected OAuth authorization");
  const code = url.searchParams.get("code");
  if (!safeValue(code)) throw new Error("The OAuth callback is missing its authorization code");
  return { code, state };
}

async function startCallbackServer(expectedState: string): Promise<{
  waitForCode: () => Promise<{ code: string; state: string }>;
  cleanup: () => void;
}> {
  let settled = false;
  let resolveCode!: (value: { code: string; state: string }) => void;
  let rejectCode!: (error: Error) => void;
  const codePromise = new Promise<{ code: string; state: string }>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  void codePromise.catch(() => {});
  const server = createServer((request, response) => {
    const reply = (status: number, text: string) => {
      response.writeHead(status, CALLBACK_HEADERS);
      response.end(text);
    };
    if (request.method !== "GET") return reply(405, "Method not allowed");
    if (!["localhost:51121", "127.0.0.1:51121", "[::1]:51121"].includes(request.headers.host ?? "")) {
      return reply(400, "Invalid callback host");
    }
    if (settled) return reply(409, "This login callback has already been consumed");
    let callback: { code: string; state: string };
    try {
      callback = parsePastedCallback(new URL(request.url ?? "", REDIRECT_URI).toString(), expectedState);
    } catch {
      // Unrelated or malformed requests must not consume a pending login.
      return reply(400, "The OAuth callback was not accepted. Return to DeepSeek Harness.");
    }
    settled = true;
    resolveCode(callback);
    reply(200, "Authorization complete. Return to DeepSeek Harness.");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(51121, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  return {
    waitForCode: () => codePromise,
    cleanup: () => {
      if (!settled) {
        settled = true;
        rejectCode(new Error("OAuth callback cancelled"));
      }
      server.closeAllConnections();
      server.close();
    },
  };
}

async function acquireAuthCode(
  expectedState: string,
  waitForCode: () => Promise<{ code: string; state: string }>,
  callbacks: OAuthLoginCallbacks,
  signal: AbortSignal,
): Promise<{ code: string; state: string }> {
  const settled = new AbortController();
  const candidates = [waitForCode()];
  if (callbacks.onPrompt || callbacks.onManualCodeInput) {
    candidates.push((async () => {
      let message = "After Google sign-in, paste the full localhost callback URL if the browser cannot reach this Host.";
      while (true) {
        signal.throwIfAborted();
        settled.signal.throwIfAborted();
        const raw = callbacks.onPrompt
          ? await callbacks.onPrompt({ message, placeholder: `${REDIRECT_URI}?state=…&code=…` })
          : await callbacks.onManualCodeInput!();
        signal.throwIfAborted();
        settled.signal.throwIfAborted();
        try {
          return parsePastedCallback(raw, expectedState);
        } catch {
          message = "Invalid callback. Paste the complete URL from this pending Google sign-in.";
        }
      }
    })());
  }
  let removeAbort = () => {};
  candidates.push(new Promise<never>((_resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else {
      signal.addEventListener("abort", abort, { once: true });
      removeAbort = () => signal.removeEventListener("abort", abort);
    }
  }));
  for (const candidate of candidates) void candidate.catch(() => {});
  try {
    return await Promise.race(candidates);
  } finally {
    settled.abort();
    removeAbort();
  }
}

function requireProject(projectId: unknown): string {
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("Google returned no Antigravity project. Sign in with an account that has access.");
  }
  return projectId;
}

function tokenData(value: unknown): { access_token: string; expires_in: number; refresh_token?: string } {
  const data = value as { access_token?: unknown; expires_in?: unknown; refresh_token?: unknown } | null;
  if (!data || typeof data.access_token !== "string" || !safeValue(data.access_token)
    || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in)
    || data.expires_in <= 0 || data.expires_in > 31_536_000
    || (data.refresh_token !== undefined && (typeof data.refresh_token !== "string" || !safeValue(data.refresh_token)))) {
    throw new Error("Google returned an invalid OAuth token response");
  }
  return data as { access_token: string; expires_in: number; refresh_token?: string };
}

async function readOAuthJson(response: Response): Promise<unknown> {
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 64 * 1024) throw new Error("Google OAuth response exceeded its byte limit");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function refreshFailure(response: Response): Promise<Error> {
  let payload: unknown;
  try { payload = await readOAuthJson(response); } catch { /* Report only the safe status below. */ }
  if (payload && typeof payload === "object" && "error" in payload && payload.error === "invalid_grant") {
    return Object.assign(new Error("The Antigravity grant is no longer valid. Sign in again."), {
      code: "OAUTH_INVALID_GRANT",
    });
  }
  return new Error(`Antigravity token refresh failed (HTTP ${response.status})`);
}

async function getUserEmail(token: string, signal: AbortSignal): Promise<string | undefined> {
  try {
    const response = await globalThis.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${token}` }, signal: operationSignal(signal), redirect: "error",
    });
    if (!response.ok) return undefined;
    const data = await readOAuthJson(response) as { email?: unknown };
    return typeof data.email === "string" ? data.email : undefined;
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}

/** Run one PKCE grant flow without opening browsers or storing any credential. */
export async function loginAntigravity(callbacks: OAuthLoginCallbacks): Promise<AntigravityOAuthCredentials> {
  const client = resolveClient(callbacks.client);
  const signal = operationSignal(callbacks.signal, OAUTH_CALLBACK_TIMEOUT_MS);
  signal.throwIfAborted();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(32).toString("base64url");
  let listener: Awaited<ReturnType<typeof startCallbackServer>> | undefined;
  try {
    listener = await startCallbackServer(state);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EADDRINUSE"
      && (callbacks.onPrompt || callbacks.onManualCodeInput))) throw error;
  }
  try {
    signal.throwIfAborted();
    const params = new URLSearchParams({
      client_id: client.clientId, response_type: "code", redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "), code_challenge: challenge, code_challenge_method: "S256",
      state, access_type: "offline", prompt: "consent",
    });
    callbacks.onAuth({
      url: `${AUTH_URL}?${params}`,
      instructions: "Complete Google sign-in, then return here or paste the localhost callback URL.",
    });
    const { code } = await acquireAuthCode(state,
      listener?.waitForCode ?? (() => new Promise<never>(() => {})), callbacks, signal);
    const response = await globalThis.fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret,
        code, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code_verifier: verifier }),
      signal: operationSignal(signal), redirect: "error",
    });
    if (!response.ok) throw new Error(`Google OAuth token exchange failed (HTTP ${response.status})`);
    const data = tokenData(await readOAuthJson(response));
    if (!data.refresh_token) throw new Error("Google did not return an offline refresh token");
    const [email, project] = await Promise.all([
      getUserEmail(data.access_token, signal), loadCodeAssist(data.access_token, signal),
    ]);
    signal.throwIfAborted();
    return { refresh: data.refresh_token, access: data.access_token,
      expires: Date.now() + data.expires_in * 1000 - Math.min(300_000, data.expires_in * 100),
      projectId: requireProject(project), ...(email === undefined ? {} : { email }) };
  } finally {
    listener?.cleanup();
  }
}

/** Refresh only the supplied grant. The Host owns locking, rotation persistence, and logout. */
export async function refreshAntigravityToken(
  credentials: OAuthCredentials,
  signal?: AbortSignal,
  application?: OAuthClientParameters,
): Promise<AntigravityOAuthCredentials> {
  const client = resolveClient(application);
  const operation = operationSignal(signal);
  operation.throwIfAborted();
  const response = await globalThis.fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret,
      refresh_token: credentials.refresh, grant_type: "refresh_token" }),
    signal: operation, redirect: "error",
  });
  if (!response.ok) {
    const error = await refreshFailure(response);
    operation.throwIfAborted();
    throw error;
  }
  const data = tokenData(await readOAuthJson(response));
  const existingProject = (credentials as AntigravityOAuthCredentials).projectId;
  const project = existingProject || await loadCodeAssist(data.access_token, operation);
  operation.throwIfAborted();
  return { ...credentials, refresh: data.refresh_token || credentials.refresh, access: data.access_token,
    expires: Date.now() + data.expires_in * 1000 - Math.min(300_000, data.expires_in * 100),
    projectId: requireProject(project) };
}

export function getApiKey(credentials: OAuthCredentials): string {
  return JSON.stringify({ token: credentials.access,
    projectId: requireProject((credentials as AntigravityOAuthCredentials).projectId) });
}
