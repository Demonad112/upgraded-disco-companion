-- The data exporters (tools/pob2/export/*.lua) against the vendored PoB2. Each one is run as its own process, the way
-- scripts/pob2/run.mjs --export runs it, and its JSON is checked for structure, not for particular game values (those
-- change with every data bump; the build scripts and goldens cover them).
local H = dofile((os.getenv("POB2_ROOT") or ".") .. "/tools/pob2/spec/helper.lua")
package.path = H.root .. "/vendor/pob2/runtime/lua/?.lua;" .. package.path
local json = require("dkjson")

local function readAll(path)
	local f = assert(io.open(path, "r"))
	local text = f:read("*a")
	f:close()
	return text
end

local pin = json.decode(readAll(H.root .. "/vendor/pob2/PIN.json"))

local cache = {}
local function raw(name)
	if not cache[name] then
		local p = assert(io.popen("cd '" .. H.root .. "' && luajit tools/pob2/export/" .. name .. ".lua 2>/dev/null"))
		cache[name] = p:read("*a")
		p:close()
	end
	return cache[name]
end

local function export(name)
	local data, _, err = json.decode(raw(name))
	assert(data, name .. ": " .. tostring(err))
	return data
end

describe("export helpers", function()
	local L = dofile(H.root .. "/tools/pob2/export/lib.lua")
	local enum = { Attack = 1, Spell = 2, Hit = 4, Melee = 256, MeleeHit = 260 }

	it("names a bitfield: an exact match is that name, anything else splits into its single bits", function()
		assert.are.same({}, L.flagNames(0, enum))
		assert.are.same({ "Hit" }, L.flagNames(4, enum))
		assert.are.same({ "MeleeHit" }, L.flagNames(260, enum))
		assert.are.same({ "Attack", "Hit" }, L.flagNames(5, enum))
	end)

	it("reverses an enum, keeping the first sorted name for a duplicated value", function()
		local names = L.reverse({ B = 1, A = 1, C = 2 })
		assert.are.equal("A", names[1])
		assert.are.equal("C", names[2])
	end)

	it("copies sets and numeric tables in sorted order and drops what is not a number", function()
		assert.are.same({ "a", "c" }, L.set({ c = true, a = true, b = false }))
		assert.are.same({ a = 1, b = 2 }, L.numbers({ b = 2, a = 1, c = "x" }))
		assert.is_nil(L.numbers(nil))
		assert.are.same({ "x", 2 }, L.list({ "x", 2, {} }))
	end)
end)

describe("exporters", function()
	it("stamp the PoB version and tree the pin names", function()
		for _, name in ipairs({ "mods", "bases", "skills", "tree" }) do
			local data = export(name)
			assert.are.equal(pin.manifestVersion, data.pobVersion, name)
			assert.are.equal(pin.latestTreeVersion, data.treeVersion, name)
		end
	end)

	it("mods: prefixes and suffixes with level, group, text and paired spawn weights", function()
		local data = export("mods")
		local prefixes, suffixes, count = 0, 0, 0
		for _, mod in pairs(data.item) do
			count = count + 1
			if mod.type == "Prefix" then
				prefixes = prefixes + 1
			elseif mod.type == "Suffix" then
				suffixes = suffixes + 1
			end
			assert.are.equal(#mod.weightKey, #mod.weightVal)
		end
		assert.is_true(count > 2000)
		assert.is_true(prefixes > 500 and suffixes > 500)
		assert.is_true(next(data.jewel) ~= nil)
		for id, mod in pairs(data.jewel) do
			-- the jewel file is read before Data.lua rewrites the radius jewel text
			assert.is_nil((mod.lines[1] or ""):find("Passive Skills in Radius also grant", 1, true), id)
		end
	end)

	it("bases: type, sorted tags, requirements and defence or weapon tables", function()
		local data = export("bases")
		local count, withArmour, withWeapon = 0, 0, 0
		for name, base in pairs(data.bases) do
			count = count + 1
			assert.is_string(base.type, name)
			assert.is_table(base.tags, name)
			assert.is_table(base.req, name)
			assert.is_boolean(base.hidden, name)
			withArmour = withArmour + (base.armour and 1 or 0)
			withWeapon = withWeapon + (base.weapon and 1 or 0)
		end
		assert.is_true(count > 1000)
		assert.is_true(withArmour > 500 and withWeapon > 100)
	end)

	it("skills: socketable supports with skill-type names, and actives with their types", function()
		local data = export("skills")
		assert.is_true(#data.supports > 400)
		for _, s in ipairs(data.supports) do
			assert.is_string(s.name, s.id)
			assert.is_number(s.tier, s.id)
			assert.is_table(s.requireSkillTypes, s.id)
			for _, t in ipairs(s.requireSkillTypes) do
				assert.is_string(t, s.id)
				assert.is_nil(tonumber(t), s.id) -- a SkillType name, not a leaked number
			end
		end
		local actives = 0
		for _, types in pairs(data.actives) do
			actives = actives + 1
			assert.is_true(#types > 0)
		end
		assert.is_true(actives > 200)
	end)

	it("tree: every class start, ids and positions, and connections that are node ids", function()
		local data = export("tree")
		assert.is_true(#data.nodes > 4000)
		assert.is_true(#data.classes >= 6)
		local starts = 0
		for _, n in ipairs(data.nodes) do
			assert.is_number(n.id)
			assert.is_number(n.x, tostring(n.id))
			assert.is_number(n.y, tostring(n.id))
			assert.is_table(n.connections)
			if n.type == "ClassStart" then
				starts = starts + 1
				assert.is_table(n.classesStart)
			end
		end
		assert.is_true(starts >= 6)
	end)

	it("are deterministic: a second run is byte-identical", function()
		local first = raw("bases")
		local p = assert(io.popen("cd '" .. H.root .. "' && luajit tools/pob2/export/bases.lua 2>/dev/null"))
		local second = p:read("*a")
		p:close()
		assert.is_true(first == second)
	end)
end)
