import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from "react";
import type {
    ComponentPropsWithoutRef,
    ForwardedRef,
    ReactElement,
    RefAttributes,
} from "react";
import type {
    AcceptableTarget,
    CorePiece,
    MountPiece,
    MountedPiece,
} from "@collagejs/core";
import { mountPiece } from "@collagejs/core";
import { useCollageContext } from "./collageContext.js";

const piecePropsSymbol = Symbol("collagejs.pieceProps");
const cachedShadowRootSymbol = Symbol("collagejs.cachedShadowRoot");

const activeCorePieces = new WeakSet<CorePiece<any>>();
const retiredCorePieces = new WeakSet<CorePiece<any>>();

/**
 * Special props consumed by the React `Piece` component.
 *
 * This type is meant to be combined with regular piece props through the
 * `piece()` helper. The symbol-backed key keeps the internal mount metadata
 * out of the public prop namespace, so user props can use any string key
 * without collisions.
 */
export type PieceProps<
    TProps extends Record<string, any> = Record<string, any>,
> = {
    [piecePropsSymbol]: {
        piece: CorePiece<TProps> | Promise<CorePiece<TProps>>;
        shadow?: boolean | ShadowRootInit;
        containerProps?: ComponentPropsWithoutRef<"div">;
    };
};

export type PieceOptions = {
    containerProps?: ComponentPropsWithoutRef<"div">;
    shadow?: boolean | ShadowRootInit;
};

/**
 * Creates the special symbol-backed prop required by the `Piece` component.
 *
 * Spread the returned object into `<Piece />` props.
 *
 * @example
 * ```tsx
 * <Piece {...piece(myCorePiece, { containerProps: { className: "host" }, shadow: true })} foo="bar" />
 * ```
 *
 * @param piece CorePiece instance (or promise) to mount.
 * @param options Optional settings for the host `<div>` and shadow-root behavior.
 */
export function piece<
    TProps extends Record<string, any> = Record<string, any>,
>(
    piece: CorePiece<TProps> | Promise<CorePiece<TProps>>,
    options?: PieceOptions,
) {
    const { containerProps, shadow } = options ?? {};

    return {
        [piecePropsSymbol]: {
            piece,
            shadow,
            containerProps,
        },
    } as PieceProps<TProps>;
}

type Props<TProps extends Record<string, any> = Record<string, any>> =
    TProps & PieceProps<TProps>;

type MountMode = "light" | "shadow";

function isHmrActive() {
    const meta = import.meta as ImportMeta & {
        hot?: {
            invalidate: (message?: string) => void;
        };
    };

    return meta.hot != null;
}

function invalidateHmr(message: string) {
    const meta = import.meta as ImportMeta & {
        hot?: {
            invalidate: (message?: string) => void;
        };
    };

    meta.hot?.invalidate(message);
}

function forcePageReload() {
    if (typeof window === "undefined") {
        return;
    }

    window.location.reload();
}

function getMountMode(shadow?: boolean | ShadowRootInit): MountMode {
    return shadow ? "shadow" : "light";
}

function getHostModeValue(shadow?: boolean | ShadowRootInit): "dom" | "open" | "closed" {
    if (!shadow) {
        return "dom";
    }

    if (shadow === true) {
        return "open";
    }

    return shadow.mode;
}

function getPieceRuntimeProps<
    TProps extends Record<string, any> = Record<string, any>,
>(props: Props<TProps>): TProps {
    const runtimeProps = { ...props } as Record<string | symbol, any>;
    delete runtimeProps[piecePropsSymbol];
    return runtimeProps as TProps;
}

function assertCorePieceCanMount<
    TProps extends Record<string, any> = Record<string, any>,
>(corePiece: CorePiece<TProps>) {
    if (retiredCorePieces.has(corePiece)) {
        throw new Error(
            "A CorePiece instance cannot be remounted after it has been unmounted. Create a new CorePiece and a new Piece component instance.",
        );
    }

    if (activeCorePieces.has(corePiece)) {
        throw new Error(
            "This CorePiece instance is already mounted. CorePiece instances are single-use and must not be mounted more than once.",
        );
    }
}

function resolveMountTarget(
    container: HTMLDivElement,
    shadow?: boolean | ShadowRootInit,
): AcceptableTarget {
    if (!shadow) {
        return container;
    }

    // For open shadow roots, container.shadowRoot is accessible.
    if (container.shadowRoot) {
        return container.shadowRoot;
    }

    // For closed shadow roots (or any shadow root), check our cache.
    // This prevents re-attaching during StrictMode double-render.
    const cached = (container as any)[cachedShadowRootSymbol];
    if (cached instanceof ShadowRoot) {
        return cached;
    }

    const shadowInit = shadow === true ? { mode: "open" as const } : shadow;

    try {
        const sr = container.attachShadow(shadowInit);
        // Cache the shadow root so StrictMode re-renders can reuse it.
        (container as any)[cachedShadowRootSymbol] = sr;
        return sr;
    } catch {
        throw new Error(
            "Could not create a shadow root for Piece. The host may already have a closed shadow root.",
        );
    }
}

function PieceImpl<
    TProps extends Record<string, any> = Record<string, any>,
>(props: Props<TProps>, ref: ForwardedRef<HTMLDivElement>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mountTargetRef = useRef<AcceptableTarget | null>(null);
    const mountModeRef = useRef<MountMode | null>(null);
    const mountedPieceRef = useRef<MountedPiece<TProps> | null>(null);
    const mountedCorePieceRef = useRef<CorePiece<TProps> | null>(null);
    const latestPropsRef = useRef<Props<TProps>>(props);
    const initialPieceInputRef =
        useRef<CorePiece<TProps> | Promise<CorePiece<TProps>> | null>(null);
    const initialMountPieceRef = useRef<MountPiece<TProps> | null>(null);
    const fallbackMountPieceRef = useRef<MountPiece<TProps> | null>(null);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const collageContext = useCollageContext();

    if (!fallbackMountPieceRef.current) {
        fallbackMountPieceRef.current = async (pieceInput, target, mountProps) => {
            const resolvedPiece = await Promise.resolve(pieceInput);
            return mountPiece(resolvedPiece, target, mountProps);
        };
    }

    const parentAwareMountPiece =
        (collageContext?.mountPiece as MountPiece<TProps> | undefined) ??
        fallbackMountPieceRef.current;

    if (!initialMountPieceRef.current) {
        initialMountPieceRef.current = parentAwareMountPiece;
    } else if (initialMountPieceRef.current !== parentAwareMountPiece) {
        throw new Error(
            "Piece cannot change mount context after initialization. Create a new Piece instance instead.",
        );
    }

    const { [piecePropsSymbol]: pieceProps } = props;
    latestPropsRef.current = props;

    if (initialPieceInputRef.current === null) {
        initialPieceInputRef.current = pieceProps.piece;
    } else if (initialPieceInputRef.current !== pieceProps.piece) {
        if (mountedCorePieceRef.current == null) {
            // Before the first successful mount, React StrictMode and other dev
            // render-phase retries can legitimately produce a new identity.
            initialPieceInputRef.current = pieceProps.piece;
        }

        else if (isHmrActive()) {
            // In HMR, modules are replaced in place and `piece(...)` arguments can
            // become new object identities during a hot update.
            initialPieceInputRef.current = pieceProps.piece;
        } else {
            throw new Error(
                "Piece received a different CorePiece input after initialization. Create a new Piece component instance instead of reusing an existing one.",
            );
        }
    }

    useEffect(() => {
        const container = containerRef.current;
        const initialProps = getPieceRuntimeProps(props);

        if (!container) {
            return;
        }

        const mode = getMountMode(pieceProps.shadow);
        mountModeRef.current = mode;
        mountTargetRef.current = resolveMountTarget(container, pieceProps.shadow);

        let didCleanup = false;
        const mountPromise = Promise.resolve(pieceProps.piece)
            .then(async (corePiece) => {
                if (didCleanup) {
                    return;
                }

                assertCorePieceCanMount(corePiece);
                activeCorePieces.add(corePiece);

                const mountPieceFn = initialMountPieceRef.current;

                if (!mountPieceFn) {
                    throw new Error(
                        "Failed to mount Piece: no mountPiece function is available in this context.",
                    );
                }

                const mountedPiece = await mountPieceFn(
                    corePiece,
                    mountTargetRef.current as AcceptableTarget,
                    initialProps,
                );

                if (didCleanup) {
                    await mountedPiece.unmount();
                    activeCorePieces.delete(corePiece);
                    retiredCorePieces.add(corePiece);
                    return;
                }

                mountedCorePieceRef.current = corePiece;
                mountedPieceRef.current = mountedPiece;

                // If props changed while mount was in-flight, apply the latest
                // values now so updates are not missed.
                void mountedPiece.update(getPieceRuntimeProps(latestPropsRef.current));
            })
            .catch((error: unknown) => {
                const message =
                    error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to mount Piece: ${message}`);
            });

        return () => {
            didCleanup = true;

            mountModeRef.current = null;
            mountTargetRef.current = null;

            void mountPromise
                .then(async () => {
                    const mountedPiece = mountedPieceRef.current;

                    mountedPieceRef.current = null;

                    if (mountedPiece) {
                        await mountedPiece.unmount();
                    }

                    const corePiece = mountedCorePieceRef.current;
                    mountedCorePieceRef.current = null;

                    if (corePiece) {
                        activeCorePieces.delete(corePiece);
                        retiredCorePieces.add(corePiece);
                    }

                    // Clear the cached shadow root on true unmount.
                    if (container) {
                        delete (container as any)[cachedShadowRootSymbol];
                    }
                })
                .catch(() => {
                    // The mount promise already wraps and reports a clear runtime error.
                });
        };
    }, []);

    useEffect(() => {
        const initialMode = mountModeRef.current;

        if (!initialMode) {
            return;
        }

        const currentMode = getMountMode(pieceProps.shadow);

        if (currentMode !== initialMode) {
            if (isHmrActive()) {
                // Shadow mode cannot be switched on a live mount target.
                // During HMR, request invalidation and also trigger a hard reload
                // fallback because linked library updates may not navigate automatically.
                invalidateHmr(
                    "Piece shadow mode changed after mount; reloading to remount safely.",
                );
                forcePageReload();
                return;
            }

            throw new Error(
                "Piece shadow mode cannot change after mount. Create a new Piece instance to switch between light and shadow DOM.",
            );
        }
    }, [pieceProps.shadow]);

    useEffect(() => {
        const mountedPiece = mountedPieceRef.current;

        if (!mountedPiece) {
            return;
        }

        const currentProps = getPieceRuntimeProps(props);
        void mountedPiece.update(currentProps);
    });

    return (
        <div
            ref={containerRef}
            {...pieceProps.containerProps}
            data-cjs-piece-host={getHostModeValue(pieceProps.shadow)}
        />
    );
}

export const Piece = forwardRef(PieceImpl) as <
    TProps extends Record<string, any> = Record<string, any>,
>(
    props: Props<TProps> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
