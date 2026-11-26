// The Ashforged's magic items: what each one does in play, as a table of effects keyed by item id.
// Exports CD_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it first.
export const CD_EFFECTS = {
  // Black Hammer of the Bull of Ash (its Killing Blow against the Flammable: combat.js)
  'black-hammer-of-the-bull-of-ash': { weapon: true },
  'dark-maul': { weapon: true }, // Dark Maul (its Strength test for one more Wound is not in yet)
  // Dagger of Malice: Frenzy and Hatred (all enemies), never lost
  'dagger-of-malice': { weapon: true, rules: ['Frenzy', 'Hatred (all enemies)'], flags: { rage: true } },
  'the-graven-sceptre': { weapon: true, flags: { woundOn: 4 } }, // 4+ always wounds
  // Armour of Vazgor the Cruel: full plate; Immune to Psychology, Magic Resistance (-2)
  'armour-of-vazgor-the-cruel': { armour: { base: 4 }, rules: ['Immune to Psychology', 'Magic Resistance (-2)'] },
  // The Mask of the Furnace: worn with other armour, +1; a 3+ Ward against Flaming Attacks
  'the-mask-of-the-furnace': { armour: { bonus: 1 }, ward: { value: 7, flaming: 3 } },
  'mantle-of-stone': { stats: { T: 1, I: -1 } }, // Mantle of Stone
  // The Lammasu's Beard: its unit a 6+ Ward and Magic Resistance (-2) (the 6" aura is not in yet)
  'the-lammasus-beard': { bannerRules: ['Magic Resistance (-2)'], flags: { lammasu: true } },
  'ashen-banner': { flags: { splendour: true } }, // -1 to shoot at its unit (shooting.js)
  'shroud-of-the-ancestor': { bannerRules: ['Hatred (Dwarfs)'] }, // Shroud of the Ancestor
  // Obsidian Vambraces: +1 Strength, Magic Resistance (-1) (their shattering on a 1 is not in yet)
  'obsidian-vambraces': { stats: { S: 1 }, rules: ['Magic Resistance (-1)'] },
  // Vial of Lammasu Blood: single use, instead of a dispel attempt — dispelled, no roll
  'vial-of-lammasu-blood': { flags: { spellbreaking: true } }
}
