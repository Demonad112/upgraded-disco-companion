-- LuaJIT / Lua 5.1 compatibility for running PoB2 (vendor/pob2, unmodified) on Lua 5.4 in WASM (wasmoon).
-- Loaded before HeadlessWrapper.lua. Only what PoB2's calc path uses: unpack, loadstring, math.pow, bit, jit,
-- math.atan2, table.maxn, lua-utf8, and LuaJIT's lenient string.format (%d of a float truncates instead of erroring).

__lua54_empty = setmetatable({}, { __newindex = function() error("write to __lua54_empty") end })
unpack = unpack or table.unpack
loadstring = loadstring or load
math.pow = math.pow or function(a, b) return a ^ b end
math.atan2 = math.atan2 or math.atan
table.maxn = table.maxn or function(t) local n = 0 for k in pairs(t) do if type(k) == "number" and k > n then n = k end end return n end

local function i32(x)
	x = math.tointeger(x) or math.tointeger(x >= 0 and math.floor(x) or math.ceil(x)) or 0
	x = x & 0xFFFFFFFF
	if x >= 0x80000000 then x = x - 0x100000000 end
	return x
end
local function fold(op)
	return function(a, ...)
		local r = i32(a)
		for i = 1, select("#", ...) do r = op(r, i32((select(i, ...)))) end
		return i32(r)
	end
end
bit = {
	tobit = i32,
	band = fold(function(a, b) return a & b end),
	bor = fold(function(a, b) return a | b end),
	bxor = fold(function(a, b) return a ~ b end),
	bnot = function(a) return i32(~i32(a)) end,
	lshift = function(a, n) return i32(i32(a) << (i32(n) & 31)) end,
	rshift = function(a, n) return i32((i32(a) & 0xFFFFFFFF) >> (i32(n) & 31)) end,
	arshift = function(a, n) return i32(i32(a) >> (i32(n) & 31) | (i32(a) < 0 and ~(0xFFFFFFFF >> (i32(n) & 31)) or 0)) end,
	rol = function(a, n) n = i32(n) & 31; local x = i32(a) & 0xFFFFFFFF; return i32(((x << n) | (x >> (32 - n))) & 0xFFFFFFFF) end,
	ror = function(a, n) n = i32(n) & 31; local x = i32(a) & 0xFFFFFFFF; return i32(((x >> n) | (x << (32 - n))) & 0xFFFFFFFF) end,
	bswap = function(a) local x = i32(a) & 0xFFFFFFFF; return i32(((x & 0xFF) << 24) | ((x & 0xFF00) << 8) | ((x >> 8) & 0xFF00) | (x >> 24)) end,
	tohex = function(a, n) return string.format("%0" .. (n or 8) .. "x", i32(a) & 0xFFFFFFFF) end,
}
bit["and"], bit["or"] = bit.band, bit.bor
package.preload["bit"] = function() return bit end

local noop = function() end
jit = { off = noop, on = noop, flush = noop, opt = { start = noop }, version = "wasm", status = function() return false end }
package.preload["jit"] = function() return jit end

-- lua-utf8: codepoint-aware where PoB relies on it (sub/len/reverse/next); pattern functions fall back to bytes.
local u = {}
for k, v in pairs(string) do u[k] = v end
function u.len(s, i, j) return utf8.len(s, i, j) or #s end
function u.sub(s, i, j)
	local n = utf8.len(s) or #s
	i = i or 1; j = j or -1
	if i < 0 then i = n + i + 1 end
	if j < 0 then j = n + j + 1 end
	if i < 1 then i = 1 end
	if j > n then j = n end
	if i > j then return "" end
	local a = utf8.offset(s, i) or 1
	local b = (utf8.offset(s, j + 1) or (#s + 1)) - 1
	return s:sub(a, b)
end
function u.reverse(s)
	local t = {}
	for _, c in utf8.codes(s) do table.insert(t, 1, utf8.char(c)) end
	return table.concat(t)
end
function u.next(s, i)
	i = i or 0
	local nx = i == 0 and 1 or utf8.offset(s, 2, i)
	if not nx or nx > #s then return nil end
	return nx, utf8.codepoint(s, nx)
end
u.char, u.codepoint, u.offset, u.codes = utf8.char, utf8.codepoint, utf8.offset, utf8.codes
package.preload["lua-utf8"] = function() return u end

-- LuaJIT's string.format accepts a non-integral number for %d/%x/%c (truncating); Lua 5.4 raises.
local format = string.format
string.format = function(fmt, ...)
	local n = select("#", ...)
	if n == 0 or type(fmt) ~= "string" then return format(fmt, ...) end
	local args = { ... }
	local i = 0
	for spec in fmt:gmatch("%%[-+ #0]*%d*%.?%d*([%a%%])") do
		if spec ~= "%" then
			i = i + 1
			local v = args[i]
			if (spec == "d" or spec == "i" or spec == "x" or spec == "X" or spec == "o" or spec == "c") and type(v) == "number" and not math.tointeger(v) then
				args[i] = v >= 0 and math.floor(v) or math.ceil(v)
				if args[i] ~= args[i] or args[i] == math.huge or args[i] == -math.huge then args[i] = 0 end
			end
		end
	end
	return format(fmt, table.unpack(args, 1, n))
end
