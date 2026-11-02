import { antigravityHeaders, endpointCandidates } from "./client.js";
import { antigravityFetch } from "../utils/http.js";
import type { AntigravityApiKey } from "../types/types.js";

const OPERATIONS = new Set([
  "streamGenerateContent", "generateContent", "fetchAvailableModels", "loadCodeAssist",
]);
export type AntigravityOperation =
  | "streamGenerateContent" | "generateContent" | "fetchAvailableModels" | "loadCodeAssist";

/** Send provider JSON with the active grant, leaving response decoding to the caller. */
export async function requestAntigravity(
  operation: AntigravityOperation,
  body: Record<string, unknown>,
  credentials: AntigravityApiKey,
  options: { signal?: AbortSignal } = {},
): Promise<Response> {
  if (!OPERATIONS.has(operation)) throw new Error("Unsupported Antigravity operation");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Antigravity body must be a JSON object");
  if (typeof credentials?.token !== "string" || !credentials.token.trim()
    || /[\p{C}\s]/u.test(credentials.token)
    || typeof credentials.projectId !== "string" || !credentials.projectId.trim()) {
    throw new Error("Antigravity requires an active token and discovered project");
  }
  options.signal?.throwIfAborted();
  const endpoint = endpointCandidates()[0];
  const suffix = operation === "streamGenerateContent" ? "?alt=sse" : "";
  return antigravityFetch(`${endpoint}/v1internal:${operation}${suffix}`, {
    method: "POST",
    headers: antigravityHeaders(credentials.token),
    body: JSON.stringify({ ...body, project: credentials.projectId }),
    signal: options.signal,
  });
}
