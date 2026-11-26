// The Ilthari Realms' magic items, Elven Honours and named characters' items: what each one does in play, as a table
// of effects keyed by item id. Exports HE_EFFECTS, which items.js merges into its EFFECTS table. No imports, so
// items.js can load it first.
const INF_CAV = /Infantry|Cavalry/
export const HE_EFFECTS = {
  'the-white-sword': { weapon: true, only: { troop: /Infantry|Chariot/ } },
  'the-blade-of-leaping-gold': { weapon: true },
  'bow-of-the-seafarer': { ranged: true }, // (shot as an ordinary missile weapon)
  // Star Lance: cavalry or monsters; only in a turn its wielder charged
  'star-lance': { weapon: true, only: { mountedOr: /Cavalry|Monster|Chariot/ }, flags: { chargeOnlyWeapon: true } },
  // Reaver Bow (its shots equal to the wielder's Attacks are not in the game yet: one shot)
  'reaver-bow': { ranged: true },
  'foe-bane': { weapon: true, flags: { woundOn: 4 } }, // Foe Bane
  'armour-of-stars': { armour: { base: 5 }, flags: { kbImmune: true }, only: { troop: INF_CAV } },
  'armour-of-pyrrhan': { armour: { base: 4 }, ward: { value: 5 } },
  // The Golden Shield: a shield; attacks directed at its bearer re-roll natural 6s To Hit (combat.js)
  'the-golden-shield': { armour: { shield: true }, flags: { goldenShield: true } },
  'dragon-helm': { armour: { bonus: 1 }, ward: { value: 7, flaming: 6 } },
  // Circlet of Talimar: +1 Wound; +1 Toughness for infantry or cavalry (units.js)
  'circlet-of-talimar': { stats: { W: 1 }, flags: { circlet: true } },
  'sacred-incense': { flags: { splendour: true } }, // -1 to shoot at the bearer or its unit
  // The Loremaster's Cloak: the bearer and its unit 4+ Ward against Magic Missiles (spells.js)
  'the-loremasters-cloak': { flags: { loreCloak: true } },
  'opal-amulet': { flags: { opal: true } }, // single use, 2+ Ward against a single wound (damage.js charmedWard)
  // Banner of Resilience: its unit +1 Toughness (units.js)
  'banner-of-resilience': { flags: { resilience: true } },
  // Banner of Arcane Protection: MR (-3); friendly units within 6" MR (-1) (units.js rulesOf)
  'banner-of-arcane-protection': { bannerRules: ['Magic Resistance (-3)'], flags: { arcaneProtection: true } },
  'battle-banner': { flags: { meleeOutcomeD3: true } }, // +D3 Melee Outcome (combat.js)
  // The Banner of Lumaren (the third rank's supporting attacks are not in the game yet)
  'the-banner-of-lumaren': { flags: { lumaren: true } },
  'lion-standard': { flags: { courage: true } }, // passes Fear and Terror tests
  // Banner of Balance (no re-rolls To Hit or To Wound either way in contact: not in the game yet)
  'banner-of-balance': { flags: { balance: true } },
  'banner-of-elvarin': { bannerRules: ['Move Through Cover'] },
  'banner-of-confidence': { flags: { standShootNoPenalty: true } }, // no -1 to Stand & Shoot (shooting.js)
  // Null Stone: Wizards within its Command range -1 to Casting and Dispel rolls (its Command use is not in yet)
  'null-stone': { flags: { nullStone: true } },
  'the-cloak-of-beards': { rules: ['Terror'] }, // (others not using its Leadership: not in yet)
  'ring-of-fury': { bound: { spell: 'hammerhand', power: 1 } },
  'seed-of-rebirth': { rules: ['Regeneration (5+)'] },
  // single use, instead of a dispel: dispelled, no roll (magic.js; the Vortex Shard's ending every Remains in Play spell too)
  'the-vortex-shard': { flags: { spellbreaking: true, vortexShard: true } },
  'sigil-of-solantar': { flags: { spellbreaking: true } },
  // The Trickster's Pendant: single use, an extra D6 for a Wizardly dispel, the lowest discarded
  'the-tricksters-pendant': { flags: { trickster: true } },
  'crownspire-crystal': { flags: { annulian: true } }, // (forgetting and re-generating a spell: not in the game yet)
  'silvery-wand': { flags: { extraSpell: 1 } },
  'staff-of-solidity': { flags: { solidity: true } }, // single use, no roll on the Backlash table (magic.js)
  // ---- Elven Honours: the rules each gains (mount and free-weapon options not in yet) ----
  loremaster: { flags: { loremasterHonour: true } }, // (its Level 1 Wizardry is not in the game yet)
  'shadow-stalker': { rules: ['Ambushers', 'Evasive', 'Fire & Flee', 'Move Through Cover', 'Scouts'] },
  'anointed-of-solantar': { rules: ['Blessings of Solantar', 'Fear', 'Witness to Destiny'] },
  'blood-of-pyrrhan': { stats: { WS: 1 }, rules: ['Dragon Armour', 'Impetuous'] },
  'thessan-hunter': { rules: ['Lion Cloak', 'Move Through Cover', 'Stubborn'] },
  'warden-of-aelsyr': { rules: ['Deflect Shots', 'Moonsilver Armour', 'Killing Blow'] },
  // Pure of Heart: it and its unit pass Panic tests (its Leadership lent to all in range: not in yet)
  'pure-of-heart': { flags: { pureOfHeart: true } },
  'sea-guard': { rules: ['Naval Discipline', 'Rallying Cry'] },
  // ---- named characters' own items ----
  calthiel: { weapon: true, flags: { grudge: 99 } }, // natural 1s To Hit re-rolled in combat
  'the-pelt-of-kharrus': { rules: ['Regeneration (5+)'], flags: { gnarrok: true } }, // (+1 armour in combat: not in yet)
  'maerins-ire': { weapon: true, flags: { glitterScales: true } } // enemies re-roll a single successful hit (once a turn)
}
