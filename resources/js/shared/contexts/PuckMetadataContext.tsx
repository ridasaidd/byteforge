import { createContext, useContext, type ReactNode } from 'react';

interface PuckMetadata {
  navigations?: unknown[];
  settings?: Record<string, unknown>;
  theme?: unknown;
}

const PuckMetadataContext = createContext<PuckMetadata | null>(null);

export function PuckMetadataProvider({
  children,
  metadata
}: {
  children: ReactNode;
  metadata: PuckMetadata | null;
}) {
  return (
    <PuckMetadataContext.Provider value={metadata}>
      {children}
    </PuckMetadataContext.Provider>
  );
}

export function usePuckMetadata(): PuckMetadata | null {
  return useContext(PuckMetadataContext);
}
