export const carKeys = {
  all: ['cars'] as const,
  list: () => [...carKeys.all, 'list'] as const,
  detail: (id: string) => [...carKeys.all, 'detail', id] as const,
} as const

