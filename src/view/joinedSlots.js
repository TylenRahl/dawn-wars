// WHERE A JOINED CHARACTER STANDS IN ITS UNIT, for drawing. Exports slotsWithJoined(), used by view/board.js,
// view/shotFx.js and view/spellFx.js.
//
// The rule (rules/core/08-characters-and-command-groups.md): a character who joins a unit goes into
// its front rank, and the ordinary rank-and-file models he pushes out (never the command group) move to
// the back rank. A character whose base is too big for the ranks stands beside the front rank on a
// flank instead, touching it.
//
// Which place each character takes is the engine's (rules/joining.js joinedPlaces), and combat counts it (rules/combat.js
// attackGroupsInner: the rank and file in the fighting rank are fewer by the characters' places). This file only lays the
// models out to draw them, the way rules/units.js modelSlots lays out a unit. Inches throughout.

import { modelSlots, alive, filesOf, width, gapOf } from '../rules/units.js'
import { joinedPlaces } from '../rules/joining.js'
import { add, mul, dirOf, rightOf } from '../rules/geometry.js'

// [{ model, unit, rank, at }]: every live model of `host` and of the characters with it. `host` may be a
// drawn copy (a gliding unit: pos and facing changed, `joined` kept).
export function slotsWithJoined (host) {
  const base = modelSlots(host).map(s => ({ ...s, unit: host }))
  // where each character stands is the engine's (rules/joining.js joinedPlaces): combat counts the same places
  const places = joinedPlaces(host)
  if (!places.front.length && !places.rear.length) return withFlank(host, base, places.flank)
  // the front rank as the engine has it (characters in their places), then everyone behind, then those displaced
  const behind = base.filter(s => s.rank > 0)
  const row = places.row.map(e => e.c ? { model: alive(e.c)[0], unit: e.c } : { model: e.model, unit: host })
  const displaced = places.front.filter(h => h.model).map(h => ({ model: h.model, unit: host }))
  const ordered = [...row, ...behind.map(s => ({ model: s.model, unit: host })), ...displaced, ...places.rear.map(c => ({ model: alive(c)[0], unit: c }))]

  // lay them out exactly as modelSlots lays out a unit: full ranks, the last one centred
  const files = filesOf(host)
  const f = dirOf(host.facing); const r = rightOf(host.facing)
  const g = gapOf(host)
  const W = width(host)
  const out = []
  for (let k = 0; k < ordered.length; k++) {
    const rank = Math.floor(k / files)
    const n = Math.min(files, ordered.length - rank * files)
    const i = k - rank * files
    const offset = (files - n) / 2
    const across = (offset + i) * (host.base.w + g) + host.base.w / 2 - W / 2
    const back = rank * (host.base.d + g) + host.base.d / 2
    out.push({ ...ordered[k], rank, file: offset + i, at: add(add(host.pos, mul(r, across)), mul(f, -back)) })
  }
  return withFlank(host, out, places.flank)
}

// characters whose base does not fit: on the right flank, against the front rank, then the left
function withFlank (host, slots, chars) {
  if (!chars.length) return slots
  const f = dirOf(host.facing); const r = rightOf(host.facing)
  const W = width(host)
  let right = W / 2; let left = -W / 2
  const out = [...slots]
  chars.forEach((c, k) => {
    const m = alive(c)[0]
    if (!m) return
    let across
    if (k % 2 === 0) { across = right + c.base.w / 2; right += c.base.w } else { across = left - c.base.w / 2; left -= c.base.w }
    out.push({ model: m, unit: c, rank: 0, flank: true, at: add(add(host.pos, mul(r, across)), mul(f, -c.base.d / 2)) })
  })
  return out
}
