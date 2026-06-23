import { createContext, useContext } from "react";
import type { MountPiece } from "@collagejs/core";

/**
 * Collage context payload used to propagate a parent-aware `mountPiece`
 * function through the React tree.
 */
export type CollageContext = {
    mountPiece: MountPiece;
};

/**
 * React context object that stores the parent-aware CollageJS mount function.
 */
export const CollageContextObject =
    createContext<CollageContext | undefined>(undefined);

/**
 * Provider component for the CollageJS context.
 */
export const CollageProvider = CollageContextObject.Provider;

/**
 * Returns the current CollageJS context if one is available.
 */
export function useCollageContext() {
    return useContext(CollageContextObject);
}
