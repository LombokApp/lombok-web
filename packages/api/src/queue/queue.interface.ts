export interface IQueue {
  add: (...args: any[]) => Promise<void>
  close: () => Promise<void>
}
