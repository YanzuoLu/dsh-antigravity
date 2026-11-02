import { credentialKey, credentialRef } from '@deepseek-ai/dsh-credentials';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { loginAntigravity, refreshAntigravityToken } from './core.js';

export const GRANT_KEY = credentialKey('dsh-antigravity', 'default');
const REFRESH_TIMEOUT_MS = 15_000;
const REFRESH_SKEW_MS = 60_000;

function authError(message) {
  return new LlmError(message, 'AUTH');
}

function normalizeGrant(value, previous) {
  const grant = { ...value, type: 'oauth', refresh: value?.refresh || previous?.refresh };
  if (typeof grant.access !== 'string' || !grant.access ||
      typeof grant.refresh !== 'string' || !grant.refresh ||
      typeof grant.expires !== 'number' || !Number.isFinite(grant.expires) ||
      typeof grant.projectId !== 'string' || !grant.projectId) {
    throw authError('Antigravity 登录凭据无效，请重新登录。');
  }
  return {
    type: 'oauth', access: grant.access, refresh: grant.refresh,
    expires: grant.expires, projectId: grant.projectId,
    ...(typeof grant.email === 'string' && grant.email ? { email: grant.email } : {}),
  };
}

function storedGrant(record) {
  if (!record) throw authError('尚未登录 Antigravity，请在设置中登录。');
  if (record.kind !== 'grant' || record.payload?.type !== 'oauth') {
    throw authError('Antigravity 登录凭据无效，请重新登录。');
  }
  return normalizeGrant(record.payload);
}

function maskedEmail(email) {
  if (!email) return undefined;
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}***${email.slice(at)}` : '***';
}

function fullCallback(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 8192) {
    throw authError('请粘贴完整的 OAuth 回调地址。');
  }
  let url;
  try { url = new URL(input.trim()); } catch {
    throw authError('请粘贴完整的 OAuth 回调地址。');
  }
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/oauth-callback' || !url.searchParams.get('code') || !url.searchParams.get('state') ||
      url.username || url.password) {
    throw authError('回调地址必须包含本机 OAuth 回调路径、code 和 state。');
  }
  return input.trim();
}

/** Single-grant controller. Only explicit login and model requests contact Google. */
export function createAuth(ctx, { login, refresh } = {}) {
  async function oauthClient() {
    const [id, secret] = await Promise.all([
      ctx.credentials.resolve(credentialRef('ANTIGRAVITY_CLIENT_ID')),
      ctx.credentials.resolve(credentialRef('ANTIGRAVITY_CLIENT_SECRET')),
    ]);
    if (!id?.value || !secret?.value) {
      throw new LlmError('请先配置本机 Antigravity OAuth 应用参数。', 'OAUTH_CLIENT_NOT_CONFIGURED');
    }
    return { clientId: id.value, clientSecret: secret.value };
  }
  login ??= async callbacks => loginAntigravity({ ...callbacks, client: await oauthClient() });
  refresh ??= async (grant, signal) => refreshAntigravityToken(grant, signal, await oauthClient());
  let flow;
  let disposed = false;
  let generation = 0;
  const listeners = new Set();
  const tasks = new Set();

  function changed(kind) {
    for (const listener of listeners) listener({ kind });
  }

  function active(candidate) {
    return !disposed && flow === candidate && candidate.generation === generation && !candidate.controller.signal.aborted;
  }

  function invalidate() {
    generation++;
    const previous = flow;
    if (previous?.status === 'pending') {
      previous.status = 'cancelled';
      previous.authUrl = undefined;
      previous.callbackRejected = false;
      previous.controller.abort(new Error('Antigravity login cancelled'));
      previous.manual.reject(previous.controller.signal.reason);
      previous.ready.resolve();
    }
  }

  async function status() {
    const record = await ctx.credentials.readRecord(GRANT_KEY);
    let grant;
    try { if (record) grant = storedGrant(record); } catch (error) {
      if (error.code !== 'AUTH') throw error;
    }
    return {
      authenticated: Boolean(grant),
      ...(grant ? { expires: grant.expires, email: maskedEmail(grant.email), expired: grant.expires <= Date.now() } : {}),
      login: {
        status: flow?.status ?? 'idle',
        ...(flow?.status === 'pending' && flow.authUrl ? { authUrl: flow.authUrl } : {}),
        ...(flow?.status === 'error' ? { error: flow.clientMissing ? '请先配置本机 Antigravity OAuth 应用参数。' : 'Antigravity 登录未完成，请重试。' }
          : flow?.callbackRejected ? { error: '回调地址无效，请确认它来自本次登录后重新粘贴。' } : {}),
      },
    };
  }

  async function getCredentials(signal) {
    const operationSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(REFRESH_TIMEOUT_MS)])
      : AbortSignal.timeout(REFRESH_TIMEOUT_MS);
    operationSignal.throwIfAborted();
    const current = storedGrant(await ctx.credentials.readRecord(GRANT_KEY));
    if (current.expires > Date.now() + REFRESH_SKEW_MS) return current;
    const record = await ctx.credentials.modifyRecord(GRANT_KEY, async latest => {
      operationSignal.throwIfAborted();
      const grant = storedGrant(latest);
      if (grant.expires > Date.now() + REFRESH_SKEW_MS) return undefined;
      let next;
      try {
        next = normalizeGrant(await refresh(grant, operationSignal), grant);
      } catch (error) {
        operationSignal.throwIfAborted();
        if (error?.code === 'AUTH' || error?.code === 'OAUTH_INVALID_GRANT' ||
            /invalid_grant|revoked|unauthorized/i.test(String(error?.message))) {
          throw authError('Antigravity 授权已失效，请重新登录。');
        }
        throw error;
      }
      operationSignal.throwIfAborted();
      return { kind: 'grant', payload: next };
    });
    return storedGrant(record);
  }

  async function startLogin() {
    if (disposed) throw authError('Antigravity 插件已停止。');
    if (flow?.status === 'pending') {
      await flow.ready.promise;
      return status();
    }
    const candidate = {
      generation: ++generation,
      controller: new AbortController(),
      ready: Promise.withResolvers(),
      manual: Promise.withResolvers(),
      status: 'pending',
      authUrl: undefined,
      manualSubmitted: false,
    };
    candidate.manual.promise.catch(() => {});
    flow = candidate;
    function manualInput() {
      if (!active(candidate)) return Promise.reject(candidate.controller.signal.reason);
      if (candidate.manualSubmitted) {
        candidate.manual = Promise.withResolvers();
        candidate.manual.promise.catch(() => {});
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
            if (parsed.protocol !== 'https:' || parsed.hostname !== 'accounts.google.com') {
              throw authError('Antigravity 返回了无效的 Google 授权地址。');
            }
            candidate.authUrl = parsed.href;
            candidate.ready.resolve();
          },
          onPrompt: () => manualInput(),
          onManualCodeInput: () => manualInput(),
        }));
        if (!active(candidate)) return;
        await ctx.credentials.modifyRecord(GRANT_KEY, async () => {
          if (!active(candidate)) return undefined;
          candidate.committing = true;
          return { kind: 'grant', payload: credentials };
        });
        if (!active(candidate)) return;
        candidate.status = 'complete';
        candidate.authUrl = undefined;
        changed('login');
      } catch (error) {
        if (active(candidate)) {
          candidate.status = 'error';
          candidate.clientMissing = error?.code === 'OAUTH_CLIENT_NOT_CONFIGURED';
        }
      } finally {
        candidate.authUrl = undefined;
        candidate.ready.resolve();
        candidate.manual.reject(new Error('Antigravity login finished'));
      }
    })();
    candidate.task = task;
    tasks.add(task);
    task.finally(() => tasks.delete(task)).catch(() => {});
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
      if (flow?.status !== 'pending' || flow.manualSubmitted) throw authError('没有等待回调的 Antigravity 登录。');
      const callback = fullCallback(input);
      flow.manualSubmitted = true;
      flow.callbackRejected = false;
      flow.manual.resolve(callback);
      return status();
    },
    async cancelLogin() {
      // The locked replacement is the commit point. Cancellation before it wins;
      // cancellation after it waits for the completed login rather than hiding it.
      if (flow?.status === 'pending' && flow.committing) await flow.task;
      else invalidate();
      return status();
    },
    async logout() {
      const previous = flow;
      invalidate();
      await ctx.credentials.deleteRecord(GRANT_KEY);
      if (flow === previous) flow = undefined;
      changed('logout');
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
    },
  };
}
