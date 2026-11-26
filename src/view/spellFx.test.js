// Every lore of magic has its own look (view/spellFx.js): its own colour and its own particle shape.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SPELLS } from '../data/spells.js'
import { LORE_LOOKS, DEFAULT_LOOK, MOTIF_NAMES, spellLook } from './spellFx.js'

test('every lore in data/spells.js has a look of its own', () => {
  const lores = [...new Set(Object.values(SPELLS).map(s => s.lore).filter(Boolean))]
  for (const l of lores) assert.ok(LORE_LOOKS[l], `no look for ${l}`)
})
test('no two looks share a particle shape or a colour', () => {
  const looks = Object.values(LORE_LOOKS)
  assert.equal(new Set(looks.map(l => l.motif)).size, looks.length)
  assert.equal(new Set(looks.map(l => l.colour)).size, looks.length)
  for (const l of [...looks, DEFAULT_LOOK]) assert.ok(MOTIF_NAMES.includes(l.motif), l.motif)
})
test('the spells with no lore get a look by their name, never nothing', () => {
  for (const s of Object.values(SPELLS).filter(s => !s.lore)) assert.ok(spellLook(s).motif, s.name)
  assert.equal(spellLook(SPELLS[Object.keys(SPELLS).find(k => /^Rune of/.test(SPELLS[k].name))]).motif, 'anvil')
})
