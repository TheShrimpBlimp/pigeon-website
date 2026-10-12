"""Prepare the complete static site for GitHub Pages (no server backend)."""
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
target = root / "build/pages"
shutil.rmtree(target, ignore_errors=True)
shutil.copytree(root / "dist/client", target)
(target / ".nojekyll").touch()
index = target / "index.html"
html = index.read_text()
html = html.replace("Install statistics load when online.", "Install counting is not enabled on this host.")
html = re.sub(r'<script type="module">try \{const r=await fetch\("api/installs".*?</script>', '', html, flags=re.S)
index.write_text(html)
installer = target / "webapp/installer/index.html"
installer.write_text(installer.read_text().replace(
    "Successful installs send an anonymous completion event to Pigeon’s counter. No sample data or device identity is sent. Offline reports wait until you reconnect.",
    "Install counting is not enabled on this host. Samples stay on your computer."))
(target / "webapp/pigeon/install-count.js").write_text(
    "// Static GitHub Pages has no install counter backend.\n"
    "export async function recordInstall() {}\n"
    "export async function flushInstallCounts() {}\n")
sw = target / "webapp/pigeon/sw.js"
sw.write_text(sw.read_text().replace('pigeon-library-v10', 'pigeon-library-pages-v11'))
print(target)
