# MAGIECHEM® Field Assistant

| File | What it is |
|---|---|
| `reference-confirmation.html` | Design reference division (Apple / MAPEI / Fiverr + four approved additional references), product strategy, information architecture, user journeys, design system, build record. |
| `prototype.html` | The functional prototype. 18 screens, one state store, a data-driven calculation engine. |
| `prototype.test.js` | 74 Playwright checks over flows A–D, tab behaviour, state preservation, composition, French layout and screen overflow. |

## Running the tests

```
npm i playwright
node -e "const fs=require('fs');fs.writeFileSync('/tmp/proto.html','<!doctype html><html><head><meta charset=utf-8></head><body>'+fs.readFileSync('docs/magiechem/prototype.html','utf8')+'</body></html>')"
SP=/tmp node docs/magiechem/prototype.test.js
```

## Replacing the demo data with real TDS values

All product data lives in the `PRODUCTS` array at the top of `prototype.html`.
No screen reads anything else, so real values drop in without a UI change.

```js
{ id:'9461', number:'9461', name:'…', family:'epoxy', tag:'Epoxy · Flooring',
  blurb:'…', uses:['…'],
  spec:{ mixRatio, wft, coverage, workingTime, recoat, packaging, voc },  // displayed verbatim
  calc:{ method, wft|coverage|rate, coats, pack:{size, unit, label} } }   // drives the engine
```

`spec` is what the app shows. `calc` is what it computes with — they are separate on
purpose, so a published coverage figure and the rule used to calculate can differ
where the TDS says they should.

### Calculation methods

| `method` | Formula | Used for |
|---|---|---|
| `wft` | `gal = area × WFT_mils × coats ÷ 1604` | anything specified by wet film thickness |
| `coverage` | `gal = area × coats ÷ coverage_ft²_per_gal` | anything with a published ft²/gal |
| `broadcast` | `lb = area × rate_lb_per_ft² × coats` | flake, quartz, silica |
| `spread` | `lb = area × rate_lb_per_ft² × coats` | cementitious urethane, slurries |
| `ratio` | `lb = gal(basis layer) × rate_lb_per_gal` | aggregate blended into a resin |

`1604` is the ft² one US gallon covers at 1 mil **wet**. There is no solids term
anywhere in the engine — MAGIECHEM® specifies WFT, not DFT.

Adding a method means adding a case to `computeLine()` and a key to the product
record. A system layer may override the product's rule (`layers[].over`), and
Advanced Settings overrides both (`state.calc.overrides`).

### Finish imagery and the colour charts

Coating finishes are painted on `<canvas>` by `paintFinish()` from the
`COLOURWAYS` table — flake chips, quartz grains, cementitious mottling,
pigmented gloss. Nothing is fetched, so the imagery costs no network and
scales to any density.

`COLOURWAYS` is a placeholder for the MAGIECHEM® colour, quartz and flake
charts. Replacing it is a data edit:

```js
COLOURWAYS.flake = [ {n:'<chart name>', base:'#RRGGBB', chips:['#…','#…','#…']} , … ]
```

Every system carries a `finish` key; `sysArt()` derives a stable colourway
per system so two smooth systems never look identical. To use photography
instead, swap `art()` for an `<img>` — artifact assets can host the files.

### Strings

`STR.en` / `STR.fr` hold the interface strings. `ROLE_FR` holds layer role names
until MAGIECHEM® supplies them bilingually; `roleName()` is the single read point.
