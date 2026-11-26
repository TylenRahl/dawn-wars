// DAWN WARS: THE MAGIC ITEMS IN OUR OWN WORDS (2026-11-07: the prose rewritten so the game can be published).
// The army builder's tooltip shows ITEM_TEXT[id]: each item's rule written fresh from what it does, every number unchanged.
// The original wording stays in magicItems.js and the saved pages ("make sure you keep the orginal writing in this folder");
// an item not rewritten yet falls back to it. Filled by itemText.data.js (written army by army).
import { ITEM_TEXT } from './itemText.data.js'
export { ITEM_TEXT }
export const itemText = (id, item) => ITEM_TEXT[id] ?? item?.text ?? ''
