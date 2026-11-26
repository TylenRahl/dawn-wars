// THE DICE ON SCREEN. Exports createDiceStrip(), used by ui/battle.js. Bottom centre, over
// the roll log: the faces of the dice behind the latest line of the log, with that line under
// them, so what was rolled and what it was for are read together.
//
// It shows; it never decides and never delays. rules/dice.js watchRolls reports each roll after
// it is made, the faces are kept until the game writes its next log line, and then that line and
// those faces are drawn together. The log still prints every roll. No tumbling: a roll simply appears.
import { watchRolls } from '../rules/dice.js'
import { face } from '../shared/dieFace.js'

const MOST = 48 // more dice than this in one line (a big unit's attacks) and the rest are counted, not drawn

export function createDiceStrip (game, box) {
  let pending = []
  const stopWatching = watchRolls(roll => pending.push(roll))
  const onLine = ({ text }) => {
    if (!pending.length) return
    const rolls = pending
    pending = []
    draw(rolls, text)
  }
  game.listeners.add(onLine)

  function dieHtml (roll, v) {
    if (roll.kind === 'artillery') return `<span class="die word${v === 'misfire' ? ' failed' : ''}">${v === 'misfire' ? 'MISFIRE' : v}</span>`
    if (roll.kind === 'scatter') return `<span class="die word${v === 'hit' ? ' passed' : ''}">${v === 'hit' ? 'HIT!' : `&#x2191; ${roll.angle}&deg;`}</span>`
    const mark = roll.kind === 'target' && roll.need != null ? (v >= roll.need ? 'passed' : 'failed') : ''
    return face(v, mark)
  }

  function draw (rolls, text) {
    let shown = 0
    let hidden = 0
    const rows = rolls.map(roll => {
      const dice = roll.dice.map(v => {
        if (shown >= MOST) { hidden++; return '' }
        shown++
        return dieHtml(roll, v)
      }).join('')
      const note = roll.kind === 'target' && roll.need != null
        ? `<b>${roll.need}+</b> ${roll.dice.filter(v => v >= roll.need).length} of ${roll.dice.length}`
        : roll.kind === 'leadership'
          ? `<b>${roll.total}</b> against Ld ${roll.need} — <span class="${roll.passed ? 'ok' : 'bad'}">${roll.passed ? 'passed' : 'failed'}</span>`
          : roll.kind === 'sum' ? `<b>${roll.total}</b>` : ''
      return dice ? `<span class="roll">${dice}${note ? `<span class="note">${note}</span>` : ''}</span>` : ''
    }).join('')
    box.innerHTML = `<div class="dice">${rows}${hidden ? `<span class="note">+${hidden} more</span>` : ''}</div><div class="what"></div>`
    box.querySelector('.what').textContent = text
    box.hidden = false
  }

  return {
    clear () { pending = []; box.hidden = true },
    stop () { stopWatching(); game.listeners.delete(onLine) }
  }
}
