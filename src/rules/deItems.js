// The Vhar's magic items, Gifts of the Bloodied God and Forbidden Poisons: what each one does in play, as a table of
// effects keyed by item id. Exports DE_EFFECTS, which items.js merges into its EFFECTS table. No imports, so
// items.js can load it first.
export const DE_EFFECTS = {
  'executioners-axe': { weapon: true, flags: { woundOn: 2 } }, // Executioner's Axe: 2+ always wounds
  // Sword of Ruin: no armour, Ward or Regeneration save (combat.js)
  'sword-of-ruin': { weapon: true, flags: { noArmour: true, ruin: true } },
  'lifetaker': { ranged: true }, // Lifetaker
  // Whip of Agony: High Beastmasters only (its lasting -1 Toughness is not in the game yet)
  'whip-of-agony': { weapon: true, only: { names: /^High Beastmaster$/ } },
  // Shield of Skelmor: a shield; attacks at its bearer -1 Strength (to 1) (combat.js)
  'shield-of-skelmor': { armour: { shield: true }, flags: { skelmor: true } },
  // Blood Armour: infantry or cavalry; 5+ (its improvement for each unsaved wound it inflicts is not in yet)
  'blood-armour': { armour: { base: 5 }, only: { troop: /Infantry|Cavalry/ } },
  'pendant-of-vaelith': { flags: { vaelith: true } }, // 5+ / 4+ against S5+ (darkelves.js deWards)
  // Pearl of Infinite Bleakness: the bearer and any unit it has joined Immune to Psychology (units.js)
  'pearl-of-infinite-bleakness': { rules: ['Immune to Psychology'], flags: { pearl: true } },
  // Banner of Umbreth: Stubborn and +1 Melee Outcome
  'banner-of-umbreth': { bannerRules: ['Stubborn'], flags: { meleeOutcome: true } },
  'standard-of-slaughter': { flags: { slaughter: true } }, // +D3 Melee Outcome in a turn it charged (combat.js)
  'banner-of-ashvane': { flags: { ashvane: true } }, // combat weapons' AP improved by 1 (combat.js)
  'hydras-tooth': { ranged: true }, // Hydra's Tooth (picking a model in the unit is not in)
  // Tome of Kelthar: one more spell than its Level gives (magic.js generateSpells)
  'tome-of-kelthar': { flags: {} },
  // ---- Gifts of the Bloodied God ----
  'cry-of-war': { flags: { cryOfWar: true } }, // enemies in its Command range -1 Leadership (leadership.js)
  'rune-of-the-bloodied-god': { flags: { runeOfTheBloodiedGod: true } }, // Extra Attacks (+D3) (Rune of the Bloodied God; darkelves.js ownExtraAttacks)
  'witchbrew': { flags: { rage: true } }, // it, its mount and its unit never lose Frenzy (combat.js, as the Banner of Rage)
  // ---- Forbidden Poisons ----
  'dark-venom': { rules: ['Killing Blow'] }, // Dark Venom
  'manbane': { flags: { woundOnFour: true } } // Manbane: 4+ always wounds (combat.js)
}
