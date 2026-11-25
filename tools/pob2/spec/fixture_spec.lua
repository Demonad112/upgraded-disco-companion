local H = dofile((os.getenv("POB2_ROOT") or ".") .. "/tools/pob2/spec/helper.lua")

describe("decoded fixtures", function()
	local fixtures = H.fixtures()

	it("exist (npm run pob2:spec decodes packages/core/test/reference/<name>/code.txt)", function()
		assert.is_true(#fixtures > 0)
	end)

	for _, name in ipairs(fixtures) do
		it(name .. " loads with no loadError", function()
			local err = H.pob.load(H.read(name))
			assert.is_nil(err)
			local snap = H.pob.snapshot(err)
			assert.is_true(snap.stats.Life > 0)
			assert.is_number(snap.export.PlayerStat.Life)
		end)
	end
end)
