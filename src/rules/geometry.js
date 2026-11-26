// Plane geometry in inches: vectors, angles, distances, segments and polygons. The engine never deals in pixels;
// the board view only scales. Used by nearly every rules module and by the board and map editor.
//
// The table: x to the right, y DOWN the table (the same way round as the screen). An angle is in radians, measured
// the screen way: 0 points along +x, and -PI/2 points up the table (toward y = 0).

export const MM_PER_INCH = 25.4
export const mmToIn = mm => mm / MM_PER_INCH

export const vec = (x, y) => ({ x, y })
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k })
export const dot = (a, b) => a.x * b.x + a.y * b.y
export const cross = (a, b) => a.x * b.y - a.y * b.x
export const len = a => Math.hypot(a.x, a.y)
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export const dirOf = angle => ({ x: Math.cos(angle), y: Math.sin(angle) })
export const angleOf = v => Math.atan2(v.y, v.x)
// the unit's right hand, when it faces `angle`
export const rightOf = angle => ({ x: -Math.sin(angle), y: Math.cos(angle) })
export function normAngle (a) {
  while (a <= -Math.PI) a += 2 * Math.PI
  while (a > Math.PI) a -= 2 * Math.PI
  return a
}
export const rotate = (p, about, angle) => {
  const c = Math.cos(angle); const s = Math.sin(angle)
  const dx = p.x - about.x; const dy = p.y - about.y
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c }
}

// Distance from point p to segment ab.
export function pointSegDist (p, a, b) {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)))
  return dist(p, add(a, mul(ab, t)))
}

// The point of segment ab nearest to p.
export function nearestOnSeg (p, a, b) {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)))
  return add(a, mul(ab, t))
}

function segsCross (a, b, c, d) {
  const d1 = cross(sub(b, a), sub(c, a)); const d2 = cross(sub(b, a), sub(d, a))
  const d3 = cross(sub(d, c), sub(a, c)); const d4 = cross(sub(d, c), sub(b, c))
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

export function segDist (a, b, c, d) {
  if (segsCross(a, b, c, d)) return 0
  return Math.min(pointSegDist(a, c, d), pointSegDist(b, c, d), pointSegDist(c, a, b), pointSegDist(d, a, b))
}

export function pointInPoly (p, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]; const b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// The closest distance between two convex polygons (0 if they touch or overlap).
export function polyDist (P, Q) {
  if (P.some(p => pointInPoly(p, Q)) || Q.some(q => pointInPoly(q, P))) return 0
  let best = Infinity
  for (let i = 0; i < P.length; i++) {
    const a = P[i]; const b = P[(i + 1) % P.length]
    for (let j = 0; j < Q.length; j++) {
      best = Math.min(best, segDist(a, b, Q[j], Q[(j + 1) % Q.length]))
    }
  }
  return best
}

// Do two convex polygons overlap by more than `tol` (touching edge to edge is not overlap)?
// Separating axis test, shrunk by tol so units in base contact are not "overlapping".
export function polysOverlap (P, Q, tol = 0.01) {
  for (const poly of [P, Q]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]; const b = poly[(i + 1) % poly.length]
      const n = { x: -(b.y - a.y), y: b.x - a.x }
      const l = len(n) || 1; n.x /= l; n.y /= l
      let pMin = Infinity; let pMax = -Infinity; let qMin = Infinity; let qMax = -Infinity
      for (const p of P) { const d = dot(p, n); pMin = Math.min(pMin, d); pMax = Math.max(pMax, d) }
      for (const q of Q) { const d = dot(q, n); qMin = Math.min(qMin, d); qMax = Math.max(qMax, d) }
      if (pMax <= qMin + tol || qMax <= pMin + tol) return false
    }
  }
  return true
}

export const round1 = x => Math.round(x * 10) / 10
