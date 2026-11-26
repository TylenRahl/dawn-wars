# Dawn Wars, Broken Past

A turn-based battle game of rank-and-file regiments for two players at one keyboard, played in the browser.
Blocks of infantry and cavalry, monsters, war machines and wizards manoeuvre on a table measured in inches, charge,
shoot, cast spells and fight in close combat until one side breaks and flees. Every result comes from six-sided dice.
The game measures, rolls and keeps the log, showing what was rolled and what was needed; you make every decision.
There is also a computer opponent.

Eighteen armies, each with its own units, magic items and rules: the Concord Realm, the Rukka Firms, the Kingdom
of Lyonne, the Broken Crowns, the Deephold Clans, the Dominion Hosts, the Hornkin Herds, the Gutlords, the Ilthari
Realms, the Lornefolk of Lorne Wood, the Vhar, the Bloodsworn Courts, the Sand Kings of Kheshet, the Gnawkin, the
Saurians of the Makers' Jungles, the Ashforged, the Jade Dominion of Shen and the Unmade.

## Run it

You need [Node.js](https://nodejs.org) 21 or newer.

```sh
npm install        # once: fetches PixiJS (drawing) and Vite (the local web server)
npm run dev        # starts the game at http://localhost:5175 — open that address in a browser
npm test           # runs the rules tests in the terminal (no browser needed)
npm run build      # makes a static copy in dist/ that any web host can serve
```

## The rules

The rules are in [`rules/core/`](rules/core/), one chapter per file, starting with
[`01-the-game-and-the-dice.md`](rules/core/01-the-game-and-the-dice.md). A short piece of background for each
army is in [`rules/armies/`](rules/armies/). The engine's charts are checked against these chapters by
`src/rules/rules.test.js`, so the book and the game cannot drift apart.

## The code

Plain JavaScript modules, no framework. For how the pieces fit together, read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). In short:

| Folder | What is in it |
|---|---|
| `src/rules/` | The rules engine: the turn, movement and charges, shooting, combat, breaking and fleeing, magic, war machines, each army's own rules, victory. No drawing; it runs in Node for the tests. |
| `src/data/` | The armies (units, points, options), weapons, spells and magic items. |
| `src/main.js`, `src/ui/` | The page: menu, army lists, battle setup, the battle screen and its panels. |
| `src/view/` | Drawing the table, the regiments, shots and spell effects. |
| `src/shared/` | Dice, music and small pieces shared by the screens. |
| `map-editor.html`, `src/mapEditor/` | The map editor: make and save your own maps. |
| `public/` | Pictures served as they are. |
| `sound_screen/` | Music. |

## Licences

- Code and pictures: MIT, see [LICENSE](LICENSE).
- Music: not included (the author's, all rights reserved); each `sound_screen/` folder's `TRACKS.md` says which file goes where. Every sound effect is synthesised and MIT. See [CREDITS.md](CREDITS.md).
- Fonts and npm packages: see [THIRD-PARTY.md](THIRD-PARTY.md).
- Read [DISCLAIMER.md](DISCLAIMER.md): this is an independent game. If you use or change it, what you do with it is
  your responsibility.
