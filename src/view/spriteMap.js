// Which picture each model wears. Exports spriteKey(unit, model, manifest, turn) and crewKey(unit, manifest),
// used by view/board.js, plus CREW, chosenWeaponId, kitsOf and kitOf. The pictures are still images in
// public/dw/images/, listed in its manifest.json. Anything without a picture is drawn as a plain base with a letter.

import { combatWeaponChoices } from '../rules/weaponChoice.js'

const ROLE_SUFFIX = { champion: '-champion', standard: '-standard', musician: '-musician', rank: '' }

// A character whose own picture shows it on the mount it bought, checked before every other rule:
// [army, pattern on the entry id, pattern on the mount (the choice's name, then the mount's and the chariot's), family].
// First match wins, so a Royal Griffon row comes before the plain Griffon row (the Griffon choice rides a mount named
// "Royal Griffon": the patterns that need the choice itself start with ^).
const CHARACTER_MOUNT = [
  // the Concord Realm
  ['concord-realm', /^general-of-the-realm$/, /^royal griffon/, 'emp-general-royal-griffon-on-60x100'],
  ['concord-realm', /^(general|captain)-of-the-realm$/, /griffon/, 'emp-general-griffon-on-60x100'],
  ['concord-realm', /^wizard-lord$/, /griffon/, 'emp-wizard-lord-royal-griffon-on-60x100'],
  ['concord-realm', /^(wizard-lord|master-mage)$/, /pegasus/, 'emp-pegasus-mage-on-40x60'],
  ['concord-realm', /./, /pegasus/, 'emp-pegasus-captain-on-40x60'],
  // the Ashforged
  ['ashforged', /^(sorcerer-prophet|bindsmith-sorcerer)$/, /bale taurus/, 'cd-sorcerer-bale-taurus-on-60x100'],
  ['ashforged', /^(sorcerer-prophet|bindsmith-sorcerer)$/, /great taurus/, 'cd-sorcerer-great-taurus-on-60x100'],
  ['ashforged', /^(sorcerer-prophet|bindsmith-sorcerer)$/, /lammasu/, 'cd-sorcerer-lammasu-on-50x75'],
  ['ashforged', /^infernal-(castellan|seneschal)$/, /bale taurus/, 'cd-castellan-bale-taurus-on-60x100'],
  ['ashforged', /^infernal-(castellan|seneschal)$/, /great taurus/, 'cd-castellan-great-taurus-on-60x100'],
  // the Ilthari Realms (the Storm Weaver rides the mage's Unicorn)
  ['ilthari-realms', /^(prince|noble)$/, /great eagle/, 'he-noble-great-eagle'],
  ['ilthari-realms', /^(prince|noble)$/, /griffon/, 'he-noble-griffon-on-60x100'],
  ['ilthari-realms', /^(archmage|mage)$/, /great eagle/, 'he-mage-great-eagle'],
  ['ilthari-realms', /./, /unicorn/, 'he-mage-unicorn-on-40x60'],
  // the Jade Dominion of Shen
  ['jade-dominion-of-shen', /^lianshi(-lord)?$/, /longma/, 'gc-lianshi-great-longma-on-60x100'],
  // the Kingdom of Lyonne: Royal Pegasus before the plain Pegasus
  ['kingdom-of-lyonne', /^(duke|baron)$/, /hippogryph/, 'brt-lord-hippogryph'],
  ['kingdom-of-lyonne', /^(duke|baron|paladin)$/, /royal pegasus/, 'brt-lord-royal-pegasus'],
  ['kingdom-of-lyonne', /^(duke|baron|paladin)$/, /pegasus/, 'brt-lord-pegasus-on-40x60'],
  ['kingdom-of-lyonne', /^prophetess$/, /pegasus/, 'brt-prophetess-pegasus'],
  ['kingdom-of-lyonne', /^prophetess$/, /unicorn/, 'brt-prophetess-unicorn'],
  ['kingdom-of-lyonne', /^prophetess$/, /horse/, 'brt-prophetess-warhorse'],
  ['kingdom-of-lyonne', /^damsel$/, /unicorn/, 'brt-damsel-unicorn-on-40x60'],
  ['kingdom-of-lyonne', /^damsel$/, /horse/, 'brt-damsel-warhorse'],
  // the Lornefolk of Lorne Wood
  ['lornefolk-of-lorne-wood', /^grove-(lord|captain)$/, /great stag/, 'we-lord-great-stag'],
  ['lornefolk-of-lorne-wood', /^grove-(lord|captain)$/, /great eagle/, 'we-lord-great-eagle'],
  ['lornefolk-of-lorne-wood', /weavesinger$/, /unicorn/, 'we-weavesinger-unicorn-on-40x60'],
  ['lornefolk-of-lorne-wood', /weavesinger$/, /great eagle/, 'we-weavesinger-great-eagle'],
  // the Sand Kings of Kheshet
  ['sand-kings-of-kheshet', /^sand-king$/, /bone dragon/, 'tk-king-bone-dragon'],
  ['sand-kings-of-kheshet', /^high-priest$/, /bone dragon/, 'tk-priest-bone-dragon'],
  // the Vhar
  ['vhar', /^vhar-(dreadlord|master)$/, /dark pegasus/, 'de-lord-dark-pegasus-on-40x60'],
  ['vhar', /sorceress$/, /dark pegasus/, 'de-sorceress-dark-pegasus-on-40x60'],
  ['vhar', /^vhar-dreadlord$/, /manticore/, 'de-lord-manticore-on-60x100'],
  ['vhar', /^high-beastmaster$/, /manticore/, 'de-beastmaster-manticore-on-60x100'],
  ['vhar', /^high-beastmaster$/, /lashrunner/, 'de-beastmaster-lashrunner'],
  // the Kingdom of Lyonne: the lady who rides Aubelune, on her 40 x 60 base
  ['kingdom-of-lyonne', /^lady-élisse-duachaard$/, /aubelune/, 'brt-lord-mounted-on-40x60'],
  // the Bloodsworn Courts: the Abyssal Terror and the Dreadwing Colossus, each with its rider
  ['bloodsworn-courts', /^blood-count$/, /abyssal terror/, 'vc-blood-count-abyssal-terror'],
  ['bloodsworn-courts', /^master-necromancer$/, /abyssal terror/, 'vc-necromancer-abyssal-terror'],
  ['bloodsworn-courts', /^gravefiend-ghoul-king$/, /dreadwing colossus/, 'vc-ghoul-king-dreadwing'],
  // the Rukka Firms: Titch on Nosher, the Nipper bosses on a Gigantic Spider
  ['rukka-firms', /^titch-toothnicker$/, /nosher/, 'og-titch-nosher'],
  ['rukka-firms', /^nipper-(gaffer|top-lad)$/, /gigantic spider/, 'og-boss-gigantic-spider-on-50x50'],
  // the Sand Kings: Amenkhet on the Chariot of the Gods
  ['sand-kings-of-kheshet', /^amenkhet/, /chariot of the gods/, 'tk-chariot-of-the-gods'],
  // the Deephold Clans (the Oathstone is only a mount choice: no unit.mount)
  ['deephold-clans', /^king$/, /oathstone/, 'dw-king-oathstone'],
  ['deephold-clans', /^thane$/, /oathstone/, 'dw-thane-oathstone'],
  ['deephold-clans', /^king$/, /shieldbearers/, 'dw-king-shieldbearers-on-50x50'],
  // the Unmade
  ['the-unmade', /^unmade-herald-of-wrath$/, /juggernaut/, 'dc-wrath-herald-juggernaut-on-50x75'],
  ['the-unmade', /^unmade-herald-of-rapture$/, /^steed of rapture/, 'dc-rapture-herald-steed'],
  ['the-unmade', /^unmade-herald-of-cipher$/, /^disc of cipher/, 'dc-cipher-herald-disc'],
  ['the-unmade', /^unmade-herald-of-endurance$/, /palanquin/, 'dc-endurance-herald-palanquin']
]

function family (unit) {
  const e = unit.entryId
  if ((unit.troopType || []).includes('Character') && (unit.mount || unit.chariotMount || unit.mountChoice)) {
    const m = [unit.mountChoice, unit.mount?.name, unit.chariotMount].filter(Boolean).join(' | ').toLowerCase()
    const hit = CHARACTER_MOUNT.find(([army, re, mre]) => army === unit.army && re.test(e) && mre.test(m))
    // (a Griffon bought with two heads keeps its two-headed picture)
    if (hit && !(/griffon/.test(m) && /two heads/i.test((unit.options || []).join(', ')))) return hit[3]
  }
  // a mounted character wears its army's mounted champion (a knight, a boar lad, a wolf rider)
  // a Dominion character in a Dominion, Chosen or Bloodbeast chariot rides that chariot's own picture
  if (unit.chariotMount && unit.army === 'dominion-hosts') {
    if (/bloodbeast/i.test(unit.chariotMount)) return 'woc-bloodbeast-chariot'
    if (/chosen dominion chariot/i.test(unit.chariotMount)) return 'woc-chosen-chariot'
    if (/dominion chariot/i.test(unit.chariotMount)) return 'woc-chariot'
  }
  // every other character in a chariot (or on a Broodmaw's howdah, mounts.js: a chariot mount) rides that
  // chariot's own picture, rather than every army's chariot falling back to the Rukka boar chariot
  if (unit.chariotMount) {
    const c = unit.chariotMount
    if (/broodmaw/i.test(c)) return 'og-broodmaw'
    if (/iron rukka/i.test(c)) return 'og-iron-rukka-chariot'
    if (/wolf/i.test(c)) return 'og-wolf-chariot'
    if (/war wagon|war altar/i.test(c)) return 'emp-war-wagon-on-60x100'   // (no War Altar picture drawn yet: the War Wagon's)
    if (/lion/i.test(c)) return 'he-lion-chariot'
    if (/skycutter/i.test(c)) return 'he-skycutter-on-60x100'
    if (/tiradel/i.test(c)) return 'he-tiradel-chariot'
    if (/lashrunner/i.test(c)) return 'de-lashrunner'
    if (/coldscale/i.test(c)) return 'de-coldone-chariot'
    if (/skeleton/i.test(c)) return 'tk-chariot'
    if (/razorboar/i.test(c)) return 'bm-razorboar-chariot'
    if (/tuskboar/i.test(c)) return 'bm-tuskboar-chariot'
    if (unit.army === 'the-unmade') return /seeker|rapture/i.test(c) ? 'dc-seeker-chariot' : /burning|cipher/i.test(c) ? 'dc-burning-chariot' : 'dc-skull-cannon'
    if (/boar/i.test(c)) return 'og-boar-chariot'
  }
  if (unit.mount && (unit.troopType || []).includes('Character')) {
    // ridden monsters and the Giant Cave Gobbler have their own pictures
    // (the token armies' own ridden pictures)
    const opts = (unit.options || []).join(', ')
    if (/griffon/i.test(unit.mount.name) && unit.army === 'concord-realm') return /two heads/i.test(opts) ? 'emp-griffon-rider-two-heads' : 'emp-griffon-rider'
    if (/clawsteed/i.test(unit.mount.name)) return 'emp-clawsteed'
    if (unit.army === 'ilthari-realms' && /sun dragon/i.test(unit.mount.name)) return 'he-sun-dragon'
    if (unit.army === 'ilthari-realms' && /moon dragon/i.test(unit.mount.name)) return 'he-moon-dragon'
    if (unit.army === 'ilthari-realms' && /star dragon/i.test(unit.mount.name)) return 'he-star-dragon'
    if (unit.army === 'ilthari-realms' && /emberwing/i.test(unit.mount.name)) return 'he-emberwing-phoenix'
    if (unit.army === 'ilthari-realms' && /rimewing/i.test(unit.mount.name)) return 'he-rimewing-phoenix'
    if (unit.army === 'vhar' && /dragon/i.test(unit.mount.name)) return 'de-black-dragon'
    if (unit.army === 'saurians' && /carnosaur/i.test(unit.mount.name)) return 'lz-carnosaur-on-50x100'
    if (unit.army === 'saurians' && /ancient hornback/i.test(unit.mount.name)) return 'lz-ancient-hornback'
    if (unit.army === 'saurians' && /hornback/i.test(unit.mount.name)) return 'lz-beast'
    if (unit.army === 'saurians' && /razorwing/i.test(unit.mount.name)) return 'lz-razorwing'
    if (unit.army === 'saurians' && /cliffwing/i.test(unit.mount.name)) return 'lz-flyer'
    if (unit.army === 'sand-kings-of-kheshet' && /bonesphinx/i.test(unit.mount.name)) return 'tk-bonesphinx'
    if (unit.army === 'bloodsworn-courts' && /zombie dragon/i.test(unit.mount.name)) return 'vc-zombie-dragon'
    if (unit.army === 'lornefolk-of-lorne-wood' && /dragon/i.test(unit.mount.name)) return 'we-forest-dragon'
    if (unit.army === 'gutlords' && /cragback/i.test(unit.mount.name)) return 'ok-cragback'
    if (unit.army === 'gutlords' && /rimetusk/i.test(unit.mount.name)) return 'ok-rimetusk'
    if (unit.army === 'jade-dominion-of-shen' && /moon/i.test(unit.mount.name)) return 'gc-moon-dragon'
    if (unit.army === 'jade-dominion-of-shen' && /dragon/i.test(unit.mount.name)) return 'gc-sun-dragon'
    if (/griffon/i.test(unit.mount.name)) return 'emp-griffon-rider'
    if (/wyvern/i.test(unit.mount.name)) return 'og-wyvern-rider'
    if (/cave gobbler/i.test(unit.mount.name)) return 'og-cave-gobbler-rider'
    if (unit.army === 'concord-realm') return 'emp-knight-champion'
    if (unit.army === 'broken-crowns') return 'ren-lord-mounted'
    if (unit.army === 'ilthari-realms') return /dragon|phoenix|griffon|eagle/i.test(unit.mount.name) ? 'woc-monster' : 'he-silverhelm-champion'
    // (a Dominion Dragon has two heads; the Manticore its own picture; both with the rider)
    if (unit.army === 'dominion-hosts') return /dragon/i.test(unit.mount.name) ? 'woc-dominion-dragon-rider' : /manticore/i.test(unit.mount.name) ? 'woc-manticore-rider' : /unmade/i.test(unit.mount.name) ? 'woc-unmade-mount-on-40x60' : 'woc-lord-steed'
    if (unit.army === 'saurians') return /carnosaur|hornback/i.test(unit.mount.name) ? 'lz-beast' : /cliffwing|razorwing/i.test(unit.mount.name) ? 'lz-flyer' : 'lz-coldone-champion'
    if (unit.army === 'sand-kings-of-kheshet') return /sphinx|dragon/i.test(unit.mount.name) ? 'tk-sphinx' : 'tk-horseman-champion'
    if (unit.army === 'bloodsworn-courts') return /dragon|terror|dreadwing|throne|reliquary/i.test(unit.mount.name) ? 'vc-monster' : 'vc-bloodknight-champion'
    if (unit.army === 'vhar') return /dragon|manticore|pegasus/i.test(unit.mount.name) ? 'woc-monster' : /coldscale/i.test(unit.mount.name) ? 'de-coldone-champion' : 'de-darkrider-champion'
    if (unit.army === 'lornefolk-of-lorne-wood') return /dragon/i.test(unit.mount.name) ? 'woc-monster' : /warhawk|eagle/i.test(unit.mount.name) ? 'we-warhawk' : 'we-gladerider-champion'
    if (unit.army === 'kingdom-of-lyonne') return unit.entryId === 'the-verdant-knight' ? 'brt-verdant-knight' : /pegasus|hippogryph/i.test(unit.mount.name) ? 'brt-pegasus-knight-champion' : 'brt-lord-mounted'
    // (each of these armies rides its own army's cavalry picture, not the Rukka boar lad's)
    if (unit.army === 'the-unmade') return /juggernaut/i.test(unit.mount.name) ? 'dc-wrath-cavalry-champion' : /rapture/i.test(unit.mount.name) ? 'dc-rapture-cavalry-champion' : /disc|cipher/i.test(unit.mount.name) ? 'dc-cipher-cavalry-champion' : 'dc-endurance-cavalry-champion'
    if (unit.army === 'jade-dominion-of-shen') return 'gc-lancer-champion'
    if (unit.army === 'deephold-clans') return 'dw-shieldbearers'
    if (unit.army === 'ashforged' && !/^iron-rukka/.test(e)) return /wolf/i.test(unit.mount.name) ? 'cd-wolf-raider' : 'woc-monster'   // (no Taurus or Lammasu picture drawn yet)
    if (/gigantic spider/i.test(unit.mount.name)) return 'og-spider-rider'
    // Titch's Nosher: light cavalry on a 25x50 base, like a wolf rider (not the boar's 30x60)
    return /wolf|gobbler|nosher/i.test(unit.mount.name) ? 'og-wolf-rider-champion' : 'og-boar-lad-champion'
  }
  const eq = (unit.equipment || '').toLowerCase()
  switch (true) {
    // ---- pictures drawn on the base the game fields the unit on (copied from the token art, re-laid where the base differs)
    case e === 'grand-master': return 'emp-grand-master'   // (on foot: a mount bought goes to the mounted picture above)
    case e === 'lord-commander': return 'emp-lord-commander'
    case /^hobgoblin-bolt-thrower/.test(e): return 'cd-bolt-thrower-on-50x50'
    case /^magma-cannon/.test(e): return 'cd-magma-cannon-on-50x100'
    case /^groundbreaker-mortar/.test(e): return 'cd-groundbreaker-mortar-on-25x25'
    case /^iron-behemoth/.test(e): return 'cd-iron-behemoth-on-60x100'
    case /^bull-centaur-hewers/.test(e): return 'cd-bull-centaur-hewer'
    case e === 'bull-centaur-ashtaur': return 'cd-bull-centaur-ashtaur'
    case e === 'cannon' && unit.army === 'deephold-clans': return 'dw-cannon-on-50x50'
    case e === 'bolt-thrower' && unit.army === 'deephold-clans': return 'dw-bolt-thrower-on-50x50'
    case e === 'organ-gun' && unit.army === 'deephold-clans': return 'dw-organ-gun-on-50x50'
    case e === 'marchlord-bombard': return 'ren-bombard-on-25x25'
    case e === 'marchlords-organ-gun': return 'ren-organ-gun-on-50x50'
    case e === 'war-wagon': return 'emp-war-wagon-on-60x100'
    case /^blightclaw-catapult/.test(e): return 'sk-blightclaw-catapult-on-50x100'
    case /^sparkwheel/.test(e): return 'sk-sparkwheel-on-50x100'
    case /^wyrd-lightning-cannon/.test(e): return 'sk-wyrd-lightning-cannon-on-50x100'
    case /^warren-abomination/.test(e): return 'sk-warren-abomination-on-60x100'
    case e === 'fangcat-packs': return 'ok-fangcat-on-25x50'
    case e === 'frostfang-cavalry': return 'ok-frostfang-on-50x100'
    case e === 'gorgers': return 'ok-gulper'
    case e === 'gutcannon': return 'ok-gutcannon-on-60x100'
    case e === 'grubling-junkflinger': return 'ok-junkflinger-on-60x100'
    case /^peryton/.test(e): return 'bm-peryton'
    case /^lumaren-skycutters/.test(e): return 'he-skycutter-on-60x100'
    case e === 'pegasus-knights': return 'brt-pegasus-knight-on-40x60'
    case e === 'lornefolk-beast-pack': return 'we-beast-keeper-on-25x50'   // the Beast Keepers (the beasts have their own pictures)
    case e === 'sniv-pedal-cart': return 'og-pedal-cart-on-50x100'
    case e === 'urn-of-souls': return 'tk-urn-of-souls-on-25x25'
    case e === 'dune-knights': return 'tk-dune-knight-on-50x100'
    case /^dune-stalkers/.test(e): return 'tk-dune-stalker-on-50x100'
    case /^bone-scorpion/.test(e): return 'tk-bone-scorpion'
    case /^mirecrawler/.test(e): return 'lz-mirecrawler'
    case /^beasts-of-endurance/.test(e): return 'dc-endurance-beast-on-50x75'
    case /^fiends-of-rapture/.test(e): return 'dc-rapture-fiend-on-50x75'
    case /^great-blighted-one/.test(e): return 'dc-endurance-greater-on-150x100'
    case /^hellflayer/.test(e): return 'dc-hellflayer'
    case /^soul-mill/.test(e): return 'dc-soul-mill-on-150x100'
    case /^bloodmire-shrines/.test(e): return 'de-bloodmire-shrine-on-60x100'
    case /^bloodmire-medusas/.test(e): return 'de-bloodmire-medusa-on-40x40'
    // ---- the token armies' own pictures
    // the Concord Realm
    case e === 'realm-archers' && unit.army === 'broken-crowns': return 'ren-archer'
    case e === 'realm-archers': return 'emp-archer'
    case /^clawsteed-(leopard-)?knights/.test(e): return 'emp-clawsteed'
    case e === 'realm-engineer': return 'emp-engineer'
    case e === 'flagellants': return 'emp-flagellant'
    // (the Leopard Knights' ids put the Order first: leopard-knights, inner-circle-leopard-knights; their picture is 'panther')
    case /^(inner-circle-)?leopard-knights/.test(e): return 'emp-knight-panther'
    case /^(realm-knights|inner-circle-knights)-(winter-fang|sunburst|the-pale-keeper|ember-heart)/.test(e): return 'emp-knight-' + e.match(/(winter-fang|sunburst|the-pale-keeper|ember-heart)/)[1]
    case /^outriders/.test(e): return 'emp-outrider'
    case e === 'realm-road-wardens': return 'emp-road-warden'
    case e === 'helstrom-rocket-battery': return 'emp-rocket-battery'
    case e === 'iron-kettle': return 'emp-iron-kettle'
    case e === 'war-wagon': return 'emp-war-wagon'
    case e === 'witch-hunter': return 'emp-witch-hunter'
    case e === 'harbinger-of-doom': return 'emp-flagellant'   // a flagellant prophet
    case e === 'general-konrad-von-lowenhacke': return 'emp-general'
    case e === 'greyfang-guard': return 'emp-kingsblade'   // heavy infantry with great weapons, on foot
    case /^march-troops|^kessel-(veteran-)?march-troops|^veteran-march/.test(e) && !/halberd|spear/.test(eq): return 'emp-swordsman'
    case /march-missile/.test(e) && /bow/.test(eq) && !/crossbow/.test(eq): return 'emp-archer'
    // Lyonne: Knights of the Lily on foot, the Yeoman Guard
    case e === 'knights-of-the-lily': return 'brt-foot-knight'
    case e === 'yeoman-guard': return 'brt-yeoman-guard'
    // the Broken Crowns
    case e === 'hireling-outriders': return 'ren-outrider'
    case e === 'marchlord-mortar': return 'ren-mortar'
    case e === 'marchlord-bombard': return 'ren-bombard'
    case e === 'outcast-wizard' && unit.army === 'broken-crowns': return 'ren-wizard'
    case /sellsword/.test(e) && !/halberd|spear|great|crossbow|handgun/.test(eq): return 'ren-sellsword-shield'
    // the Unmade: their engines and chariots
    case /^skull-cannon/.test(e): return 'dc-skull-cannon'
    case /^soul-mill/.test(e): return 'dc-soul-mill'
    case /^burning-chariot/.test(e): return 'dc-burning-chariot'
    case /^seeker-chariot/.test(e): return 'dc-seeker-chariot'
    case /^cinder-horrors/.test(e): return 'dc-cipher-brimstone'
    // the Ilthari Realms
    case /^thessan/.test(e): return 'he-thessan'
    case e === 'talonstrike-bolt-thrower': return 'he-bolt-thrower'
    case e === 'emberwing-phoenix': return 'he-emberwing-phoenix'
    case /^rimewing-phoenix/.test(e): return 'he-rimewing-phoenix'
    case e === 'handmaiden-of-the-dawnqueen': return 'he-handmaiden'
    case /^lion-chariot/.test(e): return 'he-lion-chariot'
    case e === 'duskblades': return 'he-duskblade'
    case /^lumaren-skycutters/.test(e): return 'he-skycutter'
    case e === 'tiradel-chariots': return 'he-tiradel-chariot'
    case e === 'war-lions' && unit.army === 'ilthari-realms': return 'he-war-lion'
    case e === 'dragon-mage': return 'he-sun-dragon'
    // the Hornkin Herds
    case /^cockatrice/.test(e): return 'bm-cockatrice'
    case /^gazehorn/.test(e) && unit.army === 'hornkin-herds': return 'bm-gazehorn'
    case /^gorgemaw/.test(e) && unit.army === 'hornkin-herds': return 'bm-gorgemaw'
    case /^gibberwyrm/.test(e): return 'bm-gibberwyrm'
    case /^razergor-chariot/.test(e): return 'bm-razorboar-chariot'
    case /^tuskboar-chariots/.test(e): return 'bm-tuskboar-chariot'
    case e === 'warped-hornkin': return 'bm-warped-hornkin'
    // the Ashforged
    case /^hobgoblin-bolt-thrower/.test(e): return 'cd-bolt-thrower'
    case /^wailfire-rocket-launcher/.test(e): return 'cd-deathshrieker'
    case /^groundbreaker-mortar/.test(e): return 'cd-groundbreaker-mortar'
    case /^magma-cannon/.test(e): return 'cd-magma-cannon'
    case /^iron-behemoth/.test(e): return 'cd-iron-behemoth'
    case /^hobgoblin-wolf-raiders/.test(e): return 'cd-wolf-raider'
    // the Vhar
    case /^bloodmire-shrines/.test(e): return 'de-bloodmire-shrine'
    case /^coldscale-chariots/.test(e): return 'de-coldone-chariot'
    case e === 'hexfire-warlocks': return 'de-hexfire-warlock'
    case /^abyssmaw/.test(e): return 'de-abyssmaw'
    case e === 'reaper-bolt-throwers': return 'de-reaper'
    case e === 'lashrunner-chariots': return 'de-lashrunner'
    case /^sisters-of-the-lash/.test(e): return 'de-sister-of-slaughter'
    // the Deephold Clans: their own machines
    case e === 'cannon' && unit.army === 'deephold-clans': return 'dw-cannon'
    case e === 'bolt-thrower' && unit.army === 'deephold-clans': return 'dw-bolt-thrower'
    case e === 'vengeance-thrower': return 'dw-vengeance-thrower'
    case e === 'organ-gun': return 'dw-organ-gun'
    case /^dwarf-cart/.test(e): return 'dw-cart'
    // Jade Dominion of Shen
    case /^shenese-grand-cannon/.test(e): return 'gc-grand-cannon'
    case /^fire-rain/.test(e): return 'gc-fire-rain'
    case /^crane-gunner/.test(e): return 'gc-crane-gun'
    case e === 'strategist': return 'gc-strategist'
    case /^(gate-keeper|gate-master)/.test(e): return 'gc-gate-keeper'
    // the Saurians
    case /^shieldback/.test(e): return /solar engine/i.test([unit.equipment, ...(unit.options || [])].join(', ')) ? 'lz-shieldback-solar' : 'lz-shieldback'
    case /^ancient-hornback/.test(e): return 'lz-ancient-hornback'
    case /^hornback/.test(e): return 'lz-beast'
    case /^chameleon-scalelings/.test(e): return 'lz-chameleon'
    case /^jungle-swarms/.test(e): return 'lz-jungle-swarm'
    case /^quillback/.test(e): return 'lz-quillback'
    case /^razorwing/.test(e): return 'lz-razorwing'
    // the Gutlords
    case e === 'embergut': return 'ok-embergut'
    case e === 'hunter': return 'ok-hunter'
    case /^gorgemaster/.test(e): return 'ok-gorgemaster'
    case e === 'gutcannon': return 'ok-gutcannon'
    case e === 'grubling-junkflinger': return 'ok-junkflinger'
    case /^cragback/.test(e): return 'ok-cragback'
    case e === 'rimetusk-riders': return 'ok-rimetusk'
    case e === 'maneaters': return 'ok-maneater'
    // the Gnawkin
    case /^master-assassin/.test(e): return 'sk-assassin'
    case /^blight-censer/.test(e): return 'sk-censer'
    case /^sparkwheel/.test(e): return 'sk-sparkwheel'
    case /^sparkwright/.test(e): return 'sk-engineer'
    case e === 'poisoned-wind-fumeslingers': return 'sk-fumeslinger'
    case e === 'blight-priest': return 'sk-blight-priest'
    case e === 'blightclaw-catapult': return 'sk-plagueclaw'
    case e === 'rat-swarms': return 'sk-rat-swarm'
    case /^gnawkin-dregs/.test(e): return 'sk-slave'
    case /^wyrdlock-jezzails/.test(e): return 'sk-team-jezzail'
    case e === 'wyrd-lightning-cannon': return 'sk-wyrd-lightning-cannon'
    // the Sand Kings
    case e === 'carrion': return 'tk-carrion'
    case e === 'urn-of-souls': return 'tk-casket'
    case e === 'wailing-skull-catapult': return 'tk-catapult'
    case e === 'skeleton-chariots': return 'tk-chariot'
    case e === 'bone-colossus': return 'tk-colossus'
    case /^sand-guard-chariots/.test(e): return 'tk-guard-chariot'
    case e === 'skeleton-horse-archers': return 'tk-horse-archer'
    case e === 'dune-knights': return 'tk-dune-knight'
    case e === 'bonesphinx': return 'tk-bonesphinx'
    case /^(tombwright|arch-tombwright)/.test(e): return 'tk-tombwright'
    case /^dune-stalkers/.test(e): return 'tk-stalker'
    // the Bloodsworn Courts
    case /^bat-swarm/.test(e): return 'vc-bat-swarm'
    case /^night-hearse/.test(e): return 'vc-night-hearse'
    case /^charnel-wagon/.test(e): return 'vc-charnel-wagon'
    case /^gravefiend-ghoul-king/.test(e): return 'vc-ghoul-king'
    // the Lornefolk of Lorne Wood
    case e === 'bear-of-lorne': return 'we-bear'
    case e === 'lornefolk-beast-pack': return 'we-scout'   // the Beast Keepers: hooded, hand weapon and light armour
    case e === 'forest-cat': return 'we-forest-cat'
    case e === 'deepwood-hounds': return 'we-hound'
    case e === 'sylvan-boar': return 'we-sylvan-boar'
    // units with no picture of their own, wearing the nearest one
    case /^(unmade-slayer|dragon-slayer|deathwhirl)$/.test(e) || e === 'durnak-ironhand': return 'dw-slayer-champion'
    case e === 'brotherhood-of-skarn': return 'dw-slayer'
    case e === 'royal-clan-warriors': return 'dw-warrior'
    case /^scout-rotorwings/.test(e): return 'dw-rotorwing'
    case e === 'engineer-sapper': return 'dw-engineer'
    case e === 'white-lions-core' || e === 'lion-guard': return 'he-whitelion'
    case e === 'ships-company' || e === 'sea-guard-garrison.commander': return 'he-seaguard'
    case /^battle-pilgrims/.test(e): return 'brt-pilgrim'
    case /^soulfire-cannon/.test(e): return 'woc-soulfire-cannon'
    case /^butcher/.test(e): return 'ok-butcher'
    case /^shotbellies/.test(e): return 'ok-shotbelly'
    case /^snowstalkers/.test(e): return 'ok-bull'
    case /^nipper-(gaffer|top-lad|big-odd-bod|odd-bod)$/.test(e) || e === 'mick-bogwallop': return 'og-nipper-champion'
    case /^gloom-nipper-(big-odd-bod|odd-bod)$/.test(e): return 'og-gloom-nipper-champion'
    case e === 'cult-magister': return 'woc-sorcerer'
    case e === 'wolfskins': return 'woc-hound'
    // ---- (the older mapping)
    case e === 'general-of-the-realm': return 'emp-general'
    case e === 'master-mage' || e === 'wizard-lord': return 'emp-master-mage'
    case e === 'priest-of-saint-halvar' || e === 'lector-of-saint-halvar': return 'emp-priest-of-saint-halvar'
    case e === 'priest-of-varg' || e === 'high-priest-of-varg': return 'emp-priest-of-varg'
    case e === 'rukka-head-case' || e === 'rukka-big-head-case': return 'og-head-case'
    case e === 'captain-of-the-realm': return 'emp-captain-bsb'
    case /^march-troops|^kessel-(veteran-)?march-troops|^veteran-march/.test(e): return /halberd/.test(eq) ? 'emp-halberdier' : 'emp-spearman'
    case /march-missile/.test(e): return /handgun/.test(eq) ? 'emp-handgunner' : 'emp-crossbowman'
    case e === 'kingsblades': return 'emp-kingsblade'
    case /^realm-knights|^inner-circle|^leopard-knights/.test(e): return 'emp-knight'
    case e === 'pistoliers': return 'emp-pistolier'
    case e === 'great-cannon': return 'emp-great-cannon'
    case e === 'mortar': return 'emp-mortar'
    case e === 'thunderclap-volley-gun': return 'emp-thunderclap'
    case e === 'rukka-gaffer' || e === 'iron-rukka-gaffer': return 'og-gaffer'
    case e === 'rukka-top-lad' || e === 'iron-rukka-top-lad': return 'og-top-lad-bsb'
    case /^gloom-nipper-(top-lad|gaffer)$/.test(e): return 'og-gloom-nipper-champion'
    case e === 'rukka-mob': return /bow/.test(eq) ? 'og-rukka-archer' : 'og-rukka-lad'
    case /gloom-nipper-mob/.test(e): return 'og-gloom-nipper'
    case /nipper-mob|gloom-nipper-mob/.test(e): return 'og-nipper'   // common Nippers, their own look
    case /iron-rukka-mob/.test(e): return 'og-iron-rukka'
    // (more Rukka & Nipper units with their own pictures)
    case /spider-rider/.test(e): return 'og-spider-rider'
    case e === 'broodmaw-spider': return 'og-broodmaw'
    case e === 'sniv-mob': return 'og-snivs'
    case e === 'sniv-pedal-cart': return 'og-pedal-cart'
    case e === 'nipper-flinger': return 'og-flung-nipper'
    case e === 'gloom-nipper-gobbler-herd': return 'og-cave-gobbler'
    case /^iron-rukka-boar-chariot/.test(e): return 'og-iron-rukka-chariot'
    case /^stone-troll-mob/.test(e): return 'og-troll-stone'
    case /^river-troll-mob/.test(e): return 'og-troll-river'
    case e === 'troll-hag': return 'og-troll-hag'
    case /wolf-rider/.test(e): return 'og-wolf-rider'
    case /boar-lad/.test(e): return 'og-boar-lad'
    case e === 'whirlers': return 'og-whirler'
    case e === 'gloom-nipper-gobbler-hopper-mob': return 'og-gobbler-hopper'
    case e === 'wrecker-gobblers': return 'og-wrecker-gobblers'
    case e === 'giant' || e === 'hillcrusher-giant': return 'og-giant'   // (the Hillcrusher: no picture of its own yet)
    case e === 'badland-ogre-bulls': return 'ok-bull'   // (Badland Ogres: the Gutlords' Ogre Bulls)
    case /troll/.test(e) && e !== 'dominion-trolls': return 'og-troll'
    case e === 'nipper-wolf-chariot': return 'og-wolf-chariot'
    case /boar-chariot/.test(e): return 'og-boar-chariot'
    case e === 'nipper-rock-chucka': return 'og-rock-chucka'
    case e === 'nipper-bolt-chucka': return 'og-bolt-chucka'
    // the Kingdom of Lyonne
    case e === 'the-verdant-knight': return 'brt-verdant-knight'
    case e === 'duke' || e === 'baron' || e === 'sir-aubert-lescaut-the-wyrm-slayer': return 'brt-lord'
    case e === 'paladin': return unit.isBSB ? 'brt-lord-bsb' : 'brt-lord'
    case e === 'damsel' || e === 'lady-élisse-duachaard': return 'brt-damsel'
    case e === 'prophetess': return 'brt-prophetess'
    case e === 'sergeant-at-arms': return 'brt-sergeant'
    case e === 'men-at-arms': return 'brt-man-at-arms'
    case e === 'peasant-bowmen': return 'brt-bowman'
    case e === 'squires': return 'brt-squire'
    case e === 'battle-pilgrims-special': return 'brt-pilgrim'
    case e === 'mounted-yeomen': return 'brt-mounted-yeoman'
    case e === 'knights-errant': return 'brt-knight-errant'
    case e === 'wayfarer-knights': return 'brt-wayfarer-knight'
    case e === 'chalice-knights': return 'brt-chalice-knight'
    case e === 'pegasus-knights': return 'brt-pegasus-knight'
    case /knights-of-the-lily/.test(e): return 'brt-knight'
    case e === 'field-trebuchet': return 'brt-trebuchet'
    // the Broken Crowns: the Concord Realm's archers, outriders, wizard, mortar and cannon stand in
    case e === 'renegade-prince' || (e === 'renegade-captain' && !unit.isBSB): return 'ren-prince'
    case e === 'renegade-captain': return 'ren-captain-bsb'
    case e === 'outcast-wizard': return 'emp-master-mage'
    case /sellsword/.test(e): return 'ren-sellsword-' + (/halberd/.test(eq) ? 'halberd' : /spear/.test(eq) ? 'spear' : /great/.test(eq) ? 'great' : /crossbow/.test(eq) ? 'crossbow' : /handgun/.test(eq) ? 'handgun' : 'halberd')
    case /hedge-knights/.test(e): return 'ren-freeblade'
    case e === 'marchlord-brigands': return 'ren-brigand'
    case e === 'freeholder-militia': return 'ren-militia'
    case e === 'hireling-outriders': return 'emp-pistolier'
    case e === 'marchlord-mortar': return 'emp-mortar'
    case e === 'marchlord-bombard': return 'emp-great-cannon'
    case e === 'marchlords-organ-gun': return 'ren-organ-gun'
    // the Deephold Clans
    case e === 'king' || e === 'haldor-ullekson': return unit.mountChoice === 'Shieldbearers' ? 'dw-shieldbearers' : 'dw-king'
    case e === 'thane': return unit.mountChoice === 'Shieldbearers' ? 'dw-shieldbearers' : unit.isBSB ? 'dw-thane-bsb' : 'dw-thane'
    case e === 'runesmith' || e === 'runelord': return 'dw-runesmith'
    case e === 'engineer' || e === 'torvik-ashmantle': return 'dw-engineer'
    case /slayer$/.test(e) || e === 'durnak-ironhand' || e === 'deathwhirl-merc': return 'dw-slayer-hero'
    case e === 'anvil-of-ruin': return 'dw-anvil'
    case e === 'dwarf-warriors' || e === 'crownsworn-dwarf-mercenaries': return 'dw-warrior'
    case /^long-beards/.test(e): return 'dw-greybeard'
    case e === 'kingshammers': return 'dw-kingshammer'
    case e === 'ironwalls': return 'dw-ironwall'
    case e === 'embershots': return 'dw-embershot'
    case e === 'miners': return 'dw-miner'
    case e === 'slayers': return 'dw-slayer'
    case e === 'boltbeards': return 'dw-boltbeard'
    case e === 'firebeards': return 'dw-firebeard'
    case /^rangers/.test(e): return 'dw-ranger'
    case e === 'rotorwings': return 'dw-rotorwing'
    case e === 'rotorbomber': return 'dw-rotorbomber'
    case e === 'cannon': return 'emp-great-cannon'
    case e === 'bolt-thrower': return 'og-bolt-chucka'
    case e === 'vengeance-thrower': return 'og-rock-chucka'
    case e === 'organ-gun': return 'ren-organ-gun'
    case e === 'flame-cannon': return 'dw-flame-cannon'
    case e === 'nipper-hewer': return 'dw-nipper-hewer'
    // the Dominion Hosts
    case e === 'dominion-lord' || e === 'exalted-champion' || e === 'aspiring-champion' || e === 'champion-of-ruin' || e === 'brannoc-the-chainmaker': return 'woc-lord'
    case e === 'sorcerer-lord' || e === 'exalted-sorcerer': return 'woc-sorcerer'
    case e === 'unmade-lord' && unit.army !== 'the-unmade': return 'woc-unmade-lord'
    case e === 'dominion-warriors': return 'woc-warrior'
    case e === 'chosen-dominion-warriors': return 'woc-chosen'
    case e === 'dominion-marauders': return 'woc-marauder'
    // drawn as Marauders with their kits (every unit shows its weapons)
    case e === 'marauder-tribe-berserkers' || e === 'marauder-tribe-huscarls' || e === 'dominion-cultists': return 'woc-marauder'
    case e === 'marauder-tribe-chieftain': return 'woc-marauder-champion'
    case e === 'dominion-knights' || e === 'chosen-dominion-knights': return 'woc-knight'
    case e === 'marauder-horsemen': return 'woc-horseman'
    case e === 'dominion-warhounds': return 'woc-hound'
    case e === 'forsaken': return 'woc-forsaken'
    case e === 'dominion-ogres': return 'woc-ogre'
    case e === 'dominion-trolls': return 'woc-troll'
    case e === 'dominion-spawn': return 'woc-spawn'
    case e === 'thunderwyrms' || e === 'thunderwyrm-elder': return 'woc-thunderwyrm'
    case /^dominion-chariot/.test(e): return 'woc-chariot'
    case /^chosen-dominion-chariot/.test(e): return 'woc-chosen-chariot'
    case /^bloodbeast-chariot/.test(e): return 'woc-bloodbeast-chariot'
    case e === 'dominion-giant': return 'og-giant'
    case e === 'soulfire-cannon': return 'woc-soulfire-cannon'
    case e === 'vaelgrath': return 'woc-dominion-dragon'
    case e === 'chimera': return 'woc-chimera'
    case e === 'gigantic-spawn-of-dominion': return 'woc-gigantic-spawn'
    case e === 'wyrdfire-dragon': return 'woc-wyrdfire-dragon'
    // the Ilthari Realms
    case e === 'prince' || e === 'noble' || e === 'taeron-lionmane' || e === 'seriel-vane': return 'he-prince'
    case e === 'archmage' || e === 'mage' || e === 'storm-weaver': return 'he-mage'
    case e === 'handmaiden-of-the-dawnqueen' || /^sister-of-saelwood/.test(e): return 'he-sister'
    case e === 'elven-spearmen': return 'he-spearman'
    case e === 'elven-archers' || e === 'duskblades': return 'he-archer'
    case e === 'lumaren-sea-guard': return 'he-seaguard'
    case e === 'bladewardens': return 'he-bladewarden'
    case e === 'white-lions': return 'he-whitelion'
    case e === 'ashen-guard': return 'he-phoenixguard'
    case e === 'argent-knights': return 'he-silverhelm'
    case e === 'elvarine-reavers': return 'he-reaver'
    case e === 'drakeborn': return 'he-dragonprince'
    case e === 'great-eagle': return 'he-eagle'
    case e === 'war-lions': return 'woc-hound'
    case e === 'talonstrike-bolt-thrower': return 'og-bolt-chucka'
    case /chariot|skycutter/.test(e): return 'og-boar-chariot'
    case /phoenix|ashen-guard|deepwyrms|dragon-mage/.test(e): return 'woc-monster'
    // the Unmade: each god's colours
    case unit.army === 'the-unmade': {
      // The Unmade pictures, one set per god.
      // A Greater Unmade's god is in its name; the others' in their id or special rules.
      const named = { bloodtyrant: 'wrath', 'great-blighted-one': 'endurance', 'keeper-of-delights': 'rapture', 'lord-of-riddles': 'cipher', 'soul-mill': 'wrath', 'skull-cannon': 'wrath' }
      const byName = Object.keys(named).find(n => e.startsWith(n))
      // (the pictures are named by the ids' god words; the special rules carry the gods' new names: 'Unmade of Wrath')
      const RULE_WORD = { wrath: 'wrath', endurance: 'endurance', rapture: 'rapture', cipher: 'cipher' }
      const found = byName ? named[byName] : ['wrath', 'endurance', 'rapture', 'cipher'].find(x => e.includes(x) || [...(unit.special || [])].some(r => r.toLowerCase().includes(RULE_WORD[x])))
      const god = found || 'wrath'
      if (/^dominion-furies/.test(e)) return 'dc-fury'
      if (e === 'unmade-lord') return found ? `dc-${found}-prince` : 'dc-prince'
      if (/bloodtyrant|great-blighted-one|keeper-of-delights|lord-of-riddles|soul-mill|skull-cannon/.test(e)) return `dc-${god}-greater`
      if (/herald/.test(e)) return `dc-${god}-herald`
      if (/^sullen-horrors|^cinder-horrors/.test(e)) return 'dc-cipher-blue'
      if (/^blightlings/.test(e)) return 'dc-endurance-blightlings'
      if (/^flesh-hounds/.test(e)) return 'dc-wrath-hound'
      if (/^fiends-of-rapture/.test(e)) return 'dc-rapture-fiend'
      if (/^flamers-of-cipher/.test(e)) return 'dc-cipher-flamer'
      if (/^beasts-of-endurance/.test(e)) return 'dc-endurance-beast'
      if (/^screamers/.test(e)) return 'dc-cipher-cavalry'
      if (/Cavalry|Chariot/.test((unit.troopType || []).join(' '))) return `dc-${god}-cavalry`
      return `dc-${god}`
    }
    // Jade Dominion of Shen
    case /^(lord-magistrate|strategist|gate-master|gate-keeper)/.test(e): return 'gc-lord'
    case /^(supreme-astromancer|astromancer)/.test(e): return 'gc-mage'
    case /^(mei-lan|lianshi)/.test(e): return 'gc-dragon'
    case /^jade-warriors/.test(e): return 'gc-jade'
    case /^peasant-levy/.test(e): return 'gc-levy'
    case /^(crane-gunner|iron-hail)/.test(e): return 'gc-gunner'
    case /^jade-lancers/.test(e): return 'gc-lancer'
    case /^shenese-sentinel/.test(e): return 'gc-sentinel'
    case /^(shenese-grand-cannon|fire-rain)/.test(e): return 'gc-grand-cannon'
    case /^kite-lantern/.test(e): return 'gc-dragon'
    // the Ashforged
    case /^(sorcerer-prophet|bindsmith-sorcerer)/.test(e): return 'cd-sorcerer'
    case /^(infernal-castellan|infernal-seneschal)/.test(e): return 'cd-castellan'
    case /^furnace-guard/.test(e): return 'cd-guard'
    case /^ashsworn-veterans/.test(e): return 'cd-ironsworn'
    case /^(hobgoblin-cutthroats|sneakthieves|hobgoblin-khan)/.test(e): return 'cd-hobgoblin'
    case /^(bull-centaur)/.test(e): return 'cd-centaur'
    case /^kindled-fireborn/.test(e): return 'cd-kindled'
    case /^(wailfire-rocket-launcher|magma-cannon|hobgoblin-bolt-thrower|groundbreaker-mortar)/.test(e): return 'og-rock-chucka'
    case /^iron-behemoth/.test(e): return 'og-boar-chariot'
    // the Saurians
    case /^(saurian-oldblood|saurian-scar-veteran)/.test(e): return 'lz-saurushero'
    case /^(scaleling-priest|scaleling-chief)/.test(e): return 'lz-skinkhero'
    case /^starseer/.test(e): return 'lz-starseer'
    case /^saurian-warrior/.test(e): return 'lz-saurian'
    case /^shrine-guard/.test(e): return 'lz-templeguard'
    case /^(scaleling-skirmishers|chameleon-scalelings)/.test(e): return 'lz-scaleling'
    case /^coldscale-riders/.test(e): return 'lz-coldone'
    case /^crocbrute/.test(e): return 'lz-krox'
    case /^(cliffwing-riders|razorwing-riders)/.test(e): return 'lz-flyer'
    case /^(shieldback|hornback|ancient-hornback|mirecrawler)/.test(e): return 'lz-beast'
    case /^(salamander|quillback|jungle-swarms)/.test(e): return 'lz-salamander'
    // the Gnawkin
    case /^(gnawkin-warlord|gnawkin-chieftain|master-assassin)/.test(e): return 'sk-warlord'
    case /^(pale-seer|sparkwright|blight-priest)/.test(e): return 'sk-seer'
    case /^rankrats/.test(e): return 'sk-rankrat'
    case /^ironvermin/.test(e): return 'sk-ironvermin'
    case /^(blight-monks|blight-censer)/.test(e): return 'sk-monk'
    case /^(sewer-runners|dusk-runners|wyrdlock-jezzails|poisoned-wind)/.test(e): return 'sk-runner'
    case /^weapon-team/.test(e): return 'sk-team'
    case /^(giant-rats|rat-swarms)/.test(e): return 'sk-rat'
    case /^ratbrutes/.test(e): return 'sk-ogre'
    case /^warren-abomination/.test(e): return 'sk-abomination'
    case /^sparkwheel/.test(e): return 'og-boar-chariot'
    case /^(wyrd-lightning-cannon|blightclaw)/.test(e): return 'og-rock-chucka'
    // the Sand Kings of Kheshet
    case /^(sand-king|sand-prince|royal-herald|amenkhet|merenkh|prince-sebekhar)/.test(e): return 'tk-king'
    case /^(high-priest|mortuary-priest|tombwright|arch-tombwright)/.test(e): return 'tk-priest'
    case /^skeleton-(warriors|infantry)/.test(e) && unit.army !== 'bloodsworn-courts' && unit.army !== 'vampire-counts': return 'tk-skeleton'
    case /^skeleton-(archers|skirmishers)/.test(e): return 'tk-archer'
    case /^sand-guard($|-core)/.test(e): return 'tk-tombguard'
    case /^skeleton-(horsemen|horse-archers|cavalry)/.test(e): return 'tk-horseman'
    case /^(sandwardens|venerable-sandwardens|dune-knights|bone-serpents|dune-stalkers|bone-scorpion|bone-colossus)/.test(e): return 'tk-construct'
    case /sphinx/.test(e): return 'tk-sphinx'
    case /^(tomb-swarms|carrion)/.test(e): return 'tk-swarm'
    case /^(skeleton-chariots|sand-guard-chariots|urn-of-souls)/.test(e): return 'og-boar-chariot'
    case e === 'wailing-skull-catapult': return 'og-rock-chucka'
    // the Bloodsworn Courts
    case /^(blood-count|vampire-thrall|gravefiend-ghoul-king)/.test(e): return 'vc-vampire'
    case /^(master-necromancer|necromantic-acolyte)/.test(e): return 'vc-necromancer'
    case /^(wight-king|wight-lord)/.test(e): return 'vc-wight'
    case /^(shroud-wraith|tomb-banshee)/.test(e): return 'vc-wraith'
    case /^skeleton-warriors/.test(e): return 'vc-skeleton'
    case /^zombies|^risen-zombies/.test(e): return 'vc-zombie'
    case /^pit-ghouls/.test(e): return 'vc-ghoul'
    case /^gravesworn-guard/.test(e): return 'vc-graveguard'
    case /^barrow-knights/.test(e): return 'vc-blackknight'
    case /^bloodsworn-knights/.test(e): return 'vc-bloodknight'
    case /^cursewraiths/.test(e): return 'vc-cursewraith'
    case /^dire-wolves/.test(e): return 'vc-direwolf'
    case /^(pit-horrors|duskwings|gorewolf)/.test(e): return 'vc-horror'
    case /^(dusk-bats|bat-swarm)/.test(e): return 'vc-bat'
    case /^spirit-hosts/.test(e): return 'vc-spirit'
    case /^dreadwing-colossus/.test(e): return 'vc-monster'
    case /^(charnel-wagon|night-hearse)/.test(e): return 'og-boar-chariot'
    // the Vhar
    case e === 'vhar-dreadlord' || e === 'vhar-master' || e === 'high-beastmaster' || e === 'assassin-of-the-bloodied-god': return 'de-dreadlord'
    case /sorceress/.test(e): return 'de-sorceress'
    case e === 'blood-crone': return 'de-hag'
    case /^vhar-warriors/.test(e): return 'de-warrior'
    case /^repeater-crossbowmen/.test(e): return 'de-crossbow'
    case /^dread-ark-corsairs/.test(e): return 'de-corsair'
    case /^(bloodmaidens|sisters-of-the-lash)/.test(e): return 'de-witchelf'
    case e === 'ashvane-executioners': return 'de-executioner'
    case /^black-guard/.test(e): return 'de-blackguard'
    case e === 'dark-riders' || e === 'hexfire-warlocks': return 'de-darkrider'
    case e === 'coldscale-knights': return 'de-coldone'
    case e === 'vhar-shades': return 'de-shade'
    case e === 'harpies' && unit.army !== 'hornkin-herds': return 'de-harpy'
    case /^(war-hydra|abyssmaw)/.test(e): return 'de-monster'
    case /^bloodmire-medusas/.test(e): return 'de-medusa'
    case /^(lashrunner|coldscale-chariots|bloodmire-shrines)/.test(e): return 'og-boar-chariot'
    case e === 'reaper-bolt-throwers': return 'og-bolt-chucka'
    // the Lornefolk of Lorne Wood
    case e === 'grove-lord' || e === 'grove-captain' || e === 'faelan' || e === 'warden-of-thalwen': return 'we-gladelord'
    case e === 'elder-weavesinger' || e === 'weavesinger': return 'we-mage'
    case e === 'pathstalker': return 'we-pathstalker'
    case e === 'gloomdancer': return 'we-gloomdancer'
    case e === 'hernath': return 'we-hernath'
    case e === 'treeman-ancient' || e === 'treeman': return 'we-treeman'
    case e === 'barkwraith': return 'we-barkwraith'
    case e === 'grove-guard': return 'we-gladeguard'
    case /^shadewood-scouts/.test(e): return 'we-scout'
    case e === 'pathwatchers': return 'we-pathwatcher'
    case e === 'lorne-guard' || e === 'guardians-of-thalwen': return 'we-eternalguard'
    case e === 'wilddancers': return 'we-wilddancer'
    case e === 'briarwood-rangers': return 'we-ranger'
    case e === 'dryads': return 'we-dryad'
    case e === 'treekin': return 'we-treekin'
    case e === 'grove-riders': return 'we-gladerider'
    case /^horned-riders/.test(e): return 'we-wildrider'
    case e === 'sisters-of-the-bramble': return 'we-sister'
    case e === 'hawk-riders': return 'we-warhawk'
    case e === 'giant-eagle': return 'he-eagle'
    // the Gutlords
    case e === 'tyrant' || e === 'bruiser' || e === 'hunter': return 'ok-tyrant'
    case e === 'gorgemaster' || e === 'butcher' || e === 'embergut': return 'ok-butcher'
    case e === 'ogre-bulls' || e === 'maneaters' || e === 'snowstalkers': return 'ok-bull'
    case e === 'ironbellies': return 'ok-ironbelly'
    case e === 'shotbellies': return 'ok-shotbelly'
    case /^grubling-(fighters|trappers)/.test(e): return 'ok-grubling'
    case e === 'frostfang-cavalry': return 'ok-frostfang'
    case e === 'fangcat-packs': return 'ok-fangcat'
    case e === 'gutcannon' || e === 'grubling-junkflinger': return 'og-boar-chariot'
    case e === 'cragback-riders' || e === 'rimetusk-riders' || e === 'gorgers': return 'woc-monster'
    // the Hornkin Herds
    case e === 'herdlord' || e === 'hornchief' || e === 'chieftain-of-ruin': return 'bm-herdlord'
    case e === 'great-herdseer' || e === 'herdseer' || e === 'mirefang': return 'bm-shaman'
    case e === 'bloodbull' || e === 'gorehorn': return 'bm-bloodbull'
    case e === 'ironhoof' || e === 'korvash' || /^hoofrunner/.test(e): return 'bm-hoofrunner'
    case /^hornkin(-herds)?$/.test(e): return 'bm-hornkin'
    case /^lesserhorn/.test(e): return 'bm-lesserhorn'
    case /^greathorn/.test(e): return 'bm-greathorn'
    case /^minotaur/.test(e): return 'bm-minotaur'
    case e === 'harpies': return 'bm-harpy'
    case e === 'warhounds': return 'woc-hound'
    case /^razorboar-herds/.test(e): return 'bm-boar'
    case /chariot/.test(e): return 'og-boar-chariot'
    case /^(gazehorn|gorgemaw|gibberwyrm|cockatrice|peryton)/.test(e) || e === 'dominion-giant-' || e === 'thunderwyrm-elder-': return /giant/.test(e) ? 'og-giant' : /thunderwyrm-elder/.test(e) ? 'woc-thunderwyrm' : 'woc-monster'
    default: return null
  }
}

// (the token armies' own machines, with crews of their own army)
const CREW2 = { 'emp-rocket-battery': 'emp-artillery-crew', 'ren-mortar': 'emp-artillery-crew', 'ren-bombard': 'emp-artillery-crew', 'he-bolt-thrower': 'he-crew', 'gc-grand-cannon': 'gc-levy', 'gc-fire-rain': 'gc-levy', 'cd-bolt-thrower': 'cd-hobgoblin', 'cd-deathshrieker': 'cd-hobgoblin', 'cd-groundbreaker-mortar': 'cd-hobgoblin', 'cd-magma-cannon': 'cd-hobgoblin', 'de-reaper': 'de-warrior', 'sk-plagueclaw': 'sk-slave', 'sk-wyrd-lightning-cannon': 'sk-slave', 'tk-catapult': 'tk-skeleton', 'cd-bolt-thrower-on-50x50': 'cd-hobgoblin', 'cd-groundbreaker-mortar-on-25x25': 'cd-hobgoblin', 'cd-magma-cannon-on-50x100': 'cd-hobgoblin', 'ren-bombard-on-25x25': 'emp-artillery-crew', 'ren-organ-gun-on-50x50': 'emp-artillery-crew', 'sk-blightclaw-catapult-on-50x100': 'sk-slave', 'sk-wyrd-lightning-cannon-on-50x100': 'sk-slave' }
export const CREW = { ...CREW2, 'brt-trebuchet': 'brt-peasant-crew', 'emp-thunderclap': 'emp-artillery-crew', 'emp-great-cannon': 'emp-artillery-crew', 'emp-mortar': 'emp-artillery-crew', 'og-rock-chucka': 'og-nipper-crew', 'og-bolt-chucka': 'og-nipper-crew', 'ren-organ-gun': 'emp-artillery-crew', 'dw-flame-cannon': 'dw-crew', 'dw-nipper-hewer': 'dw-slayer', 'dw-anvil': 'dw-kingshammer', 'og-flung-nipper': 'og-nipper-crew' }

// The manifest key for one model of a unit, falling back from the role's own picture to the
// rank and file's, and from a missing standard/musician to the unit's plain picture.
export function spriteKey (unit, model, manifest, turn = null) {
  const fam = family(unit)
  if (!fam || !manifest) return null
  // (the Battle Pilgrims' Chalice Reliquary and a Chalice Monk have pictures of their own)
  if (model.role === 'reliquae' && manifest['dw-brt-reliquae']) return 'dw-brt-reliquae'
  if (model.role === 'monk' && manifest['dw-brt-chalice-monk']) return 'dw-brt-chalice-monk'
  // a Gobbler Minder among the Cave Gobblers (units.js: the model's own profile row)
  if (/gobbler minder/i.test(model.name || '') && manifest['dw-og-gobbler-minder']) return 'dw-og-gobbler-minder'
  // a Beast Pack's beasts (rules/beastPack.js), each in its own picture; the Keepers are the unit's own
  const beast = { 'Shadewood Hound': 'dw-we-hound', 'Forest Cat': 'dw-we-forest-cat', 'Sylvan Boar': 'dw-we-sylvan-boar', 'Bear of Lorne': 'dw-we-bear' }[model.name]
  if (beast && manifest[beast]) return beast
  const tries = [`dw-${fam}${ROLE_SUFFIX[model.role] || ''}`, `dw-${fam}`]
  // missile troops have no standard or musician picture; borrow the halberdiers'
  if (model.role === 'standard' || model.role === 'musician') tries.splice(1, 0, unit.army === 'kingdom-of-lyonne' ? `dw-brt-man-at-arms${ROLE_SUFFIX[model.role]}` : unit.army === 'broken-crowns' ? `dw-ren-sellsword-halberd${ROLE_SUFFIX[model.role]}` : unit.army === 'deephold-clans' ? `dw-dw-warrior${ROLE_SUFFIX[model.role]}` : unit.army === 'dominion-hosts' ? `dw-woc-warrior${ROLE_SUFFIX[model.role]}` : unit.army === 'hornkin-herds' ? `dw-bm-hornkin${ROLE_SUFFIX[model.role]}` : unit.army === 'gutlords' ? `dw-ok-bull${ROLE_SUFFIX[model.role]}` : unit.army === 'ilthari-realms' ? `dw-he-spearman${ROLE_SUFFIX[model.role]}` : `dw-emp-halberdier${ROLE_SUFFIX[model.role]}`)
  for (const k of tries) {
    const plain = k.replace(/^dw-/, '')
    if (manifest[k]) return mixed(k, unit, model, manifest, turn)
    if (manifest[plain]) return plain
  }
  return null
}

// THE MIX. A rank-and-file picture may come with extra looks, manifest keys '<key>-v1', '<key>-v2' ...
// Each model keeps the same look all game: it is picked by the model's place in its unit's list, which
// casualties do not reorder. Command models and characters always use their own picture.
function mixed (key, unit, model, manifest, turn = null) {
  if (model.role && model.role !== 'rank') return key
  // THE KIT: a
  // rank-and-file picture may come as '<key>-hand', '-shield', '-great', '-paired'; the one matching
  // what the unit was bought with is used, and its own mix after it.
  // Wild Rukka are a Rukka Mob bought with Warpaint:
  // '<key>-savage', and its own kits after it ('<key>-savage-shield'...)
  if (/warpaint/i.test((unit.options || []).join(', ')) && manifest[`${key}-savage`]) key = `${key}-savage`
  // a picture for the unit's own named weapon ('dw-sk-team-chatter-gun' for a Chatter Gun team)
  for (const w of String(unit.equipment || '').split(',')) {
    const slug = w.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (slug && manifest[`${key}-${slug}`]) { key = `${key}-${slug}`; break }
  }
  const kit = kitsOf(unit, model, turn).find(k => manifest[`${key}-${k}`])
  if (kit) key = `${key}-${kit}`
  let n = 0
  while (manifest[`${key}-v${n + 1}`]) n++
  if (!n) return key
  const i = Math.max(0, (unit.models || []).indexOf(model)) % (n + 1)
  return i === 0 ? key : `${key}-v${i}`
}

export function crewKey (unit, manifest) {
  const fam = family(unit)
  // (a Deephold war machine borrowing another army's picture keeps Deephold crew)
  const c = fam && (unit.army === 'deephold-clans' && !/^dw-nipper-hewer|^dw-anvil/.test(fam) ? 'dw-crew' : CREW[fam])
  if (!c || !manifest) return null
  return manifest[`dw-${c}`] ? `dw-${c}` : (manifest[c] ? c : null)
}

// THE KITS, by weapon and shield: hand weapon, spear, halberd, great weapon, ranged weapon, each with or
// without a shield. The pictures are '<key>-<weapon>' and '<key>-<weapon>-shield' (the shield held with a
// hand weapon or spear, slung on the back otherwise), the hand weapon + shield staying plain '-shield'.
// Candidates best first, ending with the older four-kit answer (kitOf) so armies drawn before keep theirs.
// A missile weapon only names the kit when the unit has no special combat weapon (javelins, throwing axes
// and bows drawn ready to loose).
// A weapon bought for SOME models (a per-model count: Trolls' great weapons, a Motley Crew's mix) is on the
// model as model.kit (units.js); shields bought that way go to the first unit.shieldCount models.
// WHICH PICTURE WORD a weapon name or id stands for: 'great', 'halberd', 'flail', 'spear', 'paired', 'ranged', else 'hand'.
function weaponWord (gear) {
  if (/great (weapon|axe|hammer)|two-handed/.test(gear)) return 'great'
  if (/halberd/.test(gear)) return 'halberd'
  if (/flail/.test(gear)) return 'flail'
  if (/spear|lance/.test(gear)) return 'spear'   // (a lance is the cavalry's spear picture)
  if (/additional hand weapon/.test(gear)) return 'paired'
  if (/bow|crossbow|handgun|javelin|throwing|sling|pistol|blunderbuss|repeater/.test(gear)) return 'ranged'
  return 'hand'
}

// THE CHOSEN WEAPON (a unit with more than one combat weapon picks one before it fights): the weapon id the engine recorded for
// this model in unit.status.weaponChoice, or null when there is none or it is from an earlier turn. `turn` is the
// engine's key for now, `${game.round}:${game.active}` (rules/weaponChoice.js turnKey); with no `turn` nothing is current.
// A model bought with its own kit (Motley Crew) uses the choice recorded for that kit, else the unit's.
export function chosenWeaponId (unit, model = null, turn = null) {
  const wc = unit.status?.weaponChoice
  if (!wc || turn == null || wc.turn !== turn) return null
  return (model?.kit && wc.kits?.[model.kit]) || wc.unit || null
}

// Does the chosen weapon let the model keep its shield? Asked of the engine, never decided here.
function keepsShieldWith (unit, model, id) {
  try {
    const charged = !!unit.status?.charged && !unit.status?.hesitated
    const o = combatWeaponChoices(unit, { charged, kit: model?.kit && unit.motley ? model.kit : null }).find(c => c.id === id)
    return o ? o.keepsShield : true
  } catch { return true }
}

export function kitsOf (unit, model = null, turn = null) {
  const chosen = chosenWeaponId(unit, model, turn)
  const bought = [unit.equipment, ...(unit.options || []), model?.kit].filter(Boolean).join(', ').toLowerCase()
  const gear = chosen ? chosen.toLowerCase() : bought
  const counted = unit.shieldCount && model && (unit.models || []).indexOf(model) < unit.shieldCount
  let shield = counted || /shield/.test([bought, unit.armour].filter(Boolean).join(', ').toLowerCase())
  if (chosen && shield && !keepsShieldWith(unit, model, chosen)) shield = false
  const w = weaponWord(gear)
  const out = w === 'hand' ? (shield ? ['shield'] : ['hand']) : (shield ? [`${w}-shield`, w] : [w])
  // a missile weapon carried as well as the melee one (Dark Riders: cavalry spears and repeater crossbows) falls back to the
  // unit's '-ranged' picture when it has no picture for the melee weapon
  if (!chosen && w !== 'ranged' && /bow|crossbow|handgun|javelin|throwing|sling|pistol|blunderbuss|repeater/.test(gear)) out.push(...(shield ? ['ranged-shield', 'ranged'] : ['ranged']))
  if (chosen) return out   // (the older four-kit answer describes what the unit was bought with, not what it fights with)
  const old = kitOf(unit)
  return out.includes(old) ? out : [...out, old]
}

// What a unit fights with, from what it was bought with (its equipment line and the options taken):
// 'great' a great weapon of any kind, 'paired' an additional hand weapon, 'shield' a hand weapon and a
// shield, otherwise 'hand'. Drawing only; the rules read the same words elsewhere.
export function kitOf (unit) {
  const words = [unit.equipment, unit.armour, ...(unit.options || [])].filter(Boolean).join(', ').toLowerCase()
  if (/great (weapon|axe|hammer)/.test(words)) return 'great'
  if (/additional hand weapon/.test(words)) return 'paired'
  if (/shield/.test(words)) return 'shield'
  return 'hand'
}
