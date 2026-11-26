// Worker in front of the pob-engine container. Every request goes to one named instance, so PoB is loaded once and
// the service's own cache, rate limit and queue apply to all callers. The container (services/pob-engine/src/app.mjs)
// does the CORS, origin allowlist and limits; this only forwards. It sleeps after 15 minutes without a request; the
// next request then waits for PoB to start (~3 s plus the container's own start).
import { Container, getContainer } from '@cloudflare/containers'

export class PobEngine extends Container {
  defaultPort = 8080
  sleepAfter = '15m'
  envVars = { PORT: '8080' }
}

export default {
  async fetch(request, env) {
    return getContainer(env.ENGINE, 'main').fetch(request)
  },
}
