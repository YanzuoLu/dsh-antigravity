// dsh-antigravity. MIT license and upstream attribution in LICENSE and UPSTREAM.md.

// index.js
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";

// lib/adapter.js
import { AsyncLocalStorage as AsyncLocalStorage2 } from "node:async_hooks";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { LlmError, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";

// lib/core.js
import {
  calculateCost,
  createAssistantMessageEventStream
} from "@earendil-works/pi-ai";
import * as piAi from "@earendil-works/pi-ai";
import { attributionHeaders } from "@deepseek-ai/dsh-llm";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { createHash as createHash2, randomBytes } from "node:crypto";
import { createServer } from "node:http";
var ThinkingEffort = {
  Off: "off",
  Minimal: "minimal",
  Low: "low",
  Medium: "medium",
  High: "high",
  Xhigh: "xhigh"
};
var ToolChoice = {
  Auto: "auto",
  None: "none",
  Any: "any",
  Required: "required"
};
var GeminiToolCallingMode = {
  None: "NONE",
  Any: "ANY",
  Auto: "AUTO",
  Validated: "VALIDATED"
};
var GeminiRole = {
  User: "user",
  Model: "model"
};
var AntigravityRequestType = {
  Agent: "agent"
};
var AntigravityUserAgent = {
  Antigravity: "antigravity"
};
var StopReason = {
  Stop: "stop",
  Length: "length",
  ToolUse: "toolUse",
  Error: "error"
};
var PROVIDER_ID = "antigravity";
var PROVIDER_NAME = "Antigravity";
var ANTIGRAVITY_ROUTING = {
  "claude-opus-4-6": {
    routing: {
      minimal: "claude-opus-4-6-thinking",
      low: "claude-opus-4-6-thinking",
      medium: "claude-opus-4-6-thinking",
      high: "claude-opus-4-6-thinking"
    },
    defaultRequestId: "claude-opus-4-6-thinking"
  },
  // Live fetchAvailableModels exposes `claude-sonnet-4-6` (display: Thinking), not a separate *-thinking id.
  "claude-sonnet-4-6": {
    off: "claude-sonnet-4-6",
    routing: {
      minimal: "claude-sonnet-4-6",
      low: "claude-sonnet-4-6",
      medium: "claude-sonnet-4-6",
      high: "claude-sonnet-4-6",
      xhigh: "claude-sonnet-4-6"
    },
    defaultRequestId: "claude-sonnet-4-6"
  },
  "gemini-3.1-pro": {
    // `gemini-3.1-pro-high` is advertised but currently 400s for agent streamGenerateContent;
    // `gemini-pro-agent` is the working High runtime id (same display name in fetchAvailableModels).
    off: "gemini-3.1-pro-low",
    routing: {
      minimal: "gemini-3.1-pro-low",
      low: "gemini-3.1-pro-low",
      medium: "gemini-3.1-pro-low",
      high: "gemini-pro-agent",
      xhigh: "gemini-pro-agent"
    },
    defaultRequestId: "gemini-3.1-pro-low"
  },
  "gemini-3.8-flash": {
    off: "gemini-3.8-flash-low",
    routing: {
      minimal: "gemini-3.8-flash-low",
      low: "gemini-3.8-flash-low",
      medium: "gemini-3.8-flash-medium",
      high: "gemini-3.8-flash-high",
      xhigh: "gemini-3.8-flash-high"
    },
    defaultRequestId: "gemini-3.8-flash-low"
  },
  "gemini-3.7-flash": {
    off: "gemini-3.7-flash-low",
    routing: {
      minimal: "gemini-3.7-flash-low",
      low: "gemini-3.7-flash-low",
      medium: "gemini-3.7-flash-medium",
      high: "gemini-3.7-flash-high",
      xhigh: "gemini-3.7-flash-high"
    },
    defaultRequestId: "gemini-3.7-flash-low"
  },
  "gemini-3.6-flash": {
    // agy models: gemini-3.6-flash-low / -medium / -high
    off: "gemini-3.6-flash-low",
    routing: {
      minimal: "gemini-3.6-flash-low",
      low: "gemini-3.6-flash-low",
      medium: "gemini-3.6-flash-medium",
      high: "gemini-3.6-flash-high",
      xhigh: "gemini-3.6-flash-high"
    },
    defaultRequestId: "gemini-3.6-flash-low"
  },
  "gemini-3.5-flash": {
    off: "gemini-3.5-flash-extra-low",
    routing: {
      minimal: "gemini-3.5-flash-extra-low",
      low: "gemini-3.5-flash-extra-low",
      medium: "gemini-3.5-flash-low",
      high: "gemini-3-flash-agent",
      xhigh: "gemini-3-flash-agent"
    },
    defaultRequestId: "gemini-3.5-flash-extra-low"
  },
  "gpt-oss-120b": {
    off: "gpt-oss-120b-medium",
    routing: {
      minimal: "gpt-oss-120b-medium",
      low: "gpt-oss-120b-medium",
      medium: "gpt-oss-120b-medium",
      high: "gpt-oss-120b-medium"
    },
    defaultRequestId: "gpt-oss-120b-medium"
  }
};
var RUNTIME_MAX_OUTPUT_TOKENS = {
  "gemini-3.8-flash": 65536,
  "gemini-3.8-flash-low": 65536,
  "gemini-3.8-flash-medium": 65536,
  "gemini-3.8-flash-high": 65536,
  "gemini-3.7-flash": 65536,
  "gemini-3.7-flash-tiered": 65536,
  // Retain rollout-era IDs for compatibility with pinned runtime overrides.
  "gemini-3.7-flash-low": 65536,
  "gemini-3.7-flash-medium": 65536,
  "gemini-3.7-flash-high": 65536,
  "gemini-3.6-flash": 65536,
  "gemini-3.6-flash-low": 65536,
  "gemini-3.6-flash-medium": 65536,
  "gemini-3.6-flash-high": 65536,
  "gemini-3.5-flash": 65536,
  "gemini-3.5-flash-extra-low": 65536,
  "gemini-3.5-flash-low": 65536,
  "gemini-3-flash-agent": 65536,
  "gemini-3.1-pro": 65535,
  "gemini-3.1-pro-low": 65535,
  "gemini-3.1-pro-high": 65535,
  "gemini-pro-agent": 65535,
  "claude-opus-4-6": 64e3,
  "claude-opus-4-6-thinking": 64e3,
  "claude-sonnet-4-6": 64e3,
  "gpt-oss-120b": 32768,
  "gpt-oss-120b-medium": 32768
};
function getMaxOutputTokens(modelId, runtimeModel) {
  const discovered = currentModels.find((model) => model.id === modelId);
  if (currentModels !== ANTIGRAVITY_MODELS && discovered) return discovered.maxTokens;
  if (runtimeModel && RUNTIME_MAX_OUTPUT_TOKENS[runtimeModel] !== void 0) {
    return RUNTIME_MAX_OUTPUT_TOKENS[runtimeModel];
  }
  if (RUNTIME_MAX_OUTPUT_TOKENS[modelId] !== void 0) {
    return RUNTIME_MAX_OUTPUT_TOKENS[modelId];
  }
  if (runtimeModel) {
    if (runtimeModel.startsWith("claude-")) return 64e3;
    if (runtimeModel.startsWith("gpt-oss-")) return 32768;
    if (runtimeModel.startsWith("gemini-3.1-pro") || runtimeModel === "gemini-pro-agent")
      return 65535;
    if (runtimeModel.startsWith("gemini-")) return 65536;
  }
  return 8192;
}
var geminiFlashCost = { input: 0.1, output: 0.4, cacheRead: 0.025, cacheWrite: 0.1 };
var geminiProCost = { input: 1.25, output: 5, cacheRead: 0.3125, cacheWrite: 1.25 };
var claudeSonnetCost = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 };
var claudeOpusCost = { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 };
var gptOssCost = { input: 0.6, output: 2.4, cacheRead: 0.15, cacheWrite: 0.6 };
var thinkingLevelMaps = {
  lowMediumHigh: {
    off: null,
    minimal: null,
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: null,
    max: null
  },
  lowHigh: {
    off: null,
    minimal: null,
    low: "low",
    medium: null,
    high: "high",
    xhigh: null,
    max: null
  },
  thinking: {
    off: null,
    minimal: null,
    low: null,
    medium: null,
    high: "high",
    xhigh: null,
    max: null
  },
  medium: {
    off: null,
    minimal: null,
    low: null,
    medium: "medium",
    high: null,
    xhigh: null,
    max: null
  }
};
var ANTIGRAVITY_MODELS = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.lowMediumHigh,
    input: ["text", "image"],
    cost: geminiFlashCost,
    contextWindow: 1048576,
    maxTokens: 65536
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.lowMediumHigh,
    input: ["text", "image"],
    cost: geminiFlashCost,
    contextWindow: 1048576,
    maxTokens: 65536
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.lowMediumHigh,
    input: ["text", "image"],
    cost: geminiFlashCost,
    contextWindow: 1048576,
    maxTokens: 65536
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6 (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.thinking,
    input: ["text", "image"],
    cost: claudeOpusCost,
    contextWindow: 25e4,
    maxTokens: 64e3
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.thinking,
    input: ["text", "image"],
    cost: claudeSonnetCost,
    contextWindow: 2e5,
    maxTokens: 64e3
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.lowHigh,
    input: ["text", "image"],
    cost: geminiProCost,
    contextWindow: 1048576,
    maxTokens: 65535
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.lowMediumHigh,
    input: ["text", "image"],
    cost: geminiFlashCost,
    contextWindow: 1048576,
    maxTokens: 65536
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B (Antigravity)",
    reasoning: true,
    thinkingLevelMap: thinkingLevelMaps.medium,
    input: ["text"],
    cost: gptOssCost,
    contextWindow: 131072,
    maxTokens: 32768
  }
];
var currentModels = ANTIGRAVITY_MODELS;
var currentRouting = { ...ANTIGRAVITY_ROUTING };
function getCurrentAntigravityRouting() {
  return currentRouting;
}
function applyAntigravityCatalog(catalog) {
  const modelEnums = catalog.modelEnums ?? {};
  if (typeof modelEnums !== "object" || modelEnums === null || Array.isArray(modelEnums) || Object.entries(modelEnums).some(([id, value]) => !/^[a-z0-9][a-z0-9_.-]{0,255}$/i.test(id) || typeof value !== "string" || value.length === 0 || value.length > 512 || /[\p{C}\s]/u.test(value))) {
    throw new TypeError("Antigravity catalog contains invalid model enums");
  }
  restoreDynamicModelEnums(modelEnums);
  currentModels = catalog.models;
  currentRouting = catalog.routing;
}
function getAntigravityRequestModelId(modelId, effort) {
  const r = currentRouting[modelId] ?? ANTIGRAVITY_ROUTING[modelId];
  if (!r) return modelId;
  if (effort === void 0 || effort === "off") {
    return r.off ?? r.routing?.minimal ?? r.routing?.low ?? r.defaultRequestId ?? modelId;
  }
  const effortKey = effort;
  if (effortKey === ThinkingEffort.Xhigh) {
    return r.routing?.xhigh ?? r.routing?.high ?? r.routing?.low ?? r.routing?.minimal ?? r.off ?? r.defaultRequestId ?? modelId;
  }
  return r.routing?.[effortKey] ?? r.routing?.low ?? r.routing?.minimal ?? r.off ?? r.defaultRequestId ?? modelId;
}
function getFallbackRuntimeModel(runtimeModel, effort) {
  if (runtimeModel.startsWith("gemini-3.8-flash-")) {
    return runtimeModel.replace("gemini-3.8-flash-", "gemini-3.7-flash-");
  }
  if (runtimeModel === "gemini-3.8-flash") {
    return "gemini-3.7-flash-low";
  }
  if (runtimeModel === "gemini-3.7-flash-tiered") {
    return getAntigravityRequestModelId("gemini-3.6-flash", effort);
  }
  if (runtimeModel.startsWith("gemini-3.7-flash-")) {
    return runtimeModel.replace("gemini-3.7-flash-", "gemini-3.6-flash-");
  }
  if (runtimeModel === "gemini-3.7-flash") {
    return "gemini-3.6-flash-low";
  }
  return void 0;
}
var ANTIGRAVITY_MODEL_ENUM = {
  // Gemini 3.8 Flash
  "gemini-3.8-flash": "MODEL_PLACEHOLDER_M318",
  "gemini-3.8-flash-high": "MODEL_PLACEHOLDER_M318",
  "gemini-3.8-flash-medium": "MODEL_PLACEHOLDER_M319",
  "gemini-3.8-flash-low": "MODEL_PLACEHOLDER_M320",
  "gemini-3.8-flash-tiered": "MODEL_PLACEHOLDER_M322",
  // Gemini 3.7 Flash
  "gemini-3.7-flash": "MODEL_PLACEHOLDER_M298",
  "gemini-3.7-flash-high": "MODEL_PLACEHOLDER_M298",
  "gemini-3.7-flash-medium": "MODEL_PLACEHOLDER_M299",
  "gemini-3.7-flash-low": "MODEL_PLACEHOLDER_M300",
  "gemini-3.7-flash-tiered": "MODEL_PLACEHOLDER_M301",
  // Gemini 3.6 Flash
  "gemini-3.6-flash": "MODEL_PLACEHOLDER_M71",
  "gemini-3.6-flash-high": "MODEL_PLACEHOLDER_M71",
  "gemini-3.6-flash-medium": "MODEL_PLACEHOLDER_M72",
  "gemini-3.6-flash-low": "MODEL_PLACEHOLDER_M73",
  "gemini-3.6-flash-tiered": "MODEL_PLACEHOLDER_M196",
  // Gemini 3.5 Flash
  "gemini-3.5-flash": "MODEL_PLACEHOLDER_M20",
  "gemini-3.5-flash-extra-low": "MODEL_PLACEHOLDER_M187",
  "gemini-3.5-flash-low": "MODEL_PLACEHOLDER_M20",
  "gemini-3-flash-agent": "MODEL_PLACEHOLDER_M84",
  // Gemini 3.1 Pro
  "gemini-3.1-pro": "MODEL_PLACEHOLDER_M36",
  "gemini-3.1-pro-low": "MODEL_PLACEHOLDER_M36",
  "gemini-3.1-pro-high": "MODEL_PLACEHOLDER_M37",
  "gemini-pro-agent": "MODEL_PLACEHOLDER_M16",
  // Claude
  "claude-sonnet-4-6": "MODEL_PLACEHOLDER_M35",
  "claude-opus-4-6": "MODEL_PLACEHOLDER_M26",
  "claude-opus-4-6-thinking": "MODEL_PLACEHOLDER_M26",
  // GPT-OSS
  "gpt-oss-120b": "MODEL_OPENAI_GPT_OSS_120B_MEDIUM",
  "gpt-oss-120b-medium": "MODEL_OPENAI_GPT_OSS_120B_MEDIUM"
};
var modelEnumCache = /* @__PURE__ */ new Map();
function registerModelEnum(wireModelId, modelEnum) {
  if (wireModelId && modelEnum) {
    modelEnumCache.set(wireModelId, modelEnum);
  }
}
function registerDiscoveredModelEnums(models) {
  if (!models) return;
  for (const [wireId, info] of Object.entries(models)) {
    if (typeof info?.model === "string" && info.model) {
      modelEnumCache.set(wireId, info.model);
    }
  }
}
function getModelEnum(wireModelId) {
  const direct = modelEnumCache.get(wireModelId) || ANTIGRAVITY_MODEL_ENUM[wireModelId];
  if (direct) return direct;
  const routed = getAntigravityRequestModelId(wireModelId, void 0);
  return modelEnumCache.get(routed) || ANTIGRAVITY_MODEL_ENUM[routed];
}
function snapshotDynamicModelEnums() {
  return Object.fromEntries(modelEnumCache);
}
function restoreDynamicModelEnums(modelEnums) {
  modelEnumCache.clear();
  for (const [wireModelId, modelEnum] of Object.entries(modelEnums)) {
    if (wireModelId && modelEnum) modelEnumCache.set(wireModelId, modelEnum);
  }
}
function getThinkingConfig(modelId, effort) {
  if (modelId.startsWith("claude-")) {
    if (!effort || effort === "off") return { includeThoughts: false, thinkingBudget: 0 };
    return { includeThoughts: true, thinkingBudget: 1024 };
  }
  if (modelId.startsWith("gpt-oss-")) {
    if (!effort || effort === "off") return { includeThoughts: false, thinkingBudget: 0 };
    return { includeThoughts: true, thinkingBudget: 8192 };
  }
  if (modelId.startsWith("gemini-3.5-flash") || modelId === "gemini-3-flash-agent") {
    if (!effort || effort === "off") return { includeThoughts: false, thinkingBudget: 0 };
    const thinkingBudget = effort === "high" || effort === "xhigh" ? 1e4 : effort === "medium" ? 4e3 : 1e3;
    return { includeThoughts: true, thinkingBudget };
  }
  if (modelId.startsWith("gemini-3.1-pro") || modelId === "gemini-pro-agent") {
    if (!effort || effort === "off") return { includeThoughts: false, thinkingBudget: 0 };
    return {
      includeThoughts: true,
      thinkingBudget: effort === "high" || effort === "xhigh" ? 10001 : 1001
    };
  }
  if (modelId.includes("argon") || modelId.startsWith("gemini-4")) {
    if (!effort || effort === "off") return void 0;
    const thinkingBudget = effort === "high" || effort === "xhigh" ? -1 : effort === "medium" ? 4e3 : 1e3;
    return { includeThoughts: true, thinkingBudget };
  }
  if (modelId.startsWith("gemini-")) {
    if (!effort || effort === "off") return { includeThoughts: false, thinkingBudget: 0 };
    const thinkingBudget = effort === "high" || effort === "xhigh" ? -1 : effort === "medium" ? 4e3 : 1e3;
    return { includeThoughts: true, thinkingBudget };
  }
  return void 0;
}
function antigravityEnv(name2) {
  return process.env[`ANTIGRAVITY_${name2}`] || process.env[`NOAGY_${name2}`];
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asString(value) {
  return typeof value === "string" && value ? value : void 0;
}
function sanitizeText(text) {
  const str = String(text ?? "");
  const toWellFormed = str.toWellFormed;
  if (typeof toWellFormed === "function") {
    return toWellFormed.call(str);
  }
  return str.replace(
    /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF]))|(?:(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g,
    "\uFFFD"
  );
}
function stableUuid(seed) {
  const bytes = createHash("sha1").update(seed).digest().subarray(0, 16);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function toInt64SessionId(seed) {
  if (seed?.trim()) {
    const s = seed.trim();
    if (/^-?\d+$/.test(s)) {
      const value = BigInt(s);
      if (value >= -(1n << 63n) && value <= (1n << 63n) - 1n) return s;
    }
    const hash = createHash("sha256").update(`antigravity:session:${s}`).digest();
    return String(new DataView(hash.buffer, hash.byteOffset, 8).getBigInt64(0, true));
  }
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return String(new DataView(bytes.buffer, bytes.byteOffset, 8).getBigInt64(0, true));
}
var sessionTrajectoryMap = /* @__PURE__ */ new Map();
function resolveSessionTrajectory(context, sessionId) {
  if (sessionId?.trim()) {
    const seed2 = `session:${sessionId.trim()}`;
    let entry2 = sessionTrajectoryMap.get(seed2);
    if (!entry2) {
      entry2 = {
        conversationId: stableUuid(`antigravity:conv:${seed2}`),
        trajectoryId: stableUuid(`antigravity:traj:${seed2}`),
        sessionId: toInt64SessionId(sessionId)
      };
      sessionTrajectoryMap.set(seed2, entry2);
      if (sessionTrajectoryMap.size > 64) {
        const oldestKey = sessionTrajectoryMap.keys().next().value;
        if (oldestKey !== void 0) sessionTrajectoryMap.delete(oldestKey);
      }
    }
    return entry2;
  }
  const firstMsg = context?.messages?.[0];
  if (!firstMsg) {
    return {
      conversationId: crypto.randomUUID(),
      trajectoryId: crypto.randomUUID(),
      sessionId: toInt64SessionId()
    };
  }
  const contentSeed = typeof firstMsg.content === "string" ? firstMsg.content.slice(0, 64) : Array.isArray(firstMsg.content) ? JSON.stringify(firstMsg.content[0] ?? "").slice(0, 64) : "";
  const seed = `${firstMsg.role || "user"}:${firstMsg.timestamp || ""}:${contentSeed}`;
  let entry = sessionTrajectoryMap.get(seed);
  if (!entry) {
    entry = {
      conversationId: stableUuid(`antigravity:conv:${seed}`),
      trajectoryId: stableUuid(`antigravity:traj:${seed}`),
      sessionId: toInt64SessionId(seed)
    };
    sessionTrajectoryMap.set(seed, entry);
    if (sessionTrajectoryMap.size > 64) {
      const oldestKey = sessionTrajectoryMap.keys().next().value;
      if (oldestKey !== void 0) sessionTrajectoryMap.delete(oldestKey);
    }
  }
  return entry;
}
function antigravityRequestEnvelope(wireModelId, optionsOrIsClaude = false) {
  const options = typeof optionsOrIsClaude === "boolean" ? { isClaude: optionsOrIsClaude } : optionsOrIsClaude;
  const isClaude = Boolean(options.isClaude);
  const isNonGemini = Boolean(options.isNonGemini || isClaude);
  const step = Math.max(1, options.step ?? 1);
  const lastStepIndex = options.lastStepIndex ?? String(Math.max(0, step - 1));
  const requestIndex = options.requestIndex ?? options.userTurnIndex ?? Math.max(0, step - 1);
  const agentId = options.conversationId || crypto.randomUUID();
  const trajectoryId = options.trajectoryId || crypto.randomUUID();
  const sessionId = options.sessionId || toInt64SessionId();
  const claudeLabel = isClaude ? "true" : "false";
  const nonGeminiLabel = isNonGemini ? "true" : "false";
  const labels = {
    last_step_index: lastStepIndex,
    request_id: `${trajectoryId}-${requestIndex}`,
    trajectory_id: trajectoryId,
    used_claude: claudeLabel,
    used_claude_conservative: claudeLabel,
    used_non_gemini_model: nonGeminiLabel
  };
  const modelEnum = getModelEnum(wireModelId);
  if (modelEnum) {
    labels.model_enum = modelEnum;
  }
  if (step > 1) {
    labels.last_execution_id = options.lastExecutionId || stableUuid(`antigravity:exec:${trajectoryId}:${step - 1}`);
  }
  return {
    requestId: `agent/${agentId}/${Date.now()}/${trajectoryId}/${step}`,
    sessionId,
    labels
  };
}
var ALLOWED_API_HOST_SUFFIXES = [".googleapis.com", ".sandbox.googleapis.com"];
function assertSafeApiBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid ANTIGRAVITY_BASE_URL: ${raw}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`ANTIGRAVITY_BASE_URL must use https (got ${url.protocol})`);
  }
  if (url.username || url.password) {
    throw new Error("ANTIGRAVITY_BASE_URL must not include credentials");
  }
  const host = url.hostname.toLowerCase();
  const allowed = host === "googleapis.com" || ALLOWED_API_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  if (!allowed) {
    throw new Error(
      `ANTIGRAVITY_BASE_URL host "${host}" is not allowed. Use a *.googleapis.com endpoint.`
    );
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path === "/" ? "" : path}`;
}
function redactSecrets(text) {
  return text.replace(/\bya29\.[A-Za-z0-9._~+/-]+=*/g, "[redacted-access-token]").replace(/\b1\/[A-Za-z0-9_-]{20,}/g, "[redacted-refresh-token]").replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]").replace(
    /("?(?:access_token|refresh_token|id_token|token|client_secret|code_verifier|authorization)"?\s*[:=]\s*")[^"]*(")/gi,
    "$1[redacted]$2"
  ).replace(
    /("?(?:access_token|refresh_token|id_token|token|client_secret|code_verifier|authorization)"?\s*[:=]\s*)[^\s&,}]+/gi,
    "$1[redacted]"
  );
}
var VALIDATION_URL_HOST = "accounts.google.com";
function safeValidationUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 || /\s/.test(value))
    return void 0;
  let url;
  try {
    url = new URL(value);
  } catch {
    return void 0;
  }
  if (url.protocol !== "https:" || url.username || url.password) return void 0;
  if (url.hostname !== VALIDATION_URL_HOST) return void 0;
  return url.toString();
}
function extractValidationUrl(text) {
  try {
    const parsed = JSON.parse(text);
    const details = parsed.error?.details;
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (!isRecord(detail) || !isRecord(detail.metadata)) continue;
        const safe = safeValidationUrl(detail.metadata.validation_url);
        if (safe) return safe;
      }
    }
  } catch {
  }
  const match = text.match(/https:\/\/accounts\.google\.com\/[^\s"'<>\\]+/);
  return match ? safeValidationUrl(match[0].replace(/[),.;]+$/, "")) : void 0;
}
function stripValidationUrls(text) {
  return text.replace(/https:\/\/accounts\.google\.com\/[^\s"'<>\\]+/g, "[redacted-validation-url]").replace(
    / Open this link in a browser signed in to the same Google account to verify: \[redacted-validation-url\]/g,
    ""
  );
}
function safeError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSecrets(raw);
}
var storage = new AsyncLocalStorage();
var lastSnapshot = {};
function currentBag() {
  return storage.getStore() ?? lastSnapshot;
}
async function runWithDiagnostics(fn) {
  const bag = {};
  return storage.run(bag, async () => {
    try {
      return await fn();
    } finally {
      lastSnapshot = { ...bag };
    }
  });
}
function getCurrentEndpoint() {
  return currentBag().endpoint;
}
function getCurrentMatchedModelDebug() {
  return currentBag().matchedModelDebug;
}
function getCurrentAvailableModels() {
  return currentBag().availableModels;
}
function setLastStatus(status) {
  currentBag().status = status;
}
function setLastEndpoint(endpoint) {
  currentBag().endpoint = endpoint;
}
function setLastError(error) {
  currentBag().error = error === void 0 ? void 0 : stripValidationUrls(redactSecrets(error)).slice(0, 800);
}
function setLastProjectId(projectId) {
  currentBag().projectId = projectId;
}
function setLastResolvedRuntimeModel(model) {
  currentBag().resolvedRuntimeModel = model;
}
function setLastAvailableModels(models) {
  currentBag().availableModels = models;
}
function setLastMatchedModelDebug(debug) {
  currentBag().matchedModelDebug = debug === void 0 ? void 0 : redactSecrets(debug).slice(0, 1200);
}
function setLastLatencyMs(ms) {
  currentBag().latencyMs = ms;
}
function setLastToolSchemaWarnings(warnings) {
  currentBag().toolSchemaWarnings = warnings === void 0 ? void 0 : redactSecrets(warnings.join(" | ")).slice(0, 1200);
}
async function antigravityFetch(input, init = {}) {
  return globalThis.fetch(input, { ...init, redirect: "error" });
}
var DEFAULT_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com";
var ENDPOINT_FALLBACKS = [
  DEFAULT_ENDPOINT,
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
  "https://cloudcode-pa.googleapis.com"
];
var PROJECT_CACHE_TTL_MS = 30 * 60 * 1e3;
var projectCache = /* @__PURE__ */ new Map();
var MODEL_CACHE_TTL_MS = 30 * 60 * 1e3;
var modelCache = /* @__PURE__ */ new Map();
var DISCOVERY_TIMEOUT_MS = 8e3;
var inFlightModelLookups = /* @__PURE__ */ new Map();
function endpointCandidates() {
  const explicit = antigravityEnv("BASE_URL")?.trim();
  return explicit ? [assertSafeApiBaseUrl(explicit)] : ENDPOINT_FALLBACKS;
}
var DEFAULT_USER_AGENT = "antigravity/cli/1.4.0 (aidev_client; os_type=linux; arch=amd64; cl=982146307; auth_method=consumer)";
function defaultUserAgent() {
  return DEFAULT_USER_AGENT;
}
function antigravityHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": antigravityEnv("USER_AGENT") || defaultUserAgent(),
    "X-DeepSeek-Harness-Attribution": attributionHeaders()["user-agent"]
  };
}
function jsonOrTextError(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed.error?.message) return parsed.error.message;
  } catch {
  }
  return text;
}
function parseApiKey(apiKeyRaw) {
  if (!apiKeyRaw) {
    throw new Error("No Antigravity OAuth credentials. Sign in to Antigravity through DSH credentials.");
  }
  try {
    const parsed = JSON.parse(apiKeyRaw);
    if (typeof parsed?.token !== "string" || !parsed.token.trim() || /[\p{C}\s]/u.test(parsed.token) || typeof parsed.projectId !== "string" || !parsed.projectId.trim()) {
      throw new Error("missing token or discovered project");
    }
    return { token: parsed.token, projectId: parsed.projectId };
  } catch (error) {
    throw new Error(
      `Invalid Antigravity credentials. Sign in to Antigravity through DSH credentials. (${safeError(error)})`,
      { cause: error }
    );
  }
}
function extractProjectId(data) {
  if (!isRecord(data)) return void 0;
  const direct = data.antigravityProjectId ?? data.projectId ?? data.backendProjectId ?? data.userDefinedCloudaicompanionProject ?? data.cloudaicompanionProject ?? data.project;
  const directId = asString(direct);
  if (directId) return directId;
  if (isRecord(direct)) {
    const nestedId = asString(direct.id);
    if (nestedId) return nestedId;
  }
  for (const key of ["projects", "projectIds", "cloudaicompanionProjects"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = extractProjectId(item);
        if (nested) return nested;
        const itemId = asString(item);
        if (itemId) return itemId;
      }
    }
  }
  return void 0;
}
function collectModelLabels(value, out = []) {
  if (!value || out.length > 50) return out;
  if (typeof value === "string") {
    if (/gemini|claude|gpt-oss/i.test(value)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectModelLabels(item, out);
    return out;
  }
  if (isRecord(value)) {
    for (const key of ["id", "name", "label", "displayName", "model", "modelId"]) {
      collectModelLabels(value[key], out);
    }
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") collectModelLabels(nested, out);
    }
  }
  return out;
}
function summarizeModelCandidate(value) {
  if (!isRecord(value)) return String(value ?? "none");
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/token|auth|credential|secret|email/i.test(key)) continue;
    if (raw === null || ["string", "number", "boolean"].includes(typeof raw)) out[key] = raw;
    else if (Array.isArray(raw)) out[key] = `[array:${String(raw.length)}]`;
    else if (isRecord(raw)) {
      out[key] = `{${Object.keys(raw).slice(0, 12).join(",")}}`;
    }
  }
  return JSON.stringify(out).slice(0, 1200);
}
function isUsableRuntimeModelId(id) {
  return /^[a-z0-9][a-z0-9_.-]*$/i.test(id) && !/\s/.test(id) && !/^MODEL_/i.test(id) && !/^(chat_|tab_)/i.test(id) && !/image/i.test(id);
}
function dynamicModelFromInfo(modelId, info) {
  if (!isRecord(info)) return { id: modelId };
  setLastMatchedModelDebug(summarizeModelCandidate({ modelId, ...info }));
  const experiments = Array.isArray(info.modelExperiments) ? info.modelExperiments.filter((item) => typeof item === "string") : void 0;
  const modelEnum = asString(info.model);
  if (modelEnum) {
    registerModelEnum(modelId, modelEnum);
  }
  return {
    id: modelId,
    experiments,
    apiProvider: asString(info.apiProvider),
    modelProvider: asString(info.modelProvider),
    model: modelEnum
  };
}
function findDynamicModel(value, requestedId) {
  if (!value) return void 0;
  if (isRecord(value) && isRecord(value.models)) {
    const modelsMap = value.models;
    if (isUsableRuntimeModelId(requestedId) && requestedId in modelsMap) {
      return dynamicModelFromInfo(requestedId, modelsMap[requestedId]);
    }
    const lowerReq = requestedId.toLowerCase();
    for (const [modelId, info] of Object.entries(modelsMap)) {
      if (modelId.toLowerCase() === lowerReq && isUsableRuntimeModelId(modelId)) {
        return dynamicModelFromInfo(modelId, info);
      }
    }
    for (const [modelId, info] of Object.entries(modelsMap)) {
      if (!isUsableRuntimeModelId(modelId)) continue;
      if (isRecord(info)) {
        const label = info.label ?? info.displayName ?? info.name;
        if (typeof label === "string" && label.toLowerCase() === lowerReq) {
          return dynamicModelFromInfo(modelId, info);
        }
      }
    }
    return void 0;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === requestedId.toLowerCase() && isUsableRuntimeModelId(value) ? { id: value } : void 0;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDynamicModel(item, requestedId);
      if (found) return found;
    }
    return void 0;
  }
  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") {
        const found = findDynamicModel(nested, requestedId);
        if (found) return found;
      }
    }
  }
  return void 0;
}
async function fetchAvailableRuntimeModelUncached(token, projectId, requestedRuntimeModel, signal) {
  const body = JSON.stringify({ project: projectId });
  const endpoints = endpointCandidates();
  let lastLabels = "";
  for (const endpoint of endpoints) {
    signal?.throwIfAborted();
    try {
      const res = await antigravityFetch(`${endpoint}/v1internal:fetchAvailableModels`, {
        method: "POST",
        headers: antigravityHeaders(token),
        body,
        signal: catalogSignal(signal)
      });
      setLastStatus(res.status);
      if (!res.ok) continue;
      setLastEndpoint(endpoint);
      const data = await res.json();
      if (isRecord(data) && isRecord(data.models)) {
        registerDiscoveredModelEnums(data.models);
      }
      const labels = [...new Set(collectModelLabels(data))].slice(0, 16);
      if (labels.length) lastLabels = labels.join(",");
      const found = findDynamicModel(data, requestedRuntimeModel);
      if (found) {
        if (lastLabels) setLastAvailableModels(lastLabels);
        return found;
      }
    } catch (error) {
      setLastError(safeError(error));
    }
  }
  if (lastLabels) setLastAvailableModels(lastLabels);
  return void 0;
}
async function fetchAvailableRuntimeModel(token, projectId, requestedRuntimeModel, signal) {
  signal?.throwIfAborted();
  const cacheKey = `${token}::${projectId}::${requestedRuntimeModel}`;
  const cached = modelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (signal) {
    const result = await fetchAvailableRuntimeModelUncached(token, projectId, requestedRuntimeModel, signal);
    signal.throwIfAborted();
    modelCache.set(cacheKey, { result, expiresAt: Date.now() + MODEL_CACHE_TTL_MS });
    return result;
  }
  const inFlight = inFlightModelLookups.get(cacheKey);
  if (inFlight) return inFlight;
  const promise = fetchAvailableRuntimeModelUncached(token, projectId, requestedRuntimeModel).then(
    (result) => {
      modelCache.set(cacheKey, { result, expiresAt: Date.now() + MODEL_CACHE_TTL_MS });
      return result;
    }
  );
  inFlightModelLookups.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightModelLookups.delete(cacheKey);
    if (modelCache.size > 64) {
      const now = Date.now();
      for (const [key, entry] of modelCache) {
        if (entry.expiresAt <= now) modelCache.delete(key);
      }
    }
  }
}
async function fetchAvailableModelsFromEndpoint(endpoint, token, projectId, signal) {
  try {
    const res = await antigravityFetch(`${endpoint}/v1internal:fetchAvailableModels`, {
      method: "POST",
      headers: antigravityHeaders(token),
      body: JSON.stringify({ project: projectId }),
      signal: catalogSignal(signal)
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const message = isRecord(data) && isRecord(data.error) && typeof data.error.message === "string" ? data.error.message : text;
      setLastError(message);
      return void 0;
    }
    return { endpoint, status: res.status, data };
  } catch (error) {
    setLastError(safeError(error));
    return void 0;
  }
}
function catalogSignal(signal) {
  const timeout = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
function mergeAvailableModelsResults(results) {
  const mergedModels = {};
  let defaultAgentModelId;
  let defaultAgentModel;
  let agentModelSorts;
  let lastEndpoint = "";
  let lastStatus = 0;
  for (const result of results) {
    if (!result || !isRecord(result.data) || !isRecord(result.data.models) || Object.keys(result.data.models).length === 0 || !Object.values(result.data.models).every(isRecord))
      continue;
    setLastEndpoint(result.endpoint);
    setLastStatus(result.status);
    lastEndpoint = result.endpoint;
    lastStatus = result.status;
    const data = result.data;
    if (isRecord(data) && isRecord(data.models)) {
      Object.assign(mergedModels, data.models);
      registerDiscoveredModelEnums(data.models);
    }
    if (isRecord(data) && typeof data.defaultAgentModelId === "string") {
      defaultAgentModelId = data.defaultAgentModelId;
    }
    if (isRecord(data) && typeof data.defaultAgentModel === "string") {
      defaultAgentModel = data.defaultAgentModel;
    }
    if (isRecord(data) && Array.isArray(data.agentModelSorts)) {
      agentModelSorts = data.agentModelSorts;
    }
  }
  if (!lastEndpoint) {
    throw new Error(
      `/v1internal:fetchAvailableModels failed: no endpoint returned a valid non-empty catalog`
    );
  }
  return {
    endpoint: lastEndpoint,
    status: lastStatus,
    data: {
      models: mergedModels,
      defaultAgentModelId,
      defaultAgentModel,
      agentModelSorts
    }
  };
}
async function fetchAvailableModelsCatalog(token, projectId, signal) {
  signal?.throwIfAborted();
  const results = await Promise.all(
    endpointCandidates().map(
      (endpoint) => fetchAvailableModelsFromEndpoint(endpoint, token, projectId, signal)
    )
  );
  signal?.throwIfAborted();
  return mergeAvailableModelsResults(results);
}
async function loadCodeAssistUncached(token, signal) {
  const body = JSON.stringify({
    metadata: {
      ideType: "ANTIGRAVITY"
    }
  });
  for (const endpoint of endpointCandidates()) {
    signal?.throwIfAborted();
    try {
      const res = await antigravityFetch(`${endpoint}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers: antigravityHeaders(token),
        body,
        signal: catalogSignal(signal)
      });
      setLastStatus(res.status);
      setLastEndpoint(endpoint);
      if (!res.ok) continue;
      const project = extractProjectId(await res.json());
      if (project) return project;
    } catch (error) {
      setLastError(safeError(error));
    }
  }
  return void 0;
}
async function loadCodeAssist(token, signal) {
  signal?.throwIfAborted();
  const cached = projectCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    projectCache.delete(token);
    projectCache.set(token, cached);
    return cached.projectId;
  }
  const projectId = await loadCodeAssistUncached(token, signal);
  signal?.throwIfAborted();
  projectCache.set(token, { projectId, expiresAt: Date.now() + PROJECT_CACHE_TTL_MS });
  if (projectCache.size > 32) {
    const oldestKey = projectCache.keys().next().value;
    if (oldestKey !== void 0) projectCache.delete(oldestKey);
  }
  return projectId;
}
function resolveProjectId(opts) {
  const projectId = opts.warmedProject || opts.credentialProjectId;
  if (!projectId?.trim()) throw new Error("Antigravity project discovery is required before model use");
  return projectId;
}
function formatRequestDiagnostics(extra) {
  return `endpoint=${getCurrentEndpoint() || "unknown"}, project=${extra.projectId}, runtimeModel=${extra.runtimeModel}, matched=${getCurrentMatchedModelDebug() || "none"}, available=${getCurrentAvailableModels() || "unknown"}`;
}
var ANTIGRAVITY_API = "antigravity-api";
var CONTINUATION_TEXT = "Continue the active task using the available instructions and context.";
var toolCallCounter = 0;
function sanitizeToolCallId(id, fallbackName) {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const capped = cleaned.slice(0, 64);
  return capped || `${fallbackName || "tool"}_${++toolCallCounter}`;
}
function toolCallIdNeeded(modelId, runtimeModel) {
  return modelId.startsWith("claude-") || modelId.startsWith("gpt-oss-") || runtimeModel.startsWith("claude-") || runtimeModel.startsWith("gpt-oss-");
}
function transcriptModule() {
  return piAi;
}
function asSystemMessages(messages) {
  return [...messages ?? []];
}
function extractTranscriptSystemPrompt(messages) {
  const parts = [];
  for (const message of messages) {
    if (message?.role !== "system") continue;
    if (message.sections && typeof message.sections === "object") {
      const sectionParts = Object.values(message.sections).filter(
        (value) => typeof value === "string" && value.trim().length > 0
      );
      if (sectionParts.length > 0) {
        parts.push(sectionParts.join("\n\n"));
        continue;
      }
    }
    if (typeof message.content === "string" && message.content.trim()) {
      parts.push(message.content);
    } else if (Array.isArray(message.content)) {
      const texts = message.content.map((block) => typeof block === "string" ? block : block?.text || "").filter((text) => text.trim().length > 0);
      if (texts.length > 0) parts.push(texts.join("\n\n"));
    }
  }
  return parts.join("\n\n");
}
function extractTranscriptTools(messages) {
  const tools = /* @__PURE__ */ new Map();
  for (const message of messages) {
    if (message?.role !== "system") continue;
    for (const tool of message.toolsRemoved ?? []) {
      tools.delete(tool.name);
    }
    for (const tool of [...message.toolsAdded ?? [], ...message.tools ?? []]) {
      if (tool && typeof tool.name === "string") tools.set(tool.name, tool);
    }
  }
  return [...tools.values()];
}
function resolveCurrentSystemPrompt(context) {
  const helper = transcriptModule().getCurrentSystemPrompt;
  if (typeof helper === "function") {
    try {
      const fromHelper = helper(context.messages ?? []);
      if (fromHelper.trim() || context.messages.some((message) => message.role === "system")) return fromHelper;
    } catch {
    }
  }
  const fromTranscript = extractTranscriptSystemPrompt(asSystemMessages(context.messages));
  if (fromTranscript.trim()) return fromTranscript;
  return context.systemPrompt;
}
function resolveCurrentTools(context) {
  const helper = transcriptModule().getCurrentTools;
  if (typeof helper === "function") {
    try {
      const fromHelper = helper(context.messages ?? []);
      if (fromHelper.length > 0 || context.messages.some((message) => message.role === "system")) return fromHelper;
    } catch {
    }
  }
  const fromTranscript = extractTranscriptTools(asSystemMessages(context.messages));
  if (fromTranscript.length > 0) return fromTranscript;
  return context.tools;
}
var base64SignaturePattern = /^[A-Za-z0-9+/]+={0,2}$/;
function isValidThoughtSignature(signature) {
  if (!signature || typeof signature !== "string" || signature.length === 0) return false;
  if (signature.length % 4 !== 0) return false;
  return base64SignaturePattern.test(signature);
}
function geminiRequiresThoughtSignature(runtimeModel) {
  if (!runtimeModel.startsWith("gemini-")) return false;
  const match = runtimeModel.match(/^gemini-(\d+)/);
  if (match) {
    const major = Number.parseInt(match[1], 10);
    return major >= 3;
  }
  return true;
}
function parseImageData(raw, explicitMime) {
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return {
      mimeType: explicitMime || match[1] || "image/png",
      data: match[2].trim()
    };
  }
  return {
    mimeType: explicitMime || "image/png",
    data: raw.trim()
  };
}
var SKILL_BLOCK_PATTERN = /<skill\b[^>]*>[\s\S]*?<\/skill\s*>/gi;
function skillBlocks(content) {
  const texts = typeof content === "string" ? [content] : Array.isArray(content) ? content.flatMap(
    (item) => isRecord(item) && item.type === "text" && typeof item.text === "string" ? [item.text] : []
  ) : [];
  return texts.flatMap((text) => text.match(SKILL_BLOCK_PATTERN) || []);
}
function withoutSkillBlocks(text) {
  return text.replace(SKILL_BLOCK_PATTERN, "");
}
function asTextParts(content) {
  const textPart = (text) => {
    const userText = withoutSkillBlocks(text);
    return userText.trim() ? [{ text: sanitizeText(userText) }] : [];
  };
  if (typeof content === "string") return textPart(content);
  if (!Array.isArray(content)) return [];
  return content.flatMap((item) => {
    if (!isRecord(item)) return [];
    const block = item;
    if (block.type === "text") return textPart(block.text);
    if (block.type === "image") {
      const rawData = block.data || block.source?.data;
      if (!rawData) return [];
      const explicitMime = block.mimeType || block.mediaType || block.source?.mediaType;
      const { data, mimeType } = parseImageData(rawData, explicitMime);
      return data ? [{ inlineData: { mimeType, data } }] : [];
    }
    return [];
  });
}
function asImageParts(content) {
  if (!Array.isArray(content)) return [];
  return content.flatMap((item) => {
    if (!isRecord(item)) return [];
    const block = item;
    if (block.type === "image") {
      const rawData = block.data || block.source?.data;
      if (!rawData) return [];
      const explicitMime = block.mimeType || block.mediaType || block.source?.mediaType;
      const { data, mimeType } = parseImageData(rawData, explicitMime);
      return data ? [{ inlineData: { mimeType, data } }] : [];
    }
    return [];
  });
}
function appendTurn(contents, role, parts) {
  if (!parts.length) return;
  const last = contents[contents.length - 1];
  if (last && last.role === role) {
    last.parts.push(...parts);
  } else {
    contents.push({ role, parts });
  }
}
function convertMessages(model, context, runtimeModel) {
  const contents = [];
  const requiresSig = geminiRequiresThoughtSignature(runtimeModel);
  const droppedToolCallIds = /* @__PURE__ */ new Map();
  for (const msg of context.messages) {
    if (msg.role === "system") continue;
    if (msg.role === "user") {
      const parts = asTextParts(msg.content);
      appendTurn(contents, GeminiRole.User, parts);
    } else if (msg.role === "assistant") {
      if (msg.stopReason === "error" || msg.stopReason === "aborted") {
        continue;
      }
      const parts = [];
      const isSameModel = msg.provider === PROVIDER_ID && msg.model === model.id;
      const toolCalls = msg.content.filter((b) => b.type === "toolCall");
      const firstCallHasSig = toolCalls.length > 0 && isValidThoughtSignature(toolCalls[0]?.thoughtSignature);
      const allSigsValid = toolCalls.every(
        (tc) => !tc.thoughtSignature || isValidThoughtSignature(tc.thoughtSignature)
      );
      const groupIsSigned = isSameModel && firstCallHasSig && allSigsValid;
      for (const block of msg.content) {
        if (block.type === "text") {
          const textSig = isSameModel && isValidThoughtSignature(block.textSignature) ? block.textSignature : void 0;
          if ((!block.text || block.text.trim() === "") && !textSig) {
            continue;
          }
          parts.push({
            text: sanitizeText(block.text),
            ...textSig ? { thoughtSignature: textSig } : {}
          });
        } else if (block.type === "thinking" && String(block.thinking || "").trim()) {
          if (!isSameModel) continue;
          parts.push({
            thought: true,
            text: sanitizeText(block.thinking),
            ...block.thinkingSignature ? { thoughtSignature: block.thinkingSignature } : {}
          });
        } else if (block.type === "toolCall") {
          if (requiresSig && !groupIsSigned) {
            const rawId = block.id || "";
            const argsText = (() => {
              try {
                return JSON.stringify(block.arguments ?? {});
              } catch {
                return "{}";
              }
            })();
            if (rawId) {
              droppedToolCallIds.set(rawId, argsText);
              droppedToolCallIds.set(sanitizeToolCallId(rawId, block.name), argsText);
            } else {
              droppedToolCallIds.set(`empty:${block.name}`, argsText);
            }
          } else {
            parts.push({
              functionCall: {
                name: block.name,
                args: block.arguments ?? {},
                ...toolCallIdNeeded(model.id, runtimeModel) ? { id: sanitizeToolCallId(block.id || "", block.name) } : {}
              },
              ...block.thoughtSignature ? { thoughtSignature: block.thoughtSignature } : {}
            });
          }
        }
      }
      appendTurn(contents, GeminiRole.Model, parts);
    } else if (msg.role === "toolResult") {
      const text = msg.content.filter((c) => c.type === "text").map((c) => sanitizeText(c.text)).join("\n");
      const responseText = text || (msg.isError ? "Tool failed" : "");
      const imageParts = asImageParts(msg.content);
      const rawId = msg.toolCallId || "";
      const sanitizedId = toolCallIdNeeded(model.id, runtimeModel) ? sanitizeToolCallId(rawId, msg.toolName) : rawId;
      const droppedArgs = requiresSig ? droppedToolCallIds.get(rawId) ?? droppedToolCallIds.get(sanitizedId) ?? (rawId === "" ? droppedToolCallIds.get(`empty:${msg.toolName}`) : void 0) : void 0;
      if (droppedArgs !== void 0) {
        const label = droppedArgs === "{}" ? `\`${msg.toolName}\`` : `\`${msg.toolName}\` (${droppedArgs})`;
        appendTurn(contents, GeminiRole.User, [
          { text: sanitizeText(`[Observation from ${label}:
${responseText}]`) },
          ...imageParts
        ]);
      } else {
        const part = {
          functionResponse: {
            name: msg.toolName,
            response: msg.isError ? { error: responseText } : { output: responseText },
            ...toolCallIdNeeded(model.id, runtimeModel) ? { id: sanitizeToolCallId(msg.toolCallId || "", msg.toolName) } : {}
          }
        };
        appendTurn(contents, GeminiRole.User, [part, ...imageParts]);
      }
    }
  }
  for (let index = 0; index < contents.length; index += 1) {
    const turn = contents[index];
    if (turn?.role === GeminiRole.Model && turn.parts.some((part) => "functionCall" in part) && contents[index - 1]?.role !== GeminiRole.User) {
      contents.splice(index, 0, {
        role: GeminiRole.User,
        parts: [{ text: CONTINUATION_TEXT }]
      });
      index += 1;
    }
  }
  const hasUserText = contents.some(
    (turn) => turn.role === GeminiRole.User && turn.parts.some((part) => "text" in part && Boolean(part.text.trim()))
  );
  if (!hasUserText && contents.length > 0) {
    const bridge = {
      text: CONTINUATION_TEXT
    };
    const userTurn = contents.find((turn) => turn.role === GeminiRole.User);
    if (userTurn) userTurn.parts.push(bridge);
    else contents.unshift({ role: GeminiRole.User, parts: [bridge] });
  }
  const lastTurn = contents.at(-1);
  if (lastTurn?.role === GeminiRole.Model) {
    if (lastTurn.parts.some((part) => "functionCall" in part)) {
      throw new Error(
        "Antigravity request is missing tool result(s) for the final assistant tool call. Provide the corresponding tool result before continuing."
      );
    }
    appendTurn(contents, GeminiRole.User, [{ text: CONTINUATION_TEXT }]);
  }
  return contents;
}
var MAX_SCHEMA_DEREFERENCE_DEPTH = 64;
var MAX_SCHEMA_DEREFERENCE_NODES = 1e4;
var SCHEMA_MAP_KEYWORDS = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "dependentSchemas",
  "dependencies"
]);
var SCHEMA_VALUE_KEYWORDS = /* @__PURE__ */ new Set([
  "additionalItems",
  "additionalProperties",
  "contains",
  "contentSchema",
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties"
]);
var SCHEMA_ARRAY_KEYWORDS = /* @__PURE__ */ new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
function resolveLocalJsonPointer(ref, rootSchema) {
  if (ref === "#") return rootSchema;
  if (!ref.startsWith("#/")) return void 0;
  let current = rootSchema;
  for (const token of ref.slice(2).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(key)) return void 0;
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index >= current.length) return void 0;
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object") return void 0;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return void 0;
    current = current[key];
  }
  return current;
}
function dereferenceSchemaMap(schemaMap, rootSchema, refStack, objectStack, state, path, depth) {
  if (!isRecord(schemaMap)) {
    return dereferenceSchema(schemaMap, rootSchema, refStack, objectStack, state, path, depth);
  }
  const out = {};
  const issues = [];
  for (const [key, value] of Object.entries(schemaMap)) {
    const result = dereferenceSchema(
      value,
      rootSchema,
      refStack,
      objectStack,
      state,
      `${path}.${key}`,
      depth
    );
    out[key] = result.schema;
    issues.push(...result.issues);
  }
  return { schema: out, issues };
}
function dereferenceSchema(schema, rootSchema = schema, refStack = /* @__PURE__ */ new Set(), objectStack = /* @__PURE__ */ new Set(), state = { nodes: 0 }, path = "$", depth = 0) {
  if (depth > MAX_SCHEMA_DEREFERENCE_DEPTH) {
    return {
      schema: {},
      issues: [
        {
          path,
          ref: "(depth limit)",
          reason: `schema expansion exceeded ${MAX_SCHEMA_DEREFERENCE_DEPTH} levels`
        }
      ]
    };
  }
  state.nodes += 1;
  if (state.nodes > MAX_SCHEMA_DEREFERENCE_NODES) {
    return {
      schema: {},
      issues: [
        {
          path,
          ref: "(node limit)",
          reason: `schema expansion exceeded ${MAX_SCHEMA_DEREFERENCE_NODES} nodes`
        }
      ]
    };
  }
  if (!schema || typeof schema !== "object") return { schema, issues: [] };
  if (Array.isArray(schema)) {
    const results = schema.map(
      (item, index) => dereferenceSchema(
        item,
        rootSchema,
        refStack,
        objectStack,
        state,
        `${path}[${index}]`,
        depth + 1
      )
    );
    return {
      schema: results.map((result) => result.schema),
      issues: results.flatMap((result) => result.issues)
    };
  }
  const s = schema;
  if (objectStack.has(s)) {
    return {
      schema: {},
      issues: [{ path, ref: "(object cycle)", reason: "circular schema object" }]
    };
  }
  const nextObjectStack = new Set(objectStack);
  nextObjectStack.add(s);
  if (typeof s.$ref === "string") {
    const ref = s.$ref;
    if (refStack.has(ref)) {
      return {
        schema: {},
        issues: [{ path, ref, reason: "circular local reference" }]
      };
    }
    const target = resolveLocalJsonPointer(ref, rootSchema);
    if (target === void 0) {
      return {
        schema: {},
        issues: [{ path, ref, reason: "target is not present in the root schema" }]
      };
    }
    const nextRefStack = new Set(refStack);
    nextRefStack.add(ref);
    const resolved = dereferenceSchema(
      target,
      rootSchema,
      nextRefStack,
      nextObjectStack,
      state,
      path,
      depth + 1
    );
    const { $ref: _, ...siblings } = s;
    const siblingResult = dereferenceSchema(
      siblings,
      rootSchema,
      refStack,
      nextObjectStack,
      state,
      path,
      depth + 1
    );
    if (isRecord(resolved.schema) && isRecord(siblingResult.schema)) {
      return {
        schema: { ...resolved.schema, ...siblingResult.schema },
        issues: [...resolved.issues, ...siblingResult.issues]
      };
    }
    return {
      schema: resolved.schema,
      issues: [...resolved.issues, ...siblingResult.issues]
    };
  }
  const out = {};
  const issues = [];
  for (const [key, value] of Object.entries(s)) {
    if (key === "$defs" || key === "definitions") continue;
    let result;
    if (SCHEMA_MAP_KEYWORDS.has(key)) {
      result = dereferenceSchemaMap(
        value,
        rootSchema,
        refStack,
        nextObjectStack,
        state,
        `${path}.${key}`,
        depth + 1
      );
    } else if (SCHEMA_VALUE_KEYWORDS.has(key) || SCHEMA_ARRAY_KEYWORDS.has(key)) {
      result = dereferenceSchema(
        value,
        rootSchema,
        refStack,
        nextObjectStack,
        state,
        `${path}.${key}`,
        depth + 1
      );
    }
    if (result) {
      out[key] = result.schema;
      issues.push(...result.issues);
    } else {
      out[key] = value;
    }
  }
  return { schema: out, issues };
}
function ensureRootObjectSchema(schema) {
  if (!isRecord(schema)) {
    return { type: "object", properties: {} };
  }
  if (!schema.type) {
    return { ...schema, type: "object", properties: schema.properties || {} };
  }
  return schema;
}
var META_SCHEMA_KEYWORDS = /* @__PURE__ */ new Set([
  "$schema",
  "$id",
  "$anchor",
  "$dynamicAnchor",
  "$vocabulary",
  "$comment",
  "$defs",
  "definitions"
]);
function stripMetaSchemaMap(schemaMap) {
  if (!isRecord(schemaMap)) return stripMetaSchema(schemaMap);
  return Object.fromEntries(
    Object.entries(schemaMap).map(([key, value]) => [key, stripMetaSchema(value)])
  );
}
function stripMetaSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripMetaSchema);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (META_SCHEMA_KEYWORDS.has(key)) continue;
    if (SCHEMA_MAP_KEYWORDS.has(key)) {
      out[key] = stripMetaSchemaMap(value);
    } else if (SCHEMA_VALUE_KEYWORDS.has(key) || SCHEMA_ARRAY_KEYWORDS.has(key)) {
      out[key] = stripMetaSchema(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
var CUSTOM_TOOL_SCHEMA_ALLOW = /* @__PURE__ */ new Set([
  "type",
  "description",
  "properties",
  "required",
  "items",
  "enum"
]);
function normalizeCustomToolType(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return void 0;
  const entries = value;
  const scalar = entries.find(
    (entry) => typeof entry === "string" && entry !== "null"
  );
  return scalar;
}
function normalizeCustomToolSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(normalizeCustomToolSchema);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!CUSTOM_TOOL_SCHEMA_ALLOW.has(key)) continue;
    if (key === "type") {
      const normalizedType = normalizeCustomToolType(value);
      if (normalizedType !== void 0) out.type = normalizedType;
      continue;
    }
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const props = {};
      for (const [propName, propSchema] of Object.entries(value)) {
        props[propName] = normalizeCustomToolSchema(propSchema);
      }
      out.properties = props;
      continue;
    }
    if (key === "enum" && Array.isArray(value) && !value.every((entry) => typeof entry === "string")) {
      continue;
    }
    out[key] = normalizeCustomToolSchema(value);
  }
  return out;
}
function convertTools(tools, useLegacyParameters = false) {
  if (!tools?.length) return void 0;
  const warnings = [];
  const functionDeclarations = tools.flatMap((tool) => {
    const dereferenced = dereferenceSchema(tool.parameters);
    if (dereferenced.issues.length > 0) {
      const detail = dereferenced.issues.map((issue) => `${issue.path} (${issue.ref}: ${issue.reason})`).join(", ");
      warnings.push(`Skipped tool '${tool.name}' due to unresolved schema reference: ${detail}`);
      return [];
    }
    const rootObject = ensureRootObjectSchema(dereferenced.schema);
    const schema = stripMetaSchema(rootObject);
    return [
      {
        name: tool.name,
        description: tool.description,
        ...useLegacyParameters ? { parameters: normalizeCustomToolSchema(schema) } : { parametersJsonSchema: schema }
      }
    ];
  });
  setLastToolSchemaWarnings(warnings.length ? warnings : void 0);
  if (!functionDeclarations.length) return void 0;
  return [{ functionDeclarations }];
}
function mapToolChoiceMode(toolChoice) {
  if (toolChoice === ToolChoice.None) return GeminiToolCallingMode.None;
  if (toolChoice === ToolChoice.Any || toolChoice === ToolChoice.Required)
    return GeminiToolCallingMode.Any;
  return GeminiToolCallingMode.Auto;
}
function buildRequest(model, context, projectId, options, runtimeModel) {
  const injectedSkills = context.messages.flatMap(
    (msg) => msg.role === "user" ? skillBlocks(msg.content) : []
  );
  const systemPromptText = resolveCurrentSystemPrompt(context);
  const declaredTools = resolveCurrentTools(context);
  const systemParts = systemPromptText ? [{ text: sanitizeText(systemPromptText) }] : [];
  systemParts.push(...injectedSkills.map((skill) => ({ text: sanitizeText(skill) })));
  const contents = convertMessages(model, context, runtimeModel);
  const hasUserText = contents.some(
    (turn) => turn.role === GeminiRole.User && turn.parts.some((part) => "text" in part && Boolean(part.text.trim()))
  );
  if (!hasUserText && (injectedSkills.length > 0 || Boolean(systemPromptText))) {
    contents.unshift({
      role: GeminiRole.User,
      parts: [{ text: "Apply the active system instructions." }]
    });
  }
  const request = {
    contents,
    systemInstruction: {
      role: GeminiRole.User,
      parts: systemParts
    }
  };
  const generationConfig = {};
  if (options.temperature !== void 0) generationConfig.temperature = options.temperature;
  const thinking = getThinkingConfig(runtimeModel, options.reasoning ?? "off");
  if (thinking) generationConfig.thinkingConfig = thinking;
  const maxAllowed = getMaxOutputTokens(model.id, runtimeModel);
  if (options.maxTokens !== void 0) {
    generationConfig.maxOutputTokens = Math.min(options.maxTokens, maxAllowed);
  } else {
    generationConfig.maxOutputTokens = Math.min(maxAllowed, model.maxTokens || maxAllowed);
  }
  if (Object.keys(generationConfig).length) request.generationConfig = generationConfig;
  const isClaude = model.id.startsWith("claude-") || runtimeModel.startsWith("claude-");
  const tools = convertTools(declaredTools, isClaude || model.id.startsWith("gpt-oss-"));
  if (tools) {
    request.tools = tools;
  }
  if (options.toolChoice && options.toolChoice !== ToolChoice.Auto) {
    request.toolConfig = {
      functionCallingConfig: {
        mode: mapToolChoiceMode(options.toolChoice)
      }
    };
  }
  const isNonGemini = isClaude || model.id.startsWith("gpt-oss-") || runtimeModel.startsWith("gpt-oss-") || !model.id.startsWith("gemini-") && !runtimeModel.startsWith("gemini-");
  const step = Math.max(1, request.contents.length);
  const lastStepIndex = String(Math.max(0, request.contents.length - 1));
  const requestIndex = context.messages?.filter(
    (m) => m.role === "assistant" && m.stopReason !== "error" && m.stopReason !== "aborted"
  ).length ?? 0;
  const { conversationId, trajectoryId, sessionId } = resolveSessionTrajectory(
    context,
    options.sessionId
  );
  const envelope = antigravityRequestEnvelope(runtimeModel, {
    isClaude,
    isNonGemini,
    step,
    lastStepIndex,
    requestIndex,
    conversationId,
    trajectoryId,
    sessionId
  });
  request.sessionId = envelope.sessionId;
  request.labels = envelope.labels;
  return {
    project: projectId,
    model: runtimeModel,
    request,
    requestType: AntigravityRequestType.Agent,
    userAgent: AntigravityUserAgent.Antigravity,
    requestId: envelope.requestId
  };
}
function mapStopReason(reason) {
  if (reason === "STOP") return StopReason.Stop;
  if (reason === "MAX_TOKENS") return StopReason.Length;
  return reason ? StopReason.Error : StopReason.Stop;
}
function isAccountQuota429(text) {
  return /Individual quota reached/i.test(text) || /Resets? in /i.test(text) || !/rate.?limit/i.test(text) && /quota exceeded|exceeded your|daily limit/i.test(text);
}
function isRetryableRateLimit(text) {
  return /rate.?limit|too many requests/i.test(text);
}
function publicErrorStatus(status, friendly) {
  if (status === void 0) return "no response";
  return /retrying automatically/i.test(friendly) ? String(status) : "request-failed";
}
function recordStaticRouteDiagnostics(runtimeModel) {
  if (!getCurrentMatchedModelDebug()) {
    setLastMatchedModelDebug(`static:${runtimeModel}`);
  }
  if (!getCurrentAvailableModels()) {
    const ids = Object.keys(getCurrentAntigravityRouting());
    setLastAvailableModels(ids.length > 0 ? ids.join(",") : "static-catalog");
  }
}
function friendlyAntigravityError(status, text) {
  const msg = redactSecrets(jsonOrTextError(text)).slice(0, 500);
  if (status === 400) {
    if (/Requests ending with a model turn are not supported/i.test(msg)) {
      return "Antigravity rejected an invalid conversation message boundary. Next: update the extension or add a user message / start a new session, then retry.";
    }
    if (/function call turn comes immediately after a user turn or after a function response turn/i.test(
      msg
    )) {
      return "Antigravity rejected an invalid function-call message boundary. Next: update the extension or start a new session, then retry; re-login is not required.";
    }
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) {
      return "Antigravity login expired or credentials are invalid. Next: sign in again through DSH credentials, then retry.";
    }
    if (/Invalid JSON payload|Unknown name/i.test(msg)) {
      return `Antigravity request format was rejected by the backend (${msg}). Next: switch to a simpler model or retry after updating the extension.`;
    }
    if (/Request contains an invalid argument/i.test(msg)) {
      return `Antigravity rejected this request (${msg}). Next: retry once; if it keeps failing, switch models or re-login.`;
    }
    return `Bad request from Antigravity. Next: retry once, then sign in again through DSH credentials if it keeps failing. Backend said: ${msg}`;
  }
  if (status === 401) {
    return "Antigravity authentication failed. Next: sign in again through DSH credentials, then retry.";
  }
  if (status === 403) {
    const verifyUrl = extractValidationUrl(text);
    const verifyHint = verifyUrl ? ` Open this link in a browser signed in to the same Google account to verify: ${verifyUrl}` : "";
    if (/permission|forbidden|access/i.test(msg) && !verifyUrl) {
      return "Antigravity access was denied for this account or project. Next: try another model, re-login, or use an account with access.";
    }
    return `Antigravity denied this request. Next: re-login or try another model. Backend said: ${msg}${verifyHint}`;
  }
  if (status === 404) {
    if (/Requested entity was not found/i.test(msg)) {
      return "This model is not available right now. Next: switch to gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash, gemini-3.1-pro, or another working model.";
    }
    return `Antigravity could not find the requested resource. Next: retry or switch models. Backend said: ${msg}`;
  }
  if (status === 408) return "Antigravity timed out. Next: retry the same request.";
  if (status === 409) {
    return "Antigravity reported a conflict for this request. Next: retry once or start a new chat session.";
  }
  if (status === 429) {
    const wait = msg.match(/Resets? in ([^.\n]+)/i)?.[1]?.trim();
    if (/Individual quota reached/i.test(msg)) {
      return `Quota reached. Please wait ${wait || "for reset"}. Next: switch models or try again after reset.`;
    }
    const hardLimit = Boolean(wait) || !/rate.?limit/i.test(msg) && /quota exceeded|exceeded your|limit reached|reached your|daily limit/i.test(msg);
    if (hardLimit) {
      return `Quota reached.${wait ? ` Please wait ${wait}.` : ""} Next: switch models or retry later.`;
    }
    if (/rate.?limit|too many requests/i.test(msg)) {
      return "Rate limited by Antigravity (429 ResourceExhausted). Next: retrying automatically; if it persists, switch models.";
    }
    return `This model is unavailable right now (${msg || "resource exhausted"}). Next: switch to gemini-3.8-flash or another Flash model. This is not necessarily an account quota wall.`;
  }
  if (status === 500) {
    return "Antigravity had an internal server error. Next: retry in a moment or switch models.";
  }
  if (status === 502) return "Antigravity returned a bad gateway error. Next: retry in a moment.";
  if (status === 503) {
    if (/No capacity available/i.test(msg)) {
      return "This model has no capacity right now. Next: retry later or switch to another model.";
    }
    return "Antigravity is temporarily unavailable. Next: retry in a moment or switch models.";
  }
  if (status === 504) return "Antigravity timed out upstream. Next: retry in a moment.";
  return msg;
}
function createOutput(model) {
  return {
    role: "assistant",
    content: [],
    api: ANTIGRAVITY_API,
    provider: PROVIDER_ID,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    },
    stopReason: "stop",
    timestamp: Date.now()
  };
}
function asToolCallArguments(args) {
  return args ?? {};
}
var STREAM_HEADER_TIMEOUT_DEFAULT_MS = 18e4;
var STREAM_STALL_TIMEOUT_DEFAULT_MS = 12e4;
function envTimeoutMs(name2, fallback) {
  const raw = antigravityEnv(name2);
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : fallback;
}
function streamHeaderTimeoutMs() {
  return envTimeoutMs("STREAM_HEADER_TIMEOUT_MS", STREAM_HEADER_TIMEOUT_DEFAULT_MS);
}
function streamStallTimeoutMs() {
  return envTimeoutMs("STREAM_STALL_TIMEOUT_MS", STREAM_STALL_TIMEOUT_DEFAULT_MS);
}
function stallError(stallMs) {
  return new Error(`stream stalled: no data for ${stallMs}ms`);
}
function guardResponseBody(response, controller, stallMs, cleanup) {
  if (!response.body) {
    cleanup();
    return response;
  }
  const reader = response.body.getReader();
  let timer;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    cleanup();
  };
  const reset = () => {
    if (stallMs <= 0) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(stallError(stallMs)), stallMs);
  };
  let streamController;
  const abortBody = () => {
    streamController?.error(controller.signal.reason);
    void reader.cancel(controller.signal.reason).catch(() => void 0);
    finish();
  };
  controller.signal.addEventListener("abort", abortBody, { once: true });
  reset();
  const guarded = new ReadableStream({
    start(controller2) {
      streamController = controller2;
    },
    async pull(streamController2) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          finish();
          streamController2.close();
          return;
        }
        if (!(chunk.value instanceof Uint8Array)) {
          throw new Error("Response body yielded an invalid chunk");
        }
        reset();
        streamController2.enqueue(chunk.value);
      } catch (error) {
        finish();
        streamController2.error(error);
      }
    },
    async cancel(reason) {
      finish();
      await reader.cancel(reason);
    }
  });
  return new Response(guarded, response);
}
async function fetchWithHeaderDeadline(url, init, callerSignal, timeoutMs, stallMs = 0, fetchFn = antigravityFetch) {
  if (timeoutMs <= 0 && stallMs <= 0) {
    return fetchFn(url, { ...init, signal: callerSignal ?? init.signal });
  }
  const controller = new AbortController();
  const forward = () => controller.abort(callerSignal?.reason);
  const cleanup = () => callerSignal?.removeEventListener("abort", forward);
  callerSignal?.addEventListener("abort", forward, { once: true });
  if (callerSignal?.aborted) forward();
  const timer = timeoutMs > 0 ? setTimeout(
    () => controller.abort(new Error(`no response headers within ${timeoutMs}ms`)),
    timeoutMs
  ) : void 0;
  let responseBodyGuarded = false;
  try {
    const response = await fetchFn(url, { ...init, signal: controller.signal });
    responseBodyGuarded = Boolean(response.body);
    return guardResponseBody(response, controller, stallMs, cleanup);
  } finally {
    if (timer) clearTimeout(timer);
    if (!responseBodyGuarded) cleanup();
  }
}
async function streamResponse(response, stream, output, model) {
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let responseBytes = 0;
  let buffer = "";
  let scanStart = 0;
  let started = false;
  let currentBlock = null;
  let hasContent = false;
  let sawFinishReason = false;
  let stray = "";
  const blocks = output.content;
  const blockIndex = () => blocks.length - 1;
  const consumeStray = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;
    stray = stray ? `${stray}
${trimmed}` : trimmed;
    const start = stray.indexOf("{");
    if (start < 0) return;
    let parsed;
    try {
      parsed = JSON.parse(stray.slice(start));
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object" || !("error" in parsed)) return;
    const record = parsed;
    const status = typeof record.error?.code === "number" ? record.error.code : void 0;
    if (status !== void 0) setLastStatus(status);
    const friendly = friendlyAntigravityError(status, stray.slice(start));
    throw new Error(status ? `${friendly} (${status})` : friendly);
  };
  const handleLine = (line) => {
    if (!line.startsWith("data:")) {
      consumeStray(line);
      return;
    }
    const json2 = line.slice(5).trim();
    if (!json2 || json2 === "[DONE]") return;
    let chunk;
    try {
      chunk = JSON.parse(json2);
    } catch {
      return;
    }
    if (chunk.error) {
      const status = typeof chunk.error.code === "number" ? chunk.error.code : void 0;
      if (status !== void 0) setLastStatus(status);
      const friendly = friendlyAntigravityError(status, JSON.stringify({ error: chunk.error }));
      throw new Error(status ? `${friendly} (${status})` : chunk.error.message || friendly);
    }
    const responseData = chunk.response || chunk;
    const candidate = responseData.candidates?.[0];
    for (const part of candidate?.content?.parts || []) {
      if (part.text !== void 0) {
        hasContent = true;
        const isThinking = part.thought === true;
        const type = isThinking ? "thinking" : "text";
        if (!currentBlock || currentBlock.type !== type) {
          finishCurrent();
          currentBlock = isThinking ? { type: "thinking", thinking: "", thinkingSignature: void 0 } : { type: "text", text: "" };
          blocks.push(currentBlock);
          ensureStarted();
          stream.push({
            type: isThinking ? "thinking_start" : "text_start",
            contentIndex: blockIndex(),
            partial: output
          });
        }
        if (isThinking && currentBlock.type === "thinking") {
          currentBlock.thinking += part.text;
          if (part.thoughtSignature) currentBlock.thinkingSignature = part.thoughtSignature;
          stream.push({
            type: "thinking_delta",
            contentIndex: blockIndex(),
            delta: part.text,
            partial: output
          });
        } else if (!isThinking && currentBlock.type === "text") {
          currentBlock.text += part.text;
          if (part.thoughtSignature) currentBlock.textSignature = part.thoughtSignature;
          stream.push({
            type: "text_delta",
            contentIndex: blockIndex(),
            delta: part.text,
            partial: output
          });
        }
      }
      if (part.functionCall) {
        hasContent = true;
        finishCurrent();
        const rawId = part.functionCall.id || "";
        const toolCall = {
          type: "toolCall",
          id: sanitizeToolCallId(rawId, part.functionCall.name),
          name: part.functionCall.name || "",
          arguments: asToolCallArguments(part.functionCall.args),
          ...part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}
        };
        blocks.push(toolCall);
        ensureStarted();
        stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
        stream.push({
          type: "toolcall_delta",
          contentIndex: blockIndex(),
          delta: JSON.stringify(toolCall.arguments),
          partial: output
        });
        stream.push({
          type: "toolcall_end",
          contentIndex: blockIndex(),
          toolCall,
          partial: output
        });
      }
    }
    if (candidate?.finishReason) {
      sawFinishReason = true;
      output.rawStopReason = candidate.finishReason;
      output.stopReason = blocks.some((b) => b.type === "toolCall") ? StopReason.ToolUse : mapStopReason(candidate.finishReason);
    }
    if (responseData.usageMetadata) {
      const prompt = responseData.usageMetadata.promptTokenCount || 0;
      const cacheRead = responseData.usageMetadata.cachedContentTokenCount || 0;
      const thoughts = responseData.usageMetadata.thoughtsTokenCount || 0;
      output.usage.input = prompt - cacheRead;
      output.usage.output = (responseData.usageMetadata.candidatesTokenCount || 0) + thoughts;
      output.usage.reasoning = thoughts;
      output.usage.cacheRead = cacheRead;
      output.usage.totalTokens = responseData.usageMetadata.totalTokenCount || 0;
      if (model?.cost) {
        calculateCost(model, output.usage);
      } else {
        output.usage.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
      }
    }
  };
  const ensureStarted = () => {
    if (!started) {
      stream.push({ type: "start", partial: output });
      started = true;
    }
  };
  const finishCurrent = () => {
    if (!currentBlock) return;
    if (currentBlock.type === "text") {
      stream.push({
        type: "text_end",
        contentIndex: blockIndex(),
        content: currentBlock.text,
        partial: output
      });
    } else {
      stream.push({
        type: "thinking_end",
        contentIndex: blockIndex(),
        content: currentBlock.thinking,
        partial: output
      });
    }
    currentBlock = null;
  };
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) continue;
      responseBytes += result.value.byteLength;
      if (responseBytes > 16 * 1024 * 1024) throw new Error("Antigravity stream exceeded the response byte limit");
      buffer += decoder.decode(result.value, { stream: true });
      if (buffer.length > 1024 * 1024) throw new Error("Antigravity stream exceeded the event size limit");
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf("\n", scanStart)) !== -1) {
        const line = buffer.slice(scanStart, newlineIdx);
        scanStart = newlineIdx + 1;
        handleLine(line.replace(/\r$/, ""));
      }
      if (scanStart > 0) {
        buffer = buffer.slice(scanStart);
        scanStart = 0;
      }
    }
    buffer += decoder.decode();
    if (buffer.length > 0) handleLine(buffer.replace(/\r$/, ""));
    if (!sawFinishReason) {
      throw new Error(
        "Antigravity stream ended without a finish reason; the response was terminated before completion."
      );
    }
    finishCurrent();
    return hasContent;
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function streamAntigravity(model, context, options) {
  const stream = createAssistantMessageEventStream();
  const opts = options ?? {};
  void runWithDiagnostics(async () => {
    const startTime = Date.now();
    const output = createOutput(model);
    try {
      const creds = parseApiKey(opts.apiKey);
      const warmedProject = creds.projectId ? null : await loadCodeAssist(creds.token);
      const projectId = resolveProjectId({
        token: creds.token,
        warmedProject,
        credentialProjectId: creds.projectId
      });
      setLastProjectId(projectId);
      const effort = opts.reasoning ?? "off";
      const isKnownModel = model.id in getCurrentAntigravityRouting();
      const baseRuntimeModel = antigravityEnv("RUNTIME_MODEL")?.trim() || getAntigravityRequestModelId(model.id, effort);
      let initialRuntimeModel = baseRuntimeModel;
      if (!isKnownModel && !antigravityEnv("RUNTIME_MODEL")) {
        const dynamic = await fetchAvailableRuntimeModel(creds.token, projectId, baseRuntimeModel, opts.signal);
        if (dynamic?.id && isUsableRuntimeModelId(dynamic.id)) {
          initialRuntimeModel = dynamic.id;
        }
      }
      const runtimeCandidates = [initialRuntimeModel];
      const fallback = getFallbackRuntimeModel(initialRuntimeModel, effort);
      if (fallback && fallback !== initialRuntimeModel) {
        runtimeCandidates.push(fallback);
      }
      const requestHeaders = antigravityHeaders(creds.token);
      let response;
      let lastText = "";
      let received = false;
      let runtimeModel = initialRuntimeModel;
      for (let emptyAttempt = 0; emptyAttempt <= 2; emptyAttempt++) {
        if (opts.signal?.aborted) throw new Error("Request was aborted");
        if (emptyAttempt > 0) {
          const delay = 500 * 2 ** (emptyAttempt - 1);
          await new Promise((res) => setTimeout(res, delay));
        }
        for (let candIdx = 0; candIdx < runtimeCandidates.length; candIdx++) {
          runtimeModel = runtimeCandidates[candIdx];
          setLastResolvedRuntimeModel(runtimeModel);
          recordStaticRouteDiagnostics(runtimeModel);
          const body = JSON.stringify(buildRequest(model, context, projectId, opts, runtimeModel));
          for (const endpoint of endpointCandidates()) {
            setLastEndpoint(endpoint);
            response = await fetchWithHeaderDeadline(
              `${endpoint}/v1internal:streamGenerateContent?alt=sse`,
              {
                method: "POST",
                headers: requestHeaders,
                body
              },
              opts.signal,
              streamHeaderTimeoutMs(),
              streamStallTimeoutMs()
            );
            setLastStatus(response.status);
            if (response.ok) break;
            lastText = await response.text();
            if (response.status === 429 && isAccountQuota429(lastText)) break;
            if (response.status === 429 && !isRetryableRateLimit(lastText)) break;
            if (![403, 404, 429, 500, 502, 503, 504].includes(response.status)) break;
          }
          if (response?.ok) break;
          if (response?.status === 404) {
            if (candIdx + 1 < runtimeCandidates.length) {
              continue;
            }
            if (isKnownModel && candIdx === runtimeCandidates.length - 1) {
              const dynamic = await fetchAvailableRuntimeModel(
                creds.token,
                projectId,
                baseRuntimeModel,
                opts.signal
              );
              if (dynamic?.id && !runtimeCandidates.includes(dynamic.id) && isUsableRuntimeModelId(dynamic.id)) {
                runtimeCandidates.push(dynamic.id);
                continue;
              }
            }
          }
          break;
        }
        if (!response || !response.ok) {
          const friendly = friendlyAntigravityError(response?.status, lastText);
          if (response?.status === 429 && /Quota reached\./i.test(friendly)) {
            throw new Error(friendly);
          }
          throw new Error(
            `Antigravity API error (${publicErrorStatus(response?.status, friendly)}, ${formatRequestDiagnostics({ projectId, runtimeModel })}): ${friendly}`
          );
        }
        output.content = [];
        output.usage = {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        };
        output.stopReason = "stop";
        received = await streamResponse(response, stream, output, model);
        if (received) break;
      }
      if (!received) throw new Error("Antigravity API returned an empty response");
      setLastLatencyMs(Date.now() - startTime);
      if (output.stopReason === "error" || output.stopReason === "aborted") {
        const errorDetail = output.rawStopReason ? `Provider stopped with: ${output.rawStopReason}` : "An unknown error occurred";
        output.errorMessage = output.errorMessage || errorDetail;
        setLastError(output.errorMessage);
        stream.push({ type: "error", reason: output.stopReason, error: output });
      } else if (output.stopReason === "pending") {
        throw new Error("Antigravity API returned no stop reason");
      } else {
        stream.push({ type: "done", reason: output.stopReason, message: output });
      }
      stream.end();
    } catch (error) {
      setLastLatencyMs(Date.now() - startTime);
      output.stopReason = opts.signal?.aborted ? "aborted" : "error";
      output.errorMessage = safeError(error);
      setLastError(output.errorMessage);
      if (!getCurrentEndpoint() && endpointCandidates()[0]) {
        setLastEndpoint(endpointCandidates()[0]);
      }
      stream.push({ type: "error", reason: output.stopReason, error: output });
      stream.end();
    }
  });
  return stream;
}
var REDIRECT_URI = "http://localhost:51121/oauth-callback";
var AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1e3;
var OAUTH_REQUEST_TIMEOUT_MS = 15e3;
var SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs"
];
function resolveClient(client) {
  const parameters = client ?? {
    clientId: process.env.ANTIGRAVITY_CLIENT_ID,
    clientSecret: process.env.ANTIGRAVITY_CLIENT_SECRET
  };
  if (typeof parameters.clientId !== "string" || !safeValue(parameters.clientId) || typeof parameters.clientSecret !== "string" || !safeValue(parameters.clientSecret)) {
    throw Object.assign(new Error("Antigravity OAuth application parameters are not configured."), {
      code: "OAUTH_CLIENT_NOT_CONFIGURED"
    });
  }
  return { clientId: parameters.clientId, clientSecret: parameters.clientSecret };
}
var CALLBACK_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};
function operationSignal(signal, timeout = OAUTH_REQUEST_TIMEOUT_MS) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
}
function safeValue(value) {
  return value !== null && value.length > 0 && value.length <= 4096 && !/[\p{C}\s]/u.test(value);
}
function parsePastedCallback(raw, expectedState) {
  const text = raw.trim();
  if (!text || text.length > 8192) throw new Error("Paste the complete OAuth callback URL");
  const url = text.startsWith("?") || text.startsWith("state=") || text.startsWith("code=") ? new URL(`${REDIRECT_URI}?${text.replace(/^\?/, "")}`) : new URL(text);
  if (url.protocol !== "http:" || url.username || url.password || url.hash || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "51121" || url.pathname !== "/oauth-callback") {
    throw new Error("The OAuth callback URL is not the expected loopback address");
  }
  const seen = /* @__PURE__ */ new Set();
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
async function startCallbackServer(expectedState) {
  let settled = false;
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  void codePromise.catch(() => {
  });
  const server = createServer((request, response) => {
    const reply = (status, text) => {
      response.writeHead(status, CALLBACK_HEADERS);
      response.end(text);
    };
    if (request.method !== "GET") return reply(405, "Method not allowed");
    if (!["localhost:51121", "127.0.0.1:51121", "[::1]:51121"].includes(request.headers.host ?? "")) {
      return reply(400, "Invalid callback host");
    }
    if (settled) return reply(409, "This login callback has already been consumed");
    let callback;
    try {
      callback = parsePastedCallback(new URL(request.url ?? "", REDIRECT_URI).toString(), expectedState);
    } catch {
      return reply(400, "The OAuth callback was not accepted. Return to DeepSeek Harness.");
    }
    settled = true;
    resolveCode(callback);
    reply(200, "Authorization complete. Return to DeepSeek Harness.");
  });
  await new Promise((resolve, reject) => {
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
    }
  };
}
async function acquireAuthCode(expectedState, waitForCode, callbacks, signal) {
  const settled = new AbortController();
  const candidates = [waitForCode()];
  if (callbacks.onPrompt || callbacks.onManualCodeInput) {
    candidates.push((async () => {
      let message = "After Google sign-in, paste the full localhost callback URL if the browser cannot reach this Host.";
      while (true) {
        signal.throwIfAborted();
        settled.signal.throwIfAborted();
        const raw = callbacks.onPrompt ? await callbacks.onPrompt({ message, placeholder: `${REDIRECT_URI}?state=\u2026&code=\u2026` }) : await callbacks.onManualCodeInput();
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
  let removeAbort = () => {
  };
  candidates.push(new Promise((_resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else {
      signal.addEventListener("abort", abort, { once: true });
      removeAbort = () => signal.removeEventListener("abort", abort);
    }
  }));
  for (const candidate of candidates) void candidate.catch(() => {
  });
  try {
    return await Promise.race(candidates);
  } finally {
    settled.abort();
    removeAbort();
  }
}
function requireProject(projectId) {
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("Google returned no Antigravity project. Sign in with an account that has access.");
  }
  return projectId;
}
function tokenData(value) {
  const data = value;
  if (!data || typeof data.access_token !== "string" || !safeValue(data.access_token) || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 31536e3 || data.refresh_token !== void 0 && (typeof data.refresh_token !== "string" || !safeValue(data.refresh_token))) {
    throw new Error("Google returned an invalid OAuth token response");
  }
  return data;
}
async function readOAuthJson(response) {
  if (!response.body) return void 0;
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
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
async function refreshFailure(response) {
  let payload;
  try {
    payload = await readOAuthJson(response);
  } catch {
  }
  if (payload && typeof payload === "object" && "error" in payload && payload.error === "invalid_grant") {
    return Object.assign(new Error("The Antigravity grant is no longer valid. Sign in again."), {
      code: "OAUTH_INVALID_GRANT"
    });
  }
  return new Error(`Antigravity token refresh failed (HTTP ${response.status})`);
}
async function getUserEmail(token, signal) {
  try {
    const response = await globalThis.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${token}` },
      signal: operationSignal(signal),
      redirect: "error"
    });
    if (!response.ok) return void 0;
    const data = await readOAuthJson(response);
    return typeof data.email === "string" ? data.email : void 0;
  } catch {
    signal.throwIfAborted();
    return void 0;
  }
}
async function loginAntigravity(callbacks) {
  const client = resolveClient(callbacks.client);
  const signal = operationSignal(callbacks.signal, OAUTH_CALLBACK_TIMEOUT_MS);
  signal.throwIfAborted();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash2("sha256").update(verifier).digest("base64url");
  const state = randomBytes(32).toString("base64url");
  let listener;
  try {
    listener = await startCallbackServer(state);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EADDRINUSE" && (callbacks.onPrompt || callbacks.onManualCodeInput))) throw error;
  }
  try {
    signal.throwIfAborted();
    const params = new URLSearchParams({
      client_id: client.clientId,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline",
      prompt: "consent"
    });
    callbacks.onAuth({
      url: `${AUTH_URL}?${params}`,
      instructions: "Complete Google sign-in, then return here or paste the localhost callback URL."
    });
    const { code } = await acquireAuthCode(
      state,
      listener?.waitForCode ?? (() => new Promise(() => {
      })),
      callbacks,
      signal
    );
    const response = await globalThis.fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      }),
      signal: operationSignal(signal),
      redirect: "error"
    });
    if (!response.ok) throw new Error(`Google OAuth token exchange failed (HTTP ${response.status})`);
    const data = tokenData(await readOAuthJson(response));
    if (!data.refresh_token) throw new Error("Google did not return an offline refresh token");
    const [email, project] = await Promise.all([
      getUserEmail(data.access_token, signal),
      loadCodeAssist(data.access_token, signal)
    ]);
    signal.throwIfAborted();
    return {
      refresh: data.refresh_token,
      access: data.access_token,
      expires: Date.now() + data.expires_in * 1e3 - Math.min(3e5, data.expires_in * 100),
      projectId: requireProject(project),
      ...email === void 0 ? {} : { email }
    };
  } finally {
    listener?.cleanup();
  }
}
async function refreshAntigravityToken(credentials, signal, application) {
  const client = resolveClient(application);
  const operation = operationSignal(signal);
  operation.throwIfAborted();
  const response = await globalThis.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      refresh_token: credentials.refresh,
      grant_type: "refresh_token"
    }),
    signal: operation,
    redirect: "error"
  });
  if (!response.ok) {
    const error = await refreshFailure(response);
    operation.throwIfAborted();
    throw error;
  }
  const data = tokenData(await readOAuthJson(response));
  const existingProject = credentials.projectId;
  const project = existingProject || await loadCodeAssist(data.access_token, operation);
  operation.throwIfAborted();
  return {
    ...credentials,
    refresh: data.refresh_token || credentials.refresh,
    access: data.access_token,
    expires: Date.now() + data.expires_in * 1e3 - Math.min(3e5, data.expires_in * 100),
    projectId: requireProject(project)
  };
}
var THINKING_SUFFIXES = [
  { suffix: "extra-low", level: ThinkingEffort.Low },
  { suffix: "extra-high", level: ThinkingEffort.Xhigh },
  { suffix: "thinking", level: ThinkingEffort.High },
  { suffix: "minimal", level: ThinkingEffort.Minimal },
  { suffix: "medium", level: ThinkingEffort.Medium },
  { suffix: "high", level: ThinkingEffort.High },
  { suffix: "low", level: ThinkingEffort.Low }
];
var DISPLAY_LEVELS = [
  { pattern: /\(\s*extra\s*low\s*\)/i, level: ThinkingEffort.Low },
  { pattern: /\(\s*extra\s*high\s*\)/i, level: ThinkingEffort.Xhigh },
  { pattern: /\(\s*thinking\s*\)/i, level: ThinkingEffort.High },
  { pattern: /\(\s*minimal\s*\)/i, level: ThinkingEffort.Minimal },
  { pattern: /\(\s*medium\s*\)/i, level: ThinkingEffort.Medium },
  { pattern: /\(\s*high\s*\)/i, level: ThinkingEffort.High },
  { pattern: /\(\s*low\s*\)/i, level: ThinkingEffort.Low }
];
var PI_LEVELS = [
  ThinkingEffort.Off,
  ThinkingEffort.Minimal,
  ThinkingEffort.Low,
  ThinkingEffort.Medium,
  ThinkingEffort.High,
  ThinkingEffort.Xhigh,
  "max"
];
var ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
function isSelectableRuntimeModelId(id, info) {
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(id) || /^MODEL_/i.test(id)) return false;
  if (/^(chat_|tab_)/i.test(id)) return false;
  if (/image/i.test(id) || /image/i.test(modelDisplayName(info) ?? "")) return false;
  if (info?.isInternal === true || info?.apiProvider === "API_PROVIDER_INTERNAL") return false;
  return true;
}
function extractRecommendedModelIds(agentModelSorts) {
  if (!Array.isArray(agentModelSorts) || agentModelSorts.length === 0) return void 0;
  const ids = /* @__PURE__ */ new Set();
  for (const sort of agentModelSorts) {
    if (!isRecord(sort)) continue;
    const groups = Array.isArray(sort.groups) ? sort.groups : [];
    for (const group of groups) {
      if (!isRecord(group) || !Array.isArray(group.modelIds)) continue;
      for (const id of group.modelIds) {
        if (typeof id === "string" && id) ids.add(id);
      }
    }
  }
  return ids.size > 0 ? ids : void 0;
}
function buildAntigravityCatalog(rawModels, fallback, agentModelSorts) {
  const recommendedIds = extractRecommendedModelIds(agentModelSorts);
  function collectGroups(filterIds) {
    const collected = /* @__PURE__ */ new Map();
    for (const [runtimeId, info] of Object.entries(rawModels)) {
      if (!isSelectableRuntimeModelId(runtimeId, info)) continue;
      if (info?.isInternal) continue;
      if (filterIds && !filterIds.has(runtimeId)) continue;
      const displayName = modelDisplayName(info);
      if (runtimeId.endsWith("-tiered")) {
        const baseId = runtimeId.slice(0, -"-tiered".length);
        const group2 = ensureGroup(collected, baseId);
        absorbMetadata(group2, info, displayName);
        if (!group2.unsuffixed) group2.unsuffixed = runtimeId;
        continue;
      }
      const suffix = parseThinkingSuffix(runtimeId);
      const publicId = suffix?.baseId ?? runtimeId;
      const group = ensureGroup(collected, publicId);
      absorbMetadata(group, info, displayName);
      const level = levelFromDisplayName(displayName) ?? suffix?.level;
      if (level) group.variants[level] = runtimeId;
      else group.unsuffixed = runtimeId;
    }
    mergeAgentSingletons(collected);
    return collected;
  }
  let groups = collectGroups(recommendedIds);
  if (groups.size === 0 && recommendedIds) {
    groups = collectGroups();
  }
  if (groups.size === 0) throw new Error("Antigravity catalog contains no supported chat models");
  const models = [];
  const routing = {};
  for (const group of groups.values()) {
    const synthesized = synthesizeModel(group, fallback.models);
    models.push(synthesized.model);
    routing[group.publicId] = synthesized.routing;
  }
  models.sort(comparePublicModels);
  return { models, routing };
}
function positiveTokenLimit(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
}
function ensureGroup(groups, publicId) {
  const existing = groups.get(publicId);
  if (existing) return existing;
  const created = {
    publicId,
    variants: {},
    displayNames: []
  };
  groups.set(publicId, created);
  return created;
}
function absorbMetadata(group, info, displayName) {
  if (displayName) group.displayNames.push(displayName);
  const contextWindow = positiveTokenLimit(info?.maxTokens);
  const maxOutputTokens = positiveTokenLimit(info?.maxOutputTokens);
  if (contextWindow !== void 0) {
    group.contextWindow = Math.min(group.contextWindow ?? contextWindow, contextWindow);
  }
  if (maxOutputTokens !== void 0) {
    group.maxOutputTokens = Math.min(group.maxOutputTokens ?? maxOutputTokens, maxOutputTokens);
  }
  if (info?.supportsThinking === true) group.supportsThinking = true;
  else if (info?.supportsThinking === false && group.supportsThinking !== true) {
    group.supportsThinking = false;
  }
  if (info?.supportsImages === false) group.supportsImages = false;
  else if (info?.supportsImages === true && group.supportsImages === void 0) {
    group.supportsImages = true;
  }
}
function mergeAgentSingletons(groups) {
  for (const [publicId, group] of [...groups.entries()]) {
    if (!publicId.endsWith("-agent") || group.supportsThinking === false) continue;
    const runtimeIds = [group.unsuffixed, ...Object.values(group.variants)].filter(
      (id) => id !== void 0
    );
    if (runtimeIds.length !== 1) continue;
    const [runtimeId] = runtimeIds;
    const family = displayFamily(group.displayNames[0]);
    if (!family) continue;
    const target = [...groups.values()].find(
      (candidate) => candidate.publicId !== publicId && candidate.displayNames.some((name2) => displayFamily(name2) === family)
    );
    if (!target) continue;
    const level = Object.keys(group.variants).find(
      (candidate) => group.variants[candidate] === runtimeId
    ) ?? levelFromDisplayName(group.displayNames[0]);
    if (!level || target.variants[level]) continue;
    target.variants[level] = runtimeId;
    absorbMetadata(
      target,
      {
        supportsThinking: group.supportsThinking,
        supportsImages: group.supportsImages,
        maxTokens: group.contextWindow,
        maxOutputTokens: group.maxOutputTokens
      },
      group.displayNames[0]
    );
    groups.delete(publicId);
  }
}
function parseThinkingSuffix(runtimeId) {
  const lower = runtimeId.toLowerCase();
  for (const { suffix, level } of THINKING_SUFFIXES) {
    if (lower.endsWith(`-${suffix}`)) {
      return { baseId: runtimeId.slice(0, -(suffix.length + 1)), level };
    }
  }
  return void 0;
}
function levelFromDisplayName(displayName) {
  if (!displayName) return void 0;
  for (const { pattern, level } of DISPLAY_LEVELS) {
    if (pattern.test(displayName)) return level;
  }
  return void 0;
}
function modelDisplayName(info) {
  if (!info) return void 0;
  if (typeof info.displayName === "string" && info.displayName) return info.displayName;
  if (typeof info.label === "string" && info.label) return info.label;
  if (typeof info.modelName === "string" && info.modelName) return info.modelName;
  return void 0;
}
function displayFamily(displayName) {
  if (!displayName) return void 0;
  return displayName.replace(/\s*\((?:extra\s*low|extra\s*high|low|medium|high|minimal|thinking)\)\s*$/i, "").trim().toLowerCase();
}
function synthesizeModel(group, fallbackModels) {
  const template = familyTemplate(group.publicId, fallbackModels);
  const advertisedLevels = advertisedThinkingLevels(group);
  const routing = routingFromVariants(group.publicId, group.variants, group.unsuffixed);
  const supportsImages = group.supportsImages ?? template?.input.includes("image") ?? true;
  const reasoning = group.supportsThinking === false ? false : advertisedLevels.size > 0 || group.supportsThinking === true || group.supportsThinking === void 0 && Boolean(template?.reasoning);
  return {
    model: {
      id: group.publicId,
      name: publicModelName(group),
      reasoning,
      thinkingLevelMap: reasoning ? thinkingLevelMapFromLevels(advertisedLevels) : void 0,
      input: supportsImages ? ["text", "image"] : ["text"],
      cost: template?.cost ?? ZERO_COST,
      contextWindow: group.contextWindow ?? template?.contextWindow ?? 128e3,
      maxTokens: group.maxOutputTokens ?? template?.maxTokens ?? 8192
    },
    routing
  };
}
function advertisedThinkingLevels(group) {
  if (group.supportsThinking === false) return /* @__PURE__ */ new Set();
  const levels = new Set(Object.keys(group.variants));
  if (levels.size > 0) return levels;
  if (group.supportsThinking === true) {
    levels.add(ThinkingEffort.High);
  }
  return levels;
}
function routingFromVariants(publicId, variants, unsuffixed) {
  const defaultRequestId = variants[ThinkingEffort.Low] ?? variants[ThinkingEffort.Minimal] ?? variants[ThinkingEffort.Medium] ?? variants[ThinkingEffort.High] ?? unsuffixed ?? publicId;
  const pick = (...keys) => {
    for (const key of keys) {
      const id = variants[key];
      if (id) return id;
    }
    return unsuffixed ?? defaultRequestId;
  };
  return {
    off: pick(
      ThinkingEffort.Low,
      ThinkingEffort.Minimal,
      ThinkingEffort.Medium,
      ThinkingEffort.High
    ),
    routing: {
      minimal: pick(
        ThinkingEffort.Minimal,
        ThinkingEffort.Low,
        ThinkingEffort.Medium,
        ThinkingEffort.High
      ),
      low: pick(
        ThinkingEffort.Low,
        ThinkingEffort.Minimal,
        ThinkingEffort.Medium,
        ThinkingEffort.High
      ),
      medium: pick(
        ThinkingEffort.Medium,
        ThinkingEffort.Low,
        ThinkingEffort.High,
        ThinkingEffort.Minimal
      ),
      high: pick(
        ThinkingEffort.High,
        ThinkingEffort.Medium,
        ThinkingEffort.Low,
        ThinkingEffort.Minimal
      ),
      xhigh: pick(
        ThinkingEffort.Xhigh,
        ThinkingEffort.High,
        ThinkingEffort.Medium,
        ThinkingEffort.Low
      )
    },
    defaultRequestId
  };
}
function thinkingLevelMapFromLevels(levels) {
  const map = {};
  for (const level of PI_LEVELS) {
    map[level] = levels.has(level) ? level : null;
  }
  return map;
}
function familyTemplate(publicId, fallbackModels) {
  if (/^gemini-.*-flash/i.test(publicId)) {
    return fallbackModels.find((model) => /^gemini-.*-flash/i.test(model.id));
  }
  if (/^gemini-.*-pro/i.test(publicId)) {
    return fallbackModels.find((model) => /^gemini-.*-pro/i.test(model.id));
  }
  if (publicId.startsWith("claude-opus")) {
    return fallbackModels.find((model) => model.id.startsWith("claude-opus"));
  }
  if (publicId.startsWith("claude-")) {
    return fallbackModels.find((model) => model.id.startsWith("claude-sonnet")) ?? fallbackModels.find((model) => model.id.startsWith("claude-"));
  }
  if (publicId.startsWith("gpt-oss")) {
    return fallbackModels.find((model) => model.id.startsWith("gpt-oss"));
  }
  if (publicId.startsWith("gemini-")) {
    return fallbackModels.find((model) => model.id.startsWith("gemini-"));
  }
  return void 0;
}
function publicModelName(group) {
  const family = group.displayNames.map((name2) => displayFamily(name2)).find(Boolean);
  if (family) {
    return `${titleCase(family)} (Antigravity)`;
  }
  return `${humanizePublicId(group.publicId)} (Antigravity)`;
}
function titleCase(value) {
  return value.replace(/\b([a-z])/g, (char) => char.toUpperCase());
}
function humanizePublicId(id) {
  const tokens = id.split("-");
  const words = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const next = tokens[i + 1];
    if (token === "gpt" && next === "oss") {
      words.push("GPT-OSS");
      i++;
      continue;
    }
    if (/^\d+$/.test(token) && next && /^\d+$/.test(next)) {
      words.push(`${token}.${next}`);
      i++;
      continue;
    }
    if (/^\d/.test(token)) {
      words.push(token.toUpperCase());
      continue;
    }
    words.push(token.charAt(0).toUpperCase() + token.slice(1));
  }
  return words.join(" ");
}
function parseGeminiVersion(id) {
  const match = id.match(/^gemini-(\d+)(?:\.(\d+))?/i);
  if (!match) return 0;
  return Number(match[1]) * 1e3 + Number(match[2] || 0);
}
function comparePublicModels(a, b) {
  const rankA = modelRank(a.id);
  const rankB = modelRank(b.id);
  if (rankA[0] !== rankB[0]) return rankA[0] - rankB[0];
  if (rankA[1] !== rankB[1]) return rankA[1] - rankB[1];
  return a.id.localeCompare(b.id);
}
function modelRank(id) {
  const version = parseGeminiVersion(id);
  if (/^gemini-.*flash/i.test(id) && !/pro/i.test(id)) return [0, -version];
  if (id.startsWith("claude-opus")) return [1, 0];
  if (id.startsWith("claude-sonnet")) return [2, 0];
  if (id.startsWith("claude-")) return [3, 0];
  if (/^gemini-.*pro/i.test(id)) return [4, -version];
  if (id.startsWith("gemini-")) return [5, -version];
  if (id.startsWith("gpt-oss")) return [6, 0];
  return [7, 0];
}
async function discoverAntigravityModels(apiKey, signal) {
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
    routing: { ...ANTIGRAVITY_ROUTING }
  }, available.data.agentModelSorts);
  return { ...catalog, modelEnums: snapshotDynamicModelEnums() };
}
var OPERATIONS = /* @__PURE__ */ new Set([
  "streamGenerateContent",
  "generateContent",
  "fetchAvailableModels",
  "loadCodeAssist"
]);
async function requestAntigravity(operation, body, credentials, options = {}) {
  if (!OPERATIONS.has(operation)) throw new Error("Unsupported Antigravity operation");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Antigravity body must be a JSON object");
  if (typeof credentials?.token !== "string" || !credentials.token.trim() || /[\p{C}\s]/u.test(credentials.token) || typeof credentials.projectId !== "string" || !credentials.projectId.trim()) {
    throw new Error("Antigravity requires an active token and discovered project");
  }
  options.signal?.throwIfAborted();
  const endpoint = endpointCandidates()[0];
  const suffix = operation === "streamGenerateContent" ? "?alt=sse" : "";
  return antigravityFetch(`${endpoint}/v1internal:${operation}${suffix}`, {
    method: "POST",
    headers: antigravityHeaders(credentials.token),
    body: JSON.stringify({ ...body, project: credentials.projectId }),
    signal: options.signal
  });
}

// lib/adapter.js
var TTL_MS = 4 * 60 * 60 * 1e3;
var ZERO_COST2 = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
var BASE_URL = "https://daily-cloudcode-pa.googleapis.com";
function profilesFor(catalog, stream) {
  const models = (catalog?.models ?? []).map((model) => ({
    ...model,
    api: ANTIGRAVITY_API,
    provider: PROVIDER_ID,
    baseUrl: BASE_URL,
    cost: model.cost ?? ZERO_COST2
  }));
  const provider = {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    baseUrl: BASE_URL,
    auth: { apiKey: {
      name: "Antigravity single-account OAuth",
      async resolve({ credential }) {
        if (!credential?.key) return void 0;
        return { auth: { apiKey: credential.key }, source: "DSH Antigravity credential" };
      }
    } },
    getModels: () => models,
    stream: (model, context, options) => stream(model, context, options),
    streamSimple: (model, context, options) => stream(model, context, options)
  };
  return /* @__PURE__ */ new Map([[PROVIDER_ID, {
    provider: PROVIDER_ID,
    displayName: PROVIDER_NAME,
    piProvider: provider,
    modelErrors: /* @__PURE__ */ new Map(),
    configuredMaxTokens: /* @__PURE__ */ new Map(),
    retryPolicy: resolveRetryPolicy(void 0, "dsh-antigravity"),
    streamIdleTimeoutMs: 3e5,
    maxRequestImageBytes: 20 * 1024 * 1024,
    requestImagePixelBudget: 2048 * 2048,
    requestImageMaxBytes: 1024 * 1024
  }]]);
}
var AntigravityAdapter = class extends PiAiAdapter {
  constructor(ctx, auth, {
    cached = null,
    saveCatalog = async () => {
    },
    discover = discoverAntigravityModels,
    stream = streamAntigravity,
    request = requestAntigravity,
    publishCatalog = applyAntigravityCatalog,
    now = Date.now
  } = {}) {
    const state = { profiles: profilesFor(cached?.catalog, stream), cached, inflight: null, generation: 0 };
    const keys = new AsyncLocalStorage2();
    super({
      profiles: () => state.profiles,
      resolveApiKey: async () => {
        const key = keys.getStore();
        if (key === void 0) throw new LlmError("Antigravity stream has no request credential scope.", "INVALID_CONFIG");
        return key;
      },
      auth: {
        credentials: new InMemoryCredentialStore(),
        authContext: { env: async () => void 0, fileExists: async () => false }
      },
      resolveAttachments: () => ctx.get("attachments")
    });
    if (cached?.catalog) publishCatalog(cached.catalog);
    this.state = state;
    this.keys = keys;
    this.catalogLifetime = new AbortController();
    this.catalogOperations = /* @__PURE__ */ new Set();
    this.auth = auth;
    this.saveCatalog = saveCatalog;
    this.discover = discover;
    this.wireStream = stream;
    this.publishCatalog = publishCatalog;
    this.now = now;
    this.antigravityTransport = Object.freeze({
      version: 1,
      request: async (operation, body, options = {}) => {
        const grant = await auth.getCredentials(options.signal);
        options.signal?.throwIfAborted();
        return request(operation, body, { token: grant.access, projectId: grant.projectId }, options);
      }
    });
  }
  /** Called only after explicit login, or a model request whose catalog needs refreshing. */
  refreshModels(signal) {
    const state = this.state;
    if (state.inflight) return state.inflight;
    const generation = state.generation;
    signal = signal ? AbortSignal.any([signal, this.catalogLifetime.signal]) : this.catalogLifetime.signal;
    signal.throwIfAborted();
    const operation = (async () => {
      const key = await this.auth.getApiKey(signal);
      signal?.throwIfAborted();
      const catalog = await this.discover(key, signal);
      signal?.throwIfAborted();
      if (generation !== state.generation) return;
      if (!Array.isArray(catalog?.models) || catalog.models.length === 0) {
        throw new LlmError("Antigravity returned no usable chat models.", "MODEL_CATALOG_UNAVAILABLE");
      }
      const next = { catalog, checkedAt: this.now() };
      await this.saveCatalog(next);
      if (generation !== state.generation) return;
      this.publishCatalog(catalog);
      state.cached = next;
      state.profiles = profilesFor(catalog, this.wireStream);
    })();
    state.inflight = operation;
    this.catalogOperations.add(operation);
    operation.finally(() => {
      this.catalogOperations.delete(operation);
      if (state.inflight === operation) state.inflight = null;
    }).catch(() => {
    });
    return operation;
  }
  /** Logout invalidates a pending discovery as well as the advertised catalog. */
  clearCatalog() {
    this.state.generation++;
    this.state.cached = null;
    this.state.inflight = null;
    this.state.profiles = profilesFor(null, this.wireStream);
    return this.saveCatalog(null);
  }
  async prepareCall(provider, model, signal) {
    signal?.throwIfAborted();
    const cached = this.state.cached;
    if (!cached || this.now() - cached.checkedAt >= TTL_MS) await this.refreshModels(signal);
    signal?.throwIfAborted();
    const prepared = await super.prepareCall(provider, model, signal);
    return { ...prepared, stream: (options) => this.withRequestKey(options, () => prepared.stream(options)) };
  }
  async *stream(options) {
    options.signal?.throwIfAborted();
    const cached = this.state.cached;
    if (!cached || this.now() - cached.checkedAt >= TTL_MS) await this.refreshModels(options.signal);
    yield* this.withRequestKey(options, () => super.stream(options));
  }
  /** Freeze one refreshed key per request without a mutable global or shared current token. */
  async *withRequestKey(options, source) {
    options.signal?.throwIfAborted();
    const key = await this.auth.getApiKey(options.signal);
    options.signal?.throwIfAborted();
    const iterator = this.keys.run(key, () => source()[Symbol.asyncIterator]());
    let done = false;
    try {
      while (true) {
        const item = await this.keys.run(key, () => iterator.next());
        if (item.done) {
          done = true;
          return;
        }
        yield item.value;
      }
    } finally {
      if (!done && iterator.return) await this.keys.run(key, () => iterator.return());
    }
  }
  /** Drain only catalog discovery; an already running model stream is not cancelled. */
  async closeCatalog() {
    this.state.generation++;
    this.catalogLifetime.abort();
    await Promise.allSettled(this.catalogOperations);
  }
};

// lib/auth.js
import { credentialKey, credentialRef } from "@deepseek-ai/dsh-credentials";
import { LlmError as LlmError2 } from "@deepseek-ai/dsh-llm";
var GRANT_KEY = credentialKey("dsh-antigravity", "default");
var REFRESH_TIMEOUT_MS = 15e3;
var REFRESH_SKEW_MS = 6e4;
function authError(message) {
  return new LlmError2(message, "AUTH");
}
function normalizeGrant(value, previous) {
  const grant = { ...value, type: "oauth", refresh: value?.refresh || previous?.refresh };
  if (typeof grant.access !== "string" || !grant.access || typeof grant.refresh !== "string" || !grant.refresh || typeof grant.expires !== "number" || !Number.isFinite(grant.expires) || typeof grant.projectId !== "string" || !grant.projectId) {
    throw authError("Antigravity \u767B\u5F55\u51ED\u636E\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
  }
  return {
    type: "oauth",
    access: grant.access,
    refresh: grant.refresh,
    expires: grant.expires,
    projectId: grant.projectId,
    ...typeof grant.email === "string" && grant.email ? { email: grant.email } : {}
  };
}
function storedGrant(record) {
  if (!record) throw authError("\u5C1A\u672A\u767B\u5F55 Antigravity\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u767B\u5F55\u3002");
  if (record.kind !== "grant" || record.payload?.type !== "oauth") {
    throw authError("Antigravity \u767B\u5F55\u51ED\u636E\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
  }
  return normalizeGrant(record.payload);
}
function maskedEmail(email) {
  if (!email) return void 0;
  const at = email.indexOf("@");
  return at > 0 ? `${email[0]}***${email.slice(at)}` : "***";
}
function fullCallback(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 8192) {
    throw authError("\u8BF7\u7C98\u8D34\u5B8C\u6574\u7684 OAuth \u56DE\u8C03\u5730\u5740\u3002");
  }
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw authError("\u8BF7\u7C98\u8D34\u5B8C\u6574\u7684 OAuth \u56DE\u8C03\u5730\u5740\u3002");
  }
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/oauth-callback" || !url.searchParams.get("code") || !url.searchParams.get("state") || url.username || url.password) {
    throw authError("\u56DE\u8C03\u5730\u5740\u5FC5\u987B\u5305\u542B\u672C\u673A OAuth \u56DE\u8C03\u8DEF\u5F84\u3001code \u548C state\u3002");
  }
  return input.trim();
}
function createAuth(ctx, { login, refresh } = {}) {
  async function oauthClient() {
    const [id, secret] = await Promise.all([
      ctx.credentials.resolve(credentialRef("ANTIGRAVITY_CLIENT_ID")),
      ctx.credentials.resolve(credentialRef("ANTIGRAVITY_CLIENT_SECRET"))
    ]);
    if (!id?.value || !secret?.value) {
      throw new LlmError2("\u8BF7\u5148\u914D\u7F6E\u672C\u673A Antigravity OAuth \u5E94\u7528\u53C2\u6570\u3002", "OAUTH_CLIENT_NOT_CONFIGURED");
    }
    return { clientId: id.value, clientSecret: secret.value };
  }
  login ??= async (callbacks) => loginAntigravity({ ...callbacks, client: await oauthClient() });
  refresh ??= async (grant, signal) => refreshAntigravityToken(grant, signal, await oauthClient());
  let flow;
  let disposed = false;
  let generation = 0;
  const listeners = /* @__PURE__ */ new Set();
  const tasks = /* @__PURE__ */ new Set();
  function changed(kind) {
    for (const listener of listeners) listener({ kind });
  }
  function active(candidate) {
    return !disposed && flow === candidate && candidate.generation === generation && !candidate.controller.signal.aborted;
  }
  function invalidate() {
    generation++;
    const previous = flow;
    if (previous?.status === "pending") {
      previous.status = "cancelled";
      previous.authUrl = void 0;
      previous.callbackRejected = false;
      previous.controller.abort(new Error("Antigravity login cancelled"));
      previous.manual.reject(previous.controller.signal.reason);
      previous.ready.resolve();
    }
  }
  async function status() {
    const record = await ctx.credentials.readRecord(GRANT_KEY);
    let grant;
    try {
      if (record) grant = storedGrant(record);
    } catch (error) {
      if (error.code !== "AUTH") throw error;
    }
    return {
      authenticated: Boolean(grant),
      ...grant ? { expires: grant.expires, email: maskedEmail(grant.email), expired: grant.expires <= Date.now() } : {},
      login: {
        status: flow?.status ?? "idle",
        ...flow?.status === "pending" && flow.authUrl ? { authUrl: flow.authUrl } : {},
        ...flow?.status === "error" ? { error: flow.clientMissing ? "\u8BF7\u5148\u914D\u7F6E\u672C\u673A Antigravity OAuth \u5E94\u7528\u53C2\u6570\u3002" : "Antigravity \u767B\u5F55\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u8BD5\u3002" } : flow?.callbackRejected ? { error: "\u56DE\u8C03\u5730\u5740\u65E0\u6548\uFF0C\u8BF7\u786E\u8BA4\u5B83\u6765\u81EA\u672C\u6B21\u767B\u5F55\u540E\u91CD\u65B0\u7C98\u8D34\u3002" } : {}
      }
    };
  }
  async function getCredentials(signal) {
    const operationSignal2 = signal ? AbortSignal.any([signal, AbortSignal.timeout(REFRESH_TIMEOUT_MS)]) : AbortSignal.timeout(REFRESH_TIMEOUT_MS);
    operationSignal2.throwIfAborted();
    const current = storedGrant(await ctx.credentials.readRecord(GRANT_KEY));
    if (current.expires > Date.now() + REFRESH_SKEW_MS) return current;
    const record = await ctx.credentials.modifyRecord(GRANT_KEY, async (latest) => {
      operationSignal2.throwIfAborted();
      const grant = storedGrant(latest);
      if (grant.expires > Date.now() + REFRESH_SKEW_MS) return void 0;
      let next;
      try {
        next = normalizeGrant(await refresh(grant, operationSignal2), grant);
      } catch (error) {
        operationSignal2.throwIfAborted();
        if (error?.code === "AUTH" || error?.code === "OAUTH_INVALID_GRANT" || /invalid_grant|revoked|unauthorized/i.test(String(error?.message))) {
          throw authError("Antigravity \u6388\u6743\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
        }
        throw error;
      }
      operationSignal2.throwIfAborted();
      return { kind: "grant", payload: next };
    });
    return storedGrant(record);
  }
  async function startLogin() {
    if (disposed) throw authError("Antigravity \u63D2\u4EF6\u5DF2\u505C\u6B62\u3002");
    if (flow?.status === "pending") {
      await flow.ready.promise;
      return status();
    }
    const candidate = {
      generation: ++generation,
      controller: new AbortController(),
      ready: Promise.withResolvers(),
      manual: Promise.withResolvers(),
      status: "pending",
      authUrl: void 0,
      manualSubmitted: false
    };
    candidate.manual.promise.catch(() => {
    });
    flow = candidate;
    function manualInput() {
      if (!active(candidate)) return Promise.reject(candidate.controller.signal.reason);
      if (candidate.manualSubmitted) {
        candidate.manual = Promise.withResolvers();
        candidate.manual.promise.catch(() => {
        });
        candidate.manualSubmitted = false;
        candidate.callbackRejected = true;
      }
      return candidate.manual.promise;
    }
    const task = (async () => {
      try {
        const credentials = normalizeGrant(await login({
          signal: candidate.controller.signal,
          onAuth({ url }) {
            if (!active(candidate)) return;
            const parsed = new URL(url);
            if (parsed.protocol !== "https:" || parsed.hostname !== "accounts.google.com") {
              throw authError("Antigravity \u8FD4\u56DE\u4E86\u65E0\u6548\u7684 Google \u6388\u6743\u5730\u5740\u3002");
            }
            candidate.authUrl = parsed.href;
            candidate.ready.resolve();
          },
          onPrompt: () => manualInput(),
          onManualCodeInput: () => manualInput()
        }));
        if (!active(candidate)) return;
        await ctx.credentials.modifyRecord(GRANT_KEY, async () => {
          if (!active(candidate)) return void 0;
          candidate.committing = true;
          return { kind: "grant", payload: credentials };
        });
        if (!active(candidate)) return;
        candidate.status = "complete";
        candidate.authUrl = void 0;
        changed("login");
      } catch (error) {
        if (active(candidate)) {
          candidate.status = "error";
          candidate.clientMissing = error?.code === "OAUTH_CLIENT_NOT_CONFIGURED";
        }
      } finally {
        candidate.authUrl = void 0;
        candidate.ready.resolve();
        candidate.manual.reject(new Error("Antigravity login finished"));
      }
    })();
    candidate.task = task;
    tasks.add(task);
    task.finally(() => tasks.delete(task)).catch(() => {
    });
    await candidate.ready.promise;
    return status();
  }
  return {
    getCredentials,
    async getApiKey(signal) {
      const grant = await getCredentials(signal);
      return JSON.stringify({ token: grant.access, projectId: grant.projectId });
    },
    status,
    startLogin,
    async completeLogin(input) {
      if (flow?.status !== "pending" || flow.manualSubmitted) throw authError("\u6CA1\u6709\u7B49\u5F85\u56DE\u8C03\u7684 Antigravity \u767B\u5F55\u3002");
      const callback = fullCallback(input);
      flow.manualSubmitted = true;
      flow.callbackRejected = false;
      flow.manual.resolve(callback);
      return status();
    },
    async cancelLogin() {
      if (flow?.status === "pending" && flow.committing) await flow.task;
      else invalidate();
      return status();
    },
    async logout() {
      const previous = flow;
      invalidate();
      await ctx.credentials.deleteRecord(GRANT_KEY);
      if (flow === previous) flow = void 0;
      changed("logout");
      return status();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose() {
      disposed = true;
      invalidate();
      listeners.clear();
      await Promise.allSettled(tasks);
    }
  };
}

// lib/routes.js
var AUTH_API_PATH = "/api/dsh-antigravity";
function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
function failure(status, code, message) {
  return json(status, { ok: false, error: { code, message } });
}
function mountRoutes(ctx, auth) {
  const actions = {
    status: () => auth.status(),
    "start-login": () => auth.startLogin(),
    "complete-login": (body) => auth.completeLogin(body.input),
    "cancel-login": () => auth.cancelLogin(),
    logout: () => auth.logout()
  };
  const disposers = Object.entries(actions).map(([action, execute]) => ctx.connection.fetch.register({
    path: `${AUTH_API_PATH}/${action}`,
    methods: ["POST"],
    requestBody: "buffered",
    async fetch(request) {
      const admission = ctx.connection.admit(request);
      if ("rejection" in admission) {
        return failure(admission.rejection, "UNAUTHORIZED", "\u8BF7\u5148\u767B\u5F55 DSH\u3002");
      }
      if (request.method !== "POST") return failure(405, "METHOD_NOT_ALLOWED", "\u53EA\u63A5\u53D7 POST \u8BF7\u6C42\u3002");
      if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
        return failure(415, "INVALID_CONTENT_TYPE", "\u8BF7\u6C42\u5FC5\u987B\u4F7F\u7528 application/json\u3002");
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return failure(400, "INVALID_REQUEST", "\u8BF7\u6C42\u5FC5\u987B\u5305\u542B JSON \u5BF9\u8C61\u3002");
      }
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => action !== "complete-login" || key !== "input") || action === "complete-login" && (typeof body.input !== "string" || !body.input || body.input.length > 8192)) {
        return failure(400, "INVALID_REQUEST", "\u8BF7\u6C42\u53C2\u6570\u65E0\u6548\u3002");
      }
      try {
        return json(200, { ok: true, value: await execute(body) });
      } catch (error) {
        return failure(
          error?.code === "AUTH" ? 400 : 500,
          error?.code === "AUTH" ? "AUTH" : "AUTH_OPERATION_FAILED",
          error?.code === "AUTH" ? error.message : "Antigravity \u8BA4\u8BC1\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u8BD5\u3002"
        );
      }
    }
  }));
  return async () => {
    await Promise.all(disposers.map((dispose) => dispose()));
  };
}

// index.js
var name = "antigravity";
var inject = ["llm", "credentials", "storageDomain"];
var modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.array(z.enum(["text", "image"])),
  contextWindow: z.number().positive(),
  maxTokens: z.number().positive()
}).passthrough();
var cacheSpec = defineDomain({
  name: "antigravity_catalog",
  version: 1,
  tables: { cache: domainTable(z.object({
    checkedAt: z.number(),
    catalog: z.object({
      models: z.array(modelSchema),
      routing: z.record(z.string(), z.unknown()),
      modelEnums: z.record(z.string(), z.string()).optional()
    })
  })) }
});
async function apply(ctx) {
  const domain = await ctx.storageDomain.open(cacheSpec);
  const cache = domain.table("cache");
  const lifetime = new AbortController();
  const operations = /* @__PURE__ */ new Set();
  const auth = createAuth(ctx);
  const adapter = new AntigravityAdapter(ctx, auth, {
    cached: cache.get("catalog") ?? null,
    saveCatalog: (value) => value === null ? cache.delete("catalog") : cache.put("catalog", value)
  });
  let catalogError = null;
  let authEpoch = 0;
  const authStatus = auth.status;
  auth.status = async () => ({
    ...await authStatus(),
    catalog: {
      models: adapter.state.cached?.catalog.models.length ?? 0,
      loading: Boolean(adapter.state.inflight),
      ...catalogError ? { error: catalogError } : {}
    }
  });
  const notifyModels = () => ctx.emit("llm/adapters-updated");
  const unsubscribe = auth.subscribe(({ kind }) => {
    const epoch = ++authEpoch;
    const operation = (async () => {
      catalogError = null;
      await adapter.clearCatalog();
      if (epoch !== authEpoch || lifetime.signal.aborted) return;
      notifyModels();
      if (kind === "login") {
        await adapter.refreshModels(lifetime.signal);
        if (epoch === authEpoch && !lifetime.signal.aborted) notifyModels();
      }
    })();
    operations.add(operation);
    operation.catch(() => {
      if (epoch !== authEpoch || lifetime.signal.aborted) return;
      catalogError = "\u767B\u5F55\u51ED\u636E\u5DF2\u4FDD\u5B58\uFF0C\u4F46\u6A21\u578B\u76EE\u5F55\u672A\u80FD\u8BFB\u53D6\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\u3002";
      ctx.logger.warn("antigravity: model catalog refresh failed; existing provider selections were not changed");
    }).finally(() => operations.delete(operation));
  });
  ctx.effect(() => {
    const registration = ctx.llm.registerAdapter(["antigravity"], adapter);
    return async () => {
      unsubscribe();
      authEpoch++;
      lifetime.abort();
      registration();
      await auth.dispose();
      await adapter.closeCatalog();
      await Promise.allSettled(operations);
      await domain.close();
    };
  }, "antigravity provider");
  ctx.inject(["connection"], (child) => child.effect(() => mountRoutes(child, auth), "antigravity authenticated login routes"));
}
export {
  AntigravityAdapter,
  apply,
  inject,
  name
};
