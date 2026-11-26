// The Dominion Hosts' magic items, Gifts of Dominion and Chaotic Traits: what each one does in play, as a table of
// effects keyed by item id. Exports DOMINION_EFFECTS, which items.js merges into its EFFECTS table. Kept apart from
// dominion.js, with no imports, so items.js can load it without pulling in the army's rules.

// ---- the Dominion Hosts' magic items, Gifts of Dominion and Chaotic Traits, in the terms of items.js EFFECTS ----
const INF_CAV = /Infantry|Cavalry/
export const DOMINION_EFFECTS = {
  // Unmade Blade: each natural 1 To Hit hits the wielder's own unit (or the wielder) (combat.js)
  'unmade-blade': { weapon: true, flags: { unmadeBlade: true } },
  // Storm's Wrath (Brannoc's): its Strength modifier only against models she charged this turn
  'storms-wrath': { weapon: true, flags: { chargeOnlyS: true } },
  // Obsidian Dread-Glaive: a Heralds of Darkness Themed Host only (not offered)
  'obsidian-dread-glaive': { weapon: true, only: { never: 'only in a Heralds of Darkness Themed Host' } },
  'dominion-runesword': { weapon: true, stats: { WS: 1, I: 1 } }, // Dominion Runesword
  // Filth Mace: a model wounded by it tests Toughness or -1 Toughness until the end of the turn
  'filth-mace': { weapon: true, flags: { filthMace: true } },
  // Dagger of the Dark Pantheon: each Wound it costs the enemy, +1 to the wielder's next Casting/Dispel roll
  'dagger-of-the-dark-pantheon': { weapon: true, flags: { pantheon: true } },
  // Taskmaster's Scourge: infantry; Command sub-phase Leadership test, +D3 Movement (commandItems.js)
  'taskmasters-scourge': { weapon: true, only: { troop: /Infantry/ } },
  // Spellthieving Sword: an enemy Wizard it wounds forgets a random spell
  'spellthieving-sword': { weapon: true, flags: { spellthief: true } },
  // Armour of the Damned: full plate; enemies re-roll successful To Hit rolls against the wearer in combat
  'armour-of-the-damned': { armour: { base: 4 }, flags: { damned: true } },
  'unmade-platemail': { armour: { base: 4 }, stats: { T: 1, I: 1 }, only: { troop: INF_CAV } }, // Unmade Platemail
  'crimson-armour-of-durvok': { armour: { base: 5 }, flags: { mwImmune: true }, only: { troop: INF_CAV } }, // Crimson Armour of Durvok
  'talisman-of-the-carrion-crow': { rules: ['Regeneration (5+)', 'Poisoned Attacks'] },
  'crown-of-everlasting-conquest': { rules: ['Regeneration (5+)'] },
  // Talisman of the Soaring Eagle: MR (-2) and a 5+ Ward against Magical Attacks
  'talisman-of-the-soaring-eagle': { rules: ['Magic Resistance (-2)'], ward: { value: 5, magicalOnly: true } },
  'brazen-collar': { rules: ['Magic Resistance (-2)'] },
  // Banner of the Gods: no negative modifiers to its Leadership (as the Banner of the Mere's Grace)
  'banner-of-the-gods': { flags: { ladysGrace: true } },
  // Doom Totem: enemy units that can see its bearer -1 Leadership (leadership.js)
  'doom-totem': { flags: { doomTotem: true } },
  'banner-of-the-dark-powers': { bannerRules: ['Magic Resistance (-3)'] },
  // Blasted Standard: natural 1s re-rolled on Armour Rolls in the Shooting phase (damage.js)
  'blasted-standard': { flags: { blasted: true } },
  // Banner of Rage: Frenzy, never lost (units.js)
  'banner-of-rage': { bannerRules: ['Frenzy'], flags: { rage: true } },
  'icon-of-darkness': { flags: { shotAtPenalty: true } }, // Icon of Darkness
  // Bloodskull Pendant: infantry; instead of its attacks, a S8 AP -1 hit on every enemy model in base contact
  'bloodskull-pendant': { only: { troop: /Infantry/ }, flags: { bloodskull: true } },
  // Rod of the Damned: The Summoning as a Bound spell, Power Level 2
  'rod-of-the-damned': { bound: { spell: 'the-summoning', power: 2 } },
  // Pendant of Damnation: +1 Attacks for each Wound lost
  'pendant-of-damnation': { only: { troop: INF_CAV }, flags: { damnation: true } },
  'helm-of-many-eyes': { rules: ['Strike First', 'Stupidity'] }, // Helm of Many Eyes
  'favour-of-the-gods': { flags: { favour: true } }, // Favour of the Gods: re-roll the Gaze of the Gods (single use)
  // Skull of Vashtor: the bearer and every Wizard within 3" +1 to cast (magic.js)
  'skull-of-vashtor': { flags: { vashtor: true } },
  // Sceptre of Power: +1 to Casting and Dispel rolls; a natural double: a S10 AP -3 hit on the bearer
  'sceptre-of-power': { flags: { dispelBonus: 1, sceptre: true } },
  // Infernal Puppet: an enemy Wizard within 15" casting rolls an extra D6, the highest discarded
  'infernal-puppet': { flags: { puppet: true } },
  // Grimoire of Olvric: knows all seven spells of its lore; casts no more a turn than its Level
  'grimoire-of-olvric': { flags: { grimoire: true } },
  // Tome of the Dark Gods: Mark of the Unbound; any Lore of the Dominion spell for a discarded one (magic.js)
  'tome-of-the-dark-gods': { only: { rule: 'Mark of the Unbound' }, flags: { darkGods: true } },
  'spell-familiar': { flags: { extraSpell: 1 } }, // Spell Familiar
  // ---- Gifts of Dominion: the character, not its mount ----
  'dark-majesty': { flags: { darkMajesty: true } },
  'unmade-flesh': { flags: { unmadeFlesh: true } }, // cannot be wounded on a roll of 2
  'extra-arm': { stats: { A: 1 } },
  'diabolic-splendour': { only: { troop: INF_CAV }, flags: { splendour: true } },
  'enchanting-aura': { only: { troop: INF_CAV }, flags: { enchanting: true } },
  'aura-of-pain': { flags: { auraOfPain: true } },
  'master-of-mortals': { flags: { masterOfMortals: true } },
  'acid-ichor': { flags: { acidIchor: true } },
  'poisonous-slime': { rules: ['Poisoned Attacks'] },
  // ---- Chaotic Traits ----
  'unnatural-fortitude': { flags: { fortitude: true } }, // +1 T unless in heavy or full plate armour (units.js)
  'dark-hearts': { only: { troop: INF_CAV }, flags: { darkHearts: true } },
  'longstriders': { flags: { longstriders: true } }, // Vanguard unless in heavy or full plate armour
  'enhanced-reflexes': { flags: { reflexes: true } }, // +2 Initiative fighting with a hand weapon
  'battle-hunger': { only: { troop: /Infantry/ }, flags: { battleHunger: true } },
  'brazen-will': { only: { troop: INF_CAV }, rules: ['Magic Resistance (-1)'] },
  // (Prophetic Foresight keeps enemy Scouts 18" and Ambushers 12" away: the deployment check is not in the game yet)
  'prophetic-foresight': { flags: { foresight: true } }
}

