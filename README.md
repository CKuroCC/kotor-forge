# KOTOR Forge — project site

Static dashboard for the `kotor-forge` MCP server. Same architecture as
`er-forge-web`: plain HTML, one inline stylesheet, vanilla JS, no build step,
no dependencies, no webfonts. Vercel serves `public/` with `@vercel/static`.

## Refresh the data

```
"C:\Users\burori\mcp-servers\kotor-forge\.venv\Scripts\python.exe" export_live.py
git add -A && git commit -m "refresh data" && git push
```

`export_live.py` is read-only. It imports the MCP server's own modules from
`C:\Users\burori\mcp-servers\kotor-forge` so the site and the server can never
disagree about what is installed, and writes:

| file | source |
|------|--------|
| `public/data/install.json`   | live `Installation` — modules, chitin index, override drift vs the stock baseline |
| `public/data/tools.json`     | the server's own tool signatures and docstrings, via `inspect` |
| `public/data/toolchain.json` | installed package versions |
| `public/data/meta.json`      | export timestamp (drives the header) |

Three files are hand-maintained and not regenerated:
`formats.json`, `ecosystem.json`, `decisions.json`.

## Deploy

Vercel project root directory is `public`. Pushes to `main` deploy automatically.

## Related

- MCP server: `C:\Users\burori\mcp-servers\kotor-forge`
- Project tree: `D:\GameMods\KOTOR2`
- Runtime + backups: `D:\Mods\_work\kotor-forge-mcp`, `D:\Mods\_backups\kotor-forge`
- Hub notes: `WEKA-Hub\knowledge\gaming\kotor\`
