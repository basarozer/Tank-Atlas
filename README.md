# Tank Atlas

Live application: https://tank-atlas-basar.bsrozr.chatgpt.site

Canonical source repository: https://github.com/basarozer/Tank-Atlas

This repository is dedicated to Tank Atlas. The application uses a server and a database, so GitHub Pages alone cannot run it; the live link above opens Tank Atlas directly.

Private refinery and tank inventory for Türkiye. Select a facility, zoom to satellite imagery, place tank markers, and record dimensions, roof type, stored product, supplied equipment, installation dates, notes, and HTTPS document links.

## Persistence and access

Records are stored in Cloudflare D1, not browser storage. Deployment is owner-private through ChatGPT sign-in. **Do not make the deployment public without adding application authorization.** Updates use record versions to reject concurrent overwrites. Failed saves retain the user's form. JSON export provides a data copy.

Five approximate facility centers are included. No real tank tags, equipment claims, or tank coordinates have been fabricated; tank markers are added by the user. Satellite imagery is Esri World Imagery and street maps are OpenStreetMap. Imagery is not live. Google Maps opens separately. Documents are links, not uploads.

## Development

Node 22.13+; pnpm install; pnpm dev; pnpm build. Schema: db/schema.ts. Generate migrations with pnpm db:generate. Apply migrations before using the API. Hosting declares the DB logical binding. Credentials and production records are never committed.

## Location references

- https://mapcarta.com/W160400761 — Tüpraş İzmir
- https://mapcarta.com/W618579218 — STAR
- https://www.wikidata.org/wiki/Q6017970 — Tüpraş İzmit approximate center
- https://mapcarta.com/W16897131 — Tüpraş Kırıkkale
- https://mapcarta.com/W129693533 — Tüpraş Batman

Facility coordinates can be corrected in the editor. Map attribution remains visible.
