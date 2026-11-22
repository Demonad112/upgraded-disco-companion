-- luajit tools/pob2/export/mods.lua > mods.json
-- Item and jewel affixes from PoB's loaded data (data.itemMods.Item / .Jewel): per mod id its type (Prefix/Suffix/...),
-- affix name, text lines, level, group and ordered spawn weights. Feeds packages/data/scripts/build-mod-tiers-pob.mjs.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()

local function modTable(src)
	local mods = L.object()
	for _, id in ipairs(L.sortedKeys(src)) do
		local m = src[id]
		if type(m) == "table" and type(m.type) == "string" then
			mods[id] = {
				type = m.type,
				affix = m.affix,
				lines = L.list(m) or L.array(),
				level = m.level,
				group = m.group,
				weightKey = L.list(m.weightKey) or L.array(),
				weightVal = L.list(m.weightVal) or L.array(),
			}
		end
	end
	return mods
end

out.item = modTable(data.itemMods.Item)
-- Data.lua prefixes the text of the radius jewel mods ("Small Passive Skills in Radius also grant ...") after loading.
-- The planner shows the plain mod text, so read the jewel file again, as PoB itself loads it, before that rewrite.
out.jewel = modTable(LoadModule("Data/ModJewel"))
L.emit(out)
