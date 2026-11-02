/** Use the Host's fetch implementation without replacing its transport or dispatcher. */
export async function antigravityFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  return globalThis.fetch(input, { ...init, redirect: "error" });
}
