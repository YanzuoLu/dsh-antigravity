/** Remove only a redundant trailing provider label from a model display name. */
export function cleanName(name) {
  return typeof name === 'string' ? name.replace(/\s*\(antigravity\)\s*$/iu, '') : name
}

/** Copy this provider's metadata without mutating model snapshots already used by calls. */
export function normalizeProfiles(profiles) {
  if (!(profiles instanceof Map)) return profiles
  const profile = profiles.get('antigravity')
  const provider = profile?.piProvider
  if (profile?.provider !== 'antigravity' || provider?.id !== 'antigravity' || typeof provider.getModels !== 'function') return profiles
  const originalModels = provider.getModels()
  if (!Array.isArray(originalModels)) return profiles
  const models = originalModels.map(model => ({ ...model, name: cleanName(model.name) }))
  const normalized = new Map(profiles)
  normalized.set('antigravity', {
    ...profile,
    piProvider: { ...provider, getModels: () => models },
  })
  return normalized
}

/** Normalize each assignment to the provider-owned profile map, once per assignment. */
export function attachModelDisplay(adapter) {
  if (adapter?.constructor?.name !== 'AntigravityAdapter') return undefined
  const state = adapter.state
  if (!state) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(state, 'profiles')
  if (!descriptor || !('value' in descriptor) || !(descriptor.value instanceof Map) || !descriptor.writable || !descriptor.configurable) return undefined
  let profiles = normalizeProfiles(descriptor.value)
  const getProfiles = () => profiles
  Object.defineProperty(state, 'profiles', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get: getProfiles,
    set: value => { profiles = normalizeProfiles(value) },
  })
  return () => {
    if (Object.getOwnPropertyDescriptor(state, 'profiles')?.get !== getProfiles) return
    Object.defineProperty(state, 'profiles', {
      configurable: true,
      enumerable: descriptor.enumerable,
      writable: true,
      value: profiles,
    })
  }
}
