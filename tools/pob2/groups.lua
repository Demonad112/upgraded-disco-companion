-- luajit tools/pob2/groups.lua < build.xml > groups.json
-- Loads a decoded PoB export in real PoB2 headless (vendor/pob2, unmodified) once, then recalculates per skill group
-- and active skill (groups_lib.lua) and prints { groups, rows }: one row per (group, activeSkill) with PoB's own main
-- output for it. A code stores PlayerStats for its mainSocketGroup only; every other group's numbers exist only when
-- PoB's engine computes them. Decode the code first (scripts/pob2/run.mjs does this).
-- Each row also says whether the group is enabled in the export.
-- Exit codes: 0 written, 1 some variant failed to load (JSON still written, loadError on that row), 2 bad input.
local out = io.stdout
local xml = io.read("*a")
if not xml or not xml:find("<PathOfBuilding2", 1, true) then
	io.stderr:write("groups.lua: stdin is not a PoB2 export XML (<PathOfBuilding2>)\n")
	os.exit(2)
end

local script = debug.getinfo(1, "S").source:sub(2)
local dir = script:match("^(.*)[/\\]") or "."
local pob = dofile(dir .. "/headless.lua")
local result, firstError = dofile(dir .. "/groups_lib.lua").run(pob, xml)

out:write(pob.encode(result), "\n")
out:flush()
os.exit(firstError and 1 or 0)
