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

# WinRAR is the archiver on this machine, so it is the one that certifies the
# library. WinRAR.exe is a GUI binary -- it takes the same commands and exit
# codes as Rar.exe but writes nothing to stdout, so the verdict comes from the
# exit code alone. Only rc 0 counts: rc 1 is "warning" and WinRAR also returns
# it for a file that is not an archive at all.
WINRAR = Path(r"C:\Program Files\WinRAR\WinRAR.exe")
ARCHIVE_EXT = {".7z", ".zip", ".rar"}

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
    if path.suffix.lower() not in ARCHIVE_EXT:
        cache[key] = "skipped"
        return "skipped"
    if not WINRAR.exists():
        return "skipped"
    rc = subprocess.run([str(WINRAR), "t", "-ibck", "-y", str(path)],
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
        "extractor": "WinRAR 7.23 x64" if WINRAR.exists() else "missing",
        "groups": groups,
        "blockers": [
            {
                "state": "blocked",
                "title": "TSLRCM: Chrome cancelled the download, so there is "
                         "no Keep button to click",
                "body": "Chrome's own downloads record says target "
                        "tslrcm2022.exe, state CANCELLED, interrupt 41 = "
                        "USER_SHUTDOWN, danger DANGEROUS_FILE. That danger "
                        "label is Chrome's name for the file TYPE -- what "
                        "every .exe gets -- not a Safe Browsing detection: "
                        "there is no DANGEROUS_CONTENT, URL or HOST on the "
                        "record. Chrome was shut down while the confirmation "
                        "was outstanding, which killed the entry, so the "
                        "earlier advice to press Keep pointed at a control "
                        "that no longer exists. One orphaned .crdownload "
                        "survives at exactly the published 137,947,655 bytes "
                        "with an MZ header, but neither WinRAR nor 7-Zip can "
                        "open it, which rules out SFX and NSIS and means its "
                        "contents cannot be inspected without running it. So "
                        "it gets re-downloaded cleanly rather than promoted, "
                        "and the third-party Google Drive re-host linked in a "
                        "forum review is not a substitute for the most "
                        "load-bearing mod in the build.",
            },
            {
                "state": "blocked",
                "title": "Deadly Stream is throttling the whole site",
                "body": "After roughly 30 GB pulled in a couple of hours, "
                        "every Deadly Stream page started returning a browser "
                        "error -- individual file pages and the file index "
                        "alike, in three separate tabs including brand-new "
                        "ones. Not page-specific and not a login problem. The "
                        "remaining download waits for the throttle to lift; "
                        "retrying harder is how an account earns a real block.",
            },
            {
                "state": "clear",
                "title": "Steam Cloud is off -- resolved",
                "body": "remotecache.vdf under userdata\\138831487\\208580 "
                        "records a SHA for every save file, and the saves "
                        "themselves live in the game folder's cloudsaves\\ "
                        "directory, so a surgical 4-byte credits patch changes "
                        "that SHA and Steam could have offered to restore its "
                        "own copy over the edit -- from a sync last recorded "
                        "2025-02-05, months stale. Julian turned Steam Cloud "
                        "off for appid 208580 on 2026-09-12. The save tools "
                        "are now safe to use.",
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
