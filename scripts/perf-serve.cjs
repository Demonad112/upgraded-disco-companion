// static brotli server for apps/web/out (serve.mjs logic + br)
const fs = require('fs'), http = require('http'), path = require('path'), zlib = require('zlib')
const root = require('path').join(__dirname, '..', 'apps', 'web', 'out')
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' }
const cache = new Map()
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let f = path.normalize(path.join(root, p))
  if (!fs.existsSync(f)) f = f.replace(/(__next\.[^/\\]+?)\.(__PAGE__\.txt)$/, '$1/$2')
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.statSync(f) } catch { res.writeHead(404); return res.end('nf') }
  const ext = path.extname(f), type = T[ext] || 'application/octet-stream'
  const comp = !['.png', '.webp', '.woff2', '.ico'].includes(ext)
  if (!cache.has(f)) { const d = fs.readFileSync(f); cache.set(f, comp ? zlib.brotliCompressSync(d, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }) : d) }
  const h = { 'content-type': type, 'cache-control': 'no-store' }
  if (comp) h['content-encoding'] = 'br'
  res.writeHead(200, h); res.end(cache.get(f))
}).listen(4400, () => console.log('up'))
