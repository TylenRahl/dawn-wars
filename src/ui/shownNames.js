// THE NAMES ON THE PAGE: one mechanism, not thousands of edited strings. Exports showNewNames(), called once by src/main.js.
// A MutationObserver passes every text node and every title/placeholder/aria-label the page shows through forDisplay
// (src/rules/displayNames.js), as it arrives, so the shown name of anything is decided in one place whatever the data
// holds. The table's Pixi captions are not in the page; view/board.js calls forDisplay itself.
import { forDisplay } from '../rules/displayNames.js'

const ATTRIBUTES = ['title', 'placeholder', 'aria-label', 'alt']
// what this file wrote last into a node, so its own change is not renamed again
const wrote = new WeakMap()

function cleanText (node) {
  const before = node.nodeValue
  if (!before || wrote.get(node) === before) return
  if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(node.parentElement?.tagName ?? '')) return
  const after = forDisplay(before)
  if (after !== before) node.nodeValue = after
  wrote.set(node, after)
}

function cleanAttributes (el) {
  for (const name of ATTRIBUTES) {
    const before = el.getAttribute(name)
    if (!before) continue
    const key = wrote.get(el) ?? {}
    if (key[name] === before) continue
    const after = forDisplay(before)
    if (after !== before) el.setAttribute(name, after)
    wrote.set(el, { ...key, [name]: after })
  }
}

function cleanTree (root) {
  if (root.nodeType === 3) return cleanText(root)
  if (root.nodeType !== 1) return
  cleanAttributes(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === 3) cleanText(node)
    else cleanAttributes(node)
  }
}

export function showNewNames (root = document.documentElement) {
  cleanTree(root)
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') cleanText(record.target)
      else if (record.type === 'attributes') cleanAttributes(record.target)
      else for (const node of record.addedNodes) cleanTree(node)
    }
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES })
  return observer
}
