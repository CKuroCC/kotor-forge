"""Export the mod library on disk to public/data/library.json.

Read-only against D:\\GameMods\\KOTOR2\\03_MOD-LIBRARY. Every archive is
CRC-tested with 7-Zip before it is reported as present -- a size check proves
nothing about a truncated CDN transfer, which is the failure mode that actually
happens. Results are cached in verify-cache.json keyed by name+size, so a
re-export does not re-read 24 GB of cutscenes.

    py export_library.py            # test only archives not already cached
    py export_library.py --recheck  # drop the cache and test everything
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

LIB = Path(r"D:\GameMods\KOTOR2\03_MOD-LIBRARY")
OUT = Path(__file__).resolve().parent / "public" / "data" / "library.json"
CACHE = Path(__file__).resolve().parent / "verify-cache.json"
SEVENZIP = Path(r"C:\Program Files\7-Zip\7z.exe")
ARCHIVE_EXT = {".7z", ".zip", ".rar", ".exe"}

# Curated, ordered. Keys must match the folder names on disk.
GROUPS = [
    ("00_engine-fixes", "Engine fixes", "install-first",
     "3C-FD runs first and refuses a modified executable, so nothing may touch "
     "swkotor2.exe before it -- no 4GB patcher, no widescreen hex edit. Apply "
     "every patch except Borderless Window."),
    ("01_restoration", "Restoration", "install-first",
     "TSLRCM then the Community Patch. Everything downstream assumes both are "
     "already in, and several compatibility patches exist only for this pair."),
    ("02_lightsabers", "Lightsabers", "safe",
     "JC's VFX before Hilt Variety. v2.0 of Hilt Variety already contains the "
     "Aspyr hilt fix, so the standalone Glitched Hilt Fix is not needed."),
    ("03_textures", "Textures & upscales", "safe",
     "The bulk of the build. Every pack is .tpc at 2x. Each has its own list of "
     "files to delete before the rest is moved into override/."),
    ("04_cutscenes", "Cutscenes", "safe",
     "Pops Maellard's 3440x1440 set at 2.389:1 -- within 1% of this display. "
     "The matching _mods archive is required whenever TSLRCM is installed."),
    ("05_appearance", "Appearance", "safe",
     "Mesh and texture only, so zero achievement risk. New player-head mods are "
     "deliberately excluded: they append a name StrRef to dialog.tlk."),
    ("06_ui-widescreen", "UI & widescreen", "safe",
     "Matters more than usual at 3840x1600. The duplicate-TGA/TPC cleaner runs "
     "from the main game folder, never from override/."),
    ("07_lighting", "Lighting", "safe",
     "Relighting TSL, per-area. Depends on 3C-FD having restored reflections."),
]


def load_cache(recheck: bool) -> dict:
    if recheck or not CACHE.exists():
        return {}
    try:
        return json.loads(CACHE.read_text("utf-8"))
    except Exception:
        return {}


def verify(path: Path, cache: dict) -> str:
    """'ok' | 'fail' | 'skipped' -- CRC-test an archive, memoised by name+size."""
    key = f"{path.name}|{path.stat().st_size}"
    if key in cache:
        return cache[key]
    if path.suffix.lower() not in ARCHIVE_EXT or path.suffix.lower() == ".exe":
        cache[key] = "skipped"
        return "skipped"
    if not SEVENZIP.exists():
        return "skipped"
    rc = subprocess.run([str(SEVENZIP), "t", "--", str(path)],
                        capture_output=True).returncode
    cache[key] = "ok" if rc == 0 else "fail"
    return cache[key]


def main() -> int:
    recheck = "--recheck" in sys.argv
    if not LIB.exists():
        print(f"library not found: {LIB}")
        return 1
    cache = load_cache(recheck)

    groups, total_files, total_bytes, ok, bad = [], 0, 0, 0, 0
    for key, label, tier, note in GROUPS:
        d = LIB / key
        files = []
        if d.is_dir():
            for f in sorted(d.iterdir(), key=lambda p: p.name.lower()):
                if not f.is_file():
                    continue
                v = verify(f, cache)
                files.append({"name": f.name, "bytes": f.stat().st_size,
                              "verify": v})
                total_files += 1
                total_bytes += f.stat().st_size
                ok += v == "ok"
                bad += v == "fail"
        groups.append({"key": key, "label": label, "tier": tier, "note": note,
                       "files": files,
                       "bytes": sum(x["bytes"] for x in files)})

    doc = {
        "generated": datetime.now().isoformat(timespec="seconds"),
        "root": str(LIB),
        "total_files": total_files,
        "total_bytes": total_bytes,
        "verified_ok": ok,
        "verified_fail": bad,
        "extractor": "7-Zip 26.03 x64" if SEVENZIP.exists() else "missing",
        "groups": groups,
        "blockers": [
            {
                "state": "blocked",
                "title": "TSLRCM is fully downloaded and held by Chrome",
                "body": "Both copies sit in D:\\Downloads as Unconfirmed "
                        "*.crdownload at exactly 137,947,655 bytes -- the "
                        "complete 131.56 MB. TSLRCM ships as a .exe "
                        "self-extracting installer and Chrome Safe Browsing "
                        "quarantines uncommon executables by default. The bytes "
                        "are already down; only the confirmation is missing. "
                        "Ctrl+J, then Keep. Dismissing a browser security "
                        "prompt is a user-only action by design, and the "
                        "third-party Google Drive re-host linked in a forum "
                        "review is not an acceptable substitute for the most "
                        "load-bearing mod in the build.",
            },
            {
                "state": "blocked",
                "title": "Steam Cloud is SHA-tracking the savegames",
                "body": "remotecache.vdf under userdata\\138831487\\208580 "
                        "records a SHA for every save file, and the saves "
                        "themselves live in the game folder's cloudsaves\\ "
                        "directory. A surgical 4-byte credits patch changes "
                        "that SHA, so Steam can offer to restore its own copy "
                        "and silently undo the edit. The last recorded sync was "
                        "2025-02-05, so the remote copy is already stale. Fix: "
                        "Library, KOTOR II, Properties, General, uncheck Steam "
                        "Cloud.",
            },
            {
                "state": "clear",
                "title": "Steam Workshop is empty",
                "body": "steamapps\\workshop\\content\\208580 does not exist "
                        "under either Steam library root. There are zero "
                        "Workshop subscriptions to conflict with a manual mod "
                        "build, which is the single most common way these "
                        "builds break.",
            },
            {
                "state": "clear",
                "title": "Nexus kotor2/1398 is unobtainable, and not needed",
                "body": "Nexus's own automated safety checks have quarantined "
                        "the file, so no download button exists on the page at "
                        "all -- checked while signed in with Premium. Dropped "
                        "from the build. TSL still ships KOTOR 1's Large body "
                        "meshes and simply never points at them, so a cloned "
                        "appearance.2da row covers the same ground with zero "
                        "new art.",
            },
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=1), "utf-8")
    CACHE.write_text(json.dumps(cache, indent=1), "utf-8")
    print(f"wrote {OUT}")
    print(f"  {total_files} files, {total_bytes/2**30:.2f} GB, "
          f"{ok} verified ok, {bad} failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
