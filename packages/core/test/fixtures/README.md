# Test fixtures

No poe.ninja captures are committed any more (PB-5). The realistic character is the owner's main build, a PoB code in `../pob2/forbidden-rites/main.code.txt`; `../helpers/main-build.ts` reads it through `pobToCharModel` and states, inline, the inputs a code cannot supply (a defence block, poe.ninja-style breakdowns, passive counts). Hand-built gem setups are in `../helpers/gem-skills.ts`.

The captures this replaced (Athrynas v43, Yykiuy v51 and v80) stay in git history for reference. poe.ninja's character model is behind a Cloudflare challenge (NP1-1), so a new capture can't be taken; a new character is added as a PoB code under `../pob2/<league>/`.
