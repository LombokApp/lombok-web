import fs from 'fs'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import { whisper } from 'whisper-node-ts'

import { ffmpeg } from './ffmpeg.util'

export const transcribeAudio = async (
  inFilepath: string,
  outFilepath: string,
) => {
  const options = {
    modelPath: path.join(__dirname, '..', '..', '/ggml-tiny.en.bin'),
    whisperOptions: {
      gen_file_txt: false,
      gen_file_subtitle: true,
      gen_file_vtt: false,
      word_timestamps: true,
      // timestamp_size: 16, // TODO: why does this break whisper.cpp (stoi - invalid_argument)
    },
  }

  const transcript = await whisper(inFilepath, options)

  fs.writeFileSync(
    outFilepath,
    Buffer.from(JSON.stringify(transcript, null, 2), 'utf8'),
  )

  return transcript
}

export const convertToWhisperCPPInputWav = async (inFilepath: string) => {
  const wavOutputFilepath = `${uuidV4()}.wav`
  const command = ffmpeg(inFilepath)
    .addOption('-acodec pcm_s16le')
    .addOption('-ac 1')
    .addOption('-ar 16000')
    .addOutput(wavOutputFilepath)
  command.run()

  command.on('progress', (progress) => {
    console.log('ffmpeg timemark:', progress.timemark)
  })
  // wait for end or error
  await new Promise((resolve, reject) => {
    command.on('end', () => {
      resolve(undefined)
    })
    command.on('error', (e) => {
      reject(e)
    })
  })
  return wavOutputFilepath
}
