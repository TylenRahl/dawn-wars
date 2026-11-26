// Which missile a weapon throws, and which colour a breath burns (view/shotFx.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { missileOf, breathLook } from './shotFx.js'

test('every missile weapon has a look: bolts, arrows, bullets, thrown, magic', () => {
  for (const w of ['Crossbow', 'Repeater crossbow', 'Repeater handbow']) assert.equal(missileOf(w), 'bolt', w)
  for (const w of ['Bow', 'Longbow', 'Shortbow', 'Warbow', 'Lornefolk longbow', 'Greatbow']) assert.equal(missileOf(w), 'arrow', w)
  for (const w of ['Handgun', 'Pistol', 'Fernmark long rifle', 'Blunderbuss', 'Organ gun', 'Chatter gun', 'Wyrdlock jezzail']) assert.equal(missileOf(w), 'bullet', w)
  for (const w of ['Bolt thrower', 'Repeater bolt thrower', 'Harpoon launcher']) assert.equal(missileOf(w), 'bigbolt', w)
  for (const w of ['Javelin', 'Great throwing spears']) assert.equal(missileOf(w), 'javelin', w)
  for (const w of ['Throwing axe', 'Throwing weapon', 'Nipper-hewer']) assert.equal(missileOf(w), 'axe', w)
  assert.equal(missileOf('Sling'), 'stone')
  for (const w of ['Gunpowder bombs', 'Foul wind globes']) assert.equal(missileOf(w), 'bomb', w)
  for (const w of ['Wyrd lightning cannon', 'Cipher wand', 'Petrifying gaze']) assert.equal(missileOf(w), 'magic', w)
  assert.equal(missileOf('Something new'), 'dart')
})

test('each dragon its own colour; the breath decides when the rider is not on a dragon', () => {
  const star = breathLook('Prince star-dragon', 'Dragon Fire')
  const sun = breathLook('Prince Sun Dragon', 'Dragon Fire')
  const black = breathLook('Dreadlord Black Dragon', 'Noxious breath')
  const plain = breathLook('Some Lord', 'Dragon Fire')
  assert.notDeepEqual(star, sun)
  assert.notDeepEqual(star, black)
  assert.equal(plain.hue, 0)
  assert.equal(breathLook('Iron Kettle', 'Steam gun').sat, 0)
  assert.notEqual(breathLook('Dominion Lord', 'Dark Fire of the Dominion').hue, 0)
})
