import type { createFFmpeg } from '@ffmpeg/ffmpeg'
import { extensionFromMimeType } from '@stellariscloud/utils'
import { v4 as uuidV4 } from 'uuid'

import type { MediaDimensions } from './image'
import { ScriptLoader } from './script-loader'

declare const createFFmpegCore: any
declare const importScripts: undefined | ((cp: string) => void)

// FFMPEG class - which was former createFFmpeg in ffmpeg/ffmpeg

interface Progress {
  duration?: number
  ratio: number
  time?: number
}

const defaultArgs = [
  /* args[0] is always the binary path */
  './ffmpeg',
  /* Disable interaction mode */
  '-nostdin',
  /* Force to override output file */
  '-y',
]

export class FFmpegWrapper {
  private core?: any
  private lastRunLogs: string[] = []
  private coreFetchStarted: boolean = false
  private ffmpeg?: ReturnType<typeof createFFmpeg>['run']
  private runResolve?: (result: any) => void
  private running = false
  private duration = 0
  private ratio = 0
  constructor(
    private readonly settings: {
      log?: boolean
      corePath: any
      progress: (progress: Progress) => void
    },
  ) {}

  async load(host: string) {
    this.log('info', 'load ffmpeg-core')
    if (!this.core && !this.coreFetchStarted) {
      this.coreFetchStarted = true
      this.log('info', 'loading ffmpeg-core')

      /*
       * In node environment, all paths are undefined as there
       * is no need to set them.
       */
      const res = await this.getCreateFFmpegCore({
        ...this.settings,
        corePath: `${host}${this.settings.corePath}`,
      })
      this.core = await res.createFFmpegCore({
        /*
         * Assign mainScriptUrlOrBlob fixes chrome extension web worker issue
         * as there is no document.currentScript in the context of content_scripts
         */
        mainScriptUrlOrBlob: res.corePath,
        printErr: (message: string) => {
          this.lastRunLogs.push(message)
          this.parseMessage({ type: 'fferr', message })
        },
        print: (message: string) => {
          this.lastRunLogs.push(message)
          this.parseMessage({ type: 'ffout', message })
        },
        /*
         * locateFile overrides paths of files that is loaded by main script (ffmpeg-core.js).
         * It is critical for browser environment and we override both wasm and worker paths
         * as we are using blob URL instead of original URL to avoid cross origin issues.
         */
        locateFile: (path: string, prefix: string) => {
          if (
            typeof res.wasmPath !== 'undefined' &&
            path.endsWith('ffmpeg-core.wasm')
          ) {
            return res.wasmPath
          }
          if (
            typeof res.workerPath !== 'undefined' &&
            path.endsWith('ffmpeg-core.worker.js')
          ) {
            return res.workerPath
          }
          return prefix + path
        },
      })
      this.ffmpeg = this.core.cwrap('proxy_main', 'number', [
        'number',
        'number',
      ])
      this.log('info', 'ffmpeg-core loaded')
    } else {
      throw Error(
        'ffmpeg.wasm was loaded, you should not load it again, use ffmpeg.isLoaded() to check next time.',
      )
    }
  }

  public writeFile(fileName: string, buffer: Uint8Array) {
    if (!this.core) {
      throw new Error('Cannot load.')
    } else {
      let ret = null
      try {
        ret = this.core.FS.writeFile(...[fileName, buffer])
      } catch (e) {
        throw Error('Oops, something went wrong in FS operation.')
      }
      return ret
    }
  }

  public readFile(fsFileName: string) {
    if (!this.core) {
      throw new Error('Cannot load.')
    } else {
      let ret = null
      try {
        ret = this.core.FS.readFile(...[fsFileName])
      } catch (e) {
        console.error(e)
        throw Error(
          `ffmpeg.FS('readFile', '${fsFileName}') error. Check if the path exists`,
        )
      }
      return ret
    }
  }

  public unlink(fsFileName: string) {
    if (!this.core) {
      throw new Error('Cannot load.')
    } else {
      let ret = null
      try {
        ret = this.core.FS.unlink(...[fsFileName])
      } catch (e) {
        throw Error(
          `ffmpeg.FS('unlink', '${fsFileName}') error. Check if the path exists`,
        )
      }
      return ret
    }
  }

  public ls(dirName: string) {
    if (!this.core) {
      throw new Error('Cannot load.')
    } else {
      let ret = null
      try {
        ret = this.core.FS.readdir(dirName)
      } catch (e) {
        throw Error(
          `ffmpeg.FS('reddir', '${dirName}') error. Check if the path exists`,
        )
      }
      return ret
    }
  }

  async run(..._args: string[]) {
    this.lastRunLogs = []
    this.log('info', `run ffmpeg command: ${_args.join(' ')}`)
    if (!this.core) {
      throw new Error('Cannot load.')
    } else if (this.running) {
      throw Error('ffmpeg.wasm can only run one command at a time')
    } else {
      this.running = true
      if (this.ffmpeg) {
        const args = [...defaultArgs, ..._args].filter((s) => s.length !== 0)
        const parsedArgs = FFmpegWrapper.parseArgs(this.core, args)
        void this.ffmpeg.apply(this.core, parsedArgs)
      }
      return new Promise((resolve) => {
        this.runResolve = resolve
      })
    }
  }

  async getMediaDimensions(blob: Blob): Promise<MediaDimensions> {
    const fileId = uuidV4()
    const inputFilename = `/${fileId}.${extensionFromMimeType(blob.type)}`
    this.writeFile(inputFilename, new Uint8Array(await blob.arrayBuffer()))
    await this.run('-i', inputFilename)
    const inputStreamLines = this.lastRunLogs.filter(
      (log) =>
        log.trim().startsWith('Stream #') ||
        log.trim().startsWith('Duration: '),
    )
    const dimensions = { height: 0, width: 0, lengthMilliseconds: 0 }

    // parse the width and height
    const _ = inputStreamLines.find((inputStreamLine) => {
      const dimensionsToken = inputStreamLine
        .split(',')
        .reduce<string[]>((acc, next) => [...acc, ...next.split(' ')], [])
        .find((part) => {
          const partParts = part.trim().split('x')
          if (
            partParts.length === 2 &&
            `${parseInt(partParts[0], 10)}` === partParts[0] &&
            `${parseInt(partParts[1], 10)}` === partParts[1]
          ) {
            dimensions.width = parseInt(partParts[0], 10)
            dimensions.height = parseInt(partParts[1], 10)
            return true
          }
        })
      if (dimensionsToken) {
        return true
      }
    })

    // parse the duration (in the case of a video)
    const __ = inputStreamLines.find((inputStreamLine) => {
      const parts = inputStreamLine.split(',')
      const part = parts[0]?.trim()
      // console.log('LENGTH: part', part)
      if (part.startsWith('Duration: ')) {
        // Duration: 00:00:04.99
        const timePart = part.slice(10)
        const [hrs, mins, seconds] = timePart.split(':')
        // console.log('LENGTH: hrs, mins, seconds:', hrs, mins, seconds)
        const ms =
          parseFloat(seconds) * 1000 +
          parseInt(mins, 10) * 1000 * 60 +
          parseInt(hrs, 10) * 1000 * 60 * 60
        dimensions.lengthMilliseconds = ms
        // console.log('LENGTH:', dimensions.length)
        return true
      }
    })

    this.unlink(inputFilename)
    return dimensions
  }

  exit() {
    if (!this.core) {
      throw new Error('Cannot load.')
    } else {
      this.log('info', 'Exiting...')
      this.running = false
      try {
        this.core.exit(0)
      } catch (e) {
        /* ignore quit errors */
      }
      this.core = undefined
      this.ffmpeg = undefined
      this.runResolve = undefined
    }
  }

  get isLoaded(): boolean {
    return this.core !== null
  }

  private parseMessage({ type, message }: { type: string; message: string }) {
    this.log(type, message)
    this.parseProgress(message, this.settings.progress)
    this.detectCompletion(message)
  }

  private detectCompletion(message: string) {
    if (message === 'FFMPEG_END' && this.runResolve) {
      this.runResolve(true)
      this.runResolve = undefined
      this.running = false
    }
  }

  private static parseArgs(Core: any, args: string[]): string[] {
    const argsPtr = Core._malloc(args.length * Uint32Array.BYTES_PER_ELEMENT)
    args.forEach((s, idx) => {
      const buf = Core._malloc(s.length + 1)
      Core.writeAsciiToMemory(s, buf)
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      Core.setValue(argsPtr + Uint32Array.BYTES_PER_ELEMENT * idx, buf, 'i32')
    })
    return [args.length, argsPtr]
  }

  private ts2sec(ts: string) {
    const [h, m, s] = ts.split(':')
    return parseFloat(h) * 60 * 60 + parseFloat(m) * 60 + parseFloat(s)
  }

  private parseProgress(
    message: string,
    progress: (progress: Progress) => void,
  ) {
    if (typeof message === 'string') {
      if (message.startsWith('  Duration')) {
        const ts = message.split(', ')[0].split(': ')[1]
        const d = this.ts2sec(ts)
        progress({ duration: d, ratio: this.ratio })
        if (this.duration === 0 || this.duration > d) {
          this.duration = d
        }
      } else if (message.startsWith('frame') || message.startsWith('size')) {
        const ts = message.split('time=')[1].split(' ')[0]
        const t = this.ts2sec(ts)
        this.ratio = t / this.duration
        progress({ ratio: this.ratio, time: t })
      } else if (message.startsWith('video:')) {
        progress({ ratio: 1 })
        this.duration = 0
      }
    }
  }

  private log(type: string, message: string) {
    if (this.settings.log) {
      console.log(type, message)
    }
  }

  async toBlobURL(url: string, mimeType: string) {
    this.log('info', `fetch ${url}`)
    const buf = await (await fetch(url)).arrayBuffer()
    this.log('info', `${url} file size = ${buf.byteLength} bytes`)
    const blob = new Blob([buf], { type: mimeType })
    const blobURL = URL.createObjectURL(blob)
    this.log('info', `${url} blob URL = ${blobURL}`)
    return blobURL
  }

  async getCreateFFmpegCore({ corePath }: { corePath: string }): Promise<{
    createFFmpegCore: any
    corePath: string
    wasmPath: string
    workerPath: string
  }> {
    if (typeof corePath !== 'string') {
      throw Error('corePath should be a string!')
    }

    // const coreRemotePath = self.location.host +_corePath
    const coreRemotePath = corePath
    const cp = await this.toBlobURL(coreRemotePath, 'application/javascript')
    const wasmPath = await this.toBlobURL(
      coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.wasm'),
      'application/wasm',
    )
    const workerPath = await this.toBlobURL(
      coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.worker.js'),
      'application/javascript',
    )

    if (typeof createFFmpegCore === 'undefined') {
      if (typeof importScripts !== 'undefined') {
        importScripts(cp)
      } else {
        // TODO: await script load properly]
        new ScriptLoader([cp]).loadFiles()
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      return new Promise((resolve) => {
        if (typeof createFFmpegCore === 'undefined') {
          throw Error('CREATE_FFMPEG_CORE_IS_NOT_DEFINED')
        }
        this.log('info', 'ffmpeg-core.js script loaded')
        resolve({
          createFFmpegCore,
          corePath,
          wasmPath,
          workerPath,
        })
      })
    }
    this.log('info', 'ffmpeg-core.js script is loaded already')
    return Promise.resolve({
      createFFmpegCore,
      corePath,
      wasmPath,
      workerPath,
    })
  }
}
