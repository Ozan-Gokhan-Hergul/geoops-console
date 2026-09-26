# Screenshots

Five screenshots of the running application, referenced from the main
[`README.md`](../../README.md):

| File | Shows |
| --- | --- |
| `search-results.png` | A completed search near Sultanahmet: result markers on the map plus the result list (category, name, distance). Used as the hero image at the top of the README. |
| `map-initial.png` | The map on load — centered on Sultanahmet, all five categories checked, no location selected yet. |
| `map-selected.png` | After clicking a location — selection marker and the radius circle appear immediately, before Search is pressed. |
| `state-empty.png` | The empty-result state — a very small radius with no matching POIs. |
| `state-unavailable.png` | The upstream-unavailable state — shown when the public Overpass API can't be reached. |

All five were captured from the actual local app (backend + frontend both
running) and are unedited aside from cropping.

To recapture or add more: `npm run dev` at the repo root (backend, port
3000) and `cd frontend && npm run dev` (frontend, port 5173), then open
`http://localhost:5173`.
