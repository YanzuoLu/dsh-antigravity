import { AsyncLocalStorage } from 'node:async_hooks'
import { InMemoryCredentialStore } from '@earendil-works/pi-ai'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import { LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import {
  ANTIGRAVITY_API, PROVIDER_ID, PROVIDER_NAME,
  applyAntigravityCatalog, discoverAntigravityModels,
  streamAntigravity, requestAntigravity,
} from './core.js'

const TTL_MS = 4 * 60 * 60 * 1000
const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
const BASE_URL = 'https://daily-cloudcode-pa.googleapis.com'

/** Materialize native pi-ai model descriptors without losing discovered effort maps or input limits. */
function profilesFor(catalog, stream) {
  const models = (catalog?.models ?? []).map(model => ({
    ...model,
    api: ANTIGRAVITY_API,
    provider: PROVIDER_ID,
    baseUrl: BASE_URL,
    cost: model.cost ?? ZERO_COST,
  }))
  const provider = {
    id: PROVIDER_ID, name: PROVIDER_NAME, baseUrl: BASE_URL,
    auth: { apiKey: {
      name: 'Antigravity single-account OAuth',
      async resolve({ credential }) {
        if (!credential?.key) return undefined
        return { auth: { apiKey: credential.key }, source: 'DSH Antigravity credential' }
      },
    } },
    getModels: () => models,
    stream: (model, context, options) => stream(model, context, options),
    streamSimple: (model, context, options) => stream(model, context, options),
  }
  // ResolvedPiAiProviderProfile is a public constructor contract. These scalar
  // request/image defaults match the pinned DSH 0.2.0-rc.2 provider schema.
  return new Map([[PROVIDER_ID, {
    provider: PROVIDER_ID,
    displayName: PROVIDER_NAME,
    piProvider: provider,
    modelErrors: new Map(),
    configuredMaxTokens: new Map(),
    retryPolicy: resolveRetryPolicy(undefined, 'dsh-antigravity'),
    streamIdleTimeoutMs: 300000,
    maxRequestImageBytes: 20 * 1024 * 1024,
    requestImagePixelBudget: 2048 * 2048,
    requestImageMaxBytes: 1024 * 1024,
  }]])
}

/**
 * Keep DSH's native message, attachment, tool-result and replay conversion.
 * This plugin supplies only the Antigravity catalog, credential and wire stream.
 */
export class AntigravityAdapter extends PiAiAdapter {
  constructor(ctx, auth, {
    cached = null,
    saveCatalog = async () => {},
    discover = discoverAntigravityModels,
    stream = streamAntigravity,
    request = requestAntigravity,
    publishCatalog = applyAntigravityCatalog,
    now = Date.now,
  } = {}) {
    const state = { profiles: profilesFor(cached?.catalog, stream), cached, inflight: null, generation: 0 }
    const keys = new AsyncLocalStorage()
    super({
      profiles: () => state.profiles,
      resolveApiKey: async () => {
        const key = keys.getStore()
        if (key === undefined) throw new LlmError('Antigravity stream has no request credential scope.', 'INVALID_CONFIG')
        return key
      },
      auth: {
        credentials: new InMemoryCredentialStore(),
        authContext: { env: async () => undefined, fileExists: async () => false },
      },
      resolveAttachments: () => ctx.get('attachments'),
    })
    if (cached?.catalog) publishCatalog(cached.catalog)
    this.state = state
    this.keys = keys
    this.catalogLifetime = new AbortController()
    this.catalogOperations = new Set()
    this.auth = auth
    this.saveCatalog = saveCatalog
    this.discover = discover
    this.wireStream = stream
    this.publishCatalog = publishCatalog
    this.now = now
    // This is a transport seam, not a search implementation or model-facing tool.
    // dsh-web-search owns all Google grounding payloads and citation processing.
    this.antigravityTransport = Object.freeze({
      version: 1,
      request: async (operation, body, options = {}) => {
        const grant = await auth.getCredentials(options.signal)
        options.signal?.throwIfAborted()
        return request(operation, body, { token: grant.access, projectId: grant.projectId }, options)
      },
    })
  }

  /** Called only after explicit login, or a model request whose catalog needs refreshing. */
  refreshModels(signal) {
    const state = this.state
    if (state.inflight) return state.inflight
    const generation = state.generation
    signal = signal ? AbortSignal.any([signal, this.catalogLifetime.signal]) : this.catalogLifetime.signal
    signal.throwIfAborted()
    const operation = (async () => {
      const key = await this.auth.getApiKey(signal)
      signal?.throwIfAborted()
      const catalog = await this.discover(key, signal)
      signal?.throwIfAborted()
      if (generation !== state.generation) return
      if (!Array.isArray(catalog?.models) || catalog.models.length === 0) {
        throw new LlmError('Antigravity returned no usable chat models.', 'MODEL_CATALOG_UNAVAILABLE')
      }
      const next = { catalog, checkedAt: this.now() }
      await this.saveCatalog(next)
      if (generation !== state.generation) return
      this.publishCatalog(catalog)
      state.cached = next
      state.profiles = profilesFor(catalog, this.wireStream)
    })()
    state.inflight = operation
    this.catalogOperations.add(operation)
    operation.finally(() => {
      this.catalogOperations.delete(operation)
      if (state.inflight === operation) state.inflight = null
    }).catch(() => {})
    return operation
  }

  /** Logout invalidates a pending discovery as well as the advertised catalog. */
  clearCatalog() {
    this.state.generation++
    this.state.cached = null
    this.state.inflight = null
    this.state.profiles = profilesFor(null, this.wireStream)
    return this.saveCatalog(null)
  }

  async prepareCall(provider, model, signal) {
    signal?.throwIfAborted()
    const cached = this.state.cached
    if (!cached || this.now() - cached.checkedAt >= TTL_MS) await this.refreshModels(signal)
    signal?.throwIfAborted()
    const prepared = await super.prepareCall(provider, model, signal)
    return { ...prepared, stream: options => this.withRequestKey(options, () => prepared.stream(options)) }
  }

  async *stream(options) {
    options.signal?.throwIfAborted()
    const cached = this.state.cached
    if (!cached || this.now() - cached.checkedAt >= TTL_MS) await this.refreshModels(options.signal)
    yield* this.withRequestKey(options, () => super.stream(options))
  }

  /** Freeze one refreshed key per request without a mutable global or shared current token. */
  async *withRequestKey(options, source) {
    options.signal?.throwIfAborted()
    const key = await this.auth.getApiKey(options.signal)
    options.signal?.throwIfAborted()
    const iterator = this.keys.run(key, () => source()[Symbol.asyncIterator]())
    let done = false
    try {
      while (true) {
        const item = await this.keys.run(key, () => iterator.next())
        if (item.done) { done = true; return }
        yield item.value
      }
    } finally {
      if (!done && iterator.return) await this.keys.run(key, () => iterator.return())
    }
  }

  /** Drain only catalog discovery; an already running model stream is not cancelled. */
  async closeCatalog() {
    this.state.generation++
    this.catalogLifetime.abort()
    await Promise.allSettled(this.catalogOperations)
  }
}
