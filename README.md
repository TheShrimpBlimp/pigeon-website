# Pigeon download and setup site

Edit `index.html` and `site.css` here. The current offline sample tool stays in
`../pigeon/`; firmware packaging lives in `../make_site.py`.

From the project root, build with:

```sh
.venv/bin/python web/make_site.py build/pigeon.fwsc 0.1-dev web/site/dist
```

`dist/` contains the complete static site, current firmware, matching source,
licences, installer, guides, and browser sample tool. Imported user audio is not
included. The landing page uses local fonts and no external scripts.

Serve `dist/` with a loopback-only static server to preview locally. For USB MIDI,
use desktop Chrome or Edge at localhost or on HTTPS. Firmware upload remains a
user-initiated action; visiting the site does not write to a device.

The Sites project identity is retained in `.openai/hosting.json`. Its initial
hosted audience is private. The main firmware Git checkout is separate from the
site's hosting checkout.
