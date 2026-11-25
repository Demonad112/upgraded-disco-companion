-- luajit tools/pob2/groups.lua < build.xml > groups.json
-- Loads a decoded PoB export in real PoB2 headless (vendor/pob2, unmodified) once, then recalculates per skill group and active skill
-- XML from stdin, and prints a JSON array: one row per (group, activeSkill) with PoB's own main output for it.
-- A code stores PlayerStats for its mainSocketGroup only; every other group's numbers exist only when PoB's engine
-- computes them (CI-only ground truth, never shown). Decode the code first (scripts/pob2/run.mjs does this).
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

local KEYS = {
	"TotalDPS", "CombinedDPS", "AverageDamage", "Speed", "HitChance", "CritChance", "CritMultiplier",
	"TotalDotDPS", "IgniteDPS", "BleedDPS", "PoisonDPS", "ManaCost", "Cooldown", "AreaOfEffectRadiusMetres",
}
local HAND = { "PhysicalHitAverage", "LightningHitAverage", "ColdHitAverage", "FireHitAverage", "ChaosHitAverage",
	"TotalMin", "TotalMax" }
local MAX_ACTIVE = 4 -- a group's active skills (e.g. Charged Staff + Charged Shockwave); stop at the first repeat

local groups = 0
local enabled = {} -- each group's own <Skill enabled="..."> as exported (PoB treats anything but "false" as on)
for tag in xml:gmatch("<Skill [^>]*>") do
	groups = groups + 1
	enabled[groups] = tag:match('enabled="([^"]*)"') ~= "false"
end

-- Load the export once, then switch the main skill the way PoB's own sidebar dropdowns do (Modules/Build.lua:
-- mainSocketGroup / mainSkill: set the index, modFlag and buildFlag, and let the next frame recalculate). Reloading
-- the XML per row allocated a whole build each time (~65 MB) and could run the CI runner out of memory (exit 137).
--
-- Rows stay keyed by the export's <Skill> order (core's `group`). PoB's first calc folds granted-skill groups into
-- the user's own copy of the same skill (CalcSetup.lua, mergedGroups) and drops granted groups whose source is not
-- live, so its socketGroupList can be shorter. Each row's `pobGroup` is the group PoB computed it from: the same
-- group, or for a folded one the only surviving group whose first gem is the same skill (none or several: no row).
pob.init()
local skillsTab = common.classes.SkillsTab
local loadSkills = skillsTab.Load
local exported -- socket group objects in <Skill> order, captured as SkillsTab:Load builds them
skillsTab.Load = function(self, ...)
	local r = loadSkills(self, ...)
	exported = {}
	for i, sg in ipairs(self.socketGroupList) do exported[i] = sg end
	return r
end

local rows = {}
local firstError
local loadErr = pob.load(xml)
skillsTab.Load = loadSkills
if loadErr then
	rows[1] = pob.object({ group = 1, activeSkill = 1, loadError = loadErr })
	firstError = loadErr
	groups = 0
end

local list = build.skillsTab.socketGroupList
-- PoB's index for export group gi (see above), or nil when PoB kept no group for that skill.
local function pobIndex(gi)
	local sg = exported and exported[gi]
	if not sg then return nil end
	for j, s in ipairs(list) do
		if s == sg then return j end
	end
	local id = sg.gemList[1] and sg.gemList[1].skillId
	local match
	for j, s in ipairs(list) do
		if id and s.gemList[1] and s.gemList[1].skillId == id then
			if match then return nil, "PoB kept several groups for this skill" end
			match = j
		end
	end
	return match
end

-- Make (pi, ai) the main skill and recalculate. Returns an error string or nil.
local function select(pi, ai)
	-- An earlier row's prompt stays set until cleared, and would be reported for every row after it.
	launch.promptMsg = nil
	build.mainSocketGroup = pi
	list[pi].mainActiveSkill = ai
	build.modFlag = true
	build.buildFlag = true
	local ok, err = pcall(runCallback, "OnFrame")
	if not ok then return pob.strip(tostring(err)) end
	if launch.promptMsg then return pob.strip(launch.promptMsg) end
	return nil
end

for gi = 1, groups do
	local seen = {}
	local pi, why = pobIndex(gi)
	local sg = pi and list[pi]
	local keep = sg and sg.mainActiveSkill
	for ai = 1, MAX_ACTIVE do
		local err = not pi and (why or "PoB kept no group for this skill") or select(pi, ai)
		if err then
			rows[#rows + 1] = pob.object({ group = gi, activeSkill = ai, loadError = err })
			firstError = firstError or err
			break
		end
		local ms = build.calcsTab.mainEnv and build.calcsTab.mainEnv.player.mainSkill
		local ge = ms and ms.activeEffect and ms.activeEffect.grantedEffect
		local name = ge and ge.name or "?"
		if seen[name] then break end
		seen[name] = true
		local o = build.calcsTab.mainOutput
		local r = { group = gi, pobGroup = pi, activeSkill = ai, skill = name, enabled = enabled[gi] }
		for _, k in ipairs(KEYS) do
			if type(o[k]) == "number" then r[k] = o[k] end
		end
		if o.MainHand then
			local mh = {}
			for _, k in ipairs(HAND) do
				if type(o.MainHand[k]) == "number" then mh[k] = o.MainHand[k] end
			end
			r.mainHand = pob.object(mh)
		end
		rows[#rows + 1] = pob.object(r)
	end
	-- Leave this group as exported before moving on, so later rows see the same build a fresh load would.
	if sg then sg.mainActiveSkill = keep end
end

out:write(pob.encode(pob.object({ groups = groups, rows = pob.array(rows) })), "\n")
out:flush()
os.exit(firstError and 1 or 0)
