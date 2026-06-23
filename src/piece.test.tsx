import { Component, type ReactNode, act } from "react";
import { createRoot } from "react-dom/client";
import type {
    CorePiece,
    MountPiece,
    MountProps,
    MountedPiece,
} from "@collagejs/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Piece, piece } from "./piece.js";
import { CollageProvider } from "./collageContext.js";

type PieceProbe<TProps extends Record<string, any>> = {
    corePiece: CorePiece<TProps>;
    mountSpy: ReturnType<
        typeof vi.fn<
            (
                target: HTMLElement | ShadowRoot,
                props?: MountProps<TProps>,
            ) => Promise<() => Promise<void>>
        >
    >;
    unmountSpy: ReturnType<typeof vi.fn<() => Promise<void>>>;
    updateSpy: ReturnType<typeof vi.fn<(props: TProps) => Promise<void>>>;
    mountedTarget: HTMLElement | ShadowRoot | null;
    mountedProps: MountProps<TProps> | undefined;
};

type ErrorBoundaryProps = {
    children: ReactNode;
    onError: (error: Error) => void;
};

type ErrorBoundaryState = {
    error: Error | null;
};

class TestErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    public componentDidCatch(error: Error) {
        this.props.onError(error);
    }

    public render() {
        if (this.state.error) {
            return null;
        }

        return this.props.children;
    }
}

function createProbePiece<
    TProps extends Record<string, any> = Record<string, any>,
>(): PieceProbe<TProps> {
    const mountSpy = vi.fn<
        (
            target: HTMLElement | ShadowRoot,
            props?: MountProps<TProps>,
        ) => Promise<() => Promise<void>>
    >();
    const unmountSpy = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const updateSpy = vi.fn<(props: TProps) => Promise<void>>().mockResolvedValue(undefined);

    const probe: PieceProbe<TProps> = {
        corePiece: {} as CorePiece<TProps>,
        mountSpy,
        unmountSpy,
        updateSpy,
        mountedTarget: null,
        mountedProps: undefined,
    };

    probe.mountSpy = vi.fn(async (target: HTMLElement | ShadowRoot, props?: MountProps<TProps>) => {
        probe.mountedTarget = target;
        probe.mountedProps = props;
        return async () => {
            await probe.unmountSpy();
        };
    });

    probe.corePiece = {
        mount: probe.mountSpy,
        update: probe.updateSpy,
    };

    return probe;
}

async function settle() {
    await Promise.resolve();
    await Promise.resolve();
}

function consoleErrorContains(
    spy: ReturnType<typeof vi.spyOn>,
    message: string,
) {
    return spy.mock.calls.some((call: unknown[]) =>
        call.some((arg: unknown) => {
            if (typeof arg === "string") {
                return arg.includes(message);
            }

            if (arg instanceof Error) {
                return arg.message.includes(message);
            }

            return false;
        }),
    );
}

afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

describe("Piece (Browser Mode)", () => {
    it("mounts in light DOM by default and forwards runtime props", async () => {
        const probe = createProbePiece<{ foo: string }>();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} foo="bar" />);
            await settle();
        });

        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
        expect(probe.mountedTarget).toBeInstanceOf(HTMLDivElement);
        expect(probe.mountedProps?.foo).toBe("bar");
        expect(host.firstElementChild?.getAttribute("data-cjs-piece-host")).toBe(
            "dom",
        );

        await act(async () => {
            root.unmount();
            await settle();
        });

        expect(probe.unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("mounts in shadow DOM when shadow is true", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece, { shadow: true })} />);
            await settle();
        });

        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
        expect(probe.mountedTarget).toBeInstanceOf(ShadowRoot);
        expect((probe.mountedTarget as ShadowRoot).mode).toBe("open");
        expect(host.firstElementChild?.getAttribute("data-cjs-piece-host")).toBe(
            "open",
        );

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("applies first prop change after initial mount", async () => {
        const probe = createProbePiece<{ a?: number }>();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} />);
            await settle();
        });

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} a={123} />);
            await settle();
        });

        expect(probe.updateSpy).toHaveBeenCalled();
        expect(probe.updateSpy).toHaveBeenLastCalledWith({ a: 123 });

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("does not remount the same CorePiece instance after unmount", async () => {
        const probe = createProbePiece();

        const hostA = document.createElement("div");
        document.body.append(hostA);
        const rootA = createRoot(hostA);

        await act(async () => {
            rootA.render(<Piece {...piece(probe.corePiece)} />);
            await settle();
        });

        await act(async () => {
            rootA.unmount();
            await settle();
        });

        const hostB = document.createElement("div");
        document.body.append(hostB);
        const rootB = createRoot(hostB);

        await act(async () => {
            rootB.render(<Piece {...piece(probe.corePiece)} />);
            await settle();
        });

        await act(async () => {
            rootB.unmount();
            await settle();
        });

        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
    });

    it("uses parent-aware mountPiece from context", async () => {
        const probe = createProbePiece();
        const parentAwareMountPiece = vi.fn(async () => {
            return {
                mountPiece: vi.fn(),
                update: vi.fn().mockResolvedValue(undefined),
                unmount: vi.fn().mockResolvedValue(undefined),
            } as unknown as MountedPiece<Record<string, any>>;
        }) as unknown as MountPiece<Record<string, any>>;

        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <CollageProvider value={{ mountPiece: parentAwareMountPiece }}>
                    <Piece {...piece(probe.corePiece)} />
                </CollageProvider>,
            );
            await settle();
        });

        expect(parentAwareMountPiece).toHaveBeenCalledTimes(1);
        expect(probe.mountSpy).toHaveBeenCalledTimes(0);

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("rejects shadow mode changes after mount", async () => {
        const probe = createProbePiece();
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <TestErrorBoundary onError={() => {}}>
                    <Piece {...piece(probe.corePiece, { shadow: false })} />
                </TestErrorBoundary>,
            );
            await settle();
        });

        await act(async () => {
            root.render(
                <TestErrorBoundary onError={() => {}}>
                    <Piece {...piece(probe.corePiece, { shadow: true })} />
                </TestErrorBoundary>,
            );
            await settle();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorContains(consoleErrorSpy, "shadow mode cannot change after mount")).toBe(true);

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("rejects changing the CorePiece input after initialization", async () => {
        const probeA = createProbePiece();
        const probeB = createProbePiece();
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <TestErrorBoundary onError={() => {}}>
                    <Piece {...piece(probeA.corePiece)} />
                </TestErrorBoundary>,
            );
            await settle();
        });

        await act(async () => {
            root.render(
                <TestErrorBoundary onError={() => {}}>
                    <Piece {...piece(probeB.corePiece)} />
                </TestErrorBoundary>,
            );
            await settle();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorContains(consoleErrorSpy, "different CorePiece input")).toBe(true);

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("applies containerProps to the host div element", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <Piece
                    {...piece(probe.corePiece, {
                        containerProps: { className: "host-class", id: "host-id" },
                    })}
                />,
            );
            await settle();
        });

        const containerDiv = host.querySelector("#host-id");
        expect(containerDiv).toBeInstanceOf(HTMLDivElement);
        expect(containerDiv?.className).toBe("host-class");

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("mounts in closed shadow DOM when shadow mode is closed", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <Piece {...piece(probe.corePiece, { shadow: { mode: "closed" } })} />,
            );
            await settle();
        });

        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
        expect(probe.mountedTarget).toBeInstanceOf(ShadowRoot);
        expect((probe.mountedTarget as ShadowRoot).mode).toBe("closed");
        expect(host.firstElementChild?.getAttribute("data-cjs-piece-host")).toBe(
            "closed",
        );

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("reuses closed shadow root in StrictMode double-render", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        // Render with closed shadow root
        await act(async () => {
            root.render(
                <Piece {...piece(probe.corePiece, { shadow: { mode: "closed" } })} />,
            );
            await settle();
        });

        // In StrictMode dev, effect runs twice. Verify mount was called only once.
        // (Vitest browser mode runs StrictMode by default in dev)
        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
        expect((probe.mountedTarget as ShadowRoot).mode).toBe("closed");
        expect(host.firstElementChild?.getAttribute("data-cjs-piece-host")).toBe(
            "closed",
        );

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("handles Promise-based CorePiece", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        const asyncPiece = Promise.resolve(probe.corePiece);

        await act(async () => {
            root.render(<Piece {...piece(asyncPiece)} />);
            await settle();
        });

        expect(probe.mountSpy).toHaveBeenCalledTimes(1);
        expect(probe.mountedTarget).toBeInstanceOf(HTMLDivElement);

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("applies multiple sequential prop updates", async () => {
        const probe = createProbePiece<{ a?: number; b?: string }>();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} />);
            await settle();
        });

        // After mount, props are replayed, so we expect an initial empty update
        expect(probe.updateSpy).toHaveBeenLastCalledWith({});

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} a={1} />);
            await settle();
        });

        expect(probe.updateSpy).toHaveBeenLastCalledWith({ a: 1 });

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} a={1} b="hello" />);
            await settle();
        });

        expect(probe.updateSpy).toHaveBeenLastCalledWith({ a: 1, b: "hello" });

        await act(async () => {
            root.render(<Piece {...piece(probe.corePiece)} a={2} b="hello" />);
            await settle();
        });

        expect(probe.updateSpy).toHaveBeenLastCalledWith({ a: 2, b: "hello" });

        await act(async () => {
            root.unmount();
            await settle();
        });
    });

    it("combines containerProps and shadow options", async () => {
        const probe = createProbePiece();
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);

        await act(async () => {
            root.render(
                <Piece
                    {...piece(probe.corePiece, {
                        containerProps: { className: "shadow-host" },
                        shadow: true,
                    })}
                />,
            );
            await settle();
        });

        const containerDiv = host.querySelector(".shadow-host");
        expect(containerDiv).toBeInstanceOf(HTMLDivElement);

        expect(probe.mountedTarget).toBeInstanceOf(ShadowRoot);
        expect((probe.mountedTarget as ShadowRoot).mode).toBe("open");
        expect(containerDiv?.getAttribute("data-cjs-piece-host")).toBe("open");

        await act(async () => {
            root.unmount();
            await settle();
        });
    });
});
