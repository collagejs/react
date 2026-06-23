import { describe, expect, it } from "vitest";

describe("index", () => {
    it("Should export the exact list of expected objects.", async () => {
        const expectedObjects = [
            "piece",
            "Piece",
            "buildPiece",
            "CollageContextObject",
            "CollageProvider",
            "useCollageContext",
        ];
        const module = await import("./index.js");
        const exportedObjects = Object.keys(module);
        expect(exportedObjects).toEqual(expect.arrayContaining(expectedObjects));
        expect(expectedObjects).toEqual(expect.arrayContaining(exportedObjects));
    });
});