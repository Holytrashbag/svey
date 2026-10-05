import Fastify from 'fastify'
import app from './app.ts'
import { env } from './lib/env.ts'

const isProd = env.NODE_ENV === 'production'

const server = Fastify({
  logger: {
    level: 'info',
    // Data minimisation (Art. 5/32 DSGVO): in production keep per-request logs
    // for operations but strip the client IP and port, so routine server logs
    // contain no personal data. In dev the IP is kept to ease debugging.
    ...(isProd
      ? { redact: { paths: ['req.remoteAddress', 'req.remotePort'], remove: true } }
      : {}),
  },
})

server.register(app)

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})
