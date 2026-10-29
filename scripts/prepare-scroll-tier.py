"""Precompute the 1280px delivery tier from the approved source WebP frames."""
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / "shared/assets/product/keystroke-sequence"
manifest_path = folder / "manifest.json"
manifest = json.loads(manifest_path.read_text())

def encode(frame):
    source = folder / frame["file"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == frame["sha256"]
    target = folder / f"key-{frame['index']:03d}-1280.webp"
    with Image.open(source) as image:
        image.resize((1280, 1120), Image.Resampling.LANCZOS).save(target, "WEBP", quality=95, method=6)
    data = target.read_bytes()
    return dict(frame, file=target.name, width=1280, height=1120, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())

with ThreadPoolExecutor(max_workers=4) as pool:
    frames = list(pool.map(encode, manifest["frames"]))
manifest["balanced"] = dict(width=1280, height=1120, frames=frames)
size = sum(f["bytes"] for tier in [manifest, manifest["compact"], manifest["balanced"]] for f in tier["frames"])
assert size <= 32 * 1024 * 1024
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", newline="\n")
notice_path = folder / "provenance.json"
notice = json.loads(notice_path.read_text())
notice["manifestSHA256"] = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
notice["sequenceBytes"] = size
notice["deliveryTier"] = dict(source="scripts/prepare-scroll-tier.py", sourceSHA256=hashlib.sha256(Path(__file__).read_text().encode()).hexdigest(), description="1280 x 1120 Lanczos derivative of approved source WebP frames, WebP quality 95; original and compact tiers unchanged.")
notice_path.write_text(json.dumps(notice, indent=2) + "\n", newline="\n")
print(f"Prepared {len(frames)} frames; all three tiers total {size / 1048576:.2f} MiB")
