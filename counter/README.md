# PIGEON install counter

Cloudflare Worker + D1, used by the GitHub Pages site. `endpoint.txt` connects
both the homepage and completed-install reports during `scripts/prepare-pages.py`.

GET `/api/installs` returns `{ "total": 0 }`. POST increments the total.
Reports include reinstalls and retries; there is deliberately no duplicate protection.
This is a novelty, client-reported count, not a count of unique devices.
No sample data or device identifiers are stored by this Worker.

Deploy with Wrangler:

```
wrangler d1 execute pigeon-installs --remote --file counter/schema.sql --config counter/wrangler.json
wrangler deploy --config counter/wrangler.json
```

The schema is safe to reapply and preserves the current total. Credentials stay
in Wrangler's local authentication storage and must never be committed.

The emulator also uses `/api/trials`: one successful start per random ID stored
in the visitor's browser, with the ID and day in D1. This counts browser trials,
not unique people. Apply `../drizzle/0001_trials.sql` before deploying the Worker.
