"""Validate the committed static release before a pull request can merge."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import hashlib
import json
import re
import subprocess

root = Path(__file__).resolve().parents[1]
subprocess.run(["python3", str(root / "scripts/prepare-pages.py")], check=True)
release = root / "build/pages"

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.urls.append(value)

pages = list(release.rglob("*.html"))
assert pages, "Release has no HTML pages"
for page in pages:
    parser = Links()
    text = page.read_text()
    assert "{{" not in text, f"Unresolved release placeholder in {page}"
    parser.feed(text)
    for url in parser.urls:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc or not parts.path:
            continue
        route = unquote(parts.path)
        if route.startswith("/"):
            # Custom-domain homepage routes coexist with the /pigeon/ release.
            if route == "/": target = release / "home/index.html"
            elif route == "/pigeon" or route.startswith("/pigeon/"):
                target = release / route.removeprefix("/pigeon").lstrip("/")
            else: target = release / route.lstrip("/")
            target = target.resolve()
        else:
            target = (page.parent / route).resolve()
        assert target.is_relative_to(release.resolve()), f"Link escapes release: {page}: {url}"
        assert target.exists(), f"Broken release link: {page}: {url}"

installer = (release / "webapp/installer/index.html").read_text()
match = re.search(r"const meta=(\{[^\n]+?\});", installer)
assert match, "Missing installer release metadata"
meta = json.loads(match[1])
package = release / "webapp/installer" / meta["pkg"]
assert hashlib.sha256(package.read_bytes()).hexdigest() == meta["sha256"], "Installer/package checksum mismatch"
assert (release / "firmware" / f"pigeon-source-{meta['version']}.tar.gz").is_file(), "Missing matching source archive"
print(f"Validated {len(pages)} pages, local links, installer checksum, and source archive.")
