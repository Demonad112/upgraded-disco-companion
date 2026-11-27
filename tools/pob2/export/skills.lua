-- luajit tools/pob2/export/skills.lua > skills.json
-- Support gems and active skills from PoB's loaded data (data.skills, data.gems). Per socketable support: gem tier,
-- family, the requireSkillTypes / excludeSkillTypes postfix expressions (as SkillType names), and the first stat set's
-- constantStats, flag stats and its OWN statMap (the globally mapped stats are deliberately not pulled in: reading
-- statMap[stat] would trigger PoB's lazy global lookup, so only rawget/pairs are used). Per active: its skill types.
-- Feeds packages/data/scripts/build-pob-skills.mjs.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()

local skillTypeName = L.reverse(SkillType)

local function skillTypeList(t)
	local names = L.array()
	for _, v in ipairs(t or {}) do
		names[#names + 1] = skillTypeName[v] or tostring(v)
	end
	return names
end

-- Which granted effects each skill file defines, in file order. PoB loads them all into one table; the file split
-- (sup_* are the socketable supports, act_* the player's active skills) is what the planner keeps, so read ids per file
-- with stub mod builders and look the processed effect up in data.skills. File order matters: two actives can share a
-- name, and the first one defined is the one the planner uses.
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

-- Gem tier (I/II/III) by granted-effect id, from the support gems only.
local gemTier = {}
for _, gemId in ipairs(L.sortedKeys(data.gems)) do
	local gem = data.gems[gemId]
	local effect = gem.grantedEffectId
	if effect and gem.gemType == "Support" and gemTier[effect] == nil then
		gemTier[effect] = gem.Tier or 0
	end
end

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

local function modRow(mod)
	local tags = L.array()
	for _, tag in ipairs(mod) do
		local t = scalars(tag)
		-- A DistanceRamp's { distance, factor } points (ModStore EvalMod interpolates between them).
		if type(tag.ramp) == "table" then
			local ramp = L.array()
			for _, p in ipairs(tag.ramp) do ramp[#ramp + 1] = { p[1], p[2] } end
			t.ramp = ramp
		end
		tags[#tags + 1] = t
	end
	-- MinionModifier and similar wrap a mod in a LIST value: its tags (Condition, ...) gate the effect too.
	local inner = type(mod.value) == "table" and mod.value.mod
	if type(inner) == "table" then
		for _, tag in ipairs(inner) do
			tags[#tags + 1] = scalars(tag)
		end
	end
	return {
		name = mod.name,
		type = mod.type,
		value = type(mod.value) == "number" and mod.value or nil,
		valueIsTable = type(mod.value) == "table" or nil,
		flags = L.flagNames(mod.flags, ModFlag),
		keywords = L.flagNames(mod.keywordFlags, KeywordFlag),
		tags = tags,
	}
end

-- statMap[stat] is a list of mods, or a list of groups of mods (a stat feeding several mods with different scalars).
local function flatten(list)
	local rows = L.array()
	for _, item in ipairs(list) do
		if item.name then
			rows[#rows + 1] = modRow(item)
		else
			for _, m in ipairs(item) do
				rows[#rows + 1] = modRow(m)
			end
		end
	end
	return rows
end

local function supportRow(id, ge)
	local set = ge.statSets and ge.statSets[1] or {}
	local constants = L.array()
	for _, c in ipairs(set.constantStats or {}) do
		constants[#constants + 1] = { c[1], c[2] }
	end
	local statMap = L.object()
	for _, stat in ipairs(L.sortedKeys(set.statMap or {})) do
		local list = rawget(set.statMap, stat)
		if type(stat) == "string" and stat:sub(1, 1) ~= "_" and type(list) == "table" then
			statMap[stat] = flatten(list)
		end
	end
	local family = ge.gemFamily
	if type(family) == "string" then
		family = { family }
	end
	return {
		id = id,
		name = ge.name,
		description = ge.description,
		tier = gemTier[id],
		family = L.list(family) or L.array(),
		requireSkillTypes = skillTypeList(ge.requireSkillTypes),
		excludeSkillTypes = skillTypeList(ge.excludeSkillTypes),
		isLineage = ge.isLineage and true or false,
		constantStats = constants,
		stats = L.list(set.stats) or L.array(),
		statMap = statMap,
	}
end

local supports = L.array()
for _, file in ipairs({ "sup_str", "sup_dex", "sup_int" }) do
	for _, id in ipairs(idsIn(file)) do
		local ge = data.skills[id]
		if ge and ge.support and ge.name and gemTier[id] ~= nil then
			supports[#supports + 1] = supportRow(id, ge)
		end
	end
end
out.supports = supports

-- Active skill name -> skill types; the first file/id to use a name wins.
local actives = L.object()
for _, file in ipairs({ "act_str", "act_dex", "act_int" }) do
	for _, id in ipairs(idsIn(file)) do
		local ge = data.skills[id]
		if ge and ge.name and ge.skillTypes and actives[ge.name] == nil then
			local names = L.array()
			for _, t in ipairs(L.sortedKeys(ge.skillTypes)) do
				if ge.skillTypes[t] then
					names[#names + 1] = skillTypeName[t] or tostring(t)
				end
			end
			table.sort(names)
			actives[ge.name] = names
		end
	end
end
out.actives = actives
L.emit(out)
