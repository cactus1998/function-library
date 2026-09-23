import { describe, expect, it } from 'vitest'
import landingSource from '../components/LandingPage.vue?raw'
import { BREAKPOINTS, breakpointFor, VIEWPORT_MAX, VIEWPORT_MIN, VIEWPORT_PRESETS } from '../data/tokens'

describe('breakpointFor', () => {
  it('returns the mobile breakpoint below 640px', () => {
    expect(breakpointFor(0).id).toBe('sm')
    expect(breakpointFor(375).id).toBe('sm')
    expect(breakpointFor(639).id).toBe('sm')
  })

  it('treats each breakpoint minimum as inclusive', () => {
    expect(breakpointFor(640).id).toBe('md')
    expect(breakpointFor(1023).id).toBe('md')
    expect(breakpointFor(1024).id).toBe('lg')
    expect(breakpointFor(1600).id).toBe('lg')
  })

  it('maps the 4 / 8 / 12 column grid to sm / md / lg', () => {
    expect(BREAKPOINTS.map((bp) => bp.columns)).toEqual([4, 8, 12])
  })
})

describe('viewport presets', () => {
  it('stay inside the slider range', () => {
    for (const preset of VIEWPORT_PRESETS) {
      expect(preset.width).toBeGreaterThanOrEqual(VIEWPORT_MIN)
      expect(preset.width).toBeLessThanOrEqual(VIEWPORT_MAX)
    }
  })

  it('cover every breakpoint', () => {
    const covered = new Set(VIEWPORT_PRESETS.map((p) => breakpointFor(p.width).id))
    expect([...covered].sort()).toEqual(['lg', 'md', 'sm'])
  })
})

describe('LandingPage CSS stays in sync with the design tokens', () => {
  const queries = [...landingSource.matchAll(/@container landing \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]))

  it('only uses breakpoints defined in tokens.ts', () => {
    const allowed = BREAKPOINTS.filter((bp) => bp.min > 0).map((bp) => bp.min)
    expect(queries.length).toBeGreaterThan(0)
    for (const width of queries) expect(allowed).toContain(width)
  })

  it('uses every non-zero breakpoint at least once', () => {
    for (const bp of BREAKPOINTS.filter((b) => b.min > 0)) expect(queries).toContain(bp.min)
  })

  it('declares the same column counts, gutters and margins as tokens.ts', () => {
    const [sm, md, lg] = BREAKPOINTS
    expect(landingSource).toContain(`--cols: ${sm!.columns};`)
    expect(landingSource).toContain(`--gutter: ${sm!.gutter}px;`)
    expect(landingSource).toContain(`--margin: ${sm!.margin}px;`)
    expect(landingSource).toContain(`--cols: ${md!.columns};`)
    expect(landingSource).toContain(`--gutter: ${md!.gutter}px;`)
    expect(landingSource).toContain(`--margin: ${md!.margin}px;`)
    expect(landingSource).toContain(`--cols: ${lg!.columns};`)
    expect(landingSource).toContain(`--margin: ${lg!.margin}px;`)
  })
})
