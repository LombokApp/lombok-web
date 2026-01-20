import z from 'zod'

export enum DockerEndpointAuthType {
  Basic = 'basic',
  Bearer = 'bearer',
}

export const dockerEndpointAuthenticationSchema = z.discriminatedUnion(
  'authType',
  [
    z.object({
      authType: z.literal(DockerEndpointAuthType.Basic),
      username: z.string(),
      password: z.string(),
    }),
    z.object({
      authType: z.literal(DockerEndpointAuthType.Bearer),
      apiKey: z.string(),
    }),
  ],
)

export const dockerRegistryAuthenticationSchema = z.object({
  username: z.string(),
  password: z.string(),
  email: z.string().optional(),
  serverAddress: z.string(),
})

export type DockerEndpointAuth = z.infer<
  typeof dockerEndpointAuthenticationSchema
>

export type DockerRegistryAuth = z.infer<
  typeof dockerRegistryAuthenticationSchema
>
