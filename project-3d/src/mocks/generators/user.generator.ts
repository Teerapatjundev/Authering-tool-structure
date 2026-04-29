export function generateUser() {
  return { id: crypto.randomUUID(), name: 'User' }
}

