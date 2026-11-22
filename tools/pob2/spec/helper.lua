-- Shared by the specs: the headless adapter and the decoded fixtures written by `npm run pob2:spec`.
-- POB2_ROOT is the repo root (run.mjs sets it); PoB chdirs into vendor/pob2/src, so relative paths don't survive.
local root = os.getenv("POB2_ROOT") or "."
local H = { root = root, pob = dofile(root .. "/tools/pob2/headless.lua") }

function H.fixtures()
	local list = {}
	local index = io.open(root .. "/tools/pob2/spec/.fixtures/index.txt", "r")
	if index then
		for name in index:lines() do
			if name ~= "" then
				list[#list + 1] = name
			end
		end
		index:close()
	end
	return list
end

function H.read(name)
	local f = assert(io.open(root .. "/tools/pob2/spec/.fixtures/" .. name, "r"))
	local text = f:read("*a")
	f:close()
	return text
end

return H
