"""Export live KOTOR II install state for the KOTOR Forge site.

READ-ONLY. Imports the kotor-forge MCP server's own modules so the site and the
server can never disagree about what is installed. Mirrors er-forge/export_live.py.

    python export_live.py
"""
import sys, os, json, datetime, inspect

SERVER = r"C:\Users\burori\mcp-servers\kotor-forge"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "public", "data")
os.makedirs(DATA, exist_ok=True)

sys.path.insert(0, SERVER)
os.chdir(SERVER)
import config as C
import server as S
from kio import quiet, inst


def dump(name, obj):
    p = os.path.join(DATA, name + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1)
    print("wrote %-18s %8d bytes" % (name + ".json", os.path.getsize(p)))


with quiet():
    i = inst()
    modules = i.modules_list()
    chitin = i.chitin_resources()
    texpacks = i.texturepacks_list()

by_type = {}
for r in chitin:
    try:
        k = str(r.restype().extension).lower()
        by_type[k] = by_type.get(k, 0) + 1
    except Exception:
        pass

ov = S._tree_files(C.OVERRIDE) if os.path.isdir(C.OVERRIDE) else {}
stock = S._stock() or {}
base = set(k for k in stock if not k.startswith("__"))

areas = {}
for m in modules:
    code = os.path.splitext(m)[0].replace("_s", "").replace("_dlg", "")
    areas.setdefault(code, []).append(m)

dump("install", {
    "game_dir": C.GAME_DIR,
    "modules_files": len(modules),
    "area_codes": len(areas),
    "chitin_resources": len(chitin),
    "texturepacks": texpacks,
    "override_files": len(ov),
    "override_bytes": sum(s for _a, s in ov.values()),
    "stock_baseline": len(base),
    "stock_captured": stock.get("__captured__"),
    "mods_added": sorted(set(ov) - base),
    "mods_changed": sorted(k for k in (set(ov) & base) if S._sha(ov[k][0]) != stock[k]),
    "resources_by_type": dict(sorted(by_type.items(), key=lambda kv: -kv[1])),
    "areas": {k: sorted(v) for k, v in sorted(areas.items())},
})

tools = []
for n in sorted(dir(S)):
    if n.startswith("_"):
        continue
    fn = getattr(S, n)
    if not callable(fn) or getattr(fn, "__module__", "") != "server":
        continue
    if not (fn.__doc__ or "").strip():
        continue
    try:
        sig = str(inspect.signature(fn))
    except Exception:
        sig = "()"
    doc = inspect.cleandoc(fn.__doc__)
    if n.startswith("forge_"):
        group = "lifecycle"
    elif n.startswith("mod_"):
        group = "mods"
    elif n.startswith("save_"):
        group = "saves"
    elif n in ("twoda_edit", "twoda_add_row", "script_compile",
               "stage_add", "stage_clear"):
        group = "edit"
    else:
        group = "query"
    tools.append({"name": n, "sig": sig, "group": group,
                  "summary": doc.splitlines()[0], "doc": doc})
dump("tools", tools)

import importlib.metadata as md
pkgs = []
for pkg, why in (
    ("pykotor", "Core read/write library. Every KOTOR2 format, in-process, one language."),
    ("holopatcher", "Headless TSLPatcher-mod installer. The only scriptable path for that mod class."),
    ("bioware-kaitai-formats", "Machine-readable BioWare format specs (.ksy)."),
    ("mcp", "Model Context Protocol SDK."),
):
    try:
        v = md.version(pkg)
    except Exception:
        v = None
    pkgs.append({"name": pkg, "version": v, "why": why})
dump("toolchain", pkgs)

dump("meta", {"generated": datetime.datetime.now().isoformat(timespec="seconds")})
print("done")
