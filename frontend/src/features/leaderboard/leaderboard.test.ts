import { describe, it, expect } from 'vitest'
import { parseScore, formatScore, buildBoard, isBetter, type CommunityScore } from './leaderboardStore'

describe('parseScore', () => {
  it('parses mm:ss into seconds', () => {
    expect(parseScore('time', '3:45')).toBe(225)
    expect(parseScore('time', '0:59')).toBe(59)
  })
  it('parses raw seconds for time', () => {
    expect(parseScore('time', '90')).toBe(90)
  })
  it('parses load and reps as numbers', () => {
    expect(parseScore('load', '100')).toBe(100)
    expect(parseScore('reps', '22')).toBe(22)
  })
  it('rejects invalid input', () => {
    expect(parseScore('time', 'abc')).toBeNull()
    expect(parseScore('load', '')).toBeNull()
    expect(parseScore('load', '-5')).toBeNull()
  })
})

describe('formatScore', () => {
  it('formats each type', () => {
    expect(formatScore('time', 225)).toBe('3:45')
    expect(formatScore('load', 100)).toBe('100 kg')
    expect(formatScore('reps', 22)).toBe('22 reps')
  })
})

describe('isBetter', () => {
  it('lower wins for time, higher for others', () => {
    expect(isBetter('time', 180, 200)).toBe(true)
    expect(isBetter('load', 200, 180)).toBe(true)
    expect(isBetter('reps', 18, 22)).toBe(false)
  })
})

describe('buildBoard', () => {
  const community: CommunityScore[] = [
    { athlete: 'A', benchmark: 'fran', value: 200 },
    { athlete: 'B', benchmark: 'fran', value: 160 },
  ]
  it('sorts time ascending and inserts the user', () => {
    const board = buildBoard('fran', community, 150, 'Ti')
    expect(board[0]).toMatchObject({ athlete: 'Ti', value: 150, isMe: true })
    expect(board.map((r) => r.value)).toEqual([150, 160, 200])
  })
  it('omits the user when no PB', () => {
    const board = buildBoard('fran', community, null)
    expect(board.some((r) => r.isMe)).toBe(false)
  })
})

describe('server community rows', () => {
  it('starts empty when the API has no records', () => {
    const board = buildBoard('fran', [], null)
    expect(board).toEqual([])
  })
})
