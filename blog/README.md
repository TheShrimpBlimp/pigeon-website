# Blog mirror

`/blog/` renders the latest public submissions from u/theshrimpblimp via
`/api/blog`, using Reddit's Atom feed. It refreshes on page load and every
15 minutes while visible. No Reddit comments are imported. The feed is a recent
post mirror, not a complete historical archive; Reddit controls its length.

The domain Worker caches successful responses for up to seven days and refreshes
when requested after 15 minutes. If Reddit fails, it serves the cached feed;
without a cache it returns 503 and the page links to the profile. Reddit may block
Worker requests; live retrieval must be verified after deployment. Post HTML is
rendered with an element/URL allowlist and no imported scripts or event handlers.

Pages packaging includes the blog automatically. Deploy the domain Worker as
well as Pages when publishing this feature. No automatic publication is enabled.
