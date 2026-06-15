# Bestdori Card Manifest

`/mokoko` and `每日木柜子` prefer this authorized Bestdori game card manifest before generic daily beauty pools.

Put the manifest at:

```text
data/bestdori-cards.json
```

Supported shape:

```json
{
  "cards": [
    {
      "characterKey": "tomori",
      "characterName": "Takamatsu Tomori",
      "title": "Card title",
      "url": "https://example.com/card-image.png"
    },
    {
      "characterKey": "tomori",
      "characterName": "Takamatsu Tomori",
      "title": "Batch card set",
      "urls": [
        "https://example.com/card-image-1.png",
        "https://example.com/card-image-2.png"
      ],
      "images": [
        "https://example.com/card-image-3.png"
      ]
    },
    {
      "characterKey": "tomori",
      "characterName": "Takamatsu Tomori",
      "title": "Local authorized Bestdori card pack",
      "dirs": [
        "../authorized-images/bestdori/tomori"
      ],
      "files": [
        "../authorized-images/bestdori/tomori/card-001.png"
      ]
    }
  ]
}
```

`url`, `urls`, and `images` can be mixed for HTTP(S), `data:image/...`, or `base64://` image sources. `file`, `files`, `path`, and `paths` can point at local image files. `dir`, `dirs`, `directory`, `directories`, `imageDir`, and `imageDirs` can point at local folders; the bot recursively expands `.jpg`, `.jpeg`, `.png`, `.webp`, and `.gif` files and removes duplicates.

Relative local paths are resolved from the manifest file location. For example, `data/bestdori-cards.json` with `dirs: ["../authorized-images/bestdori/tomori"]` reads `authorized-images/bestdori/tomori` under the repo root. The bot converts local images to base64 when sending, so NapCat does not need direct access to the same host path.

The bot matches `characterKey` first. Known keys:

```text
tomori, anon, rana, soyo, taki, uika, mutsumi, umiri, nyamu, sakiko
```

If multiple cards match the same character, the daily draw rotates through those images by user, chat, and date. If the manifest is missing or an image URL/path fails, the bot falls back to the per-character daily beauty pool, then Bandori Wiki page images, then the local daily card.

For CS player and Genshin character manifests, see [daily-image-manifests.md](daily-image-manifests.md).

## Generate From Bestdori

You can generate this manifest from Bestdori's public card metadata:

```bash
npm run daily:image:bestdori:write
```

The generator reads Bestdori cards/characters API, probes candidate `card_normal` and trained card PNG URLs, and writes only URLs that respond as images. Current Bestdori metadata covers MyGO!!!!! character IDs 36-40, so those game card images can be generated automatically. Ave Mujica entries stay at zero until Bestdori exposes matching character IDs/cards or you add authorized local card packs manually.

Useful variants:

```bash
npm run daily:image:bestdori -- --stdout
node scripts/build-bestdori-card-manifest.js --write data/bestdori-cards.json --include-trim
```
