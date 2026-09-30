# Tank Atlas

Live application: https://tank-atlas-basar.bsrozr.chatgpt.site

Canonical source repository: https://github.com/basarozer/Tank-Atlas

This repository is dedicated to Tank Atlas. The application uses a server and a database, so GitHub Pages alone cannot run it; the live link above opens Tank Atlas directly.

Private refinery and tank inventory for Türkiye. Select a facility, zoom to satellite imagery, place tank markers, and record dimensions, roof type, stored product, supplied equipment, installation dates, notes, and HTTPS document links.

## Persistence and access

Records are stored in Cloudflare D1, not browser storage. Deployment is owner-private through ChatGPT sign-in. **Do not make the deployment public without adding application authorization.** Updates use record versions to reject concurrent overwrites. Failed saves retain the user's form. JSON export provides a data copy.

Seven approximate facility reference locations are included. No real tank tags, equipment claims, or tank coordinates have been fabricated; tank markers are added by the user. Satellite imagery is Esri World Imagery and street maps are OpenStreetMap. Imagery is not live. Google Maps opens separately. Documents are links, not uploads.

## Development

Node 22.13+; pnpm install; pnpm dev; pnpm build. Schema: db/schema.ts. Generate migrations with pnpm db:generate. Apply migrations before using the API. Hosting declares the DB logical binding. Credentials and production records are never committed.

## Location references

- https://mapcarta.com/W160400761 — Tüpraş İzmir
- https://mapcarta.com/W618579218 — STAR
- https://www.wikidata.org/wiki/Q6017970 — Tüpraş İzmit approximate center
- https://mapcarta.com/W16897131 — Tüpraş Kırıkkale
- https://mapcarta.com/W129693533 — Tüpraş Batman

Facility coordinates can be corrected in the editor. Map attribution remains visible.


## Facility symbols and additional location references

The approved refinery, petrochemical and storage artwork is bundled in public/icons/facility-symbols.png and displayed in the list, legend and map. Tank name placeholder: TK-555.

- Petkim: https://mapcarta.com/W618579217 (approximate industrial area center).
- STAD: https://cdnc.heyzine.com/files/uploaded/fde829c0e537b8c157ab47925782110441fc89c0.pdf (SOCAR Akaryakıt Depolama İskelesi, 38°46′21″ N, 26°55′42″ E). This is a pier reference, not a verified tank-farm centroid; edit the facility coordinates to refine it.

The tank editor has explicit viewport positioning and separate layers for its backdrop, form and confirmation dialogs, including mobile browsers. Map placement precedes opening the form.
