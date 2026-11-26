# Decisions

The owner's decisions about this project, newest first. A decision that belongs to another doc,
such as a ruling in `docs/automa.md` or a screen in `docs/design.md`, lives there instead.

## 2026-11-26 · Stay with Sail Solitaire; no second variant

> Ok, then we continue with solitaire.

Compared with Mitch Fisher's Solo SAIL ("Persona" rules, v1.0.0, March 2026, BGG file 444697):
Sail Solitaire keeps the Bosun's hand hidden, needs nothing beyond the box and is complete as
written, while Solo SAIL shows the persona's whole hand each deal, needs a die and leaves about six
gaps. Its extra-reveal difficulty dial and colour stacks were the ideas worth keeping in mind. The
app runs Sail Solitaire only.

## 2026-11-25 · Scenarios come from the Scenario Book, picked before the start

> Added scenarios PDF - we might need to add it to the game (selector before the start)

`docs/reference/sail-scenarios.pdf` holds the Learning scenario and scenarios 1 to 5. New voyage
picks one of the six; setup lists its tokens, and the storm checks name its storm columns (only
one storm in the Learning scenario). The design's scenario chips, drawn as 1 to 6, become
Learning and 1 to 5.

## 2026-11-25 · The Kraken track is 3, 3, 4, 5, skull

> it's 3-3-4-5-skull

The owner checked the box: the Kraken board's spaces from the start are 3, 3, 4, 5, then the skull.
The design drew 3, 4, 5, skull; the HUD's dial and the round-end texts change with it.

## 2026-11-25 · Chuck Rosselli agreed; credit him

> Already asked, he's fine

The owner asked the author of Sail Solitaire before building on it. The app, the landing page and
the README credit him as its author.

## 2026-11-25 · The wordmark is BOSUN in every language

> BOSUN everywhere (Recommended)

The lockup says BOSUN everywhere; sentences translate the persona (Contramaestre, Bootsmann,
Боцман).

## 2026-11-25 · The source PDFs are committed

> keep them in repo and update companion rule - there's no harm in keeping rules

The rulebooks (EN, RU), the Scenario Book and Sail Solitaire live in `docs/reference/`, committed,
with no release and no download command. The companion and public layers changed to match in
asilachev/agent-app-boilerplate#11.

## 2026-11-25 · No official art

> None, ours only (Recommended)

Every picture is our own drawing: the K3+ kit in the design (wooden pieces, stamp symbols, sketch
sea). Allplay and the designers get credit in text, and the landing page links allplay.com and
BoardGameGeek.

## 2026-11-25 · Addresses: bosun.silachev.com

> bosun.silachev.com

The landing page is `bosun.silachev.com` on GitHub Pages; the app is `app.bosun.silachev.com` on
Vercel. The repo stays `asilachev/sail-automa`.

## 2026-11-25 · The same setup as Thanos

> Same as Thanos (Recommended)

- Public repo; MIT for the code (not the game, its rules and art, or the fonts).
- Autonomy `ship`: issue, branch, PR, squash-merge, built in parallel streams. Footprint `full`.
- Layers: core, design, public, languages, pwa, companion.
- Hosting: the Docker image on GHCR, Vercel for the app, GitHub Pages for the landing page.
- Analytics: only Vercel Web Analytics, cookieless page views, compiled into Vercel builds only.
- The landing page links the app. No app links posted on BoardGameGeek. Announcements are
  drafted for the owner, who posts them, and say the translations are mostly AI.
