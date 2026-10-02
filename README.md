# Tank Atlas

Live application: https://tank-atlas-basar.bsrozr.chatgpt.site

Canonical source repository: https://github.com/basarozer/Tank-Atlas

This repository is dedicated to Tank Atlas. The application uses a server and a database, so GitHub Pages alone cannot run it; the live link above opens Tank Atlas directly.

Private refinery and tank inventory for Türkiye. Select a facility, zoom to satellite imagery, place tank markers, and record dimensions, roof type, stored product, multiple company products with individual delivery dates, permanent dated notes, and HTTPS document links.

## Persistence and access

Records are stored in Cloudflare D1, not browser storage. Deployment is owner-private through ChatGPT sign-in. **Do not make the deployment public without adding application authorization.** Updates use record versions to reject concurrent overwrites. Failed saves retain the user's form. Excel export reads the latest server data and provides a re-importable .xlsx copy.

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

## Excel and inventory workflow

- **Import Excel → Download Excel Template** provides Tanks, Company Products and Notes sheets, with instructions and existing facility names/IDs. Upload `.xlsx`, review the preview, then Confirm Import.
- Tanks match by ID or facility + tank name. Choose Update or Skip. Blank cells preserve existing values. Imports never remove products or notes. Limits: 5 MB, 1,000 tank changes and 2,000 notes per import.
- Use one Company Products row per product. Preserve Product ID for updates. Without an ID, a unique product name matches within a tank. Each product has its own delivery date and project/PO reference.
- Tanks without coordinates remain in the list. Open the tank and choose **Set Location on Map** to place it.
- Fixed Roof / Cover Type and Floating Roof Type are independent. External Floating Roof is incompatible with a known fixed roof. Other stored products require a description.
- New notes receive a server timestamp and authenticated author; manual note dates use Türkiye time. Imported Note Date may be historical or blank (unknown), but the recorded timestamp and importer are assigned by the server. Existing note IDs cannot be overwritten. Notes without IDs are deduplicated by tank, supplied date and text.
- Notes are protected by database triggers against update/deletion. Tanks with note history cannot be deleted. Correct a note by appending another note.
- Previous installation dates, roof descriptions and notes are retained read-only. Installation dates are not converted to delivery dates. An old generic Fixed Roof value is retained for reference while column status remains Unknown.
- Import writes use a single database batch. A concurrent edit or duplicate rolls the batch back. No partial import is reported as success.

Validation: `node scripts/test-inventory.mjs` checks Excel round trips, sparse updates, skips, unlocated tanks, multiple deliveries, legacy preservation, note immutability, invalid dates and atomic conflict rollback. Run `pnpm exec tsc --noEmit` and `pnpm build` as well. Tests use synthetic records in an in-memory SQLite database; they do not modify production data.
