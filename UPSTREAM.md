# Provider core provenance

The chat, model discovery/grouping, wire metadata, diagnostics, and OAuth protocol code in `src/upstream/` is derived from [Rahularya01/pi-antigravity](https://github.com/Rahularya01/pi-antigravity) at commit `3870729ede108e439ad2a48ca0448b2245e863b2` (package version 0.11.0).

The user's earlier reference fork is [YanzuoLu/pi-antigravity](https://github.com/YanzuoLu/pi-antigravity) at `24d3829fd2e818df63e00d9c90fc9257ef430a38` (0.7.1-fork.1), based on upstream `ce5b0b9e61dac774f1e0545b91e689d0baabda1a`. This port preserves the provider-only intent rather than copying the old fork's extension entry point.

## Local adaptation

- Expose a small ESM provider boundary through [core-entry.ts](<src/upstream/core-entry.ts>) and build it into [core.js](<lib/core.js>) with [build-core.mjs](<scripts/build-core.mjs>).
- Use the Host's existing global `fetch`. Do not install a dispatcher, start a prewarm request, open a browser, or modify any process-wide HTTP implementation.
- Preserve the audited CLI wire User-Agent and add truthful DSH attribution from `attributionHeaders()` in `X-DeepSeek-Harness-Attribution` on private provider requests. Public Google OAuth requests retain their standard headers.
- Keep credentials, refresh locking, storage, logout, and catalog refresh/persistence policy in the DSH Host. Catalog snapshots carry optional dynamic `modelEnums` alongside models/routing, so restoring a cached catalog also restores its wire labels after a restart. The core does not read or write Pi configuration or credential files.
- Accept only a real project returned by `loadCodeAssist` or already bound to the supplied grant. No generated project, free-tier enrollment, automatic onboarding, or project override is used.
- OAuth application parameters are supplied by the Host through native credential references, or explicitly configured `ANTIGRAVITY_CLIENT_ID` and `ANTIGRAVITY_CLIENT_SECRET` environment variables. No built-in application identifier or secret is embedded in source or bundles. Missing parameters fail before any listener or request is started.
- OAuth uses PKCE, independent random state, a loopback callback, and a manually pasted callback URL. Invalid callbacks do not consume the pending login. Cancellation and deadlines cover callback waiting, token exchange, and project discovery. A busy fixed loopback port can still use the manual flow.
- Omit account management, automatic account failover, extension registration, slash commands, search tools, image generation, and native image APIs. Input images and tool-result images remain supported as chat context.
- Retain normalized Pi transcript/system/tool history and signed thinking/tool replay. Do not add the upstream default Antigravity persona or output-style instructions when the Host supplies no system prompt.
- Bound SSE response/event bytes and preserve cancellation and stream/header stall errors. Hard quota errors are surfaced without changing the active grant.

The generic `requestAntigravity` transport accepts only `streamGenerateContent`, `generateContent`, `fetchAvailableModels`, and `loadCodeAssist`. It adds the active bearer and discovered project, returns an unread `Response`, and has no search-specific payload or tool registration logic. Callers own their operation semantics.

Offline verification uses the installed Host `@earendil-works/pi-ai` 0.87.1 event stream and mocked HTTP. It does not establish live account authorization, Google policy compliance, or continued compatibility of these unofficial private endpoints.

## Upstream license

MIT License

Copyright (c) 2026 Rahul Arya

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
