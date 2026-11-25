-- Our adapter around PoB2's own HeadlessWrapper (vendor/pob2 is never edited).
-- Loads PoB once per process, then load(xml) / snapshot() any number of builds.
-- Used by snapshot.lua (CLI) and the busted specs in spec/. Needs LuaJIT (jit, bit, ffi) and the lua-utf8 C module.
local ffi = require("ffi")

local M = {}

local function dirname(p)
	return (p:gsub("[/\\][^/\\]*$", ""))
end

ffi.cdef([[
char *getcwd(char *buf, size_t size);
int chdir(const char *path);
]])

local function cwd()
	local buf = ffi.new("char[?]", 4096)
	return ffi.string(ffi.C.getcwd(buf, 4096))
end

local function absolute(p)
	if p:sub(1, 1) == "/" then
		return p
	end
	return cwd() .. "/" .. p
end

-- Repo root from this file's own location: tools/pob2/headless.lua -> ../..
local here = absolute(dirname(debug.getinfo(1, "S").source:sub(2)))
M.root = dirname(dirname(here))
M.vendor = M.root .. "/vendor/pob2"

local loaded = false

-- dkjson writes an empty table as []; maps keyed by stat name must stay {} when empty.
local function object(t)
	return setmetatable(t or {}, { __jsontype = "object" })
end
local function array(t)
	return setmetatable(t or {}, { __jsontype = "array" })
end

-- Mirrors PoB's own CI: LUA_PATH=../runtime/lua/?.lua, cwd = src/, HeadlessWrapper with no argv.
-- Console output from PoB (print/ConPrintf) goes to stderr so stdout stays clean for JSON.
function M.init()
	if loaded then
		return
	end
	package.path = M.vendor .. "/runtime/lua/?.lua;" .. M.vendor .. "/runtime/lua/?/init.lua;" .. package.path
	if ffi.C.chdir(M.vendor .. "/src") ~= 0 then
		error("cannot chdir to " .. M.vendor .. "/src")
	end
	print = function(...)
		local parts = {}
		for i = 1, select("#", ...) do
			parts[i] = tostring((select(i, ...)))
		end
		io.stderr:write(table.concat(parts, "\t"), "\n")
	end
	-- Always use the committed ModCache, as PoB desktop does. HeadlessWrapper skips it when CI is set, which would
	-- make GitHub Actions parse mods live and could differ from a local run.
	local getenv = os.getenv
	os.getenv = function(name)
		if name == "CI" then
			return nil
		end
		return getenv(name)
	end
	local savedArg = arg
	arg = {}
	dofile("HeadlessWrapper.lua")
	arg = savedArg
	os.getenv = getenv
	if not build then
		error("PoB failed to start: " .. M.strip(tostring(launch and launch.promptMsg)))
	end
	loaded = true
end

-- Remove PoB colour codes (^0-^9, ^xRRGGBB).
function M.strip(s)
	return (s:gsub("%^x%x%x%x%x%x%x", ""):gsub("%^%d", ""))
end

local function pendingError()
	local msg = launch.promptMsg
	if msg then
		-- PoB's state is unreliable after an error (the failed build stays in BUILD mode): restart it on next use.
		loaded = false
		msg = M.strip(msg)
		-- launch:ShowErrMsg wraps the message in instructions for the desktop UI; keep only the error itself.
		msg = msg:gsub("^Error:%s*", ""):gsub("\n[^\n]*Press Enter/Escape.*$", ""):gsub("\nv[%w%.]+[^\n]*$", "")
		return (msg:gsub("^%s+", ""):gsub("%s+$", ""))
	end
	return nil
end

function M.newBuild()
	M.init()
	newBuild()
	return pendingError()
end

-- Load an XML export (already decoded; PoB's headless Inflate is a stub). Returns loadError or nil.
function M.load(xml)
	M.init()
	local ok, err = pcall(loadBuildFromXML, xml)
	if ok then
		-- A second frame settles anything queued by the first (same as interacting once in the UI).
		ok, err = pcall(runCallback, "OnFrame")
	end
	if not ok then
		loaded = false
		return M.strip(tostring(err))
	end
	local e = pendingError()
	if e then
		return e
	end
	if not (build.calcsTab and build.calcsTab.mainOutput) then
		return "no calc output after load"
	end
	return nil
end

-- JSON-safe scalar: numbers stay numbers unless non-finite (then "inf"/"-inf"/"nan"); strings and booleans as is.
local function scalar(v)
	local t = type(v)
	if t == "number" then
		if v ~= v then
			return "nan"
		elseif v == math.huge then
			return "inf"
		elseif v == -math.huge then
			return "-inf"
		end
		return v
	elseif t == "string" or t == "boolean" then
		return v
	end
	return nil
end

-- Values PoB writes with tostring(); read them back as numbers where they are numbers.
local function parsed(s)
	local n = tonumber(s)
	if n then
		return scalar(n)
	end
	return s
end

local function fullDpsRows(skillDps)
	local rows = array()
	for _, s in ipairs(skillDps or {}) do
		local count = s.count or 1
		rows[#rows + 1] = {
			name = s.name,
			count = count,
			dps = scalar(s.dps),
			value = scalar(s.dps * count),
			skillPart = s.skillPart or "",
			source = s.source or s.trigger or "",
		}
	end
	return rows
end

-- What PoB would write into an export right now: PlayerStat / MinionStat / FullDPSSkill from build:SaveDB.
local function exported()
	local xmlText = build:SaveDB("x")
	local out = { PlayerStat = object(), MinionStat = object(), FullDPSSkill = array() }
	if not xmlText then
		return out
	end
	local dbXML = common.xml.ParseXML(xmlText)
	for _, node in ipairs(dbXML[1]) do
		if type(node) == "table" and node.elem == "Build" then
			for _, child in ipairs(node) do
				if type(child) == "table" then
					local a = child.attrib or {}
					if child.elem == "PlayerStat" or child.elem == "MinionStat" then
						out[child.elem][a.stat] = parsed(a.value)
					elseif child.elem == "FullDPSSkill" then
						out.FullDPSSkill[#out.FullDPSSkill + 1] = {
							stat = a.stat,
							value = parsed(a.value),
							skillPart = a.skillPart or "",
							source = a.source or "",
						}
					end
				end
			end
		end
	end
	return out
end

local function readPin()
	local f = io.open(M.vendor .. "/PIN.json", "r")
	if not f then
		return {}
	end
	local text = f:read("*a")
	f:close()
	return require("dkjson").decode(text) or {}
end

-- Snapshot of the loaded build. Every displayStats / extraSaveStats key present in mainOutput (childStat keys
-- dotted, e.g. MainHand.Accuracy; MainHand/OffHand live in output.MainHand/OffHand, combined values on output),
-- regardless of the skill-flag filter PoB applies when saving, so the oracle holds the whole recomputed set.
function M.snapshot(loadError)
	local pin = readPin()
	local snap = {
		pobVersion = launch and launch.versionNumber or nil,
		pinCommit = pin.commit,
		loadError = loadError or require("dkjson").null,
	}
	if loadError then
		return snap
	end
	local output = build.calcsTab.mainOutput
	local stats = object()
	for _, d in ipairs(build.displayStats) do
		if d.stat and d.stat ~= "SkillDPS" then
			local v = output[d.stat]
			local key = d.stat
			if d.childStat then
				v = type(v) == "table" and v[d.childStat] or nil
				key = d.stat .. "." .. d.childStat
			end
			v = scalar(v)
			if v ~= nil then
				stats[key] = v
			end
		end
	end
	for _, stat in ipairs(build.extraSaveStats) do
		local v = scalar(output[stat])
		if v ~= nil then
			stats[stat] = v
		end
	end
	if output.Minion then
		for _, d in ipairs(build.minionDisplayStats) do
			if d.stat then
				local v = scalar(output.Minion[d.stat])
				if v ~= nil then
					stats["Minion." .. d.stat] = v
				end
			end
		end
	end
	snap.stats = stats
	snap.fullDpsSkills = fullDpsRows(output.SkillDPS)
	snap.export = exported()
	return snap
end

M.object = object
M.array = array

-- dkjson with every key in sorted order, so the CLI output is deterministic. `compact` drops the indent (data exports).
function M.encode(value, compact)
	local keys, seen = {}, {}
	local function collect(t)
		for k, v in pairs(t) do
			if type(k) == "string" and not seen[k] then
				seen[k] = true
				keys[#keys + 1] = k
			end
			if type(v) == "table" then
				collect(v)
			end
		end
	end
	collect(value)
	table.sort(keys)
	return require("dkjson").encode(value, { indent = not compact, keyorder = keys })
end

return M
