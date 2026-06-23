import { act } from "react";
import type {
    CorePiece,
    MountPiece,
    MountProps,
    MountedPiece,
} from "@collagejs/core";
import { mountPieceKey } from "@collagejs/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPiece } from "./collage.js";
import { Piece, piece } from "./piece.js";

function createProbePiece<
    TProps extends Record<string, any> = Record<string, any>,
>(): CorePiece<TProps> & {
    mountSpy: ReturnType<typeof vi.fn>;
} {
    const mountSpy = vi.fn(async () => {
        return async () => undefined;
    });

    return {
        mount: mountSpy,
        mountSpy,
    };
}

async function settle() {
    await Promise.resolve();
    await Promise.resolve();
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("buildPieceFactory (Browser Mode)", () => {
    it("passes parent-aware mountPiece through context to nested Piece", async () => {
        const childCorePiece = createProbePiece();
        const parentAwareMountPiece = vi.fn(async () => {
            return {
                mountPiece: vi.fn(),
                update: vi.fn().mockResolvedValue(undefined),
                unmount: vi.fn().mockResolvedValue(undefined),
            } as unknown as MountedPiece<Record<string, any>>;
        }) as unknown as MountPiece<Record<string, any>>;

        function ParentComponent() {
            return <Piece {...piece(childCorePiece)} />;
        }

        const parentCorePiece = buildPiece(ParentComponent);

        const host = document.createElement("div");
        document.body.append(host);

        let cleanup: (() => Promise<void>) | undefined;

        await act(async () => {
            cleanup = await parentCorePiece.mount(host, {
                [mountPieceKey]: parentAwareMountPiece,
            } as MountProps<Record<string, any>>);
            await settle();
        });

        expect(parentAwareMountPiece).toHaveBeenCalledTimes(1);
        expect(childCorePiece.mountSpy).toHaveBeenCalledTimes(0);

        await act(async () => {
            await cleanup?.();
            await settle();
        });
    });

    it("enforces single-use policy after unmount", async () => {
        function PlainComponent() {
            return null;
        }

        const corePiece = buildPiece(PlainComponent);

        const host = document.createElement("div");
        document.body.append(host);

        let cleanup: (() => Promise<void>) | undefined;

        await act(async () => {
            cleanup = await corePiece.mount(host);
            await settle();
        });

        await act(async () => {
            await cleanup?.();
            await settle();
        });

        await expect(corePiece.mount(host)).rejects.toThrow(
            "already unmounted and cannot be remounted",
        );
    });
});
