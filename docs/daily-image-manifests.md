# Daily Image Manifests

The daily draw features can prefer local authorized image manifests before trying wiki or API image sources. Use the generic beauty manifest for large, good-looking image pools.

Hard target: every concrete draw item should have at least 200 images of its own. Do not use one mixed pool for multiple features or multiple items.

Put the files here:

```text
data/daily-beauty-images.json
data/bestdori-cards.json
data/daily-player-images.json
data/genshin-character-images.json
```

Recommended priority:

1. `data/daily-beauty-images.json`: all daily features, per-item pools, poster/card/splash/showcase images.
2. `data/bestdori-cards.json`: Mokoko/MyGO/Ave Mujica card art compatibility manifest.
3. `data/daily-player-images.json`: CS player compatibility manifest.
4. `data/genshin-character-images.json`: Genshin compatibility manifest.

Supported shape:

```json
{
  "cards": [
    {
      "kind": "player",
      "key": "donk",
      "nick": "donk",
      "name": "Danil Kryshkovets",
      "title": "Action poster 2026",
      "tags": ["poster", "action", "wallpaper"],
      "url": "https://example.com/donk-1.jpg"
    },
    {
      "kind": "genshin",
      "key": "hutao",
      "name": "Hu Tao",
      "title": "Official splash art set",
      "tags": ["splash", "artwork"],
      "urls": [
        "https://example.com/hutao-1.png",
        "https://example.com/hutao-2.png"
      ],
      "images": [
        "https://example.com/hutao-3.png"
      ]
    }
  ]
}
```

`url`, `urls`, and `images` can be mixed. The bot expands every URL into the daily image pool and removes duplicates.

Matching rules:

- `data/daily-beauty-images.json`: every image must use `kind` plus a concrete item identifier such as `key`, `name`, `nick`, `characterKey`, `characterName`, `weapon`, or `skin`.
- `data/bestdori-cards.json`: use `characterKey` such as `tomori`, `anon`, `rana`, `soyo`, `taki`, `uika`, `mutsumi`, `umiri`, `nyamu`, `sakiko`.
- `data/daily-player-images.json`: use `nick`, `name`, or `key`, for example `ZywOo`, `donk`, `NiKo`.
- `data/genshin-character-images.json`: use `key` or English `name`, for example `hu-tao`, `Hu Tao`, `Raiden Shogun`.

Supported `kind` values include:

```text
player, team, map, weapon, skin, role, loadout, utility, tactic, clutch, knife, mokoko, genshin, duel, fact, book, poem
```

For better output, put at least 200 good-looking images under each concrete item. For example, `kind=player + nick=donk` needs 200+ images, `kind=team + name=Vitality` needs 200+ images, and `kind=mokoko + characterKey=tomori` needs 200+ images. A single `kind=player` pool without an item identifier is not enough.

Prefer tags like `poster`, `action`, `wallpaper`, `card`, `splash`, `artwork`, `showcase`, `inspect`, `stage`, or `scene`. Avoid `headshot`, `avatar`, `profile`, and `portrait` unless there is no better image; those are demoted behind prettier images.

If multiple images match the same draw, the bot rotates up to 200 candidates by user, chat, and date. It does not use `all`, `daily`, or untagged generic records from `daily-beauty-images.json`, so images do not leak across features or items. If the item-specific beauty pool is missing or an image URL fails, the bot falls back to item-specific compatibility manifests, existing public wiki/API image sources, then to the local daily card image.

Use `/csplayer status` on the VPS to see the current draw's per-item beauty coverage, including whether each selected item has reached `200/200OK`.

This repo intentionally does not include a website crawler. Use images and URLs that you are authorized to store in these local manifest files.
