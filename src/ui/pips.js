// THE ACTION PIPS ON THE BATTLE TABLE. Exports createPips(), used by ui/battle.js.
//
// The shared pips (src/shared/actionPips.js) drawn over this table. Each pip is a button the side panel already has — same label, same handler — moved to
// the thing it acts on. This file decides nothing and checks nothing: phases.js built the
// buttons and the modes, and a pip only presses one.
//
//   Selected unit, your turn: Charge, Move, March, Reform, Fly, Join, Shoot over the unit.
//                             Greyed (and saying so on hover) when the side panel's is greyed.
//   Choosing a charge target: a Charge pip over every unit it may charge.
//   Choosing a shooting target: a Shoot pip, with the distance, over every target.
//   Moving, once a left-click has held the ghost: Forward, Wheel, Back, Sideways, Done over it, and
//   a grey row of Turn left / right, About face, Redress, Undo, Cancel above (phases.js moveMode).
//   Reforming, facing held: Confirm, Narrower, Wider, Formation; Turn again and Cancel (reformMode).
//   Combat phase: a Fight pip over each combat still to fight.
// The side panel keeps every button: the pips are an addition, never the only way.
// Space hides and shows them.
import { createActionPips } from '../shared/actionPips.js'
import { corners, centre } from '../rules/units.js'
import { combatsToFight } from '../rules/combat.js'

// The side panel buttons that become pips over the unit: their label's start, and the pip's word.
const UNIT_PIPS = [
  [/^Charge…/, 'Charge'],
  [/^Move…/, 'Move'],
  [/^March…/, 'March'],
  [/^Reform…/, 'Reform'],
  [/^Fly…/, 'Fly'],
  [/^Fly, marching…/, 'Fly (march)'],
  [/^Join a unit…/, 'Join'],
  [/^Shoot…/, 'Shoot'],
  [/^Shoot: (.+)…/, m => `Shoot: ${m[1]}`]
]

// where a pip stands: over the unit's middle, on its top edge as the table is seen
const over = u => ({ x: centre(u).x, y: Math.min(...corners(u).map(p => p.y)) })

export function createPips (ui, { host, canvas, toScreen }) {
  const pips = createActionPips({
    host,
    canvas,
    toScreen: (x, y) => toScreen({ x, y }),
    screens: ['menu', 'lists', 'setup', 'help']
  })

  function render () {
    const game = ui.game
    // nothing to press while the rules are busy (a charge being answered, a combat being fought)
    if (game.phase === 'deploy' || game.phase === 'over' || ui.busy || ui.fighting) { pips.set([]); return }
    // a mode choosing a target offers its own pips (phases.js chargeMode, shootMode)
    if (ui.mode) {
      pips.set((ui.mode.pips?.() || []).map(p => ({ ...p, at: p.at ?? over(p.unit) })))
      return
    }
    const list = []
    if (game.sub === 'fight') {
      for (const c of combatsToFight(game)) {
        const action = (ui.actions || []).find(([label]) => label === `Fight: ${c.label}`)
        const u = c.units.find(x => x.side === game.active) || c.units[0]
        if (action && u) list.push({ key: `fight-${u.id}`, label: 'Fight', why: c.label, at: over(u), onPress: action[1] })
      }
    }
    const u = ui.selected
    if (u && u.placed && !u.status.removed && u.side === game.active) {
      for (const [label, fn, disabled] of ui.actions || []) {
        for (const [re, word] of UNIT_PIPS) {
          const m = label.match(re)
          if (!m) continue
          const text = typeof word === 'function' ? word(m) : word
          list.push({
            key: `unit-${u.id}-${text}`,
            label: text,
            why: disabled ? `${label.replace('…', '')}: not possible for this unit now.` : label,
            at: over(u),
            state: disabled ? 'off' : undefined,
            onPress: disabled ? () => {} : fn
          })
          break
        }
      }
    }
    pips.set(list)
  }

  return { render, place: pips.place }
}
