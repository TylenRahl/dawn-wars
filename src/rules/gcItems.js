// The Jade Dominion of Shen's magic items: what each one does in play, as a table of effects keyed by item id.
// Exports GC_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it first.
export const GC_EFFECTS = {
  'the-monkey-kings-wisdom': { weapon: true }, // The Monkey King's Wisdom
  // Jade Blade of the Great Fleet: its wielder Regeneration (5+)
  'jade-blade-of-the-great-fleet': { weapon: true, rules: ['Regeneration (5+)'] },
  'the-sword-of-reason': { weapon: true }, // (its Killing Blow on a 5 is not in yet)
  'the-brazen-blade': { weapon: true }, // (no Ward or Regeneration on a natural 6 is not in yet)
  'the-wrath-of-lan-yao': { weapon: true, flags: { noRegenAgainst: true } }, // (no Regeneration against it: not in yet)
  'the-sword-of-hai-lun': { weapon: true },
  // Spirit Longma Spear: cavalry, monsters or chariots; its bonuses only in a turn its wielder charged
  'spirit-longma-spear': { weapon: true, only: { mountedOr: /Cavalry|Monster|Chariot/ }, flags: { chargeOnlyS: true, chargeOnlyAP: true } },
  'sun-and-moon-blades': { weapon: true }, // (its parry of a Killing Blow is not in yet)
  // The Armour of the Warbird: regular or heavy infantry; heavy armour, Counter Charge, Fly (9), Swiftstride;
  // cannot join a unit
  'the-armour-of-the-warbird': { armour: { base: 5 }, rules: ['Counter Charge', 'Fly (9)', 'Swiftstride'], flags: { noJoin: true }, only: { troop: /Regular Infantry|Heavy Infantry/ } },
  // Jade Armour of Zhaolin: full plate, a 5+ Ward, Magic Resistance (-2)
  'jade-armour-of-zhaolin': { armour: { base: 4 }, ward: { value: 5 }, rules: ['Magic Resistance (-2)'] },
  'shield-of-hai-lun': { armour: { shield: true } }, // (its +2 when charged is not in yet)
  'crystal-of-tianlu': { ward: { value: 5 } }, // (its hits back on a natural 6 are not in yet)
  'sigil-of-smoke-and-powder': { flags: { splendour: true } }, // -1 to shoot at the bearer or its unit (shooting.js)
  // Vermilion Quills: single use, failed rolls To Hit and To Wound re-rolled in a combat (combat.js coin)
  'vermilion-quills': { flags: { coin: 'both' } },
  // Banner of the Dragon's Wrath: Flaming Attacks and Impact Hits (1)
  'banner-of-the-dragons-wrath': { bannerRules: ['Flaming Attacks', 'Impact Hits (1)'] },
  'the-jade-banner': { flags: { meleeOutcome2: true } }, // +2 Melee Outcome (combat.js)
  'the-shroud-of-ameyo': { flags: {} }, // Fear, or Terror (units.js rulesOf)
  // Alchemist's Mask: Plague of Rust as a Bound spell, Power Level 1
  'alchemists-mask': { bound: { spell: 'plague-of-rust', power: 1 } },
  // Ring of Jet: Unquiet Spirits as a Bound spell, Power Level 1
  'ring-of-jet': { bound: { spell: 'unquiet-spirits', power: 1 } },
  'spirit-lantern': { rules: ['Terror'] }, // (its re-roll of 1s To Wound against Unmade or Undead is not in yet)
  'guardian-fen-shao': { flags: { zhuatlLike: true } }, // attacks at its owner in combat -1 To Hit (combat.js)
  // Clockwork Compass: single use, instead of a dispel — dispelled, and every Remains in Play spell
  'clockwork-compass': { flags: { spellbreaking: true, vortexShard: true } },
  'learned-fen-shao': { flags: {} }, // one more spell (magic.js generateSpells)
  'scrolls-of-shu-an': { flags: {} }, // one more spell (magic.js generateSpells)
  'talons-of-the-storm': { weapon: true } // Mei Lan's own
}
