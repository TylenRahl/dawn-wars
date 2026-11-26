// The Sand Kings of Kheshet's magic items and named characters' items: what each one does in play, as a table of
// effects keyed by item id. Exports TK_EFFECTS, which items.js merges into its EFFECTS table. No imports, so
// items.js can load it first.
const MONARCH = /^(Sand King|Sand Prince)$/
const PRIEST = /^(High Priest|Mortuary Priest)$/
export const TK_EFFECTS = {
  // Destroyer of Eternities (its D6 'Scything' hits instead of attacking are not in the game yet)
  'destroyer-of-eternities': { weapon: true },
  'crook-and-flail-of-radiance': { weapon: true, only: { names: MONARCH } }, // Monarchs of Kheshet only
  // Flail of Skulls: its Strength bonus only against an enemy it charged this turn
  'flail-of-skulls': { weapon: true, flags: { chargeOnlyS: true } },
  'serpent-staff': { weapon: true, only: { names: PRIEST } }, // Grave Priests only
  // The Conqueror's Blade (its Killing Blow on a 5 in a challenge and 100 VP are not in yet)
  'the-conquerors-blade': { weapon: true },
  // Maatkhar's Blades of Justice: infantry (its +1 Attack per enemy rank is not in yet)
  'maatkhars-blades-of-justice': { weapon: true, only: { troop: /Infantry/ } },
  // Armour of the Ages: infantry, cavalry or chariot; light armour; successful rolls To Wound against
  // its wearer re-rolled (combat.js)
  'armour-of-the-ages': { armour: { base: 6 }, flags: { ages: true }, only: { troop: /Infantry|Cavalry|Chariot/ } },
  // Warding Splint: heavy armour a Grave Priest may wear without penalty; a 5+ Ward
  'warding-splint': { armour: { base: 5 }, ward: { value: 5 }, flags: { wizardArmour: true } },
  // Shield of Sharu: a shield; enemies attacking its bearer in combat -1 Weapon Skill (combat.js)
  'shield-of-sharu': { armour: { shield: true }, flags: { sharu: true } },
  // Amulet of the Serpent: the bearer and its unit Poisoned Attacks (units.js rulesOf)
  'amulet-of-the-serpent': { rules: ['Poisoned Attacks'], flags: { serpentAmulet: true } },
  // Relic of the Desert Sun: not subject to Dry as Dust or Flammable (damage.js, tombkings.js)
  'relic-of-the-desert-sun': { flags: { desertSun: true } },
  'icon-of-the-sacred-eye': { flags: { wsBonus: true } }, // +1 Weapon Skill (combat.js, as the Big Red Raggedy Flag)
  'mirage-banner': { flags: { splendour: true } }, // -1 to shoot at it (shooting.js)
  // Tapestry of Conquered Lands: a standard it captures is worth 100 (damage.js trophies)
  'tapestry-of-conquered-lands': { flags: { tapestry: true } },
  // Banner of the Desert Winds: infantry; Vanguard and Reserve Move
  'banner-of-the-desert-winds': { bannerRules: ['Vanguard', 'Reserve Move'], only: { troop: /Infantry/ } },
  'death-mask-of-khasut': { rules: ['Terror'] }, // Death Mask of Khasut
  'orb-of-sharu': { flags: { splendour: true } }, // -1 to shoot at the bearer or its unit (shooting.js)
  // ---- named characters' own items ----
  'the-blessed-blade-of-sharu': { weapon: true }, // (its lasting -1 To Hit on the wounded is not in yet)
  'the-scarab-brooch-of-nephrath': { ward: { value: 5 } }, // The Scarab Brooch of Nephrath
  'the-flail-of-conquered-kings': { weapon: true, flags: { chargeOnlyS: true } }
}
