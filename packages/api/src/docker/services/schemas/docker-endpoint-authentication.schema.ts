import z from 'zod'

export enum DockerEndpointAuthType {
  Basic = 'basic',
  Bearer = 'bearer',
}

export const dockerEndpointAuthenticationSchema = z.discriminatedUnion(
  'authenticationType',
  [
    z.object({
      authenticationType: z.literal(DockerEndpointAuthType.Basic),
      username: z.string(),
      password: z.string(),
    }),
    z.object({
      authenticationType: z.literal(DockerEndpointAuthType.Bearer),
      apiKey: z.string(),
    }),
  ],
)

export type DockerEndpointAuth = z.infer<
  typeof dockerEndpointAuthenticationSchema
>
