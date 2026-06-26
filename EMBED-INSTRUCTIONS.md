# Bay Whale Strandings — Embed instructions

A short reference for partners embedding the Bay Whale Strandings
interactive map (`baywhales.org`) in an online article via `<iframe>`.

## Basic snippet

Paste this anywhere in the article body:

```html
<!-- Bay Whale Strandings — interactive embed -->
<iframe
  src="https://baywhales.org/embed"
  style="width: 100%; height: 640px; border: 0; max-width: 100%;"
  loading="lazy"
  title="Bay Whale Strandings — interactive map"
  allow="fullscreen"
></iframe>
```

That's it — no scripts to load, nothing to install. The iframe is
responsive (width: 100%) and will adapt to whatever column it sits in.

Readers land on the full Bay Area map with all 217 strandings. Below
the map, three featured stories invite deeper reading — clicking one
filters the data and surfaces an editorial caption. Closing the
caption (or clicking the active pill again) returns to the default
map.

If your article's framing leans hard into one specific story, you can
pre-open it by adding `?story=<slug>` to the iframe `src` (see
"Customizing the default story" below).

## Recommended sizing

| Surface | Height |
|---|---|
| Desktop / wide column | `640px` |
| Mobile / narrow column | `560px` |
| Acceptable range | `500–800px` |
| Hard floor | `480px` |

Width is always set by your article column (`width: 100%`). The embed
adapts to widths from `~320px` (small phone) up to any desktop column.

## What's in the embed

- The interactive map with all 217 strandings 2005–2025
- Species filter (All / Gray / Humpback / Fin / Other)
- Year timeline (right edge)
- A small "Showing X strandings" count that updates with the filter
- **Three featured story pills** below the map — clicking one filters
  the data, swaps map colors / pins as appropriate, and surfaces an
  editorial caption explaining what the reader is seeing. Closing the
  caption returns to the default map.
  - *Marin: monitored, not deadlier*
  - *Most causes aren't confirmed*
  - *Warm seas, more strandings*
- "Open full map ↗" button — opens `baywhales.org` in a new tab.
  Preserves the active story (if any) so context carries over.

What's intentionally *not* in the embed: the opening animation, the
large header, the full patterns rail (10+ stories), the advanced
filter drawer, the share button. Those live on the full site for
visitors who click "Open full map".

## Customizing the default story

By default the embed loads in explore mode (full map, no story
pre-selected). To pre-open a specific story on load, add `?story=<slug>`
to the iframe `src`:

```html
<iframe src="https://baywhales.org/embed?story=warm-seas" ...></iframe>
```

The three pills below the map remain visible regardless — readers can
always switch between them or close back to default. Slugs:

| Slug | Editorial framing |
|---|---|
| `marin-monitored` | "Where strandings appear may reflect where people are looking." |
| `cause-of-death-unknown` | "Most causes aren't confirmed." |
| `warm-seas` | "Stranding spikes follow marine heatwaves." |
| `gray-whales-bay` | Gray whales found a new stop |
| `spring-2025-cluster` | Spring 2025 spike |
| `industrial-corridor` | An industrial corridor |
| `spring-stranding-season` | Spring stranding peak |
| `humpbacks-following` | Humpbacks crossed in |
| `species-mix-narrowed` | Species mix has narrowed |

The first three render as pills in the embed; the rest are reachable
only via the URL param or from the full site.

## Behavior notes

- **Responsive.** The embed adapts down to ~320px wide; the species
  filter pills wrap, the caption shrinks, the timeline tightens
  against the right edge.
- **"Open full map" opens in a new tab.** Readers don't lose their
  place in your article.
- **Auto-resizes (optional).** If you use a library like
  [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer)
  on your side, the embed broadcasts its content height via
  `postMessage({ baywhales: { height: <px> } })`. With nothing on
  the host side, the fixed-height iframe works fine.
- **No cookies, no tracking pixels.** Vercel Web Analytics records
  anonymous pageviews (country, OS, browser) only.
- **Not indexed by search engines.** The embed page carries a
  `noindex,nofollow` meta tag so it doesn't compete with the main
  site in search results.

## Accessibility

The embed is keyboard-navigable (tab through species pills, year
labels, the "Open full map" link). Screen readers announce filter
state and pin counts. Map markers carry per-pin aria labels with
species + date + locality.

## Troubleshooting

- **Iframe shows a "refused to display in a frame" error.**
  Make sure the `src` is `/embed`, not `/`. The main site is
  same-origin-only; the `/embed` route explicitly allows cross-origin
  framing.
- **Pins or controls are clipped.**
  Increase the iframe `height`. Try `680px` if the caption is being
  cut off at the bottom.
- **Layout looks wrong only on Safari < 14.**
  The embed uses standard flex / grid / CSS variables — supported
  back to Safari 14 (Sept 2020). Older versions aren't supported.

## Contact

Issues or design feedback: [contact details — fill in].
Source code: [GitHub link if public].
