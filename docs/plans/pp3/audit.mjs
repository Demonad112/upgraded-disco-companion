// PP3 audit: screenshots + scripted contrast / touch targets / keyboard / motion / type / overflow.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const OUT = process.argv[2]
const WIDTHS = (process.argv[3] ?? '390').split(',').map(Number)
const REPO = '/home/user/upgraded-disco-companion'
const BASE = 'http://localhost:4321/'
const PROFILE = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'
const fixture = readFileSync(`${REPO}/packages/core/test/fixtures/athrynas-v43.json`)
const ROUTES = [
  ['home', ''], ['character-empty', 'character/'], ['character-imported', `character/?import=${encodeURIComponent(PROFILE)}`],
  ['dashboard', 'dashboard/'], ['atlas', 'atlas/'], ['checklist', 'checklist/'], ['trade', 'trade/'],
  ['methodology', 'methodology/'], ['whats-new', 'whats-new/'],
]
const HEIGHT = { 390: 844, 768: 1024, 1440: 900 }
mkdirSync(`${OUT}/shots`, { recursive: true })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const sampler = await (await browser.newContext()).newPage()

async function ctxFor(w, reduced) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: HEIGHT[w] }, deviceScaleFactor: 1, hasTouch: w < 1000, isMobile: w < 700,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  await ctx.route((u) => u.hostname !== 'localhost', (r) => {
    const u = r.request().url()
    if (u.includes('/api/character')) return r.fulfill({ status: 200, contentType: 'application/json', body: fixture })
    if (u.includes('/api/ladder')) return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' })
    return r.abort()
  })
  return ctx
}
async function open(ctx, name, path) {
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'load' })
  if (name === 'character-imported') await page.getByRole('heading', { name: /Athrynas/ }).first().waitFor({ timeout: 40000 })
  await page.waitForTimeout(1200)
  return page
}

const collect = () => {
  const desc = (el) => {
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '')
  }
  const chain = (el) => { const a = []; for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) a.unshift(desc(e)); return a.join(' > ') }
  const vis = (el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' }
  const sx = scrollX, sy = scrollY
  // ---- text
  const texts = []
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (!el || seen.has(el) || !vis(el) || el.closest('script,style,noscript,[aria-hidden="true"]')) continue
    seen.add(el)
    const r = document.createRange(); r.selectNodeContents(n)
    const rect = [...r.getClientRects()].find((q) => q.width > 4 && q.height > 4)
    if (!rect) continue
    const s = getComputedStyle(el)
    let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity)
    if (op < 0.05) continue
    const clip = s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'
    if (clip) el.setAttribute('data-pp3-clip', '1')
    texts.push({
      sel: chain(el), text: n.nodeValue.trim().slice(0, 40), color: s.color, fill: s.webkitTextFillColor, clip, op,
      size: parseFloat(s.fontSize), weight: +s.fontWeight || 400, family: s.fontFamily.split(',')[0].replace(/["']/g, '').slice(0, 24),
      lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform,
      x: rect.left + sx, y: rect.top + sy, w: rect.width, h: rect.height,
      inClosedDetails: !!el.closest('details:not([open])') && !el.closest('summary'),
    })
  }
  // ---- targets
  const targets = []
  for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary,[role=tab],[role=button],[role=checkbox],[role=switch],[tabindex="0"]')) {
    if (!vis(el) || el.disabled) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    let rr = r
    if (el.matches('input[type=checkbox],input[type=radio]')) { const l = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)); if (l) rr = l.getBoundingClientRect() }
    const s = getComputedStyle(el)
    const fixedAnc = (() => { for (let e = el; e; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return desc(e) + ':' + p } return '' })()
    targets.push({ sel: chain(el), name: (el.getAttribute('aria-label') || el.innerText || el.value || '').trim().slice(0, 40), w: Math.round(rr.width), h: Math.round(rr.height),
      x: Math.round(rr.left + sx), y: Math.round(rr.top + sy), inline: s.display === 'inline' && !!el.closest('p,li,td,dd'), fixedAnc })
  }
  // ---- fixed/sticky bars
  const bars = []
  for (const el of document.querySelectorAll('header,nav,footer,[class*=bar],[class*=tab],[role=tablist]')) {
    const s = getComputedStyle(el); if ((s.position === 'fixed' || s.position === 'sticky') && vis(el)) {
      const r = el.getBoundingClientRect(); if (r.width && r.height) bars.push({ sel: desc(el), pos: s.position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), bg: s.backgroundColor, bf: s.backdropFilter })
    }
  }
  // ---- overflow
  const de = document.documentElement
  const wide = []
  if (de.scrollWidth > innerWidth + 1) for (const el of document.body.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 && r.width > 0 && vis(el) && wide.length < 8) wide.push(desc(el) + ' right=' + Math.round(r.right)) }
  // ---- headings + landmarks
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map((h) => +h.tagName[1])
  const skips = []; for (let i = 1; i < heads.length; i++) if (heads[i] - heads[i - 1] > 1) skips.push(`h${heads[i - 1]}→h${heads[i]}`)
  // ---- line length
  const paras = [...document.querySelectorAll('p,li')].filter((p) => vis(p) && p.innerText.trim().length > 120).map((p) => { const r = p.getBoundingClientRect(); const s = getComputedStyle(p); const lines = Math.max(1, Math.round(r.height / (parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5))); return Math.round(p.innerText.trim().length / lines) })
  const anims = document.getAnimations().filter((a) => a.playState === 'running').map((a) => { const t = a.effect?.getComputedTiming?.() ?? {}; return { name: a.animationName || a.transitionProperty || 'waapi', dur: t.duration, iter: t.iterations === Infinity ? 'inf' : t.iterations, target: a.effect?.target ? desc(a.effect.target) : '' } })
  return { texts, targets, bars, scrollW: de.scrollWidth, innerW: innerWidth, height: de.scrollHeight, wide, h1: heads.filter((h) => h === 1).length, headCount: heads.length, skips: [...new Set(skips)], paras,
    nodes: document.querySelectorAll('*').length, anims, lang: de.lang, title: document.title, mainCount: document.querySelectorAll('main').length,
    imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length, unnamed: [...document.querySelectorAll('a[href],button')].filter((e) => vis(e) && !(e.getAttribute('aria-label') || e.innerText || e.title || '').trim() && !e.querySelector('img[alt],svg[aria-label],svg title')).map(desc).slice(0, 10) }
}

async function sample(png, rects) {
  return sampler.evaluate(async ({ b64, rects }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
    const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b) }
    return rects.map(([x, y, w, h]) => {
      x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y)); w = Math.min(Math.ceil(w), img.width - x); h = Math.min(Math.ceil(h), img.height - y)
      if (w < 1 || h < 1) return null
      const d = g.getImageData(x, y, w, h).data; const px = []
      const step = Math.max(1, Math.floor((w * h) / 600))
      for (let i = 0; i < w * h; i += step) px.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2], lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])])
      px.sort((a, b) => a[3] - b[3])
      const at = (q) => px[Math.min(px.length - 1, Math.floor(q * px.length))]
      return { med: at(0.5), lo: at(0.05), hi: at(0.95) }
    })
  }, { b64: png.toString('base64'), rects })
}

const results = {}
for (const w of WIDTHS) {
  const ctx = await ctxFor(w, false)
  for (const [name, path] of ROUTES) {
    const key = `${name}@${w}`
    try {
      const page = await open(ctx, name, path)
      await page.screenshot({ path: `${OUT}/shots/${name}-${w}-fold.png` })
      await page.screenshot({ path: `${OUT}/shots/${name}-${w}-full.png`, fullPage: true })
      const data = await page.evaluate(collect)
      // background pass: hide all text, capture what is really behind it
      await page.addStyleTag({ content: '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}[data-pp3-clip]{background-image:none!important}' })
      await page.waitForTimeout(150)
      const bg = await page.screenshot({ fullPage: true })
      const rects = data.texts.map((t) => [t.x, t.y, t.w, t.h])
      const smp = await sample(bg, rects)
      data.texts.forEach((t, i) => (t.bg = smp[i]))
      // keyboard: 45 Tab stops
      const kb = []
      if (w === 390 || w === 1440) {
        await page.reload({ waitUntil: 'load' }); if (name === 'character-imported') await page.getByRole('heading', { name: /Athrynas/ }).first().waitFor({ timeout: 40000 })
        await page.waitForTimeout(500)
        for (let i = 0; i < 45; i++) {
          await page.keyboard.press('Tab')
          kb.push(await page.evaluate(() => {
            const el = document.activeElement; if (!el || el === document.body) return { none: true }
            const s = getComputedStyle(el); const r = el.getBoundingClientRect()
            const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
            let covered = ''
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2
            if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) { const top = document.elementFromPoint(cx, cy); if (top && top !== el && !el.contains(top) && !top.contains(el)) covered = top.tagName.toLowerCase() + '.' + (typeof top.className === 'string' ? top.className.split(/\s+/)[0] : '') }
            return { sel: el.tagName.toLowerCase() + (c ? '.' + c : ''), name: (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 30), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, shadow: s.boxShadow === 'none' ? '' : s.boxShadow.slice(0, 60), fv: el.matches(':focus-visible'), inView: r.top >= 0 && r.bottom <= innerHeight, covered, w: Math.round(r.width), h: Math.round(r.height) }
          }))
        }
      }
      data.kb = kb
      results[key] = data
      await page.close()
      console.log('ok', key, 'h=' + data.height, 'texts=' + data.texts.length, 'targets=' + data.targets.length)
    } catch (e) { results[key] = { error: String(e).slice(0, 400) }; console.log('FAIL', key, String(e).slice(0, 300)) }
  }
  await ctx.close()
  // reduced motion pass (390 only): running animations and sky canvas change
  if (w === 390) {
    for (const reduced of [false, true]) {
      const c2 = await ctxFor(w, reduced)
      for (const [name, path] of ROUTES) {
        try {
          const page = await open(c2, name, path)
          const m = await page.evaluate(async () => {
            const run = () => document.getAnimations().filter((a) => a.playState === 'running')
            const cv = document.querySelector('canvas'); const grab = () => { try { return cv ? cv.toDataURL().length + ':' + cv.toDataURL().slice(-200) : '' } catch { return 'tainted' } }
            const a = grab(); await new Promise((r) => setTimeout(r, 1500)); const b = grab()
            const r = run()
            return { running: r.length, infinite: r.filter((x) => x.effect?.getComputedTiming?.().iterations === Infinity).map((x) => (x.animationName || 'waapi') + '@' + (x.effect?.target?.className?.toString?.().split(' ')[0] ?? '')).slice(0, 12), canvas: !!cv, canvasChanged: a !== b, smooth: getComputedStyle(document.documentElement).scrollBehavior }
          })
          results[`${name}@${w}`][reduced ? 'motionReduced' : 'motionFull'] = m
          await page.close()
        } catch (e) { console.log('FAIL motion', name, String(e).slice(0, 200)) }
      }
      await c2.close()
    }
  }
  writeFileSync(`${OUT}/raw-${w}.json`, JSON.stringify(Object.fromEntries(Object.entries(results).filter(([k]) => k.endsWith('@' + w)))))
}
await browser.close()
