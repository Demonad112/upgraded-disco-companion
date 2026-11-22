-- Shared by tools/pob2/export/{mods,bases,skills,tree}.lua. Loads PoB2 headless (vendor/pob2, unmodified) once and
-- gives the exporters small helpers. Exporters build plain tables from PoB's loaded data (never encode PoB's own tables:
-- tree nodes and groups point at each other) and write one JSON document to stdout; PoB's console output goes to stderr.
--
-- Run through scripts/pob2/run.mjs (`node scripts/pob2/run.mjs --export <mods|bases|skills|tree>`), which picks local
-- LuaJIT or PoB's tests image, exactly like the snapshot runner.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
-- headless.lua finds the repo root from its own path, so give it a normalised one (tools/pob2/headless.lua).
local pob = dofile((dir:gsub("[/\\]export$", "")) .. "/headless.lua")

local L = { pob = pob, object = pob.object, array = pob.array }

-- Keys of a table in a stable order (numbers by value, everything else by its string form).
function L.sortedKeys(t)
	local keys = {}
	for k in pairs(t) do
		keys[#keys + 1] = k
	end
	table.sort(keys, function(a, b)
		if type(a) == "number" and type(b) == "number" then
			return a < b
		end
		return tostring(a) < tostring(b)
	end)
	return keys
end

-- A Lua list as a JSON array (strings and numbers only); nil gives nil so absent fields stay absent.
function L.list(t)
	if type(t) ~= "table" then
		return nil
	end
	local out = L.array()
	for _, v in ipairs(t) do
		if type(v) == "string" or type(v) == "number" or type(v) == "boolean" then
			out[#out + 1] = v
		end
	end
	return out
end

-- The keys of a { name = true } set, sorted.
function L.set(t)
	if type(t) ~= "table" then
		return nil
	end
	local out = L.array()
	for _, k in ipairs(L.sortedKeys(t)) do
		if t[k] then
			out[#out + 1] = tostring(k)
		end
	end
	return out
end

-- { [name] = number } with numeric values only, or nil.
function L.numbers(t)
	if type(t) ~= "table" then
		return nil
	end
	local out = L.object()
	for _, k in ipairs(L.sortedKeys(t)) do
		if type(t[k]) == "number" then
			out[tostring(k)] = t[k]
		end
	end
	return out
end

-- value -> name for an enum table of numbers (SkillType). The first name in sorted order wins a duplicated value.
function L.reverse(enum)
	local out = {}
	for _, name in ipairs(L.sortedKeys(enum)) do
		local v = enum[name]
		if type(v) == "number" and out[v] == nil then
			out[v] = name
		end
	end
	return out
end

-- Names of a ModFlag / KeywordFlag bitfield, in the shape the regex scripts read from PoB's source text: an exact
-- match for a named flag (including composites such as MeleeHit) is that name; anything else splits into the
-- single-bit flags it contains, lowest bit first. 0 gives an empty list.
function L.flagNames(value, enum)
	local out = L.array()
	if type(value) ~= "number" or value == 0 then
		return out
	end
	for _, name in ipairs(L.sortedKeys(enum)) do
		if enum[name] == value then
			out[1] = name
			return out
		end
	end
	local singles = {}
	for _, name in ipairs(L.sortedKeys(enum)) do
		local v = enum[name]
		if type(v) == "number" and v > 0 and bit.band(v, v - 1) == 0 and bit.band(value, v) ~= 0 then
			singles[#singles + 1] = { name = name, v = v }
		end
	end
	table.sort(singles, function(a, b)
		return a.v < b.v
	end)
	for _, s in ipairs(singles) do
		out[#out + 1] = s.name
	end
	return out
end

function L.emit(value)
	io.stdout:write(pob.encode(value, true), "\n")
	io.stdout:flush()
end

-- Common header: which PoB the data came from.
function L.header()
	pob.init()
	return { pobVersion = launch and launch.versionNumber or nil, treeVersion = latestTreeVersion }
end

return L
