window.__ModuleLoader__.load({
  id: 'dsh-antigravity',
  factory(require) {
    const React = require('react');
    const { Button, Input } = require('@deepseek-ai/dsh-client-ui-primitives');
    const { createElement: h, useCallback, useEffect, useRef, useState } = React;
    const API = '/api/dsh-antigravity';

    async function api(action, body, signal) {
      const response = await fetch(`${API}/${action}`, {
        method: 'POST', credentials: 'same-origin', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Antigravity 认证操作失败。');
      return result.value;
    }

    function AntigravitySettings() {
      const [snapshot, setSnapshot] = useState(null);
      const [callback, setCallback] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const sequence = useRef(0);
      const mounted = useRef(true);
      const request = useCallback(async (action, body = {}, signal) => {
        const version = ++sequence.current;
        const command = action !== 'status';
        if (command) setBusy(true);
        setError('');
        try {
          const value = await api(action, body, signal);
          if (mounted.current && sequence.current === version) setSnapshot(value);
        } catch (failure) {
          if (mounted.current && sequence.current === version && !signal?.aborted) setError(failure.message);
        } finally {
          if (mounted.current && command) setBusy(false);
        }
      }, []);

      useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        void request('status', {}, controller.signal);
        return () => { mounted.current = false; controller.abort(); };
      }, [request]);

      const pending = snapshot?.login.status === 'pending';
      const checking = pending || Boolean(snapshot?.catalog?.loading);
      useEffect(() => {
        if (!checking || busy) return;
        const controller = new AbortController();
        const timer = setTimeout(() => { void request('status', {}, controller.signal); }, 1500);
        return () => { clearTimeout(timer); controller.abort(); };
      }, [snapshot, checking, busy, request]);

      const submitCallback = () => {
        const input = callback;
        setCallback('');
        void request('complete-login', { input });
      };
      return h('section', { style: { maxWidth: 640, display: 'grid', gap: 16 } },
        h('h2', { style: { margin: 0 } }, 'Antigravity'),
        h('p', { style: { margin: 0 } }, '使用 Google OAuth 登录，仅为 DSH 提供模型。不会导入其他应用的账号或凭据。'),
        h('p', { role: 'status', style: { margin: 0 } }, snapshot === null ? '正在读取登录状态…'
          : snapshot.authenticated ? `已登录${snapshot.email ? ` ${snapshot.email}` : ''}${snapshot.expired ? '，下次模型请求时刷新授权' : ''}`
          : '尚未登录'),
        snapshot?.authenticated && h('p', { style: { margin: 0, fontSize: 13 } }, `访问令牌有效期至 ${new Date(snapshot.expires).toLocaleString()}`),
        snapshot?.authenticated && snapshot.catalog && h('p', { style: { margin: 0 } }, snapshot.catalog.loading ? '正在读取模型目录…' : `可用模型 ${snapshot.catalog.models} 个`),
        snapshot?.catalog?.error && h('p', { role: 'alert', style: { margin: 0 } }, snapshot.catalog.error),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          !pending && h(Button, { variant: 'primary', disabled: busy, onClick: () => { void request('start-login'); } }, snapshot?.authenticated ? '重新登录' : '登录'),
          pending && h(Button, { variant: 'outline', disabled: busy, onClick: () => { setCallback(''); void request('cancel-login'); } }, '取消登录'),
          snapshot?.authenticated && h(Button, { variant: 'outline', disabled: busy, onClick: () => { setCallback(''); void request('logout'); } }, '退出登录'),
          h(Button, { variant: 'ghost', disabled: busy, onClick: () => { void request('status'); } }, '刷新状态'),
        ),
        pending && h('div', { style: { display: 'grid', gap: 12 } },
          snapshot.login.authUrl && h('a', { href: snapshot.login.authUrl, target: '_blank', rel: 'noopener noreferrer' }, '打开 Google 登录'),
          h('p', { style: { margin: 0 } }, '同机浏览器可自动完成回调。若 DSH 在远程机器运行，登录后请复制浏览器地址栏中完整的 localhost OAuth 回调地址并粘贴到这里。'),
          h('label', { htmlFor: 'dsh-antigravity-callback' }, '完整回调地址'),
          h(Input, { id: 'dsh-antigravity-callback', value: callback, autoComplete: 'off', spellCheck: false,
            placeholder: 'http://localhost:51121/oauth-callback?code=…&state=…',
            onChange: event => setCallback(event.target.value), style: { width: '100%' } }),
          h(Button, { variant: 'primary', disabled: busy || !callback.trim(), onClick: submitCallback }, '完成登录'),
        ),
        snapshot?.login.status === 'complete' && h('p', { style: { margin: 0 } }, '登录完成。'),
        snapshot?.login.status === 'cancelled' && h('p', { style: { margin: 0 } }, '登录已取消。'),
        (error || snapshot?.login.error) && h('p', { role: 'alert', style: { margin: 0 } }, error || snapshot.login.error),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'antigravity', order: 32, label: () => 'Antigravity',
        }, AntigravitySettings)), 'dsh-antigravity: settings section');
      },
    };
  },
});
