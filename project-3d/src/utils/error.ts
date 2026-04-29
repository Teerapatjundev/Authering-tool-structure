export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

