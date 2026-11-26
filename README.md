# Game Roulette

Game Roulette is an unofficial Millennium plugin for the Steam desktop library. Pick a Steam collection, then spin to choose a random game. Open the roulette using the dice icon next to Collections.

- Filter the collection to installed games, never-played games, or both. Soundtracks are excluded.
- Open the winning game's library page directly from the result.
- Customize spin sounds, the winner banner, and the small game icon in the plugin settings.
- Built-in theme support for Steam Enhanced, [SpaceTheme for Steam](https://steambrew.app/theme/zQndv1rI0FXLh3QTRgOL), and [Glass Dusk](https://steambrew.app/theme/0hs3xMU5Eb85uvIALzkq). The roulette adapts its styling automatically and also works with the default Steam theme. In Steam Enhanced, the dice icon sits in the game list header next to the library controls.
- With HLTB for Millennium installed and HLTB Support enabled, the result can show Main Story and 100% completion estimates. Estimates may be unavailable or take longer when they are not cached.

## Install from the release ZIP

1. Extract the `game-roulette` folder into the `millennium\plugins` folder inside your Steam installation. The default location on Windows is `C:\Program Files (x86)\Steam\millennium\plugins`.
2. In the extracted folder, check that `plugin.json` is next to the `.millennium` and `backend` folders.
3. Restart Steam. If needed, enable Game Roulette in Millennium's plugin settings.
4. Open the Steam desktop library and click the dice icon.

Millennium is required. Big Picture is outside the plugin's supported interface. HLTB for Millennium is optional.

## Data and credits

Game Roulette saves its settings locally. It may load artwork from Steam's CDN. When HLTB Support is enabled, Game Roulette passes the selected game's Steam App ID and display name to HLTB for Millennium, which can look up completion estimates from HowLongToBeat.

The bundled Germania One font is distributed under the SIL Open Font License. Its notices are included with the font.
