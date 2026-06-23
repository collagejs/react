# <img src="https://raw.githubusercontent.com/collagejs/core/HEAD/src/logos/collagejs-48.svg" alt="CollageJS Logo" width="48" height="48" align="left"> @collagejs/react

> React integration for the CollageJS micro-frontend library

[Online Documentation](https://collagejs.dev)

This is the official React package for *CollageJS*. It is used for two complementary tasks:

1. Create `CorePiece` objects from React components.
2. Consume `CorePiece` objects (built with any framework or library) in React projects.

## Installation

```bash
npm install @collagejs/react @collagejs/core react react-dom
```

## Creating React-Powered CorePiece Objects

When building a React micro-frontend that should be mounted through *CollageJS*, wrap your root React component with `buildPiece()`.

```tsx
// mfe.tsx
import { buildPiece } from "@collagejs/react";
import { cssMountFactory } from "@collagejs/vite-css/ex";
import { App } from "./App";

// Only one cssMount per file is needed.
const cssMount = cssMountFactory("mfe");

export function myMfeFactory() {
  const piece = buildPiece(App);

  return {
    // Keep cssMount before piece.mount to prevent FOUC.
    mount: [cssMount, piece.mount],
    update: piece.update,
  };
}
```

`buildPiece()` is the public helper. It wraps a React component into a
CollageJS `CorePiece` object and can be customized with lifecycle hooks and
default props through its options argument.

### buildPiece() Options

`buildPiece(Component, options)` supports the following options:

1. `props`: default props merged with runtime props.
2. `preMount`: callback invoked before the React root is created.
3. `postUnmount`: callback invoked after unmounting the React root.
4. `rootOptions`: options forwarded to React's `createRoot(...)`.

Example:

```tsx
import { buildPiece } from "@collagejs/react";
import { App } from "./App";

export const myPieceFactory = () =>
  buildPiece(App, {
    rootOptions: {
      identifierPrefix: "my-piece-",
    },
  });
```

## Consuming CorePiece Objects in React

Use the `Piece` component to mount any CollageJS `CorePiece` in a React app.

```tsx
import { Piece, piece } from "@collagejs/react";
import { myMfeFactory } from "@my/bare-module-specifier";

export function Host() {
  return <Piece {...piece(myMfeFactory())} extra="yes" data={true} />;
}
```

Important points:

1. Pass the `CorePiece` through the `piece()` helper.
2. Any other props are forwarded to the mounted piece.
3. `Piece` can mount into light DOM (default) or shadow DOM.

### React Best Practice: Keep Piece Identity Stable

In React, avoid creating a new `CorePiece` object on every render. Because
CollageJS pieces are single-use, repeatedly creating them inline can trigger
unnecessary remounts and lifecycle conflicts.

Prefer memoizing the piece object:

```tsx
import { useMemo } from "react";
import { Piece, piece } from "@collagejs/react";

export function Host() {
  const corePiece = useMemo(() => myMfeFactory(), []);

  return <Piece {...piece(corePiece)} extra="yes" data={true} />;
}
```

This keeps the same piece identity for the lifetime of the component instance.
During HMR, React may still replace modules and identities internally, and this
package accepts that development-only case.

### piece() Options

Use the second argument of `piece()` to configure mounting behavior.

```tsx
<Piece
  {...piece(myMfeFactory(), {
    shadow: true,
    containerProps: { className: "host" },
  })}
/>
```

The options object accepts:

1. `shadow`: `undefined`/`false` for light DOM, `true` for open shadow root, or `ShadowRootInit` for custom shadow options.
2. `containerProps`: props forwarded to the host `<div>` element.

#### Shadow Mounting

The `shadow` option supports:

1. `undefined` or `false`: mount in the host element (light DOM).
2. `true`: mount in `attachShadow({ mode: "open" })`.
3. `ShadowRootInit`: mount in a shadow root with custom options, including `mode: "closed"`.

During local development with Vite HMR, if shadow mode changes after mount,
`Piece` triggers a full page reload automatically. This preserves the
single-use lifecycle policy while avoiding manual reloads.

#### Host Container Styling

The host `<div>` is intentionally unstyled by this package.

If you want host-level styling, pass it through `containerProps`, for example
`containerProps.style` or `containerProps.className`.

Each host `<div>` also includes a `data-cjs-piece-host` attribute:

1. `dom` for light DOM mounts.
2. `open` for open shadow-root mounts.
3. `closed` for closed shadow-root mounts.

This is useful for global CSS selectors in host apps, for example:

```css
:where([data-cjs-piece-host="dom"]) {
  display: contents;
}
```

#### Host Container Events

`containerProps` accepts any standard React `<div>` props, including event
handlers. This lets you react to host-level interactions around a mounted
piece without changing the piece implementation.

Use bubbling events (for example `onClick`, `onKeyDown`, `onInput`) so events
from descendants can reach the host container:

```tsx
import { useState } from "react";
import { Piece, piece } from "@collagejs/react";

export function Host() {
  const [lastEvent, setLastEvent] = useState("none");

  return (
    <>
      <Piece
        {...piece(myMfeFactory(), {
          containerProps: {
            onClick: () => setLastEvent("click"),
            onKeyDown: () => setLastEvent("keydown"),
          },
        })}
      />
      <p>Last host event: {lastEvent}</p>
    </>
  );
}
```

This pattern works well for listening to interactions that bubble from content
mounted inside the piece.

## Lifecycle Policy (Single-Use)

This package follows CollageJS lifecycle policy strictly:

1. A `CorePiece` instance must not be remounted after unmount.
2. A mounted `CorePiece` instance must not be mounted again concurrently.
3. A `Piece` instance must not switch to a different `CorePiece` input after initialization.
4. A `Piece` instance must not switch shadow mode after mount.

If any of these rules are violated, the library throws explicit runtime errors.

## Parent-Aware Mounting and Context

CollageJS supports parent-aware lifecycle management: when a parent piece unmounts, child pieces mounted through that parent-aware `mountPiece` are unmounted first.

This package supports that model by:

1. Exposing `CollageProvider` and `useCollageContext`.
2. Injecting the parent-aware `mountPiece` into context when using `buildPiece()`.
3. Making `Piece` consume context and prefer the parent-aware `mountPiece` when available.

In most cases, this works automatically when both sides use `@collagejs/react` APIs.

## IntelliSense for CorePiece Props

You can get IntelliSense for props passed to `Piece` if your factory function return type is known.

One approach is to declare the module in a `.d.ts` file:

```ts
import type { CorePiece } from "@collagejs/core";

declare module "@my/bare-module-specifier" {
  export function myMfeFactory(): CorePiece<{
    extra: string;
    data: boolean;
  }>;
}
```

## TypeScript Declarations

This package ships generated declaration files in `dist/`, including `dist/index.d.ts` with API JSDoc comments.

## Development

```bash
npm test
npm run build
```

Tests run in Vitest Browser Mode (Playwright/Chromium).
