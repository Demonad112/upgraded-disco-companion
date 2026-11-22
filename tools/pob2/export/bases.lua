-- luajit tools/pob2/export/bases.lua > bases.json
-- Every item base from PoB's loaded data (data.itemBases): type, subType, hidden flag, spawn tags, implicit text,
-- defence / weapon stats and requirements. Feeds packages/data/scripts/build-mod-tiers-pob.mjs.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()

local bases = L.object()
for _, name in ipairs(L.sortedKeys(data.itemBases)) do
	local b = data.itemBases[name]
	bases[name] = {
		type = b.type,
		subType = b.subType,
		hidden = b.hidden and true or false,
		tags = L.set(b.tags) or L.array(),
		implicit = b.implicit,
		armour = L.numbers(b.armour),
		weapon = L.numbers(b.weapon),
		req = L.numbers(b.req) or L.object(),
	}
end
out.bases = bases
L.emit(out)
