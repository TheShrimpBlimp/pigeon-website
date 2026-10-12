"""Prepare the complete static site for GitHub Pages (no server backend)."""
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
target = root / "build/pages"
shutil.rmtree(target, ignore_errors=True)
shutil.copytree(root / "dist/client", target)
(target / ".nojekyll").touch()
endpoint_file = root / "counter/endpoint.txt"
endpoint = endpoint_file.read_text().strip() if endpoint_file.exists() else ""
index = target / "index.html"
html = index.read_text()
if endpoint:
    html = html.replace('fetch("api/installs",', f'fetch("{endpoint}",')
    module = target / "webapp/pigeon/install-count.js"
    module.write_text(module.read_text().replace("new URL('../../api/installs',import.meta.url)", repr(endpoint)))
else:
    html = html.replace("Loading shared count · includes reinstalls", "Install counting is not enabled on this host.")
    html = re.sub(r'<script type="module">try \{const r=await fetch\("api/installs".*?</script>', '', html, flags=re.S)
    (target / "webapp/pigeon/install-count.js").write_text(
        "export async function recordInstall() {}\nexport async function flushInstallCounts() {}\n")
    installer = target / "webapp/installer/index.html"
    installer.write_text(installer.read_text().replace(
        "Successful installs send an anonymous completion event to Pigeon’s counter. No sample data or device identity is sent. Offline reports wait until you reconnect.",
        "Install counting is not enabled on this host. Samples stay on your computer."))
index.write_text(html)
sw = target / "webapp/pigeon/sw.js"
sw.write_text(sw.read_text().replace('pigeon-library-v10', 'pigeon-library-pages-v12'))
print(target)
