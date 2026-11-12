/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { isLoopbackUrl, normalizeTiedPlayerRows } from '@/scripts/parity/rules'

type Row = [rank: string, name: string, ...rest: string[]]

function leaderboard(rows: Row[], headers = ['#', 'Player', 'Wins', 'Win Rate']): HTMLElement {
  const root = document.createElement('section')
  const head = headers.map((h) => `<th><button type="button">${h}</button></th>`).join('')
  const body = rows
    .map(
      ([rank, name, ...rest]) =>
        `<tr><td>${rank}</td><td><a href="/players/${name}">${name}</a></td>${rest.map((c) => `<td>${c}</td>`).join('')}</tr>`,
    )
    .join('')
  root.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  return root
}

function cells(root: HTMLElement): string[][] {
  return Array.from(root.querySelectorAll('tbody tr'), (tr) =>
    Array.from(tr.querySelectorAll('td'), (td) => td.innerHTML),
  )
}

describe('normalizeTiedPlayerRows', () => {
  it('puts players tied on every other value in name order and keeps ranks in place', () => {
    const root = leaderboard([
      ['1', 'Tolbert', '115', '43.4%'],
      ['2', 'Zed', '0', '0.0%'],
      ['3', 'amy', '0', '0.0%'],
      ['4', 'Bob', '0', '0.0%'],
    ])

    normalizeTiedPlayerRows(root)

    expect(cells(root)).toEqual([
      ['1', '<a href="/players/Tolbert">Tolbert</a>', '115', '43.4%'],
      ['2', '<a href="/players/amy">amy</a>', '0', '0.0%'],
      ['3', '<a href="/players/Bob">Bob</a>', '0', '0.0%'],
      ['4', '<a href="/players/Zed">Zed</a>', '0', '0.0%'],
    ])
  })

  it('gives the same result for any order of the same tied rows', () => {
    const one = leaderboard([['12', 'Zed', '0', '0.0%'], ['12', 'amy', '0', '0.0%'], ['12', 'Bob', '0', '0.0%']])
    const two = leaderboard([['12', 'Bob', '0', '0.0%'], ['12', 'Zed', '0', '0.0%'], ['12', 'amy', '0', '0.0%']])

    normalizeTiedPlayerRows(one)
    normalizeTiedPlayerRows(two)

    expect(one.innerHTML).toBe(two.innerHTML)
  })

  it('leaves rows that differ in any other value in their order', () => {
    const root = leaderboard([
      ['7', 'Xavier', '8', '11.0%'],
      ['7', 'Blayden', '8', '10.4%'],
    ])
    const before = root.innerHTML

    normalizeTiedPlayerRows(root)

    expect(root.innerHTML).toBe(before)
  })

  it('leaves a table without a Player column alone', () => {
    const root = leaderboard(
      [
        ['2', 'Zed', '0'],
        ['2', 'amy', '0'],
      ],
      ['#', 'Name', 'Wins'],
    )
    const before = root.innerHTML

    normalizeTiedPlayerRows(root)

    expect(root.innerHTML).toBe(before)
  })
})

describe('isLoopbackUrl', () => {
  it('accepts loopback hosts', () => {
    expect(isLoopbackUrl('http://127.0.0.1:3201')).toBe(true)
    expect(isLoopbackUrl('http://127.0.0.2:3201')).toBe(true)
    expect(isLoopbackUrl('http://localhost:3202/')).toBe(true)
    expect(isLoopbackUrl('http://[::1]:3202')).toBe(true)
  })

  it('refuses any other host', () => {
    expect(isLoopbackUrl('https://harborstats.jussaw.com')).toBe(false)
    expect(isLoopbackUrl('http://192.168.1.20:23413')).toBe(false)
    expect(isLoopbackUrl('http://localhost.example.com')).toBe(false)
    expect(isLoopbackUrl('not a url')).toBe(false)
  })
})
