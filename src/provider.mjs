export function readConfig(env = process.env) {
  const enabled = env.TIWEN_LIVE_ENABLED === 'true';
  const model = env.TIWEN_MODEL?.trim() || '';
  const key = env.TIWEN_API_KEY?.trim() || '';
  const limit = Number(env.TIWEN_MAX_CALLS || 10);
  let endpoint;
  try {
    const base = new URL(env.TIWEN_API_BASE_URL || 'invalid');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
    if ((base.protocol !== 'https:' && !(local && base.protocol === 'http:')) || base.username || base.password || base.search || base.hash) throw new Error();
    endpoint = new URL(base.href.replace(/\/$/, '') + '/chat/completions');
    if (!local && !key) endpoint = undefined;
  } catch { endpoint = undefined; }
  return { enabled, model, key, endpoint, limit, ready: enabled && Boolean(endpoint && model && Number.isSafeInteger(limit) && limit > 0 && limit <= 100) };
}

export class ModelProvider {
  constructor(config, fetcher = fetch) { this.config = config; this.fetcher = fetcher; this.calls = 0; this.usage = []; }
  async complete(system, data) {
    if (!this.config.ready) throw new Error('真实模型未配置。请在本机 .env 中明确启用并填写服务地址、模型及调用上限。');
    if (this.calls >= this.config.limit) throw new Error('本次进程的模型调用上限已到。请核对费用后再操作。');
    this.calls++;
    let response;
    try {
      response = await this.fetcher(this.config.endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
        headers: { 'Content-Type': 'application/json', ...(this.config.key ? { Authorization: `Bearer ${this.config.key}` } : {}) },
        body: JSON.stringify({ model: this.config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(data) }], max_tokens: 2400 })
      });
    } catch { throw new Error('模型连接失败或超时。未自动重试，请检查服务配置和费用。'); }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`模型请求失败（HTTP ${response.status}）。服务端错误详情不会回显。`); }
    let length = 0; const chunks = [];
    try {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 128_000) { await reader.cancel(); throw new Error(); }
        chunks.push(value);
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (payload.choices?.[0]?.finish_reason === 'length') throw new Error();
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error();
      const cleaned = content.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const result = JSON.parse(cleaned);
      const tokens = payload.usage?.total_tokens;
      this.usage.push(Number.isSafeInteger(tokens) && tokens >= 0 ? tokens : null);
      return result;
    } catch { throw new Error('模型返回内容不完整、过大或不是有效 JSON；本次没有可用结果。'); }
  }
  snapshot() { return { calls: this.calls, limit: this.config.limit, reportedTokens: this.usage.some(x => x === null) ? null : this.usage.reduce((a, b) => a + b, 0), billing: '金额未由本应用核实，请查看服务商账单。' }; }
}
