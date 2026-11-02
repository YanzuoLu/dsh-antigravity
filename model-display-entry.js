import { attachModelDisplay } from './lib/model-display.js'

export const name = 'antigravity-model-display'
export const inject = ['llm']

/** Attach only metadata normalization, leaving the registered provider and active calls intact. */
export function apply(ctx) {
  ctx.effect(() => {
    const attached = new Map()
    const sync = () => {
      const adapter = ctx.llm.adapters.get('antigravity')?.adapter
      for (const [previous, dispose] of attached) {
        if (previous === adapter) continue
        dispose()
        attached.delete(previous)
      }
      if (!adapter || attached.has(adapter)) return
      const dispose = attachModelDisplay(adapter)
      if (!dispose) return
      attached.set(adapter, dispose)
      ctx.emit('llm/adapters-updated')
    }
    const unsubscribe = ctx.on('llm/adapters-updated', sync)
    sync()
    return () => {
      unsubscribe()
      for (const dispose of attached.values()) dispose()
      attached.clear()
    }
  }, 'antigravity model display metadata')
}
