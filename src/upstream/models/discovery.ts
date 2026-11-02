import { fetchAvailableModelsCatalog, parseApiKey } from "../client/client.js";
import { buildAntigravityCatalog, type AntigravityCatalog } from "./grouping.js";
import {
  ANTIGRAVITY_MODELS, ANTIGRAVITY_ROUTING, registerDiscoveredModelEnums, snapshotDynamicModelEnums,
} from "./models.js";

/** Discover model metadata without owning Host persistence, refresh policy, or credentials. */
export async function discoverAntigravityModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<AntigravityCatalog> {
  signal?.throwIfAborted();
  const credentials = parseApiKey(apiKey);
  const available = await fetchAvailableModelsCatalog(credentials.token, credentials.projectId, signal);
  signal?.throwIfAborted();
  const models = available.data.models;
  if (!models || Object.keys(models).length === 0) {
    throw new Error("Antigravity returned an empty or unrecognized model catalog");
  }
  registerDiscoveredModelEnums(models);
  const catalog = buildAntigravityCatalog(models, {
    models: ANTIGRAVITY_MODELS,
    routing: { ...ANTIGRAVITY_ROUTING },
  }, available.data.agentModelSorts);
  return { ...catalog, modelEnums: snapshotDynamicModelEnums() };
}
