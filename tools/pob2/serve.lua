-- luajit tools/pob2/serve.lua   (long-lived worker for services/pob-engine)
-- Loads PoB2 headless once (vendor/pob2, unmodified), then answers builds over stdin/stdout until stdin closes:
--   request:  "<byte count>\n" followed by that many bytes of decoded PoB export XML (<PathOfBuilding2>)
--   response: one compact JSON line { snapshot, groups } (snapshot.lua's and groups.lua's shapes), or { error }
-- The first line written is { ready = true, pobVersion, pinCommit } once PoB has started. PoB's console goes to stderr.
-- Each build is loaded once: the snapshot is taken right after the load, then every skill group is recalculated.
local script = debug.getinfo(1, "S").source:sub(2)
local dir = script:match("^(.*)[/\\]") or "."
local pob = dofile(dir .. "/headless.lua")
local groupsLib = dofile(dir .. "/groups_lib.lua")
local out = io.stdout

local function reply(t)
	out:write(pob.encode(t, true), "\n")
	out:flush()
end

-- Start PoB before reading anything: HeadlessWrapper may io.read on a startup error.
local ok, err = pcall(pob.init)
if not ok then
	io.stderr:write("serve.lua: PoB failed to start: ", tostring(err), "\n")
	os.exit(3)
end
local hello = pob.snapshot("startup") -- pobVersion / pinCommit only
reply(pob.object({ ready = true, pobVersion = hello.pobVersion, pinCommit = hello.pinCommit }))

while true do
	local header = io.read("*l")
	if not header then break end
	local n = tonumber(header)
	if not n or n < 0 then
		reply(pob.object({ error = "bad frame header" }))
		break -- the stream is out of step; the parent restarts the worker
	end
	local xml = io.read(n) or ""
	if not xml:find("<PathOfBuilding2", 1, true) then
		reply(pob.object({ error = "not a PoB2 export XML" }))
	else
		local snap
		local done, res = pcall(groupsLib.run, pob, xml, function(loadError)
			snap = pob.snapshot(loadError)
		end)
		if done then
			reply(pob.object({ snapshot = snap, groups = res }))
		else
			reply(pob.object({ error = pob.strip(tostring(res)) }))
		end
	end
	collectgarbage("collect")
end
