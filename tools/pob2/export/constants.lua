-- luajit tools/pob2/export/constants.lua > constants.json
-- The character base values PoB adds before any item, passive or quest, for the stats core's code breakdowns cover
-- (packages/core/src/pob/code-breakdowns.ts): Life, Mana, Spirit, Evasion and the four resistances, plus every quest
-- reward with the default PoB applies when a code does not save the input. Feeds packages/data/scripts/build-tree-pob.mjs,
-- which writes them into generated/passive-tree.json as `characterBase` (CP-5).
--
-- Some of these numbers are literals in PoB's calc source, not data (the `base = 16` on Life per level, the `or -60`
-- resistance penalty, 2 Life per Strength). They are read from the vendored source text by pattern, and a pattern that
-- stops matching fails the export rather than falling back to a remembered number.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()
local c = data.characterConstants

local function source(rel)
	local f = assert(io.open(L.pob.vendor .. "/src/" .. rel, "r"), "cannot open " .. rel)
	local text = f:read("*a")
	f:close()
	return text
end

local function need(value, what)
	if value == nil then
		error("constants.lua: " .. what .. " not found in the vendored PoB source; update the pattern")
	end
	return tonumber(value) or value
end

local setup = source("Modules/CalcSetup.lua")
local perform = source("Modules/CalcPerform.lua")

local function levelMod(stat, constant)
	local pattern = 'NewMod%("' .. stat .. '", "BASE", data%.characterConstants%["' .. constant .. '"%], "Base", { type = "Multiplier", var = "Level", base = (%-?%d+) }%)'
	return need(setup:match(pattern), stat .. " per level")
end

local function flatBase(stat, rhs)
	return need(setup:match('NewMod%("' .. stat .. '", "BASE", ' .. rhs .. ', "Base"%)'), stat .. " base")
end

-- `prefix` pins the branch: Life per Strength sits in the `else` of HalvesLifeFromStrength.
local function perAttribute(stat, attr, source, prefix)
	return need(perform:match((prefix or "") .. 'NewMod%("' .. stat .. '", "BASE", output%.' .. attr .. ' %* (%d+) %* inherentAttributeMultiplier, "' .. source .. '"%)'), stat .. " per " .. attr)
end

-- Life = life_per_level x Level + base; Mana likewise. PoB's ModStore applies a Multiplier tag as value x mult + base.
out.life = { perLevel = need(c["life_per_level"], "life_per_level"), base = levelMod("Life", "life_per_level"), perStrength = perAttribute("Life", "Str", "Strength", "else%s+modDB:") }
out.mana = { perLevel = need(c["mana_per_level"], "mana_per_level"), base = levelMod("Mana", "mana_per_level"), perIntelligence = perAttribute("Mana", "Int", "Intelligence") }
out.spirit = { base = flatBase("Spirit", "(%-?%d+)") }
-- base_evasion_rating, checked to be what CalcSetup adds.
need(setup:match('NewMod%("Evasion", "BASE", data%.characterConstants%["base_evasion_rating"%], "Base"%)'), "Evasion base")
out.evasion = { base = need(c["base_evasion_rating"], "base_evasion_rating") }
-- Elemental resistances start at the config's penalty (`resistancePenalty`, default as written in CalcSetup); chaos at a flat base.
out.resistance = {
	penaltyDefault = need(setup:match('NewMod%("FireResist", "BASE", env%.configInput%.resistancePenalty or (%-?%d+), "Base"%)'), "resistance penalty"),
	chaosBase = flatBase("ChaosResist", "(%-?%d+)"),
	max = need(c["base_maximum_all_resistances_%"], "base_maximum_all_resistances_%"),
}

-- Quest rewards as Modules/ConfigOptions.lua offers them: `useConfig == false` rewards are not offered and never apply;
-- a `Stat` reward is a check box that defaults on; an `Options` reward is a list that defaults to nothing.
local quests = L.array()
for _, q in ipairs(data.questRewards or {}) do
	if q.useConfig ~= false then
		quests[#quests + 1] = {
			key = "quest" .. q.Description .. q.Area .. q.Info,
			label = q.Description .. ": " .. q.Area,
			stat = q.Stat,
			options = L.list(q.Options),
		}
	end
end
out.questRewards = quests
L.emit(out)
