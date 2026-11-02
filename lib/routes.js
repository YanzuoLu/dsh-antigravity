export const AUTH_API_PATH = '/api/dsh-antigravity';

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function failure(status, code, message) {
  return json(status, { ok: false, error: { code, message } });
}

/** Exact Connection routes retain native authentication and Host/Origin admission. */
export function mountRoutes(ctx, auth) {
  const actions = {
    status: () => auth.status(),
    'start-login': () => auth.startLogin(),
    'complete-login': body => auth.completeLogin(body.input),
    'cancel-login': () => auth.cancelLogin(),
    logout: () => auth.logout(),
  };
  const disposers = Object.entries(actions).map(([action, execute]) => ctx.connection.fetch.register({
    path: `${AUTH_API_PATH}/${action}`,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      const admission = ctx.connection.admit(request);
      if ('rejection' in admission) {
        return failure(admission.rejection, 'UNAUTHORIZED', '请先登录 DSH。');
      }
      if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED', '只接受 POST 请求。');
      if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
        return failure(415, 'INVALID_CONTENT_TYPE', '请求必须使用 application/json。');
      }
      let body;
      try { body = await request.json(); } catch {
        return failure(400, 'INVALID_REQUEST', '请求必须包含 JSON 对象。');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          Object.keys(body).some(key => action !== 'complete-login' || key !== 'input') ||
          (action === 'complete-login' && (typeof body.input !== 'string' || !body.input || body.input.length > 8192))) {
        return failure(400, 'INVALID_REQUEST', '请求参数无效。');
      }
      try {
        return json(200, { ok: true, value: await execute(body) });
      } catch (error) {
        return failure(error?.code === 'AUTH' ? 400 : 500, error?.code === 'AUTH' ? 'AUTH' : 'AUTH_OPERATION_FAILED',
          error?.code === 'AUTH' ? error.message : 'Antigravity 认证操作未完成，请重试。');
      }
    },
  }));
  return async () => {
    await Promise.all(disposers.map(dispose => dispose()));
  };
}
