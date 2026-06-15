export interface PortRow {
  host: string
  container: string
  protocol: 'tcp' | 'udp'
}

export interface ContainerConfigState {
  mounts: string
  tmpfs: string
  devices: string
  env: string
  ports: PortRow[]
  networkMode: string
  extraHosts: string
  hostname: string
  domainName: string
  dns: string
  dnsSearch: string
  memoryLimit: string
  cpuShares: string
  cpuQuota: string
  pidsLimit: string
  shmSize: string
  gpuDeviceIds: string
  entrypoint: string
  command: string
  workingDir: string
  user: string
  stopSignal: string
  stopTimeout: string
  restartPolicy: 'no' | 'always' | 'unless-stopped' | 'on-failure' | 'none'
  privileged: boolean
  readOnly: boolean
  capAdd: string
  capDrop: string
  securityOpt: string
  ipcMode: string
  pidMode: string
  cgroupParent: string
  runtime: string
  labels: string
  ulimits: string
  sysctls: string
}
