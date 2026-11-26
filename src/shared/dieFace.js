// ONE D6 FACE as HTML: nine cells, the lit ones carrying a pip. Exports face(value, extra) and
// PIPS; the dice strip under the battle (src/ui/diceStrip.js) draws its faces with it.

// The pip layout of a d6 face, as the cells of a 3x3 grid that carry a pip. Exported so a die
// can be repainted in place: swapping the whole element would restart any animation on it.
export const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
}

export function face (value, extra = '') {
  const on = new Set(PIPS[value] ?? [])
  return `<span class="die ${extra}" data-value="${value}" title="${value}">${
    Array.from({ length: 9 }, (unused, i) => `<i${on.has(i) ? ' class="pip"' : ''}></i>`).join('')
  }</span>`
}
