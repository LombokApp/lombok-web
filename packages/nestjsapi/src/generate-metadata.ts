import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins'
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin'
import fs from 'fs/promises'
import path from 'path'

const generator = new PluginMetadataGenerator()

async function main() {
  const generatedDir = path.join(__dirname, 'generated')
  const generatedDirStat = await fs.stat(generatedDir)

  if (!generatedDirStat.isDirectory()) {
    await fs.mkdir(generatedDir)
  }

  generator.generate({
    visitors: [
      new ReadonlyVisitor({
        introspectComments: true,
        pathToSource: __dirname,
      }),
    ],
    outputDir: __dirname,
    printDiagnostics: true,
    tsconfigPath: 'tsconfig.json',
    filename: 'generated/metadata.ts',
  })
}

void main()
