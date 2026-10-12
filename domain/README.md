# Custom domain

https://theshrimpblimp.com/pigeon/ serves the GitHub Pages release through a
Cloudflare Worker. Site updates still deploy through the existing Pages workflow;
this Worker maps `/pigeon/` to `/pigeon-website/`, including tools, font files,
firmware downloads and service workers. `/pigeon` redirects to `/pigeon/`.
Other paths return 404 and are reserved for future website content.

Deploy routing changes with:

```
wrangler deploy --config domain/wrangler.json
```

Cloudflare manages the custom-domain DNS and HTTPS certificate. The counter
remains its separate Worker and already allows the theshrimpblimp.com origin.
