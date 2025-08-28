import 'pdfjs-dist/web/pdf_viewer.css'

import { cn } from '@lombokapp/ui-toolkit'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import {
  EventBus,
  PDFLinkService,
  PDFViewer as PDFJSViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs'
import React from 'react'

// Initialize a dedicated worker for pdf.js in module mode (works with Vite)
const pdfWorker = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
  { type: 'module' },
)
GlobalWorkerOptions.workerPort = pdfWorker

export function PDFViewer({
  dataURL,
  className,
}: {
  dataURL: string
  className?: string
}) {
  const viewerContainerRef = React.useRef<HTMLDivElement | null>(null)
  const viewerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!viewerContainerRef.current || !viewerRef.current || !dataURL) {
      return
    }

    // Hard clear: remove all children/siblings to ensure a clean slate
    const containerNode = viewerContainerRef.current
    const viewerNode = viewerRef.current
    viewerNode.replaceChildren()
    Array.from(containerNode.children).forEach((child) => {
      if (child !== viewerNode) {
        containerNode.removeChild(child)
      }
    })

    const eventBus = new EventBus()
    const linkService = new PDFLinkService({ eventBus })
    const viewer = new PDFJSViewer({
      container: containerNode,
      viewer: viewerNode,
      eventBus,
      linkService,
      textLayerMode: 1,
      annotationMode: 2,
    })
    linkService.setViewer(viewer)

    let cancelled = false
    const loadingTask = getDocument({ url: dataURL })

    void loadingTask.promise
      .then((pdfDocument) => {
        if (cancelled) {
          try {
            void pdfDocument.destroy()
          } catch {
            // ignore
          }
          return
        }
        linkService.setDocument(pdfDocument)
        viewer.setDocument(pdfDocument)
        try {
          viewer.currentScaleValue = 'page-width'
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore
      })

    const handleResize = () => {
      eventBus.dispatch('resize', { source: null })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', handleResize)
      try {
        const pdfDocument = (
          viewer as unknown as { _pdfDocument?: { destroy: () => void } }
        )._pdfDocument
        pdfDocument?.destroy()
      } catch {
        // ignore
      }
      viewerNode.replaceChildren()
      Array.from(containerNode.children).forEach((child) => {
        if (child !== viewerNode) {
          containerNode.removeChild(child)
        }
      })
    }
  }, [dataURL])

  return (
    <div className="size-full">
      <div
        className={cn(
          'viewerContainer overflow-y-auto size-full absolute left-0',
          className,
        )}
        ref={viewerContainerRef}
        style={{ backgroundColor: 'transparent' }}
      >
        {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
        <div className="pdfViewer" ref={viewerRef} />
      </div>
    </div>
  )
}
