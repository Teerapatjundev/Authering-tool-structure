export const foodKeys = {
  all: ['foods'] as const,
  list: () => [...foodKeys.all, 'list'] as const,
  detail: (id: string) => [...foodKeys.all, 'detail', id] as const,
} as const

