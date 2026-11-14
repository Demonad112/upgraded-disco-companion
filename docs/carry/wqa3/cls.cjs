const { chromium, devices } = require('playwright')
;(async () => {
  const [url, prof, rm] = process.argv.slice(2)
  const b = await chromium.launch(); const c = await b.newContext({ ...(prof === 'phone' ? devices['iPhone 13'] : { viewport: { width: 1440, height: 900 } }), reducedMotion: rm ? 'reduce' : 'no-preference' })
  await c.addInitScript(`window.__s=[];new PerformanceObserver(l=>{for(const e of l.getEntries())__s.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),inp:e.hadRecentInput,src:e.sources.map(s=>{const n=s.node;return n?(n.nodeName+'.'+(n.className&&n.className.baseVal===undefined?String(n.className).slice(0,40):'')+(n.id?'#'+n.id:'')):'?'}).slice(0,3)})}).observe({type:'layout-shift',buffered:true})`)
  const p = await c.newPage(); await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  const before = await p.evaluate(() => window.__s.length)
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 150); await p.waitForTimeout(50) }
  await p.waitForTimeout(500)
  const s = await p.evaluate(() => window.__s)
  console.log(url, prof, rm ? 'rm' : 'motion', 'atLoad', s.slice(0, before).filter(x=>!x.inp).reduce((a, x) => a + x.v, 0).toFixed(3), 'duringScroll', s.slice(before).filter(x=>!x.inp).reduce((a, x) => a + x.v, 0).toFixed(3))
  console.log(JSON.stringify(s.filter(x=>x.v>0.005).slice(0, 8)))
  await b.close()
})()
