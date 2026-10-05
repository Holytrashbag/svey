import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { env } from '../lib/env.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Defaults to a local folder for dev; in production set UPLOADS_DIR to a path
// backed by a persistent volume so avatars survive container rebuilds.
export const UPLOADS_DIR = env.UPLOADS_DIR
  ? path.resolve(env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads')
export const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars')

const uploadsPlugin: FastifyPluginAsync = async (fastify) => {
  fs.mkdirSync(AVATARS_DIR, { recursive: true })

  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  })

  await fastify.register(staticFiles, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })
}

export default fp(uploadsPlugin)
