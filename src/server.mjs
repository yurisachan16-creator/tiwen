import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readConfig, ModelProvider } from './provider.mjs';
import { catalog, scenarios, previewQuestions, previewReply } from './engine.mjs';

const publicFiles = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/style.css', ['style.css', 'text/css; charset=utf-8']]]);
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
async function body(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('请提交 JSON。');
  let length = 0; const chunks = [];
  for await (const chunk of req) { length += chunk.length; if (length > 192_000) throw new Error('请求内容过大。'); chunks.push(chunk); }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请求格式无效。');
  return input;
}

export function createPreviewServer({ config = readConfig(), provider = new ModelProvider(config) } = {}) {
  let busy = false;
  const runs = [];
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`)) return json(res, 403, { error: '仅允许本机同源访问。请使用终端显示的127.0.0.1地址。' });
    try {
      if (req.method === 'GET' && publicFiles.has(req.url)) {
        const [file, type] = publicFiles.get(req.url);
        res.writeHead(200, { 'Content-Type': type });
        res.end(await readFile(new URL(`../public/${file}`, import.meta.url))); return;
      }
      if (req.method === 'GET' && req.url === '/api/config') return json(res, 200, { liveReady: config.ready, model: config.ready ? config.model : null, usage: provider.snapshot(), catalog: catalog.map(({ id, text, category, decision, reason }) => ({ id, text, category, decision, reason })), scenarios });
      if (req.method === 'GET' && req.url === '/api/runs') return json(res, 200, { runs });
      if (req.method !== 'POST' || !['/api/questions', '/api/reply'].includes(req.url)) return json(res, 404, { error: '没有这个预览入口。' });
      if (busy) return json(res, 409, { error: '已有预览正在运行，请等待它完成。' });
      // Lock before reading the body: parallel or slow requests cannot start paid calls together.
      busy = true;
      try {
        const input = await body(req);
        const result = req.url === '/api/questions' ? await previewQuestions(input, provider) : await previewReply(input, provider);
        const record = { id: randomUUID(), createdAt: new Date().toISOString(), kind: req.url === '/api/questions' ? 'questions' : 'reply', result };
        runs.unshift(record); if (runs.length > 20) runs.pop();
        json(res, 200, record);
      } finally { busy = false; }
    } catch (error) {
      const safe = error instanceof SyntaxError ? '请求不是有效 JSON。' : error.message;
      json(res, 400, { error: safe });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = Number(process.env.PORT || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT 必须是1024到65535之间的整数。');
  const server = createPreviewServer();
  server.on('error', () => { console.error('无法启动本地预览，请检查端口是否已被占用。'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`提问本地预览 http://127.0.0.1:${port} · 无 X 外发能力 · Ctrl+C 停止`));
}
