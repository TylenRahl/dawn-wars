// Every string the game's own code writes (src/ui, src/rules, src/view) carries no retired name (the list of retired
// names: rules/displayNames.test.js OLD, read from the name tables). A string is looked at as written, not after
// forDisplay (which would swap any retired name away). Comments, ids (lower-case-with-hyphens) and the data files
// (src/data) are not looked at.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { OLD } from '../rules/displayNames.test.js'

const files = dir => readdirSync(new URL(dir, import.meta.url)).filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).map(f => new URL(dir + f, import.meta.url))
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1')
const literals = src => [...stripComments(src).matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2] ?? m[3])

test('no old word in any text the code shows', () => {
  const left = []
  for (const f of [...files('./'), ...files('../rules/'), ...files('../view/')]) {
    if (/names\/index\.js$|testLists\.js$/.test(f.pathname)) continue
    for (const s of literals(readFileSync(f, 'utf8'))) {
      if (!/[A-Z]/.test(s) || /^[\w./-]*$/.test(s) && !/[A-Z][a-z]/.test(s)) continue // ids, keys, paths
      const m = s.match(OLD)
      if (m) left.push(`${f.pathname.split('/src/')[1]}: "${m[0]}" in "${s.slice(0, 90)}"`)
    }
  }
  assert.deepEqual(left.slice(0, 40), [], `${left.length} left`)
})
