# PoB2 calc engine. Build from the repository root (the image needs vendor/pob2 and tools/pob2):
#   docker build -f services/pob-engine/Dockerfile -t pob-engine .
#   docker run --rm -p 8080:8080 pob-engine
# LuaJIT is built at the commit PoB's own tests image pins (PoB2 uses compound assignment, `x += 1`, which distro
# LuaJIT packages cannot parse) with luautf8 0.1.6, the same as scripts/pob2/install-luajit.sh.
FROM debian:bookworm-slim AS lua
ARG LUAJIT_COMMIT=2460b3ff93a1c955de3d62cfc825de7d68dc272e
ARG LUAUTF8=0.1.6-1
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends build-essential ca-certificates git luarocks >/dev/null
RUN git clone -q --filter=blob:none https://github.com/LuaJIT/LuaJIT /src/LuaJIT \
 && git -C /src/LuaJIT checkout -q "$LUAJIT_COMMIT" \
 && make -C /src/LuaJIT -j"$(nproc)" >/dev/null \
 && make -C /src/LuaJIT install PREFIX=/usr/local >/dev/null \
 && ln -sf "$(ls /usr/local/bin/luajit-2.1.* | head -1)" /usr/local/bin/luajit
RUN luarocks --lua-version=5.1 --lua-dir=/usr/local LUA_INCDIR=/usr/local/include/luajit-2.1 install luautf8 "$LUAUTF8" >/dev/null \
 && luajit -e 'local a = 1; a += 1; assert(a == 2); require("lua-utf8")'

FROM node:22-bookworm-slim
COPY --from=lua /usr/local/bin/luajit* /usr/local/bin/
COPY --from=lua /usr/local/lib/libluajit* /usr/local/lib/
COPY --from=lua /usr/local/share/luajit-2.1 /usr/local/share/luajit-2.1
COPY --from=lua /usr/local/lib/lua /usr/local/lib/lua
RUN ldconfig && luajit -e 'local a = 1; a += 1; require("lua-utf8")'
WORKDIR /app
COPY vendor/pob2 vendor/pob2
COPY tools/pob2 tools/pob2
COPY services/pob-engine services/pob-engine
ENV NODE_ENV=production POB_ROOT=/app PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "services/pob-engine/src/server.mjs"]
