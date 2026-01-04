/**
 * Puck-specific types for component development
 * These types are used across all Puck components
 */

/**
 * Puck's drag ref callback type
 * This is the proper type from Puck's internals
 */
export type PuckDragRef = ((element: Element | null) => void) | null;

/**
 * Puck render context passed to component render functions
 * Contains editor-specific functionality like drag handles
 */
export interface PuckRenderContext {
  /** Whether the component is currently being edited in the Puck editor */
  isEditing?: boolean;
  /** Ref callback for drag functionality - attach to the root element */
  dragRef: PuckDragRef;
}

/**
 * Props extension for components that support Puck drag functionality
 */
export interface WithPuckProps {
  puck?: PuckRenderContext;
}
