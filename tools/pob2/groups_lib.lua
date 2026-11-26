-- Per skill group main output for a decoded PoB export, shared by groups.lua (CLI, CI oracle) and serve.lua (engine
-- service). Loads the export once, then switches the main skill the way PoB's own sidebar dropdowns do
-- (Modules/Build.lua: mainSocketGroup / mainSkill: set the index, modFlag and buildFlag, and let the next frame
-- recalculate). Reloading the XML per row allocated a whole build each time (~65 MB) and could run the CI runner out
-- of memory (exit 137).
--
-- Rows stay keyed by the export's <Skill> order (core's `group`). PoB's first calc folds granted-skill groups into
-- the user's own copy of the same skill (CalcSetup.lua, mergedGroups) and drops granted groups whose source is not
-- live, so its socketGroupList can be shorter. Each row's `pobGroup` is the group PoB computed it from: the same
-- group, or for a folded one the only surviving group whose first gem is the same skill (none or several: no row).
local M = {}

local KEYS = {
	"TotalDPS", "CombinedDPS", "AverageDamage", "Speed", "HitChance", "CritChance", "CritMultiplier",
	"TotalDotDPS", "IgniteDPS", "BleedDPS", "PoisonDPS", "ManaCost", "Cooldown", "AreaOfEffectRadiusMetres",
}
local HAND = { "PhysicalHitAverage", "LightningHitAverage", "ColdHitAverage", "FireHitAverage", "ChaosHitAverage",
	"TotalMin", "TotalMax" }
local MAX_ACTIVE = 4 -- a group's active skills (e.g. Charged Staff + Charged Shockwave); stop at the first repeat

-- Load `xml` (with the export's own socket groups captured) and return loadError or nil. `afterLoad(loadError)` runs
-- right after the load, before any group is switched (serve.lua takes its snapshot there).
local function loadCapturing(pob, xml)
	pob.init()
	local skillsTab = common.classes.SkillsTab
	local loadSkills = skillsTab.Load
	local exported
	skillsTab.Load = function(self, ...)
		local r = loadSkills(self, ...)
		exported = {}
		for i, sg in ipairs(self.socketGroupList) do exported[i] = sg end
		return r
	end
	local ok, loadErr = pcall(pob.load, xml)
	skillsTab.Load = loadSkills
	if not ok then
		return tostring(loadErr), nil
	end
	return loadErr, exported
end

-- Returns { groups, rows } and the first error (or nil).
function M.run(pob, xml, afterLoad)
	local rows = {}
	local firstError
	local loadErr, exported = loadCapturing(pob, xml)
	if afterLoad then afterLoad(loadErr) end
	if loadErr then
		rows[1] = pob.object({ group = 1, activeSkill = 1, loadError = loadErr })
		return pob.object({ groups = 0, rows = pob.array(rows) }), loadErr
	end

	-- Groups of the active <SkillSet> only: SkillsTab:Load ends with SetActiveSkillSet, so `exported` is that set's
	-- list, and a group of another set has no calc to read. `enabled` is the group's own <Skill enabled="..."> as PoB
	-- read it.
	local groups = #exported
	local enabled = {}
	for gi, sg in ipairs(exported) do
		enabled[gi] = sg.enabled == true
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

	return pob.object({ groups = groups, rows = pob.array(rows) }), firstError
end

return M
