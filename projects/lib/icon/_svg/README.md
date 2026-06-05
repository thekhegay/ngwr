# Icon SVG sources

## Layout

```
_svg/
├── *.svg                ← ngwr originals (tracked in git, drive the `icons/*.ts` exports)
├── _tags.json           ← tag metadata for the originals
│
├── lucide/              ← reference sets below — gitignored, fetch on demand
├── phosphor/{regular,fill}/
├── tabler/{outline,filled}/
└── heroicons/{24-outline,24-solid,20-solid,16-solid}/
```

## Reference sets

Reference SVGs from popular icon libraries, kept locally for redesign work.
Each subdirectory is **gitignored** so the repo stays lean (~48 MB total
otherwise). Re-fetch with `pnpm icons:fetch` (or by hand — see below).

| Set         | Style                        | Count | Source                                                    |
| ----------- | ---------------------------- | ----- | --------------------------------------------------------- |
| Lucide      | 24px stroke                  | 1714  | https://github.com/lucide-icons/lucide                    |
| Phosphor    | regular + fill weights       | 3024  | https://github.com/phosphor-icons/core                    |
| Tabler      | outline + filled             | 6146  | https://github.com/tabler/tabler-icons                    |
| Heroicons   | 24-outline / -solid, 20s, 16s | 1288  | https://github.com/tailwindlabs/heroicons                 |

### Re-fetch by hand

```bash
mkdir -p /tmp/_ngwr-icons-fetch && cd $_
git clone --depth=1 https://github.com/lucide-icons/lucide.git
git clone --depth=1 https://github.com/phosphor-icons/core.git phosphor
git clone --depth=1 https://github.com/tabler/tabler-icons.git tabler
git clone --depth=1 https://github.com/tailwindlabs/heroicons.git

# Back to repo root:
cd /path/to/ngwr/projects/lib/icon/_svg
mkdir -p lucide phosphor/{regular,fill} tabler/{outline,filled} \
         heroicons/{24-outline,24-solid,20-solid,16-solid}

cp /tmp/_ngwr-icons-fetch/lucide/icons/*.svg lucide/
cp /tmp/_ngwr-icons-fetch/phosphor/assets/regular/*.svg phosphor/regular/
cp /tmp/_ngwr-icons-fetch/phosphor/assets/fill/*.svg phosphor/fill/
cp /tmp/_ngwr-icons-fetch/tabler/icons/outline/*.svg tabler/outline/
cp /tmp/_ngwr-icons-fetch/tabler/icons/filled/*.svg tabler/filled/
cp /tmp/_ngwr-icons-fetch/heroicons/src/24/outline/*.svg heroicons/24-outline/
cp /tmp/_ngwr-icons-fetch/heroicons/src/24/solid/*.svg   heroicons/24-solid/
cp /tmp/_ngwr-icons-fetch/heroicons/src/20/solid/*.svg   heroicons/20-solid/
cp /tmp/_ngwr-icons-fetch/heroicons/src/16/solid/*.svg   heroicons/16-solid/

rm -rf /tmp/_ngwr-icons-fetch
```

## Licenses

| Set        | License    |
| ---------- | ---------- |
| Lucide     | ISC        |
| Phosphor   | MIT        |
| Tabler     | MIT        |
| Heroicons  | MIT        |

LICENSE files aren't committed — re-attach them if you redistribute originals
as-is. Redrawn icons are your own work and don't need attribution.
