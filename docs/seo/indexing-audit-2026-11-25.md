# GO ELEC indexing audit — 25 November 2026

Scope: GSC's 403 indexed / 273 excluded snapshot, public server-rendered HTML,
current published catalogue (read only), sitemap and internal links. No database,
prices, product records, visible design, checkout or authentication changes.

## Findings and decisions

| GSC issue | Evidence | Action |
| --- | --- | --- |
| 254 duplicates without user canonical | All 254 examples read: 181 authentication URLs, 9 search/filter URLs, 33 categories, 27 products, 3 information pages, 1 protected quote page. | Allow the public sign-in/up forms through robots.txt so Google can read their existing noindex. Preserve search/filter noindex and quote protection. Legitimate sitemap pages already have correct self-canonicals; no blanket noindex or canonical replacement. |
| 9 Google-selected canonical conflicts | Individual Google URL inspections distinguish historical results from current state; see table below. | Preserve correct www canonicals, permanent apex redirect, sitemap and www internal links. Do not canonicalize different real products to one another. |
| 5 missing URLs | Three historical category paths have exact current category counterparts. The two malformed paths have no counterpart. No incoming broken links to these five paths were found in the 539-page crawl. | Three explicit 301s preserving query strings; keep `/$` and `/&` as genuine 404s. |
| 5 crawled/not indexed products | Four are already indexed in current individual inspection. Only the Millenium poussoir remains crawled/not indexed. | Factual unique metadata for the five specifically requested products, guarded by slug AND SKU. Product schema descriptions are plain text; real manufacturer references and visible breadcrumb links are represented in structured data. No fabricated ratings, stock or specifications. |

Google's overview is an older snapshot (displayed last update 16 November); individual
inspection contains later crawl records. The overview counts must not be reported as
an immediately current or immediately fixable total.

## Nine canonical inspections

All nine live www URLs return 200 with a self-referencing www canonical. Google
inspection results during this audit:

| Path | Current Google inspection |
| --- | --- |
| `/produit/dvr-hikvision-8-canaux-4k-ds-7208hthi-k1` | Indexed; inspected www URL selected; crawl 20 Nov |
| `/produit/cable-electrique-u-1000-r2v-2x16-m-b-nexans-prix-au-metre` | Inspected www URL selected; crawl 24 Nov |
| `/categorie/cables-fils` | Indexed; inspected www URL selected; crawl 19 Nov |
| `/categorie/outillage` | Indexed; inspected www URL selected; crawl 19 Nov |
| `/informations/paiement` | Indexed; inspected www URL selected; crawl 19 Nov |
| `/produit/moulure-20x10-auto-adhesif-2m` | Historical Google canonical is identical path on non-www; crawl 9 Nov |
| `/produit/chargeur-usb-simple` | Historical Google canonical is identical path on non-www; crawl 8 Nov |
| `/produit/dvr-hikvision-4-canaux-4k-ds-7204hthi-k1` | Google canonical remains identical path on non-www; crawl 23 Nov |
| `/produit/switch-gigabit-poe-smart-16-ports-hikvision-ds-3e1518p-si` | Historical Google canonical is identical path on non-www; crawl 3 Nov |

The four non-www selections require Google's recrawl/consolidation, not another
conflicting canonical tag. Live apex redirects were verified independently.

Some individual inspections report a temporary sitemap processing error; one has a
historical HTTPS warning. Public HTTPS, sitemap XML and all listed URLs succeeded in
this audit. These GSC diagnostics need monitoring; this audit does not claim their
historical warnings have disappeared.

## Verified 301 replacements

| Old path | Replacement path |
| --- | --- |
| `/categorie/multiprise-enrouleur` | `/categorie/materiel-electrique/multiprise-enrouleur` |
| `/categorie/eclairage/exterieur/poteau-jardin` | `/categorie/eclairage/exterieur/poteau` |
| `/categorie/eclairage/exterieur/applique-jardin` | `/categorie/eclairage/exterieur/applique-ext` |

The first two current categories are empty but are the exact existing category
successors. No invented products or unrelated homepage redirects were introduced.

## Five products: verified metadata

The site appends ` | GO ELEC` to each normal HTML title. Existing social product
names, photos, sharing handlers and canonical URLs remain unchanged. Editorial
meta descriptions also provide consistent social/schema descriptions.

| Product path suffix | New title (before site suffix) | Source |
| --- | --- | --- |
| `lazer-magnetique-12w` | Module LED Lazer magnétique 12 W GS1020 | Published name, SKU GS1020, description identifies rail magnétique; deliberately omit speculative voltage/colour claims in source copy |
| `panel-led-rond-encastre-36w-ajustable` | Panel LED rond encastré 36 W ajustable Goled GOLED5301 | Published name, Goled brand, SKU GOLED5301 |
| `hager-interrupteur-differentiel-sanvis-63a-30ma-type-a-auto-230v-cds765f` | Hager CDS765F : interrupteur différentiel 63 A 30 mA type A | Published name/reference and description; 230 V / 2 modules verified; omit contradictory connection claims |
| `moniteur-7-cdv-70h2-silver` | Moniteur vidéo Commax CDV-70H2 Silver 7 pouces | Published name, Commax brand and hands-free colour monitor description |
| `poussoir-a-bascule-lumineux-led-millenium` | Poussoir à bascule lumineux LED LAP Millenium 10928 | Published LAP brand, reference and LED locator description |

Exact descriptions are versioned in `lib/product-indexing-seo.js`.
Existing visible product descriptions are preserved, not rewritten in the database.
Internal links are already server-rendered: the five products respectively have
75, 8, 15, 13 and 4 incoming links in the audited sitemap pages, including real
parent/leaf category listings. No orphan-page problem was found and no artificial
link block was added. Breadcrumb structured data matches existing visible links.

## Sitemap and crawl audit

539 unique sitemap URLs: 401 products, 125 categories, 11 information pages,
one brand page and homepage. All returned 200 with matching www self-canonicals;
none had noindex. XML parsed successfully. No query-string URLs, non-www URLs,
duplicate entries, protected quote/auth/search/cart/account pages or the six empty
Domotique URLs were present. Sitemap logic therefore needs no speculative rewrite.
Across 539 sitemap pages, all 22,849 observed same-site link occurrences used www.
No other missing public content path was discovered in those links; additional
paths are existing utility/auth pages or noindexed Domotique.

The audit does not establish that every empty category deserves indexing. Generic
empty-category/content policy and incomplete legal/business information require
separate editorial decisions; no invented content or blanket indexation change is
included here.

## Domain behavior verified

| Request | First response | Destination |
| --- | --- | --- |
| HTTP apex | 301 | Same apex path/query on HTTPS, followed by the existing 308 to www |
| HTTP www | 301 | Same www path/query on HTTPS |
| HTTPS apex | 308 | Same path/query on `https://www.goelec.ma` |
| HTTPS www | 200 | Canonical storefront |

Path/query preservation tested with a real product URL and repeated query keys in
regression tests. No internal port is emitted. No deployment/server configuration
change is needed.

## Validation and remaining work

TypeScript, ESLint, production webpack build and the full repository test suite
passed: 183 passed, zero failed, 9 environment-dependent integration tests skipped.
Local production HTML verifies all five titles/descriptions, clean canonicals,
Product + BreadcrumbList JSON-LD and real manufacturer references. Authentication,
search, cart and favourites remain noindex, follow. Regression tests cover robots
longest-rule precedence, the three exact 301s, unchanged unknown/malformed paths,
SKU guards and product social/canonical continuity.

Deployment/live verification is reported separately after the authorized push.
Indexing and Google's canonical choice cannot be guaranteed by deployment. Recheck
GSC after recrawl, especially the four non-www selections and Millenium poussoir.
Do not request indexing of login/search/utility URLs or mark all 273 exclusions as
commercial pages to index.

Reference: Google requires crawling for noindex to be processed:
https://developers.google.com/search/docs/crawling-indexing/block-indexing
Robots rule specificity:
https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
