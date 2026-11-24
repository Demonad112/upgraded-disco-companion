-- luajit tools/pob2/groups.lua < build.xml > groups.json
-- Runs real PoB2 headless (vendor/pob2, unmodified) once per skill group and active skill of a decoded PoB export
-- XML from stdin, and prints a JSON array: one row per (group, activeSkill) with PoB's own main output for it.
-- A code stores PlayerStats for its mainSocketGroup only; every other group's numbers exist only when PoB's engine
-- computes them (provenance pob-sim). Decode the code first (scripts/pob2/run.mjs does this).
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

-- Set mainSocketGroup to gi and that group's mainActiveSkill to ai, leaving every other byte as exported.
local function variant(gi, ai)
	local x = xml:gsub('mainSocketGroup="%d+"', 'mainSocketGroup="' .. gi .. '"', 1)
	local n = 0
	x = x:gsub('(<Skill [^>]*mainActiveSkill=")([^"]*)(")', function(a, _, c)
		n = n + 1
		if n == gi then return a .. ai .. c end
	end)
	return x
end

local groups = 0
local enabled = {} -- each group's own <Skill enabled="..."> as exported (PoB treats anything but "false" as on)
for tag in xml:gmatch("<Skill [^>]*>") do
	groups = groups + 1
	enabled[groups] = tag:match('enabled="([^"]*)"') ~= "false"
end

local rows = {}
local firstError
for gi = 1, groups do
	local seen = {}
	for ai = 1, MAX_ACTIVE do
		local err = pob.load(variant(gi, ai))
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
		local r = { group = gi, activeSkill = ai, skill = name, enabled = enabled[gi] }
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
end

out:write(pob.encode(pob.object({ groups = groups, rows = pob.array(rows) })), "\n")
out:flush()
os.exit(firstError and 1 or 0)
