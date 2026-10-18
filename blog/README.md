# Captain’s Log

The public log lives at `/blog/`; its writing desk is `/admin/`.
Posts are stored in D1. There is no Reddit dependency or automatic sync.
The admin supports creating, editing, dating and deleting entries; text is
rendered literally with paragraph breaks and clickable HTTP(S) links.

## First-time setup

From this site directory:

```
wrangler d1 execute pigeon-installs --remote --file domain/blog-schema.sql --config domain/wrangler.json
wrangler secret put BLOG_ADMIN_PASSWORD --config domain/wrangler.json
```

Enter a strong unique password at the interactive secret prompt. Never put it
in source control or frontend code. Then deploy Pages and the domain Worker.
Sign in at `/admin/`. Sessions expire after 24 hours; changing the password
invalidates existing sessions. A signed HttpOnly/Secure/SameSite cookie protects
writes; same-origin checks and persistent per-hour login limits are enforced.
Anonymous users can read published posts only. New and edited posts are public
as soon as Publish post succeeds; deletion requires confirmation. There are no
drafts or image uploads in this version. Reddit posts can be pasted into the desk.

Focused checks: `node tests/blog-admin-test.mjs`.
