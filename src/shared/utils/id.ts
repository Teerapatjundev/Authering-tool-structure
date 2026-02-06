import { nanoid } from "nanoid";

export function generateId(): string {
  return nanoid();
}

export function generateNodeId(): string {
  return `node_${nanoid(10)}`;
}
