export interface AbstractTaskProcessor<
  T extends {
    [key: string]: string | number
  },
> {
  run: (data: T) => Promise<void>
}
