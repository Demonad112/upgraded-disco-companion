// One long-lived `luajit tools/pob2/serve.lua` process. PoB starts once (~2.5 s); each build is then one framed
// request on stdin and one JSON line on stdout. Requests are serialised. A timeout, a crash or a bad reply kills
// the process and the next request starts a fresh one; it is also recycled after `maxBuilds` builds.
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export class EngineWorker {
  constructor({ root, luajit = 'luajit', timeoutMs = 90_000, maxBuilds = 200, log = () => {} } = {}) {
    this.root = root
    this.luajit = luajit
    this.timeoutMs = timeoutMs
    this.maxBuilds = maxBuilds
    this.log = log
    this.proc = null
    this.ready = null // Promise<{ pobVersion, pinCommit }>
    this.info = null
    this.builds = 0
    this.chain = Promise.resolve()
    this.pending = null // { resolve, reject }
    this.buffer = ''
  }

  start() {
    if (this.ready) return this.ready
    const proc = spawn(this.luajit, [join(this.root, 'tools/pob2/serve.lua')], {
      cwd: this.root,
      env: { ...process.env, POB2_ROOT: this.root },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc = proc
    this.builds = 0
    this.buffer = ''
    let onReady
    this.ready = new Promise((resolve, reject) => {
      onReady = { resolve, reject }
    })
    const startTimer = setTimeout(() => this.fail(new Error('PoB did not start in time')), this.timeoutMs)
    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (chunk) => {
      this.buffer += chunk
      let nl
      while ((nl = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, nl)
        this.buffer = this.buffer.slice(nl + 1)
        let msg
        try {
          msg = JSON.parse(line)
        } catch {
          this.fail(new Error('engine wrote a line that is not JSON'))
          return
        }
        if (msg.ready) {
          clearTimeout(startTimer)
          this.info = { pobVersion: msg.pobVersion ?? null, pinCommit: msg.pinCommit ?? null }
          onReady?.resolve(this.info)
          onReady = null
        } else if (this.pending) {
          const p = this.pending
          this.pending = null
          p.resolve(msg)
        }
      }
    })
    proc.stderr.setEncoding('utf8')
    let stderrTail = ''
    proc.stderr.on('data', (chunk) => {
      stderrTail = (stderrTail + chunk).slice(-2000)
    })
    proc.on('error', (e) => this.fail(e))
    proc.on('exit', (code, signal) => {
      clearTimeout(startTimer)
      if (this.proc !== proc) return
      const err = new Error(`engine exited (${signal ?? code}): ${stderrTail.split('\n').slice(-4).join(' | ')}`)
      onReady?.reject(err)
      onReady = null
      this.fail(err)
    })
    // A rejected startup must not become an unhandled rejection when nobody is waiting yet.
    this.ready.catch(() => {})
    return this.ready
  }

  fail(err) {
    this.log(`engine: ${err.message}`)
    const proc = this.proc
    this.proc = null
    this.ready = null
    if (this.pending) {
      const p = this.pending
      this.pending = null
      p.reject(err)
    }
    if (proc && proc.exitCode === null) proc.kill('SIGKILL')
  }

  stop() {
    const proc = this.proc
    this.proc = null
    this.ready = null
    if (proc && proc.exitCode === null) proc.kill('SIGKILL')
  }

  /** Run one decoded build XML. Resolves to { snapshot, groups } or rejects. */
  calc(xml) {
    const run = this.chain.then(() => this.calcNow(xml))
    this.chain = run.catch(() => {})
    return run
  }

  async calcNow(xml) {
    if (this.builds >= this.maxBuilds) this.stop()
    const info = await this.start()
    const proc = this.proc
    const body = Buffer.from(xml, 'utf8')
    const reply = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error(`build took over ${this.timeoutMs} ms`)), this.timeoutMs)
      this.pending = {
        resolve: (v) => (clearTimeout(timer), resolve(v)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      }
      proc.stdin.write(`${body.length}\n`)
      proc.stdin.write(body)
    })
    this.builds++
    if (reply.error) {
      const e = new Error(reply.error)
      e.engine = true
      throw e
    }
    return { ...info, snapshot: reply.snapshot, groups: reply.groups }
  }
}
