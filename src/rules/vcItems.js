// The Bloodsworn Courts' magic items and Vampiric Powers: what each one does in play, as a table of effects keyed by
// item id. Exports VC_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it
// first.
export const VC_EFFECTS = {
  // Spell Familiar: one more spell than its Level gives (magic.js generateSpells)
  'spell-familiar': { flags: {}, only: { wizard: true } },
  // Standard of Hellish Vigour
  'standard-of-hellish-vigour': { bannerRules: ['Reserve Move'] },
  'sword-of-kings': { weapon: true }, // Sword of Kings (its Killing Blow on a 5 is not in yet: on a 6)
  'blood-drinker': { weapon: true }, // Blood Drinker (its Wound back is not in yet)
  // Dreadlance: cavalry or monsters; only in a turn its wielder charged
  'dreadlance': { weapon: true, only: { mountedOr: /Cavalry|Monster|Chariot/ }, flags: { chargeOnlyWeapon: true, rerollHit: true } },
  'frostblade': { weapon: true }, // Frostblade (its Toughness test is not in yet)
  // The Flayed Hauberk: heavy armour a Wizard may wear; a 6+ Ward
  'the-flayed-hauberk': { armour: { base: 5 }, ward: { value: 6 }, flags: { wizardArmour: true } },
  // The Accursed Armour: infantry or cavalry; full plate, +1 T, -1 WS and I
  'the-accursed-armour': { armour: { base: 4 }, stats: { T: 1, WS: -1, I: -1 }, only: { troop: /Infantry|Cavalry/ } },
  // Cloak of Mist and Shadows: Necromancers on foot; Ethereal
  'cloak-of-mist-and-shadows': { rules: ['Ethereal'], only: { names: /Necromancer|Necromantic Acolyte/ } },
  'skull-staff': { flags: { dispelRange: 3, dispelBonus: 1 } }, // Skull Staff
  // Crown of the Damned: a 4+ Ward and Stupidity
  'crown-of-the-damned': { ward: { value: 4 }, rules: ['Stupidity'] },
  // ---- Vampiric Powers ----
  'curse-of-the-revenant': { stats: { W: 1 } }, // +1 Wound
  'beguile': { flags: { glamourweave: true } }, // a Leadership test to hit it in combat (combat.js, as the Glamourweave)
  // Flying Horror: infantry; Fly (10), cannot join a unit
  'flying-horror': { rules: ['Fly (10)'], flags: { noJoin: true }, only: { troop: /Infantry/ } },
  'dark-acolyte': { rules: ['Invocation of the Risen'] }, // counts as a Level 1 Wizard for it (vampires.js)
  'supernatural-horror': { rules: ['Terror'] }
}
