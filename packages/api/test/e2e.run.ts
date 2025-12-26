import Bun from 'bun'

async function main() {
  const args =
    Bun.argv.length > 2 ? Bun.argv.slice(2) : ['./src/**/*.e2e-spec.ts']
  const expandedArgs: string[] = []

  for (const arg of args) {
    const glob = new Bun.Glob(arg)
    let matched = false

    for await (const match of glob.scan('.')) {
      expandedArgs.push(match)
      matched = true
    }

    if (!matched) {
      expandedArgs.push(arg)
    }
  }

  await Bun.spawn(['bun', 'install'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  await Bun.spawn(['bun', './test/e2e.setup.ts'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  await Bun.spawn(['bun', 'test', ...expandedArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited
}

void main()
