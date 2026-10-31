# Cape Cod Pack & Ship website

The new website for Cape Cod Pack & Ship, 850 Main St, Unit 3, Falmouth MA. It's a rebuild of the old Wix site
(capecodpackandship.com).

- **Preview (unlisted):** https://robobandit.com/ccps/ is not linked from anywhere, and every page carries `noindex`,
  so search engines leave it out.
- **Plain files, no build step, nothing to slow it down:** no web fonts (system fonts), no frameworks, and the Google
  Map only loads when a visitor scrolls down to it. Any static host works: GitHub Pages, Netlify, Cloudflare Pages.

| File | What it is |
| --- | --- |
| `index.html` | The whole site: one page, with its little script at the bottom |
| `site.css` | The look (colors are at the top: navy from the Cape Cod logo, raspberry from the awning) |
| `favicon.svg`, `favicon-32.png` | Browser tab icon: the box riding a wave |
| `apple-touch-icon.png`, `img/icon-192.png`, `img/icon-512.png`, `site.webmanifest` | Home screen icons for iPhone and Android |
| `img/logo.svg` | The logo with the name, for print, email signatures and social profiles |
| `img/share.jpg` | The 1200×630 picture that shows when the link is texted or posted (Open Graph / Twitter tags in `<head>`) |

## Updating it with AI

Ask for the change in plain words, e.g. "change Friday's hours to 9 to 3", "show a notice that we're closed Monday
for the storm" or "add notary service". The places to know:

| What | Where |
| --- | --- |
| Hours | The table in the hero (`table.hours`), the Visit list, the JSON-LD block in `<head>`, and `OPEN`/`CLOSE` in the script at the bottom (it drives "Open now / Closed now") |
| Pickup times | The `#pickups` line under the hours, the carrier cards, and `PICKUPS` in the script (it drives the "next pickup in …" countdown) |
| Holiday / storm notice | `<div class="notice" hidden>` at the top: write the message and remove `hidden` |
| Phone, fax, email | Search for `508-540-1900`, `508-540-4300` and `capecodpackandship@gmail.com` (also `EMAIL` in the script, used by the quote form) |
| Prices | Copies (10¢), local delivery ($70/hr): in the Copies and Packing sections |

After a change to `site.css`, bump the `?v=` on its link so browsers fetch the new copy (in the RoboBandit repo,
`node tools/bump-version.js` does it for every page).

## Still to do

- **More photos.** The storefront, the packed painting, the supplies wall and the card racks are in `img/` (from the
  old site, small: about 455 px). Bigger originals and a few more (a custom crate, the counter, seafood coolers)
  would make it look even better.
- **Confirmed by Andrew (Oct 2026):** hours Mon–Fri 9–5, closed weekends; pickups FedEx 3:00 pm, UPS 4:00 pm; no
  notary yet (he may add it); no live chat. Still to come: his photos, and Facebook and LinkedIn pages to link.
- **Going live:** in a new repo, delete the "Preview of the new…" bar and the `noindex` meta tag, change the
  `robobandit.com/ccps/` addresses in `<head>` (og:url, og:image, twitter:image, JSON-LD) to the real domain, add a
  `CNAME` file with the domain, and point capecodpackandship.com's DNS at the new host.

## Moving to its own repo

Copy everything in this folder to the root of the new repository. Every link is relative, so nothing else needs
to change.
