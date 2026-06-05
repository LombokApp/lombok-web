import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// ─── Bridge tunnel session ──────────────────────────────────────────────────

export const dockerSessionDTOSchema = z
  .object({
    id: z.string(),
    containerId: z.string(),
    hostId: z.string().nullable(),
    mode: z.string(),
    state: z.string(),
    protocol: z.string(),
    tty: z.boolean(),
    command: z.array(z.string()),
    agentReady: z.boolean(),
    publicId: z.string().nullable(),
    label: z.string(),
    appId: z.string().nullable(),
    clientCount: z.number(),
    createdAt: z.number(),
    lastActivityAt: z.number(),
  })
  .meta({ id: 'DockerSession' })

export type DockerSessionDTO = z.infer<typeof dockerSessionDTOSchema>

export class DockerSessionListResponse extends createZodDto(
  z.object({ result: z.array(dockerSessionDTOSchema) }),
) {}

// ─── Bridge process log entry ───────────────────────────────────────────────

export const bridgeLogEntryDTOSchema = z
  .object({
    seq: z.number(),
    source: z.enum(['stdout', 'stderr']),
    level: z.enum(['debug', 'info', 'warn', 'error', 'unknown']),
    ts: z.string(),
    msg: z.string(),
    fields: z.record(z.string(), z.unknown()).optional(),
    raw: z.string().optional(),
  })
  .meta({ id: 'BridgeLogEntry' })

export type BridgeLogEntryDTO = z.infer<typeof bridgeLogEntryDTOSchema>

export class BridgeLogListResponse extends createZodDto(
  z.object({ result: z.array(bridgeLogEntryDTOSchema) }),
) {}
