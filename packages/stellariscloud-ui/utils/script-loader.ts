export class ScriptLoader {
  private readonly m_js_files: string[]
  private readonly m_blob_files: string[]
  private readonly m_css_files: string[]
  private readonly m_head: HTMLHeadElement

  private readonly log = (t: any) => {
    console.log(`ScriptLoader: ${t}`)
  }

  constructor(files: string[]) {
    this.m_js_files = []
    this.m_css_files = []
    this.m_blob_files = []
    this.m_head = document.getElementsByTagName('head')[0]
    // this.m_head = document.head; // IE9+ only

    for (const f of files) {
      if (f.endsWith('.css')) {
        this.m_css_files.push(f)
      } else if (f.endsWith('.js')) {
        this.m_js_files.push(f)
      } else if (f.startsWith('blob:')) {
        this.m_blob_files.push(f)
      } else {
        this.log(`Error unknown filetype "${f}".`)
      }
    }
  }

  public withNoCache = (filename: string): string => {
    let f = filename
    if (!f.includes('?')) {
      f = `${f}?no_cache=${new Date().getTime()}`
    } else {
      f = `${f}&no_cache=${new Date().getTime()}`
    }

    return f
  }

  public loadStyle = (filename: string) => {
    // HTMLLinkElement
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = this.withNoCache(filename)

    this.log('Loading style ' + filename)
    link.onload = () => {
      this.log('Loaded style "' + filename + '".')
    }

    link.onerror = () => {
      this.log('Error loading style "' + filename + '".')
    }

    this.m_head.appendChild(link)
  }

  public loadBlob = (blobUrl: string) => {
    // Blob URL
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = blobUrl

    this.log(`Loading blob ${blobUrl}`)
    script.onload = () => {
      this.log(`Loaded blob "${blobUrl}".`)
    }

    script.onerror = () => {
      this.log(`Error loading blob "${blobUrl}".`)
    }

    this.m_head.appendChild(script)
  }

  public loadScript = (i: number) => {
    console.log('i', i)
    console.log('this.m_js_files', this.m_js_files)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = this.withNoCache(this.m_js_files[i])

    const loadNextScript = () => {
      if (i + 1 < this.m_js_files.length) {
        this.loadScript(i + 1)
      }
    }

    script.onload = () => {
      this.log('Loaded script "' + this.m_js_files[i] + '".')
      loadNextScript()
    }

    script.onerror = () => {
      this.log('Error loading script "' + this.m_js_files[i] + '".')
      loadNextScript()
    }

    this.log('Loading script "' + this.m_js_files[i] + '".')
    this.m_head.appendChild(script)
  }

  public loadFiles = () => {
    // this.log(this.m_css_files);
    // this.log(this.m_js_files);

    for (const cssFile of this.m_css_files) {
      this.loadStyle(cssFile)
    }

    if (this.m_js_files.length > 0) {
      this.loadScript(0)
    }

    for (const blob of this.m_blob_files) {
      this.loadBlob(blob)
    }
  }
}
