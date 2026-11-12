# Ghar Jabo

> It's 6:30 PM in Salt Lake Sector V, Kolkata. Get home. Everything will go wrong.

A phone-first 3D browser game: run out of the college gate, chase moving buses and hang off the footboard,
book a bike taxi that cancels on you, shove into the Green Line metro, and try to reach Sealdah before 10:30 PM.
Every run ends on a newspaper front page you can share.

Built with Vite, TypeScript and three.js. The streets are real, generated from OpenStreetMap.

## Run it

```sh
npm install
npm run dev        # local dev server
npm run build      # production build in dist/
npm run check      # everything: types, lint, tests, build, size, browser smoke tests
```

Controls: on a phone, drag the left side to run and use the buttons on the right. On a laptop: WASD to run,
Space to jump, E to hop on/off, P for the bike-taxi app, M to mute.

## Project docs

- `AGENTS.md`: rules and commands for anyone (human or agent) working on the code.
- `docs/PROPOSAL.md`: stack, folder structure, principles and tests. `docs/WORKFLOW.md`: how we work. `docs/tasks/BACKLOG.md`: what is next.
- `DESIGN.md`: the game design.
- `research/`: playtest notes on similar games, framework research, map and sound research.
- `tools/build-map.py`: turns OpenStreetMap extracts into `src/data/sectorv.json`.

## Credits

**Map data** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the
Open Database License (ODbL).

**Sounds** (the clips the game ships are in `public/sounds/`; the traffic, crow and rain beds are trimmed and
re-cut as seamless loops. Sources are in `research/sounds/shippable/`, see `research/sounds/SOUNDS.md` for the full
list; the tram bell and metro door sounds are synthesised):

- Calcutta traffic horns and rain: TRP, freesound.org/s/576484 and /576486 (CC0)
- Rain on a tin shed, Kolkata: Sukanta Majumdar, radio aporee / archive.org (Public Domain Mark)
- Rain on a fibre roof, Kolkata: Sagnik_Basu, freesound.org/s/398581 (CC0)
- Shankh: rsn267, freesound.org/s/746592 (CC0)
- Conch: David Bolton, Wikimedia Commons (CC BY 2.5)
- Kolkata hawker call and fish hawker: rain+, freesound.org/s/608765 and /548482 (CC BY 4.0)
- House crows of Calcutta: Calcuttan, freesound.org/s/249567 (CC0)
- Dhaak (Durga Puja drums): AnneshaGhosh, freesound.org/s/592301 (CC BY 4.0)
- Central Kolkata street ambience: Jean-François Cavro, radio aporee / archive.org (Public Domain Mark)
- Musical bus horn: SoundEnsemble, freesound.org/s/508540 (CC0)
- Spoken Bangla place names: Titodutta, Lingua Libre / Wikimedia Commons (CC0); the conductor's "Sealdah ×3"
  placeholder is cut from the same recording
<!-- Voice lines (docs/VOICE.md): add "Voice lines: Adarsh" here with the first real file in public/sounds/voice/. -->

Brand names in the game are parodies. It is not affiliated with any company, transport operator or app.
