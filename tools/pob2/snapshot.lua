-- luajit tools/pob2/snapshot.lua < build.xml > snapshot.json
-- Runs real PoB2 headless (vendor/pob2, unmodified) on a decoded PoB export XML from stdin and prints a JSON snapshot:
-- pobVersion, pinCommit, loadError, stats (displayStats/extraSaveStats/Minion.*), fullDpsSkills and export
-- (PlayerStat/MinionStat/FullDPSSkill from build:SaveDB, i.e. what PoB would export now).
-- Decode the code first (scripts/pob2/run.mjs does this): PoB's headless Inflate is a stub.
-- Exit codes: 0 snapshot written, 1 PoB could not load the build (JSON still written, loadError set), 2 bad input.
local out = io.stdout
local xml = io.read("*a") -- read stdin before PoB starts: HeadlessWrapper may io.read on a startup error
if not xml or not xml:find("<PathOfBuilding2", 1, true) then
	io.stderr:write("snapshot.lua: stdin is not a PoB2 export XML (<PathOfBuilding2>)\n")
	os.exit(2)
end

local script = debug.getinfo(1, "S").source:sub(2)
local dir = script:match("^(.*)[/\\]") or "."
local pob = dofile(dir .. "/headless.lua")

local loadError = pob.load(xml)
local snap = pob.snapshot(loadError)
out:write(pob.encode(snap), "\n")
out:flush()
os.exit(loadError and 1 or 0)
