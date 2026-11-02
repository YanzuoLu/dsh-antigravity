# dsh-antigravity

A single-account Antigravity model provider for DeepSeek Harness 0.2.0-rc.2.

## Scope

This plugin registers **one provider and zero model-facing tools**. It does not register image generation, a separate search tool or command, account lists, or automatic account switching. Existing DSH tools remain owned and executed by DSH.

- Google OAuth with PKCE, state validation and a local callback. A remote browser can paste the full callback URL into the settings page.
- One grant stored through DSH's native credentials service. Refresh rereads the credential under its cross-process writer lock, preserves rotation, observes cancellation, and asks for login again when Google rejects the refresh grant.
- Authenticated model discovery and a native storage-domain catalog cache, including discovered runtime model enums. The cache restores without network access; login refreshes it, and model requests refresh an expired catalog.
- Native `PiAiAdapter` message, attachment, tool-result and signed replay conversion, backed by the migrated `pi-antigravity` transport.
- Model display names omit a redundant trailing `(Antigravity)` because the provider group already identifies the host. A metadata-only entry normalizes cached and refreshed catalogs without replacing the registered provider or mutating model snapshots already captured by active calls. Model IDs, runtime routes and reasoning settings remain unchanged.
- No browser opens automatically. Importing, mounting, opening settings, and listing cached models do not contact Google.
- No global fetch/dispatcher replacement. Provider requests retain the host's current HTTP/1.1 and proxy behavior.

## Install and log in

```sh
dsh plugin --profile web add github:YanzuoLu/dsh-antigravity
```

With a live profile the host mounts without a DSH restart. Refresh the Web page to load the new client settings section if it is not visible.

OAuth application parameters are supplied through DSH's native credential references `ANTIGRAVITY_CLIENT_ID` and `ANTIGRAVITY_CLIENT_SECRET`, or their launch-environment values. The public package contains no embedded client ID or client secret. These parameters identify the OAuth application, not your Google account's access/refresh tokens. Configure them locally before signing in.

Open **Settings → Antigravity → 登录** and manually open the Google authorization link. The callback is `http://localhost:51121/oauth-callback`. If the browser cannot reach the DSH machine's loopback port, paste the complete callback URL into the same settings page.

After successful login the provider discovers the account's actual chat models. Select one using DSH's existing model picker. Login does not change the global default or any existing session's model.

Google access is unofficial. This is not a Google product, a public Gemini API key, or a promise that every subscription/model is eligible. It uses the locally configured OAuth application's identity and private Cloud Code Assist endpoints. Google can reject the client or change the protocol. The plugin does not fabricate project IDs, enroll a free tier, import other apps' credentials, or switch to another account.

## Existing web_search integration

Update [YanzuoLu/dsh-web-search](https://github.com/YanzuoLu/dsh-web-search) for Antigravity grounding support. It uses this adapter's authenticated transport, not another token file, and does not add a tool to the model's tool list. `dsh-web-search` alone owns the Google search request and citation handling; this provider contains no search implementation.

## Credentials and account lifetime

The grant is stored at credential key `dsh-antigravity/default` in DSH's native credential store, not in Pi's auth or multi-account files. Other provider credentials are untouched. DSH's local store is permission-restricted but not an encrypted keychain.

退出登录 removes the local Antigravity credential and cached catalog. It does not revoke the Google grant remotely. An already started model stream is not cancelled by unloading this plugin.

## Compatibility and provenance

Pinned to DSH `0.2.0-rc.2` and `@earendil-works/pi-ai` `0.87.1`. The upstream transport was migrated from `Rahularya01/pi-antigravity` commit `3870729ede108e439ad2a48ca0448b2245e863b2`, preserving the provider-only intent of the user's fork at `24d3829fd2e818df63e00d9c90fc9257ef430a38`. See [UPSTREAM.md](./UPSTREAM.md) for the source, license and deliberate exclusions.

Build the committed core and content-addressed host snapshot with `node scripts/build.mjs`. The bundle uses a fresh host module URL for each release. After updating an already running installation, disable and re-enable only this bundle to load the new snapshot without restarting DSH. Offline tests and diagnostic fixtures are kept in the ignored `.cache` directory. Offline protocol and native DSH integration checks do not constitute live Google authentication/model validation.
