import { z } from 'zod'

export const dockerResourceConfigDataSchema = z.object({
  volumes: z.string().array().optional(),
  env: z.record(z.string(), z.string()).optional(),
  gpus: z
    .object({ driver: z.string(), deviceIds: z.string().array() })
    .optional(),
  extraHosts: z.string().array().optional(),
  networkMode: z.string().nonempty().optional(),
  capAdd: z.string().array().optional(),
  capDrop: z.string().array().optional(),
  securityOpt: z.string().array().optional(),
  ports: z
    .array(
      z.object({
        host: z.number().positive().max(65535),
        container: z.number().positive().max(65535),
        protocol: z.enum(['tcp', 'udp']).default('tcp'),
      }),
    )
    .optional(),
  restartPolicy: z
    .enum(['no', 'always', 'unless-stopped', 'on-failure'])
    .optional(),
  shmSize: z.number().positive().optional(),
  tmpfs: z.record(z.string(), z.string()).optional(),
  devices: z.string().array().optional(),
  ulimits: z
    .record(z.string(), z.object({ soft: z.number(), hard: z.number() }))
    .optional(),
  sysctls: z.record(z.string(), z.string()).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  privileged: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  user: z.string().optional(),
  workingDir: z.string().optional(),
  hostname: z.string().optional(),
  domainName: z.string().optional(),
  dns: z.string().array().optional(),
  dnsSearch: z.string().array().optional(),
  entrypoint: z.string().array().optional(),
  command: z.string().array().optional(),
  stopSignal: z.string().optional(),
  stopTimeout: z.number().optional(),
  memoryLimit: z.number().positive().optional(),
  cpuShares: z.number().positive().optional(),
  cpuQuota: z.number().optional(),
  pidsLimit: z.number().positive().optional(),
  ipcMode: z.string().optional(),
  pidMode: z.string().optional(),
  cgroupParent: z.string().optional(),
  runtime: z.string().optional(),
})
