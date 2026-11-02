import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { AntigravityAdapter } from './lib/adapter.js'
import { createAuth } from './lib/auth.js'
import { mountRoutes } from './lib/routes.js'

export const name = 'antigravity'
export const inject = ['llm', 'credentials', 'storageDomain']
export { AntigravityAdapter } from './lib/adapter.js'

const modelSchema = z.object({
  id: z.string(), name: z.string(), input: z.array(z.enum(['text', 'image'])),
  contextWindow: z.number().positive(), maxTokens: z.number().positive(),
}).passthrough()
const cacheSpec = defineDomain({
  name: 'antigravity_catalog', version: 1,
  tables: { cache: domainTable(z.object({
    checkedAt: z.number(),
    catalog: z.object({
      models: z.array(modelSchema), routing: z.record(z.string(), z.unknown()),
      modelEnums: z.record(z.string(), z.string()).optional(),
    }),
  })) },
})

/** Mount one native model provider and its authenticated single-account login UI. */
export async function apply(ctx) {
  const domain = await ctx.storageDomain.open(cacheSpec)
  const cache = domain.table('cache')
  const lifetime = new AbortController()
  const operations = new Set()
  const auth = createAuth(ctx)
  const adapter = new AntigravityAdapter(ctx, auth, {
    cached: cache.get('catalog') ?? null,
    saveCatalog: value => value === null ? cache.delete('catalog') : cache.put('catalog', value),
  })
  let catalogError = null
  let authEpoch = 0
  const authStatus = auth.status
  auth.status = async () => ({
    ...await authStatus(),
    catalog: {
      models: adapter.state.cached?.catalog.models.length ?? 0,
      loading: Boolean(adapter.state.inflight),
      ...(catalogError ? { error: catalogError } : {}),
    },
  })
  const notifyModels = () => ctx.emit('llm/adapters-updated')
  const unsubscribe = auth.subscribe(({ kind }) => {
    const epoch = ++authEpoch
    const operation = (async () => {
      catalogError = null
      await adapter.clearCatalog()
      if (epoch !== authEpoch || lifetime.signal.aborted) return
      notifyModels()
      if (kind === 'login') {
        await adapter.refreshModels(lifetime.signal)
        if (epoch === authEpoch && !lifetime.signal.aborted) notifyModels()
      }
    })()
    operations.add(operation)
    operation.catch(() => {
      if (epoch !== authEpoch || lifetime.signal.aborted) return
      catalogError = '登录凭据已保存，但模型目录未能读取，请重新登录后重试。'
      ctx.logger.warn('antigravity: model catalog refresh failed; existing provider selections were not changed')
    }).finally(() => operations.delete(operation))
  })
  ctx.effect(() => {
    const registration = ctx.llm.registerAdapter(['antigravity'], adapter)
    return async () => {
      unsubscribe()
      authEpoch++
      lifetime.abort()
      registration()
      await auth.dispose()
      await adapter.closeCatalog()
      await Promise.allSettled(operations)
      await domain.close()
    }
  }, 'antigravity provider')
  ctx.inject(['connection'], child => child.effect(() => mountRoutes(child, auth), 'antigravity authenticated login routes'))
}
