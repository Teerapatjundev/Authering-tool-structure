// Serialization utilities

import { Document } from "../doc/types";

export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(json: string): Document {
  return JSON.parse(json);
}

export function exportToJSON(doc: Document): Blob {
  const json = serializeDocument(doc);
  return new Blob([json], { type: "application/json" });
}
