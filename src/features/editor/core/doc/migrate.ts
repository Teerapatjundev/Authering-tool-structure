import { Document } from "./types";

// Document migration utilities for version updates

export function migrateDocument(doc: any): Document {
  // If no version, assume version 1
  const version = doc.version || 1;

  let migrated = { ...doc };

  // Add migrations here as needed
  // if (version < 2) { ... }

  return migrated as Document;
}

export function createEmptyDocument(id: string, title = "Untitled"): Document {
  return {
    id,
    title,
    version: 1,
    nodes: [],
    width: 1920,
    height: 1080,
    backgroundColor: "#ffffff",
    updatedAt: Date.now(),
  };
}
