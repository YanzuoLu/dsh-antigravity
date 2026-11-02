// dsh-antigravity model display metadata only. MIT.

// lib/model-display.js
function cleanName(name2) {
  return typeof name2 === "string" ? name2.replace(/\s*\(antigravity\)\s*$/iu, "") : name2;
}
function normalizeProfiles(profiles) {
  if (!(profiles instanceof Map)) return profiles;
  const profile = profiles.get("antigravity");
  const provider = profile?.piProvider;
  if (profile?.provider !== "antigravity" || provider?.id !== "antigravity" || typeof provider.getModels !== "function") return profiles;
  const originalModels = provider.getModels();
  if (!Array.isArray(originalModels)) return profiles;
  const models = originalModels.map((model) => ({ ...model, name: cleanName(model.name) }));
  const normalized = new Map(profiles);
  normalized.set("antigravity", {
    ...profile,
    piProvider: { ...provider, getModels: () => models }
  });
  return normalized;
}
function attachModelDisplay(adapter) {
  if (adapter?.constructor?.name !== "AntigravityAdapter") return void 0;
  const state = adapter.state;
  if (!state) return void 0;
  const descriptor = Object.getOwnPropertyDescriptor(state, "profiles");
  if (!descriptor || !("value" in descriptor) || !(descriptor.value instanceof Map) || !descriptor.writable || !descriptor.configurable) return void 0;
  let profiles = normalizeProfiles(descriptor.value);
  const getProfiles = () => profiles;
  Object.defineProperty(state, "profiles", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get: getProfiles,
    set: (value) => {
      profiles = normalizeProfiles(value);
    }
  });
  return () => {
    if (Object.getOwnPropertyDescriptor(state, "profiles")?.get !== getProfiles) return;
    Object.defineProperty(state, "profiles", {
      configurable: true,
      enumerable: descriptor.enumerable,
      writable: true,
      value: profiles
    });
  };
}

// model-display-entry.js
var name = "antigravity-model-display";
var inject = ["llm"];
function apply(ctx) {
  ctx.effect(() => {
    const attached = /* @__PURE__ */ new Map();
    const sync = () => {
      const adapter = ctx.llm.adapters.get("antigravity")?.adapter;
      for (const [previous, dispose2] of attached) {
        if (previous === adapter) continue;
        dispose2();
        attached.delete(previous);
      }
      if (!adapter || attached.has(adapter)) return;
      const dispose = attachModelDisplay(adapter);
      if (!dispose) return;
      attached.set(adapter, dispose);
      ctx.emit("llm/adapters-updated");
    };
    const unsubscribe = ctx.on("llm/adapters-updated", sync);
    sync();
    return () => {
      unsubscribe();
      for (const dispose of attached.values()) dispose();
      attached.clear();
    };
  }, "antigravity model display metadata");
}
export {
  apply,
  inject,
  name
};
