import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isIosSafari } from '../src/lib/installPrompt'

const pub = (f: string) => resolve(__dirname, '../public', f)
const manifest = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8'))

describe('manifest', () => {
  it('is relative throughout, so basePath builds work', () => {
    const urls = [manifest.start_url, manifest.scope, manifest.id, ...manifest.icons.map((i: { src: string }) => i.src)]
    for (const s of manifest.shortcuts) urls.push(s.url, ...s.icons.map((i: { src: string }) => i.src))
    for (const u of urls) expect(u, u).toMatch(/^\.(\/|$)/)
  })

  it('has a shortcut for each of the four tools, with icons that exist', () => {
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      './character/',
      './checklist/',
      './atlas/',
      './dashboard/',
    ])
    for (const s of manifest.shortcuts) for (const i of s.icons) expect(existsSync(pub(i.src.slice(2)))).toBe(true)
  })

  it('declares standalone display', () => {
    expect(manifest.display_override).toEqual(['standalone'])
    expect(manifest.description).toBeTruthy()
  })
})

describe('isIosSafari', () => {
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  it('is true for iPhone Safari and iPadOS desktop-mode Safari', () => {
    expect(isIosSafari(safari, 5)).toBe(true)
    expect(isIosSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', 5)).toBe(true)
  })
  it('is false for iOS Chrome and desktop Safari', () => {
    expect(isIosSafari(safari.replace('Version/17.0', 'CriOS/120') , 5)).toBe(false)
    expect(isIosSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', 0)).toBe(false)
  })
})
