import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import fs from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import {
  downloadFileToDisk,
  hashFileStream,
  hashLocalFile,
  uploadFile,
} from './file.util'

// Mock fetch globally
const mockFetch = mock()

// Mock console.log to avoid noise in tests
const mockConsoleLog = mock((): void => {
  // Intentionally empty mock function
})

describe('file.util', () => {
  let tempDir: string
  let testFilePath: string
  let testFileContent: string

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'file-util-test-'))
    testFileContent = 'Hello, World! This is a test file.'
    testFilePath = path.join(tempDir, 'test.txt')
    fs.writeFileSync(testFilePath, testFileContent)

    // Mock console.log
    // eslint-disable-next-line no-console
    console.log = mockConsoleLog

    // Reset and mock global fetch
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(async () => {
    // Wait a bit to ensure any async operations complete
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (error) {
        // Ignore cleanup errors to prevent test failures
        // eslint-disable-next-line no-console
        console.warn('Failed to clean up temp dir:', error)
      }
    }
  })

  describe('uploadFile', () => {
    it('should upload a file successfully', () => {
      const uploadUrl = 'https://example.com/upload'
      const mimeType = 'text/plain'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      expect(
        uploadFile(testFilePath, uploadUrl, mimeType),
      ).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': testFileContent.length.toString(),
        },
        body: expect.any(Blob) as Blob,
      })
    }, 10000)

    it('should upload a file without mimeType', () => {
      const uploadUrl = 'https://example.com/upload'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      expect(uploadFile(testFilePath, uploadUrl)).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': testFileContent.length.toString(),
        },
        body: expect.any(Blob) as Blob,
      })
    }, 10000)

    it('should throw error when upload fails', () => {
      const uploadUrl = 'https://example.com/upload'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/plain']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      expect(uploadFile(testFilePath, uploadUrl)).rejects.toThrow(
        'Upload failed with status 500',
      )
    })

    it('should throw error when file does not exist', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt')
      const uploadUrl = 'https://example.com/upload'

      expect(uploadFile(nonExistentFile, uploadUrl)).rejects.toThrow()
    })

    it('should handle large files correctly', async () => {
      // Create a larger test file
      const largeContent = 'x'.repeat(10000)
      const largeFilePath = path.join(tempDir, 'large.txt')
      fs.writeFileSync(largeFilePath, largeContent)

      const uploadUrl = 'https://example.com/upload'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      await uploadFile(largeFilePath, uploadUrl)

      expect(mockFetch).toHaveBeenCalledWith(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': '10000',
        },
        body: expect.any(Blob) as Blob,
      })
    }, 10000)
  })

  describe('hashFileStream', () => {
    it('should hash a file stream correctly', async () => {
      const readStream = fs.createReadStream(testFilePath)

      const hash = await hashFileStream(readStream)

      // Expected SHA1 hash of "Hello, World! This is a test file."
      expect(hash).toBe('1056685b1f563ba4ff3d3848dd7f27ac15673320')
    }, 10000)

    it('should handle empty file stream', async () => {
      const emptyFilePath = path.join(tempDir, 'empty.txt')
      fs.writeFileSync(emptyFilePath, '')
      const readStream = fs.createReadStream(emptyFilePath)

      const hash = await hashFileStream(readStream)

      // SHA1 hash of empty string
      expect(hash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
    }, 10000)

    it('should handle binary file stream', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff])
      const binaryFilePath = path.join(tempDir, 'binary.bin')
      fs.writeFileSync(binaryFilePath, binaryContent)
      const readStream = fs.createReadStream(binaryFilePath)

      const hash = await hashFileStream(readStream)

      expect(hash).toMatch(/^[a-f0-9]{40}$/)
    }, 10000)

    it('should reject on stream error', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent-file.txt')
      const readStream = fs.createReadStream(nonExistentFile)

      // The stream will emit an error when we try to read from it
      // We need to wait for the error to be emitted
      expect(hashFileStream(readStream)).rejects.toThrow()
    }, 10000)
  })

  describe('hashLocalFile', () => {
    it('should hash a local file correctly', async () => {
      const hash = await hashLocalFile(testFilePath)

      // Expected SHA1 hash of "Hello, World! This is a test file."
      expect(hash).toBe('1056685b1f563ba4ff3d3848dd7f27ac15673320')
    }, 10000)

    it('should handle empty file', async () => {
      const emptyFilePath = path.join(tempDir, 'empty.txt')
      fs.writeFileSync(emptyFilePath, '')

      const hash = await hashLocalFile(emptyFilePath)

      // SHA1 hash of empty string
      expect(hash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
    }, 10000)

    it('should handle binary file', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff])
      const binaryFilePath = path.join(tempDir, 'binary.bin')
      fs.writeFileSync(binaryFilePath, binaryContent)

      const hash = await hashLocalFile(binaryFilePath)

      expect(hash).toMatch(/^[a-f0-9]{40}$/)
    }, 10000)

    it('should throw error for non-existent file', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt')

      expect(hashLocalFile(nonExistentFile)).rejects.toThrow()
    }, 10000)

    it('should produce consistent hashes for same content', async () => {
      const hash1 = await hashLocalFile(testFilePath)
      const hash2 = await hashLocalFile(testFilePath)

      expect(hash1).toBe(hash2)
    }, 10000)

    it('should produce different hashes for different content', async () => {
      const differentFilePath = path.join(tempDir, 'different.txt')
      fs.writeFileSync(differentFilePath, 'Different content')

      const hash1 = await hashLocalFile(testFilePath)
      const hash2 = await hashLocalFile(differentFilePath)

      expect(hash1).not.toBe(hash2)
    }, 10000)
  })

  describe('downloadFileToDisk', () => {
    it('should download a file successfully', async () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')
      const responseContent = 'Downloaded content'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/plain'],
          ['content-length', responseContent.length.toString()],
        ]),
        body: {
          getReader: () => {
            let hasRead = false
            return {
              read: () => {
                if (hasRead) {
                  return Promise.resolve({ done: true, value: undefined })
                }
                hasRead = true
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(responseContent),
                })
              },
            }
          },
        },
      })

      const result = await downloadFileToDisk(downloadUrl, outputPath)

      expect(result).toEqual({ mimeType: 'text/plain' })
      expect(fs.existsSync(outputPath)).toBe(true)
      expect(fs.readFileSync(outputPath, 'utf8')).toBe(responseContent)
    }, 10000)

    it('should handle download failure', () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'text/plain']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      expect(downloadFileToDisk(downloadUrl, outputPath)).rejects.toThrow(
        'Download failed when connecting to host (404)',
      )
    }, 10000)

    it('should throw error when content-type header is missing', () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '100']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
          }),
        },
      })

      expect(downloadFileToDisk(downloadUrl, outputPath)).rejects.toThrow(
        'Cannot resolve mimeType for https://example.com/file.txt',
      )
    }, 10000)

    it('should throw error when response body is not available', () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/plain'],
          ['content-length', '100'],
        ]),
        body: null,
      })

      expect(downloadFileToDisk(downloadUrl, outputPath)).rejects.toThrow(
        'No response body available',
      )
    }, 10000)

    it('should handle streaming download with progress', async () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')
      const responseContent = 'x'.repeat(5000) // Large content to trigger progress

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/plain'],
          ['content-length', responseContent.length.toString()],
        ]),
        body: {
          getReader: () => {
            let hasRead = false
            return {
              read: () => {
                if (hasRead) {
                  return Promise.resolve({ done: true, value: undefined })
                }
                hasRead = true
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(responseContent),
                })
              },
            }
          },
        },
      })

      const result = await downloadFileToDisk(downloadUrl, outputPath)

      expect(result).toEqual({ mimeType: 'text/plain' })
      expect(fs.existsSync(outputPath)).toBe(true)
    }, 10000)

    it('should handle zero content-length', async () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')
      const responseContent = 'Small content'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/plain'],
          ['content-length', '0'],
        ]),
        body: {
          getReader: () => {
            let hasRead = false
            return {
              read: () => {
                if (hasRead) {
                  return Promise.resolve({ done: true, value: undefined })
                }
                hasRead = true
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(responseContent),
                })
              },
            }
          },
        },
      })

      const result = await downloadFileToDisk(downloadUrl, outputPath)

      expect(result).toEqual({ mimeType: 'text/plain' })
      expect(fs.existsSync(outputPath)).toBe(true)
    }, 10000)

    it('should handle binary content', async () => {
      const downloadUrl = 'https://example.com/file.bin'
      const outputPath = path.join(tempDir, 'downloaded.bin')
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'application/octet-stream'],
          ['content-length', binaryContent.length.toString()],
        ]),
        body: {
          getReader: () => {
            let hasRead = false
            return {
              read: () => {
                if (hasRead) {
                  return Promise.resolve({ done: true, value: undefined })
                }
                hasRead = true
                return Promise.resolve({
                  done: false,
                  value: binaryContent,
                })
              },
            }
          },
        },
      })

      const result = await downloadFileToDisk(downloadUrl, outputPath)

      expect(result).toEqual({ mimeType: 'application/octet-stream' })
      expect(fs.existsSync(outputPath)).toBe(true)
      expect(fs.readFileSync(outputPath)).toEqual(binaryContent)
    }, 10000)

    it('should overwrite existing file', async () => {
      const downloadUrl = 'https://example.com/file.txt'
      const outputPath = path.join(tempDir, 'downloaded.txt')

      // Create existing file
      fs.writeFileSync(outputPath, 'existing content')

      const responseContent = 'New downloaded content'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/plain'],
          ['content-length', responseContent.length.toString()],
        ]),
        body: {
          getReader: () => {
            let hasRead = false
            return {
              read: () => {
                if (hasRead) {
                  return Promise.resolve({ done: true, value: undefined })
                }
                hasRead = true
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(responseContent),
                })
              },
            }
          },
        },
      })

      await downloadFileToDisk(downloadUrl, outputPath)

      expect(fs.readFileSync(outputPath, 'utf8')).toBe(responseContent)
    }, 10000)
  })

  describe('integration tests', () => {
    it('should work with real file operations', async () => {
      // Test hashLocalFile with actual file
      const hash = await hashLocalFile(testFilePath)
      expect(hash).toMatch(/^[a-f0-9]{40}$/)

      // Test that the hash is consistent
      const hash2 = await hashLocalFile(testFilePath)
      expect(hash).toBe(hash2)
    }, 10000)

    it('should handle file operations with different encodings', async () => {
      const utf8Content = 'Hello, 世界! 🌍'
      const utf8FilePath = path.join(tempDir, 'utf8.txt')
      fs.writeFileSync(utf8FilePath, utf8Content, 'utf8')

      const hash = await hashLocalFile(utf8FilePath)
      expect(hash).toMatch(/^[a-f0-9]{40}$/)
    }, 10000)
  })
})
