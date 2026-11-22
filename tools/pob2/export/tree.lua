-- luajit tools/pob2/export/tree.lua > tree.json
-- The newest passive tree PoB loads (main.tree[latestTreeVersion], so the same one a new build starts on): classes with
-- their ascendancies and start nodes, and every node with its name, type, stats, position, group, ascendancy and
-- connections. Positions are PoB's own (group position + orbit angle). Feeds packages/data/scripts/build-tree-pob.mjs.
local dir = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") or "."
local L = dofile(dir .. "/lib.lua")
local out = L.header()
local tree = main.tree[latestTreeVersion]
out.treeName = tree.tree

local classes = L.array()
for _, classId in ipairs(L.sortedKeys(tree.classes)) do
	local c = tree.classes[classId]
	local ascendancies = L.array()
	for _, ascId in ipairs(L.sortedKeys(c.ascendancies or {})) do
		local a = c.ascendancies[ascId]
		if type(ascId) == "number" and ascId > 0 then
			ascendancies[#ascendancies + 1] = { id = a.id, name = a.name, internalId = a.internalId, startNodeId = a.startNodeId }
		end
	end
	classes[#classes + 1] = { name = c.name, integerId = c.integerId, startNodeId = c.startNodeId, ascendancies = ascendancies }
end
out.classes = classes

local nodes = L.array()
for _, id in ipairs(L.sortedKeys(tree.nodes)) do
	local n = tree.nodes[id]
	local connections = L.array()
	for _, conn in ipairs(n.connections or {}) do
		if type(conn) == "table" and conn.id then
			connections[#connections + 1] = conn.id
		end
	end
	table.sort(connections)
	nodes[#nodes + 1] = {
		id = n.id,
		name = n.dn,
		type = n.type,
		stats = L.list(n.stats) or L.array(),
		x = n.x,
		y = n.y,
		group = n.g,
		orbit = n.o,
		orbitIndex = n.oidx,
		ascendancyName = n.ascendancyName,
		isAscendancyStart = n.isAscendancyStart or nil,
		isJewelSocket = n.isJewelSocket or nil,
		isOnlyImage = n.isOnlyImage or nil,
		classesStart = L.list(n.classesStart),
		connections = connections,
	}
end
out.nodes = nodes
L.emit(out)
