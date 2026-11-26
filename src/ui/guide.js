// The "What now?" guide at the top of the side panel, used by ui/battle.js; exports STEP_HELP and the guide's
// drawing functions. It says what the current step is for, in plain words, and lists the units that can do something in
// it with what they can do — read from the same buttons the side panel shows (ui/phases.js actionsFor), so it never
// disagrees with them. Click a row to select that unit.

import { whoDeploys, sideName, unitsOf } from '../rules/game.js'
import { isDead } from '../rules/units.js'
import { actionsFor } from './phases.js'

const el = (tag, props = {}) => Object.assign(document.createElement(tag), props)

// What each step is for, and how to finish it. The full rules are in rules/core/03-the-turn.md and the phase chapters after it.
export const STEP_HELP = {
  deploy: 'Deployment: the players take turns putting one unit on the table, in their own shaded zone. Click a unit\'s name in the box below, then click on the table. The outline is green where it can stand, red where it cannot. Characters come last: click one onto a unit to join it. When all are down, press Start battle (bottom right).',
  start: 'Start of Turn: anything that happens "at the start of your turn" happens now (some armies have buttons here, e.g. releasing Whirlers). Usually there is nothing to do: press the gold button.',
  command: 'Command: some characters and items have once-a-turn abilities used here (e.g. the Big Ruck, prayers, battle cries). They appear as buttons on those units. Otherwise press the gold button.',
  conjuration: 'Conjuration: your Wizards may cast their Enchantment spells (help your units) and Hex spells (hinder the enemy) now. Click a Wizard, or the unit it has joined, and press a Cast button. The other player is asked whether to dispel it.',
  rally: 'Rally: every fleeing unit of yours tests its Leadership (2D6, equal or under) to stop running. This is rolled for you. A unit that rallies may make a free reform. Press the gold button to go on to Movement.',
  charges: 'Declare charges: click one of your units, press Charge…, then click an enemy unit. Declare all your charges, then press "Charges declared". (You do not have to charge.)',
  chargeMoves: 'Charge moves: first the other player picks how each charged unit reacts — Hold (stand still), Stand & Shoot (shoot at the chargers first) or Flee (run away). Then each charger rolls its charge distance and moves into contact if it reaches; that is done for you.',
  compulsory: 'Compulsory moves: units that must move do so now — fleeing units run, Whirlers spin, units with Random Movement roll. Units with a Roll button must roll before you can go on.',
  remaining: 'Move your other units. Click a unit, then: Move… (up to its Movement), March… (double distance; within 8" of an enemy it must pass a Leadership test first, or it may only move normally; it cannot shoot after), or Reform… (turn to face any way). Characters can Join a unit… or leave one. Wizards may cast Conveyance spells here. Size a step with the mouse (it stops at the maximum), left-click to fix it, right-click to confirm the move. Engaged or fleeing units cannot move.',
  shoot: 'Fire: click a unit with missile weapons, press Shoot…, then click a target in range and in its front arc. Wizards may cast Magic Missiles here. A unit that marched or is in combat cannot shoot.',
  fight: 'Melee: every combat must be fought, in either player\'s turn. Press each Fight: button. The game asks about challenges, where attacks go, and pursuit; then it rolls every attack, works out who won, and the loser takes a Break test.',
  over: 'The battle is over. The log at the bottom has the Victory Points and the winner.'
}

// A button label shortened for the guide: "Move… (up to 4")" → "Move"
const short = label => label.replace(/…/g, '').replace(/\s*\(.*$/, '').replace(/\s+—.*$/, '').trim()

// The units of the side whose turn it is that can do something now, with what they can do; in the Fight step, the
// combats still to fight. [{ unit, what: [names] }] — or [{ combat: label }]
export function summariseActions (ui) {
  const game = ui.game
  if (game.phase === 'deploy' || game.phase === 'over') return []
  if (game.sub === 'fight') {
    const fights = actionsFor(ui, null).filter(a => !a[2] && /^Fight: /.test(a[0])).map(a => ({ combat: a[0].replace(/^Fight: /, '') }))
    // (Wizards of either side may cast in combat; they show on their units)
    const casters = game.units.filter(u => u.placed && !u.status.removed && !isDead(u) && !u.status.joinedTo)
      .map(u => ({ unit: u, what: [...new Set(actionsFor(ui, u).filter(a => !a[2] && /Cast /.test(a[0])).map(a => short(a[0].replace(/^[^:]*: (?=Cast)/, ''))))] }))
      .filter(x => x.what.length)
    return [...fights, ...casters]
  }
  return unitsOf(game, game.active)
    .filter(u => u.placed && !u.status.removed && !isDead(u) && !u.status.joinedTo)
    .map(u => ({ unit: u, what: [...new Set(actionsFor(ui, u).filter(a => !a[2]).map(a => short(a[0])))] }))
    .filter(x => x.what.length)
}

let hidden = false
try { hidden = localStorage.getItem('dw-guide-hidden') === '1' } catch (e) {}

export function renderGuide (ui) {
  const box = document.getElementById('guide')
  if (!box) return
  box.replaceChildren()
  const game = ui.game
  const head = el('div', { className: 'guide-head' })
  head.append(el('b', { textContent: 'What now?' }))
  const tog = el('button', { className: 'guide-toggle', textContent: hidden ? 'show' : 'hide' })
  tog.onclick = () => { hidden = !hidden; try { localStorage.setItem('dw-guide-hidden', hidden ? '1' : '0') } catch (e) {} renderGuide(ui) }
  head.append(tog)
  box.append(head)
  if (hidden) return

  const key = game.phase === 'deploy' ? 'deploy' : game.phase === 'over' ? 'over' : game.sub
  const who = game.phase === 'deploy' ? whoDeploys(game) : game.active
  if (who != null && game.phase !== 'over') box.append(el('div', { className: 'guide-who ' + (who === 0 ? 'side-blue' : 'side-red'), textContent: `${sideName(game, who)} to play.` }))
  box.append(el('div', { className: 'guide-text', textContent: STEP_HELP[key] || '' }))

  // a question waiting in the panel below comes first
  // (in deployment the unit list sits in the same box: only a real question counts)
  const q = document.querySelector('#prompt .q')?.textContent || ''
  if (document.querySelector('#prompt button') && (game.phase !== 'deploy' || !/pick a unit|Every unit is on the table/.test(q))) {
    box.append(el('div', { className: 'guide-wait', textContent: '↓ A question is waiting below: answer it to go on.' }))
    return
  }
  if (game.phase === 'deploy' || game.phase === 'over') return
  // (charge reactions being asked, or a combat being fought: no gold button until it is done)
  if (ui.busy || ui.fighting) { box.append(el('div', { className: 'guide-wait', textContent: 'Resolving… answer any question that appears.' })); return }

  const rows = summariseActions(ui)
  if (!rows.length) {
    box.append(el('div', { className: 'guide-none', textContent: game.sub === 'fight' ? 'No combats to fight. Press the gold button (bottom right) to end the turn.' : 'None of your units can do anything here. Press the gold button (bottom right) to go on.' }))
    return
  }
  box.append(el('div', { className: 'guide-sub', textContent: game.sub === 'fight' ? 'To do:' : 'Your units that can act (click one):' }))
  const list = el('div', { className: 'guide-list' })
  for (const r of rows) {
    if (r.combat) { list.append(el('div', { className: 'guide-row', textContent: `⚔ ${r.combat} — press its Fight button below` })); continue }
    const row = el('button', { className: 'guide-row' + (ui.selected === r.unit ? ' sel' : '') })
    row.append(el('span', { className: 'guide-unit', textContent: r.unit.name }), el('span', { className: 'guide-what', textContent: r.what.join(' · ') }))
    row.onclick = () => ui.select(r.unit)
    list.append(row)
  }
  box.append(list)
  box.append(el('div', { className: 'guide-none', textContent: 'When you are done, press the gold button (bottom right).' }))
}
