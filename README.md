# PolyTrack Pro

Static Polymarket-style dashboard ready for GitHub Pages.

## Run locally

Double-click `start-api.cmd` and open:

- `http://localhost:8080/`

API endpoints:

- `http://localhost:8080/api/health`
- `http://localhost:8080/api/data`
- `http://localhost:8080/api/markets`
- `http://localhost:8080/api/wallets`
- `http://localhost:8080/api/signals`

## Publish online with GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or `master`.
5. Wait for the `Deploy GitHub Pages` workflow to finish.

Your site URL will be:

- `https://<your-github-username>.github.io/<your-repo-name>/`

## Files

- `index.html`: app shell
- `styles.css`: styling
- `app.js`: frontend logic
- `published-data.js`: embedded published data fallback
- `data/war_data.json`: static hosted JSON data
- `start-api.ps1`: local API/static server
- `start-api.cmd`: Windows launcher
