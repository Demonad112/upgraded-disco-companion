const { chromium, devices } = require('playwright')
;(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] })
  await c.addInitScript(`window.__n=0;const cr=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.dataset.fx==='sky')window.__n++;return cr.apply(this,a)}`)
  const p = await c.newPage(); await p.goto('https://upgraded-disco-companion.pages.dev/checklist/', { waitUntil: 'load' }); await p.waitForTimeout(2500)
  const cdp = await c.newCDPSession(p)
  const count = async (ms) => { const a = await p.evaluate(() => window.__n); await p.waitForTimeout(ms); return (await p.evaluate(() => window.__n)) - a }
  console.log('idle paints/2s before', await count(2000))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 600 }] })
  for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 600 - i * 20 }] }); await p.waitForTimeout(16); if (i === 10) await p.setViewportSize({ width: 390, height: 720 }) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await p.waitForTimeout(1000)
  console.log('idle paints/2s after resize mid-scroll', await count(2000))
  await b.close()
})()
