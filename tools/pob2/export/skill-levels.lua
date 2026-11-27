-- luajit tools/pob2/export/skill-levels.lua > skill-levels.json
-- Per-level gem data for the damage mini-calc (Batch 3), for each active skill (the first definition of a name): the
-- effect's castTime, per-level scalars (baseMultiplier, attackSpeedMultiplier, ...), and the first stat set's
-- constantStats, baseFlags, incrementalEffectiveness, stats and per-level stat values (statLevels: { level, values,
-- interpolation }, values in `stats` order), and the gem's qualityStats. Only plain numbers, strings and booleans
-- are kept.
-- Feeds packages/data/scripts/build-skill-levels.mjs.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()

local function scalars(t)
	local o = L.object()
	for _, k in ipairs(L.sortedKeys(t)) do
		local v = t[k]
		if type(k) == "string" and (type(v) == "string" or type(v) == "number" or type(v) == "boolean") then
			o[k] = v
		end
	end
	return o
end

local function flagNames(t)
	local names = L.array()
	for _, k in ipairs(L.sortedKeys(t or {})) do
		if t[k] then
			names[#names + 1] = tostring(k)
		end
	end
	return names
end

local function levelRows(levels)
	local rows = L.array()
	for _, n in ipairs(L.sortedKeys(levels or {})) do
		if type(n) == "number" then
			local row = scalars(levels[n])
			row.level = n
			row.levelRequirement = nil
			local nums = L.list(levels[n])
			if nums and #nums > 0 then
				row.values = nums
			end
			rows[#rows + 1] = row
		end
	end
	return rows
end

local function effectRow(id, ge)
	local row = L.object()
	row.id = id
	row.name = ge.name
	row.castTime = ge.castTime
	row.levels = levelRows(ge.levels)
	-- Gem quality: { stat, value per 1% quality } (CalcTools buildSkillInstanceStats truncates stat x quality).
	local quality = L.array()
	for _, q in ipairs(ge.qualityStats or {}) do
		quality[#quality + 1] = { q[1], q[2] }
	end
	row.qualityStats = quality
	local set = ge.statSets and ge.statSets[1]
	if set then
		local constants = L.array()
		for _, c in ipairs(set.constantStats or {}) do
			constants[#constants + 1] = { c[1], c[2] }
		end
		local statLevels = L.array()
		for _, n in ipairs(L.sortedKeys(set.levels or {})) do
			local lv = set.levels[n]
			local values = type(n) == "number" and L.list(lv)
			if values and #values > 0 then
				statLevels[#statLevels + 1] = { level = n, values = values, interpolation = L.list(lv.statInterpolation) or L.array() }
			end
		end
		row.statSet = {
			incrementalEffectiveness = set.incrementalEffectiveness,
			baseFlags = flagNames(set.baseFlags),
			constantStats = constants,
			stats = L.list(set.stats) or L.array(),
			statLevels = statLevels,
		}
	end
	return row
end

local function idsIn(file)
	local ids = {}
	local stub = function()
		return {}
	end
	local into = setmetatable({}, {
		__newindex = function(t, id, v)
			rawset(t, id, v)
			ids[#ids + 1] = id
		end,
	})
	LoadModule("Data/Skills/" .. file, into, stub, stub, stub)
	return ids
end

local actives = L.object()
for _, file in ipairs({ "act_str", "act_dex", "act_int" }) do
	for _, id in ipairs(idsIn(file)) do
		local ge = data.skills[id]
		if ge and ge.name and ge.skillTypes and actives[ge.name] == nil then
			actives[ge.name] = effectRow(id, ge)
		end
	end
end
out.actives = actives
L.emit(out)
