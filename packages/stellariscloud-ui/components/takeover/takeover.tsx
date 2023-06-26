import ReactDOM from 'react-dom'

export const Takeover: (children: {
  children: React.ReactNode
}) => React.ReactPortal = ({ children }: { children: React.ReactNode }) => {
  return ReactDOM.createPortal(
    <div className="absolute top-0 bottom-0 right-0 left-0 z-50">
      {children}
    </div>,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.querySelector('#takeover-root')!,
  )
}
