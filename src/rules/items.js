// Magic items: what each one does, for the items that are in the game. Exports EFFECTS (merged with each army's
// own table from the *Items.js files) and the helpers every module uses to ask what a model carries, spend a
// single-use item, or apply an item's armour, weapon and stats. Used widely, and by the list builder and battle
// screens.
//
// The items, their points and rules text are src/data/magicItems.js. An item not listed in EFFECTS below is shown
// in the list builder as "(not playable yet)" and cannot be bought.
//
// Limits: one of each item per army, and one item of each category per model, except "extremely common" items,
//   which may be taken more than once and alongside another of the same category.
// A model's allowance for magic items is given in its options.
// Magic standards: only a unit with a standard bearer may carry one; the
//   only character that may carry one is the Battle Standard Bearer (with no points limit:
//   Concord Realm Army List, Battle Standard Bearer).
// Arcane items: only Wizards may buy arcane items.
// Magic armour: only a model that has (or may have) armour, a shield or
//   barding may buy magic armour, and it REPLACES the mundane equivalent.
// Magic weapons: a magic weapon is not used with an additional hand weapon,
//   and the wielder cannot set it aside for a mundane weapon.
// The Battle Standard Bearer Model: a Battle Standard (and so its
//   magic standard) is lost with its bearer; a unit's standard with its standard bearer.

import { HE_EFFECTS } from './heItems.js'
import { WOOD_EFFECTS } from './woodItems.js'
import { DE_EFFECTS } from './deItems.js'
import { VC_EFFECTS } from './vcItems.js'
import { TK_EFFECTS } from './tkItems.js'
import { SK_EFFECTS } from './skItems.js'
import { LZ_EFFECTS } from './lzItems.js'
import { CD_EFFECTS } from './cdItems.js'
import { GC_EFFECTS } from './gcItems.js'
import { DC_EFFECTS } from './dcItems.js'
import { OGRE_EFFECTS } from './ogreItems.js'
import { BEAST_EFFECTS } from './beastItems.js'
import { DOMINION_EFFECTS } from './dominionItems.js'
import { ITEMS } from '../data/magicItems.js'
import { alive } from './units.js'
import { RUNE_EFFECTS } from './runes.js'

// What an item does. Keys (all optional):
//   weapon     use the item's profile as the bearer's combat weapon
//   ranged     use the item's profile as a missile weapon
//   armour     { base: 6|5|4 (light/heavy/full plate), fixed: n (armour value that cannot be
//              improved), bonus: n (worn with other armour), shield: true }
//   ward       { value, nonMagical, shootingOnly, flaming } (flaming: a better ward against Flaming Attacks)
//   rules      special rules the bearer gains;  bannerRules  special rules the unit gains
//   stats      characteristic modifiers to the bearer, e.g. { T: 1 }
//   flags      named effects the engine asks about with itemFlag()
//   only       { troop: RegExp, wizard: true }  who may take it
export const EFFECTS = {
  // ---- magic weapons (profiles from the item data) ----
  'ogre-blade': { weapon: true }, // Ogre Blade
  'sword-of-battle': { weapon: true }, // Sword of Battle
  'duellists-blades': { weapon: true }, // Duellist's Blades
  'giant-blade': { weapon: true }, // Giant Blade
  'hell-forged-axe': { weapon: true }, // Hell-Forged Axe
  'sword-of-swiftness': { weapon: true }, // Sword of Swiftness
  'berserker-blade': { weapon: true, rules: ['Impetuous'] }, // Berserker Blade
  'sword-of-might': { weapon: true }, // Sword of Might
  'biting-blade': { weapon: true }, // Biting Blade
  'burning-blade': { weapon: true }, // Burning Blade
  'headsmans-axe': { weapon: true }, // Headsman's Axe
  'sword-of-striking': { weapon: true, flags: { hitBonus: 1 } }, // Sword of Striking: +1 To Hit in combat
  'meteor-hammer': { weapon: true, flags: { woundOn: 3 } }, // Meteor Hammer: 3+ always wounds
  'cackling-blade': { weapon: true, flags: { cackling: true } }, // Cackling Blade: a 6 for its extra attacks costs a Wound
  oathblade: { weapon: true, flags: { woundOn: 2 } }, // Oathblade: 2+ always wounds
  'sword-of-justice': { weapon: true, flags: { rerollWound: true } }, // Sword of Justice
  'pearl-daggers': { weapon: true, flags: { rerollHit: true } }, // Pearl Daggers
  'dragon-bow': { ranged: true, only: { names: /^(General|Captain) of the Realm$/ } }, // Dragon Bow: 'Commanders of the Concord Realm only' (taken as the General and the Captain: no page defines it)
  'battleaxe-of-the-last-big-ruck': { weapon: true, flags: { lastBigRuck: true } }, // a 6 for its extra attacks loses them after this phase
  'even-bigger-chopper': { weapon: true }, // Even Bigger Chopper
  'tommos-best-basher': { weapon: true, stats: { WS: 1, I: 1 } }, // Tommo's Best Basher
  'the-choppiest-chopper': { weapon: true }, // The Choppiest Chopper
  'the-reeking-axe': { weapon: true, flags: { rerollHit: true, chargeOnlyS: true } }, // The Reeking Axe
  // ---- more magic weapons ----
  'dragon-slaying-sword': { weapon: true }, // Dragon Slaying Sword (Monster Slayer, in its profile: combat.js)
  'sword-of-reaving': { weapon: true, flags: { reaving: true } }, // Sword of Reaving (D3 S4 hits on itself if it wounds nothing)
  'flail-of-wrecks': { weapon: true, flags: { chargeOnlyS: true, chargeOnlyBane: true, flailWrecks: true } }, // Flail of Wrecks
  'grim-verdict': { weapon: true, rules: ['Furious Charge', 'Impetuous'], flags: { grimVerdict: true } }, // Grim Verdict
  'spelleater-axe': { weapon: true, rules: ['Magic Resistance (-2)'] }, // Spelleater Axe
  'sword-of-sorrow': { ranged: true, flags: { noWardRegen: true } }, // Sword of Sorrow (a missile weapon only)
  'hunters-scorn': { ranged: true, flags: { huntersScorn: true } }, // Hunter's Scorn
  'mace-of-holtzbrand': { weapon: true, flags: { chooseProfile: true, oneAttackProfile: 1 } }, // Mace of Holtzbrand
  'hammer-of-righteousness': { weapon: true, flags: { ldTestHits: true } }, // Hammer of Righteousness
  'chalkys-pig-sticker': { weapon: true, flags: { chargeOnlyS: true, chargeOnlyAP: true, rankAttacks: true }, only: { mountedOr: /Cavalry|Monster|Chariot|Behemoth/ } }, // Chalky's Pig-Sticker
  'backstabbers-blade': { weapon: true, flags: { backstab: true }, only: { names: /^(Gloom )?Nipper (Gaffer|Top Lad)/ } }, // Backstabber's Blade
  'clouters-one-hit-wonder': { weapon: true, flags: { clouter: true }, only: { names: /^(Gloom )?Nipper (Gaffer|Top Lad)/ } }, // Clouter's One-Hit Wonder (single use)
  // ---- magic armour and talismans ----
  'armour-of-dark-faith': { armour: { base: 6 }, flags: { darkFaith: true }, only: { troop: /Infantry|Cavalry/ } }, // Armour of Dark Faith
  'glittering-scales': { armour: { base: 6 }, flags: { glitterScales: true } }, // Glittering Scales
  'levitating-shield': { armour: { shield: true }, flags: { levitating: true }, only: { troop: /Infantry/ } }, // Levitating Shield
  spellshield: { armour: { shield: true }, flags: { spellshield: true } }, // Spellshield
  'armour-of-meteoric-iron': { armour: { fixed: 5 }, flags: { apImmune: true } }, // Armour of Meteoric Iron
  'trailblazers-hauberk': { armour: { base: 5 }, rules: ['Move Through Cover', 'Scouts'], only: { troop: /Infantry/ } }, // Trailblazer's Hauberk
  'mantle-of-drifting-shadow': { armour: { base: 6 }, stats: { M: 1 }, rules: ['Loner'], flags: { farShotImmune: 6 }, only: { troop: /Infantry/ } }, // Mantle of Drifting Shadow
  'charmed-shield': { armour: { shield: true }, flags: { charmedShield: true } }, // Charmed Shield (single use)
  'icon-of-fortitude': { flags: { mwImmune: true }, only: { troop: /Infantry|Cavalry/ } }, // Icon of Fortitude
  'ironhide-talisman': { flags: { ironhide: true }, only: { troop: /Infantry/ } }, // Ironhide Talisman
  'shroud-of-iron': { flags: { shroudOfIron: true } }, // Shroud of Iron
  'spiteful-shield': { armour: { shield: true }, flags: { spiteful: true } }, // Spiteful Shield
  'periapt-of-soul-exchange': { command: true }, // Periapt of Soul Exchange (commandItems.js)
  // ---- arcane items and the like ----
  'wizarding-hat': { rules: ['Stupidity'], flags: { wizardingHat: true } }, // Wizarding Hat (a Level 1 Wizard: units.js)
  'arch-lightning-rod': { flags: {} }, // Arch-Lightning Rod (single use: arcane.js)
  'flying-carpet': { rules: ['Fly (8)', 'Swiftstride'], flags: { noJoin: true }, only: { troop: /Regular Infantry|Heavy Infantry/ } }, // Flying Carpet
  'becalming-orb': { bound: { spell: 'becalming-orb', power: 1, singleUse: true } }, // Becalming Orb
  'feedback-scroll': { flags: {} }, // Feedback Scroll (instead of a dispel: magic.js)
  'scroll-of-transmogrification': { flags: {} }, // Scroll of Transmogrification (magic.js, arcane.js)
  'staff-of-quietude': { flags: {} }, // Staff of Quietude (Command sub-phase: arcane.js)
  'lore-familiar': { flags: { loreFamiliar: true } }, // Lore Familiar (spells chosen: magic.js)
  'scroll-of-invocation': { flags: {} }, // Scroll of Invocation (magic.js)
  'infernal-familiar': { flags: { infernalFamiliar: true } }, // Infernal Familiar (magic.js)
  'power-scroll': { flags: {} }, // Power Scroll (magic.js)
  'unweaving-scroll': { flags: {} }, // Unweaving scroll (magic.js)
  'arcane-familiar': { flags: { arcaneFamiliar: true } }, // Arcane Familiar (two lores: magic.js)
  'twin-tailed-wand': { flags: {} }, // Twin-tailed Wand (magic.js)
  'tome-of-midnight': { rules: ['Loner'], flags: { extraSpell: 1 } }, // Tome of Midnight (magic.js)
  'sparkly-wizard-finda': { rules: ['Magic Resistance (-2)', 'Hatred (enemy Wizards)'] }, // Sparkly Wizard Finda
  'staff-of-ka-blam': { flags: {} }, // Staff of Ka-Blam (magic.js)
  'the-hags-brew': { flags: { trollLore: true }, only: { names: /Head Case|Big Head Case|Odd Bod|Big Odd Bod/ } }, // The Hag's Brew (roster.js loresFor)
  'glowy-green-amulet': { flags: {} }, // Glowy Green Amulet (instead of a dispel: magic.js)
  'amulet-of-spell-attraction': { flags: {} }, // Amulet of Spell Attraction (magic.js)
  // ---- enchanted items and magic standards ----
  'paymasters-coin': { flags: { coin: 'hit' } }, // Paymaster's Coin (single use: combat.js)
  'ring-of-fortune': { flags: { coin: 'wound' } }, // Ring of Fortune (single use: combat.js)
  'unmade-blooded-steed': { flags: { unmadeSteed: true }, only: { mountedOr: /Cavalry/ } }, // Unmade-Blooded Steed (units.js)
  'slayers-hourglass': { flags: { hourglass: true } }, // Slayer's Hourglass
  'the-silver-horn': { flags: { silverHorn: true }, only: { rule: 'Swiftstride' } }, // The Silver Horn
  'crystal-ball': { flags: { crystalBall: true } }, // Crystal Ball
  'laurels-of-victory': { flags: { laurels: true } }, // Laurels of Victory
  'the-collar-of-old-grunter': { flags: { collarOfOldGrunter: true } }, // The Collar of Old Grunter
  'nutters-lid': { rules: ['Impact Hits (1)'], flags: { headbutt: true } }, // Nutter's Lid (AP -2)
  'glittering-wotnots': { flags: {} }, // Glittering Wotnots (instead of a dispel: magic.js)
  'banner-of-the-steadfast': { flags: { steadfast: true }, only: { troop: /Infantry/ } }, // Banner of the Steadfast
  'the-banner-of-the-dark-heart': { flags: { darkHeart: true } }, // The Banner of The Dark Heart
  'standard-of-the-fell-warrior': { flags: { fellWarrior: true } }, // Standard of the Fell Warrior (single use)
  'royal-banner': { flags: { royalBanner: true } }, // Royal Banner
  'the-gleaming-pennant': { flags: { pennant: true } }, // The Gleaming Pennant (single use)
  'the-spider-banner': { bannerRules: ['Poisoned Attacks'], flags: { spiderBanner: true } }, // The Spider Banner
  'the-away-end-banner': { flags: { nomadz: true } }, // The Away End Banner
  'banner-of-the-sticks': { bannerRules: ['Move Through Cover'] }, // Banner of the Sticks
  // ---- Kingdom of Lyonne ----
  'sword-of-the-wayfarer': { weapon: true, flags: { chooseProfile: true } }, // Sword of the Wayfarer
  'sword-of-heroes': { weapon: true, flags: { woundOn: 5 } }, // Sword of Heroes (Monster Slayer in its profile)
  'heartwood-lance': { weapon: true, flags: { chargeOnlyWeapon: true }, only: { mountedOr: /Cavalry|Monster/ } }, // Heartwood Lance
  'morning-star-of-dauvergne': { weapon: true, flags: { breaksMagicWeapons: true } }, // Morning Star of Dauvergne
  'sword-of-the-stout-hearted': { weapon: true, rules: ['Immune to Psychology'] }, // Sword of the Stout Hearted
  foebreaker: { weapon: true, flags: { foebreaker: true } }, // Foebreaker
  'gilded-cuirass': { armour: { base: 5 }, rules: ['Regeneration (5+)'] }, // Gilded Cuirass
  'deepsteel-great-helm': { armour: { bonus: 1 }, flags: { rerollArmour1: true } }, // Deepsteel Great Helm
  'anointed-armour': { armour: { base: 5 }, flags: { anointed: true }, only: { troop: /Infantry|Cavalry/, vow: 'The Chalice Vow' } }, // Anointed Armour
  'mantle-of-the-damsel-isaure': { flags: { poisonImmune: true } }, // Mantle of the Damsel Isaure
  'mirabels-locket': { flags: { mwImmune: true }, only: { troop: /Infantry|Cavalry/ } }, // Mirabel's Locket
  'chalice-pendant': { flags: { chalicePendant: true }, only: { vow: 'The Chalice Vow' } }, // Chalice Pendant (single use)
  'valorous-standard': { flags: { valorous: true } }, // Valorous Standard
  'conquerors-tapestry': { flags: { tapestry: true } }, // Conqueror's Tapestry
  'errantry-banner': { flags: { chargeStrength: 1 }, bannerRules: ['Impetuous'] }, // Errantry Banner
  'banner-of-chalons': { flags: { noStandShoot: true } }, // Banner of Chalons
  'banner-of-the-meres-grace': { flags: { ladysGrace: true } }, // Banner of the Mere's Grace
  'banner-of-honourable-warfare': { flags: { honourable: true } }, // Banner of Honourable Warfare
  'falcon-horn-of-aldemar': { flags: {} }, // Falcon-horn of Aldemar (as the Arch-Lightning Rod: arcane.js)
  'antlers-of-the-great-hunt': { flags: { antlers: true } }, // Antlers of the Great Hunt (lyonne.js)
  'gauntlet-of-the-duel': { flags: { gauntlet: true } }, // Gauntlet of the Duel
  'the-seal-of-lisarde': { flags: { seal: true } }, // The Seal of Lisarde
  'silver-mirror': { flags: {} }, // Silver Mirror (a dispel's extra dice: magic.js)
  'sacrament-of-the-mere': { flags: {} }, // Sacrament of the Mere (+2 to a Casting roll, single use: magic.js)
  'prayer-icon-of-ombrelle': { flags: { dispelRange: 3, hexDispel: 1 } }, // Prayer Icon of Ombrelle
  'heart-of-the-wilds': { flags: { heartOfWilds: true } }, // Heart of the Wilds (magic.js)
  'the-dolorous-blade': { weapon: true, flags: { chooseProfile: true } }, // The Dolorous Blade
  'sorrows-end': { weapon: true }, // Sorrow's End
  'dragonhide-cloak': { flags: { dragonhide: true, kbImmune: true, mwImmune: true }, ward: { value: 7, flaming: 3 } }, // Dragonhide Cloak
  'cup-of-vaucelle': { flags: { chalice: true } }, // Cup of Vaucelle
  'the-staff-of-the-elements': { flags: { twoSwaps: true } }, // The Staff of the Elements (ui/battle.js)
  // the Knightly Virtues (Knightly Virtues: never the mount's)
  'virtue-of-audacity': { flags: { audacity: true } }, // Virtue of Audacity
  'virtue-of-confidence': { flags: { confidence: true } }, // Virtue of Confidence
  'virtue-of-discipline': { rules: ['Drilled'] }, // Virtue of Discipline (marches within 8" untested — as Drilled does)
  'virtue-of-duty': { flags: { duty: true, noJoin: true, notGeneral: true }, only: { names: /^(Duke|Baron|Paladin)$/ } }, // Virtue of Duty
  'virtue-of-empathy': { flags: {}, only: { names: /^(Duke|Baron|Paladin)$/ } }, // Virtue of Empathy (lyonne.js)
  'virtue-of-heroism': { flags: { heroism: true } }, // Virtue of Heroism
  'virtue-of-knightly-temper': { flags: { knightlyTemper: true } }, // Virtue of Knightly Temper
  'virtue-of-noble-disdain': { flags: { honourable: true } }, // Virtue of Noble Disdain
  'virtue-of-purity': { flags: {} }, // Virtue of Purity (lyonne.js blessingWard)
  'virtue-of-stoicism': { flags: {} }, // Virtue of Stoicism (combat.js Break test)
  'virtue-of-the-ideal': { stats: { WS: 1, I: 1, A: 1, Ld: 1 }, flags: { noJoin: true, notGeneral: true }, only: { names: /^(Duke|Baron|Paladin)$/ } }, // Virtue of the Ideal
  'virtue-of-the-impetuous-knight': { rules: ['Impetuous'], flags: { impetuousKnight: true } }, // Virtue of the Impetuous Knight
  'virtue-of-the-joust': { flags: { joust: true } }, // Virtue of the Joust
  'virtue-of-the-penitent': { rules: ['Unbreakable'], flags: { noJoin: true }, only: { names: /^(Duke|Baron|Paladin)$/ } }, // Virtue of the Penitent
  // ---- named characters' own items (magicItems.js UNIQUE) ----
  'beast-reaver': { weapon: true, flags: { rerollWoundVs: 'hornkin-herds' } }, // Beast Reaver
  'bog-wood-staff': { weapon: true, flags: { healOnWound: true } }, // Bog-wood Staff
  'the-nut-cracker': { weapon: true, flags: { chooseProfile: true } }, // The Nut Cracker (hammer or pick: combat.js)
  'the-bosss-trophy-rack': { flags: { bossRack: true } }, // The Boss's Trophy Rack (rulesOf, Melee Outcome)
  judgement: { weapon: true }, // Judgement
  'the-griffon-helm': { ward: { value: 5 }, flags: { kbImmune: true } }, // The Griffon Helm
  'trollhide-shawl': { armour: { bonus: 1 }, rules: ['Regeneration (5+)', 'Flammable'] }, // Trollhide Shawl
  // ---- magic armour ----
  'armour-of-destiny': { armour: { base: 5 }, ward: { value: 4 } }, // Armour of Destiny
  'armour-of-silvered-steel': { armour: { fixed: 3 } }, // Armour of Silvered Steel
  'shield-of-the-warrior-true': { armour: { shield: true }, ward: { value: 5, shootingOnly: true } }, // Shield of the Warrior True
  'enchanted-shield': { armour: { shield: true }, ward: { value: 6, nonMagical: true } }, // Enchanted Shield
  'armour-of-fortune': { armour: { base: 5 }, ward: { value: 6 }, flags: { kbImmune: true } }, // Armour of Fortune
  'armour-of-aschenbrand': { armour: { base: 6 }, ward: { value: 5 }, flags: { wizardArmour: true }, only: { wizard: true } }, // Armour of Aschenbrand
  'trollhide-trousers': { armour: { bonus: 1 }, rules: ['Regeneration (5+)'] }, // Trollhide Trousers
  'dead-ard-clobba': { armour: { base: 4 }, stats: { T: 1 }, only: { troop: /Infantry|Cavalry|Chariot/, names: /Rukka (Gaffer|Top Lad)|Iron Rukka/ } }, // Dead 'Ard Clobba
  'armour-of-wangler': { armour: { base: 5 }, rules: ['Magic Resistance (-2)'] }, // Armour of Wangler
  'bedazzling-helm': { armour: { bonus: 1 }, flags: { hitPenalty: 1 }, only: { troop: /Infantry|Cavalry/ } }, // Bedazzling Helm
  'scale-of-false-promise': { armour: { base: 5 }, stats: { T: 1, W: 1 }, rules: ['Stupidity'], only: { troop: /Infantry|Cavalry/ } }, // Scale of False Promise
  // ---- talismans ----
  'talisman-of-protection': { ward: { value: 5 } }, // Talisman of Protection
  dawnstone: { flags: { rerollArmour1: true } }, // Dawnstone
  'the-white-cloak': { ward: { value: 5, flaming: 3 } }, // The White Cloak
  'effigy-of-wangler': { flags: { hitPenalty: 1 } }, // Effigy of Wangler
  'jade-amulet': { flags: { kbImmune: true } }, // Jade Amulet
  'witch-hunters-ward': { rules: ['Magic Resistance (-2)'], flags: { armourRerollOnce: true } }, // Witch Hunter's Ward
  luckstone: { flags: { armourRerollOnce: true } }, // Luckstone (single use)
  'obsidian-lodestone': { flags: { lodestone: true } }, // Obsidian Lodestone: -1 Magic Resistance per stone, up to three
  // ---- enchanted items ----
  'necklace-of-blessed-teef': { flags: { rerollArmour1: true, rerollWard1: true, rerollRegen1: true } }, // Necklace of Blessed Teef
  'the-thinkin-rukkas-at': { stats: { I: 1 }, flags: { notImpetuous: true } }, // The Thinkin' Rukka's 'At
  'grisly-trophy-rack': { flags: { trophyRack: true }, only: { names: /Gaffer|Top Lad/i } }, // Grisly Trophy Rack
  // used in the Command sub-phase (commandItems.js)
  'healing-potion': { command: true }, // Healing Potion
  'potion-of-strength': { command: true }, // Potion of Strength
  'potion-of-toughness': { command: true }, // Potion of Toughness
  'potion-of-speed': { command: true }, // Potion of Speed
  'potion-of-fervour': { command: true }, // Potion of Fervour
  'potion-of-foolhardiness': { command: true }, // Potion of Foolhardiness
  'elixir-of-power': { command: true }, // Elixir of Power
  'guvnors-titfer': { command: true }, // Guv'nor's Titfer
  'fungus-wine': { command: true, only: { names: /^Gloom Nipper/ } }, // Fungus Wine
  // ---- Bound spells (magic.js castBound) ----
  'ruby-ring-of-ruin': { bound: { spell: 'fireball', power: 1 } }, // Ruby Ring of Ruin
  'ring-of-doom': { bound: { spell: 'ruinbolt', power: 2, doom: true } }, // Ring of Doom
  'ring-of-tarn': { bound: { spell: 'oaken-shield', power: 3, singleUse: true } }, // Ring of Tarn
  'twice-blessed-armour': { armour: { base: 4 }, bound: { spell: 'hammerhand', power: 2 } }, // Twice-Blessed Armour (full plate)
  // ---- arcane items ----
  'wizards-familiar': { flags: { dispelBonus: 1 } }, // Wizard's Familiar (0-1 per Wizard)
  'wizards-staff': { flags: {} }, // Wizard's Staff: +1 to cast an Assailment or Magic Missile (magic.js; 0-1 per Wizard)
  'tome-of-spellcraft': { flags: { rerollCast: true } }, // Tome of Spellcraft
  'nobbys-knobbly-staff': { flags: { rerollCast: true } }, // Nobby's Knobbly Staff
  'idol-of-bosher': { flags: { rerollCast: true, spellRange: 3 } }, // Idol of Bosher
  'idol-of-wangler': { flags: { rerollDispel: true, dispelRange: 3 } }, // Idol of Wangler
  'scroll-of-disruption': { flags: { rerollDispel: true } }, // Scroll of Disruption
  'rod-of-might': { flags: { miscastOn2: true } }, // Rod of Might (its +1 to cast: magic.js)
  'wand-of-jet': { flags: { dispelBonus: 1 } }, // Wand of Jet (its +1 to cast and breaking on a double: magic.js)
  'book-of-iselde': { flags: { dispelRange: 3 } }, // Book of Iselde (its +1 unless a double: magic.js)
  'earthing-rod': { flags: {} }, // Earthing Rod (single use: magic.js backlash)
  // ---- magic standards ----
  'war-banner': { flags: { meleeOutcome: 1 } }, // War Banner
  'banner-of-iron-resolve': { bannerRules: ['Stubborn'] }, // Banner of Iron Resolve
  'razor-standard': { bannerRules: ['Armour Bane (2)'] }, // Razor Standard
  'the-blazing-banner': { bannerRules: ['Flaming Attacks'] }, // The Blazing Banner
  'rampaging-banner': { flags: { rerollCharge: true } }, // Rampaging Banner
  'banner-of-swirling-wind': { flags: { shotAtPenalty: 1 } }, // Banner of Swirling Wind
  'monster-hunters-tapestry': { flags: { noStomp: true } }, // Monster Hunter's Tapestry
  'griffon-standard': { flags: { griffon: true } }, // Griffon Standard
  'tapestry-of-saint-halvars-triumph': { flags: { firstRoundWound1: true } }, // Tapestry of Saint Halvar's Triumph
  'icon-of-the-pale-keeper': { flags: { iconOfThePaleKeeper: true } }, // Icon of the Pale Keeper
  'banner-of-duty': { flags: { rerollRally: true } }, // Banner of Duty
  'the-big-red-raggedy-flag': { flags: { meleeOutcome: 1, wsBonus: 1 } }, // The Big Red Raggedy Flag
  'big-ruck-banner': { flags: { bigRuckBanner: true } }, // Big Ruck Banner
  'the-angry-ladz-flag': { bannerRules: ['Frenzy'] }, // The Angry Ladz Flag
  'the-banner-of-butchery': { flags: { chargeStrength: 1 } }, // The Banner of Butchery
  'wheezers-windy-banner': { flags: { rerollPanic: true } }, // Wheezer's Windy Banner
  'totem-of-wrath': { flags: { totemOfWrath: true } } // Totem of Wrath
}

// the Dwarfs' runes (runes.js)
Object.assign(EFFECTS, RUNE_EFFECTS, DOMINION_EFFECTS, BEAST_EFFECTS, OGRE_EFFECTS, HE_EFFECTS, WOOD_EFFECTS, DE_EFFECTS, VC_EFFECTS, TK_EFFECTS, SK_EFFECTS, LZ_EFFECTS, CD_EFFECTS, GC_EFFECTS, DC_EFFECTS)
export const isPlayable = id => !!EFFECTS[id]
export const itemById = id => ITEMS[id] || null

// The magic standard a unit carries now: its own (while its standard bearer stands), or a joined
// Battle Standard Bearer's.
export function bannersOf (u) {
  const out = []
  const standing = !u.status?.lost_standard && alive(u).some(m => m.role === 'standard')
  if (u.banner && standing) out.push(u.banner)
  if (standing) out.push(...(u.bannerRunes || []))
  for (const c of [u, ...(u.joined || [])]) {
    if (c.status?.removed) continue
    for (const id of c.items || []) if (ITEMS[id]?.type === 'banner' || ITEMS[id]?.type === 'banner-runes') out.push(id)
  }
  return [...new Set(out)]
}

// Does the unit (or, for a unit-wide effect, its banner) have this named effect? Returns the
// item's flag value (true or a number) or undefined. `personal`: the bearer's own items only.
export function itemFlag (u, flag, { personal = false } = {}) {
  if (!u) return undefined
  const isStd = id => ITEMS[id]?.type === 'banner' || ITEMS[id]?.type === 'banner-runes'
  const ids = personal ? (u.items || []).filter(id => !isStd(id)) : [...(u.items || []).filter(id => !isStd(id)), ...bannersOf(u)]
  for (const id of ids) {
    if (itemLeft(u, id) <= 0 && (u.items || []).includes(id)) continue
    const v = EFFECTS[id]?.flags?.[flag]
    if (v !== undefined) return v
  }
  return undefined
}
export const itemWith = (u, flag) => (u?.items || []).find(id => EFFECTS[id]?.flags?.[flag] !== undefined && itemLeft(u, id) > 0) || (bannersOf(u || {}).find(id => EFFECTS[id]?.flags?.[flag] !== undefined)) || null
export const itemName = id => ITEMS[id]?.name || id
// The sum of a numeric effect over the bearer's own unspent items (a Wizard's Familiar and a Wand of Jet both +1)
export const itemSum = (u, flag) => [...new Set(u?.items || [])].flatMap(id => Array(Math.max(0, itemLeft(u, id))).fill(id)).reduce((a, id) => a + (Number(EFFECTS[id]?.flags?.[flag]) || 0), 0)
// How many of this item the bearer still has unspent (an extremely common item may be carried twice).
export const itemLeft = (u, id) => (u?.items || []).filter(x => x === id).length - (u?.status?.spentItems || []).filter(x => x === id).length
// single-use and breakable items: spent for the rest of the game (one copy at a time)
export function spendItem (u, id) {
  u.status.spentItems = [...(u.status.spentItems || []), id]
}

// Fit the bearer's items to the unit record when it is fielded: rules gained, characteristics,
// wards, and the standard's rules. Called once, by fieldUnit (units.js); equip (damage.js) reads
// the armour and weapon with itemArmour and itemWeapon.
export function applyItemsToUnit (u) {
  const mr = []
  for (const id of u.items || []) {
    const e = EFFECTS[id]
    if (!e) continue
    for (const r of e.rules || []) {
      if (r.startsWith('Magic Resistance')) mr.push(Math.abs(Number(r.match(/-?\d+/)[0])))
      else u.special.add(r)
    }
    if (e.stats) {
      for (const m of u.models) {
        m.profile = { ...m.profile }
        // (Master Rune of Adamant: a Toughness of 10 — set, not added)
        for (const [k, v] of Object.entries(e.stats)) m.profile[k] = e.setStats ? v : Math.min(10, (m.profile[k] ?? 0) + v)
        if (e.stats.W) { m.wounds += e.stats.W; m.startW = (m.startW || 1) + e.stats.W }
      }
    }
    if (e.ward) u.wards = [...(u.wards || []), { ...e.ward, item: id }]
    for (const w of e.wards || []) u.wards = [...(u.wards || []), { ...w, item: id }]
  }
  // Rune of Shielding: one rune a 6+ Ward, each more improves it by 1
  const shields = (u.items || []).filter(id => id === 'rune-of-shielding').length
  if (shields) u.wards = [...(u.wards || []), { value: 7 - Math.min(3, shields), item: 'rune-of-shielding' }]
  // Obsidian Lodestone: one stone -1, two -2, three -3
  const stones = (u.items || []).filter(id => id === 'obsidian-lodestone').length
  if (stones) mr.push(Math.min(3, stones))
  // more than one source of Magic Resistance: the best is used (an assumption; no page says)
  if (mr.length) {
    for (const r of [...u.special]) if (r.startsWith('Magic Resistance')) { mr.push(Math.abs(Number(r.match(/-?\d+/)?.[0] || 0))); u.special.delete(r) }
    u.special.add(`Magic Resistance (-${Math.max(...mr)})`)
  }
  u.bannerRules = [...new Set((u.items || []).concat(u.banner ? [u.banner] : [], u.bannerRunes || []).flatMap(id => EFFECTS[id]?.bannerRules || []))]
}

// The bearer's magic armour, read by equip: { base, fixed, bonus, shield } merged.
export function itemArmour (u) {
  const out = { bonus: 0 }
  for (const id of u.items || []) {
    const a = EFFECTS[id]?.armour
    if (!a) continue
    if (a.base) out.base = a.base
    if (a.fixed) out.fixed = a.fixed
    if (a.shield) out.shield = true
    if (a.bonus) out.bonus += a.bonus
  }
  return out
}

// The magic weapon profile the bearer fights or shoots with, as weapons.js would give it.
export function itemWeapon (u, kind) {
  for (const id of u.items || []) {
    const e = EFFECTS[id]
    if (!e || !(kind === 'combat' ? e.weapon : e.ranged)) continue
    // (The Nut Cracker: two profiles, the one chosen for this combat — u.status.profileChoice)
    const k = u.status?.profileChoice?.[id] || 0
    // (an item both shot and wielded — the Spear of Talorn: its combat profile in combat, the other when shooting)
    let p = e.weapon && e.ranged ? ITEMS[id].profiles.find(q => (q.range === 'Combat') === (kind === 'combat')) : ITEMS[id].profiles[k]
    if (!p) continue
    // Clouter's One-Hit Wonder: its own profile once a game, else a hand weapon with Magical Attacks
    if (e.flags?.clouter && !u.status?.clouterNow) p = { range: 'Combat', S: 'S', AP: '-', rules: ['Magical Attacks'] }
    const f = e.flags || {}
    return { key: 'magic:' + id, name: ITEMS[id].name, range: p.range, S: p.S, AP: p.AP, rules: [...p.rules, ...(e.extraRules || [])], page: ITEMS[id].page, magic: true, chargeOnlyS: !!f.chargeOnlyS, chargeOnlyBane: !!f.chargeOnlyBane, chargeOnlyAP: !!f.chargeOnlyAP, oneAttack: f.oneAttackProfile != null && f.oneAttackProfile === k, flags: f }
  }
  return null
}

// Is the unit (any of its banners or a joined character's) carrying the item?
export const carries = (u, id) => bannersOf(u).includes(id) || (u.items || []).includes(id)

// "Extra Attacks (+D3)" → the number to add this time, rolled with the game's dice.
export function extraAttacks (rules, roll) {
  const r = (rules || []).find(x => x.startsWith('Extra Attacks'))
  if (!r) return { n: 0 }
  const m = r.match(/\(\+(D?)(\d+)\)/)
  if (!m) return { n: 1 }
  if (!m[1]) return { n: Number(m[2]) }
  const d = roll(Number(m[2]))
  return { n: d, rolled: d, dice: `D${m[2]}` }
}

// "Multiple Damage (D3)" → a function giving the Wounds each unsaved wound causes.
export function multipleDamage (rules, roll) {
  const r = (rules || []).find(x => x.startsWith('Multiple Damage'))
  if (!r) return null
  const m = r.match(/\((D?)(\d+)(?:\+(\d+))?\)/)
  if (!m) return null
  return () => (m[1] ? roll(Number(m[2])) : Number(m[2])) + Number(m[3] || 0)
}

// Who may take the item (beyond the category and points checks in roster.js).
export function mayTake (entry, sel, id, { wizard = false, armourOption = false } = {}) {
  const it = ITEMS[id]
  const e = EFFECTS[id]
  if (!it) return 'no such item'
  if (it.type === 'arcane-item' && !wizard) return 'only Wizards may take arcane items'
  if (it.type === 'armor' && !armourOption && !e?.flags?.wizardArmour) return 'only a model that has or may have armour, a shield or barding may take magic armour'
  if (e?.only?.wizard && !wizard) return 'Wizards only'
  if (e?.only?.never) return e.only.never
  if (e?.only?.general && !(sel?.command || []).some(i => /^general$/i.test(entry.command?.[i]?.name || ''))) return 'the army\'s General only'
  const tt = (entry.troopType || []).join(' ')
  if (e?.only?.troop && !e.only.troop.test(tt)) return 'not for this troop type'
  if (e?.only?.names && !e.only.names.test(entry.name)) return 'not for this character'
  if (e?.only?.rule && !(entry.specialRules || []).some(r => (r.name || r) === e.only.rule)) return `${e.only.rule} characters only`
  // (a Chivalrous Vow: on the entry, or bought as one of its options)
  if (e?.only?.vow && !(entry.specialRules || []).some(r => (r.name || r) === e.only.vow) && !(sel?.options || []).some(i => (entry.options[i]?.name || '').startsWith(e.only.vow))) return `${e.only.vow} only`
  // (a mount here is any cavalry, monster or chariot model: on foot, the character has to ride one)
  if (e?.only?.mountedOr && !e.only.mountedOr.test(tt) && !(sel?.mount != null && !/on foot/i.test(entry.mounts?.[sel.mount]?.name || 'on foot'))) return 'cavalry, monsters and chariots only'
  return null
}

