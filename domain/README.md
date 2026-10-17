# Custom domain

https://theshrimpblimp.com/pigeon/ serves the GitHub Pages release through a
Cloudflare Worker. Site updates still deploy through the existing Pages workflow;
this Worker maps `/pigeon/` to `/pigeon-website/`, including tools, font files,
firmware downloads and service workers. `/pigeon` redirects to `/pigeon/`.
The root `/` serves the personal homepage from `home/index.html`; its stylesheet
and portrait are under `/home/`. PIGEON stays at `/pigeon/`. Other paths return 404.

Edit homepage source in `home/`. The Pages preparation script copies it into the
release output. Publishing a routing change also requires deploying this Worker.

Deploy routing changes with:

```
wrangler deploy --config domain/wrangler.json
```

Cloudflare manages the custom-domain DNS and HTTPS certificate. The counter
remains its separate Worker and already allows the theshrimpblimp.com origin.

## Neutral acknowledgement gate

`gate-page.js` contains the page source: **whats up** and **acknowledge**.
`gate.js` gates requests Cloudflare geolocates to Israel (`IL`) or Hong Kong
(`HK`), then returns visitors to their original page after acknowledgement.
A signed Secure/HttpOnly/SameSite cookie remembers the action for one year.
Other countries bypass the gate. The gate's font file is allowed before entry.

The gate does not read, hash or store visitor IP addresses, record visits, or
count acknowledgements. Its cookie only remembers acknowledgement; there is no
server-side visitor record. Hosting-provider logs are configured separately.

Before publishing, configure a stable private secret:

```sh
openssl rand -hex 32 | wrangler secret put GATE_SECRET --config domain/wrangler.json
wrangler deploy --config domain/wrangler.json
```

Rotating the secret invalidates acknowledgement cookies. Missing configuration returns 503 for gated requests. This applies to
the custom domain; public mirrors and existing offline caches remain separate.
Run focused tests with `node domain/test-gate.mjs`.
