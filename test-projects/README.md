# React Test Projects

There are 2 sub-folders:

- `buildPiece`
- `Piece`

Both are Vite + React + TS projects used to test-drive the code changes done for `@collagejs/react`, the main purpose of this repository.  While they can teach you how to do things in *CollageJS*, they are not meant to be stable demos.  They are playgrounds, and they won't necessarily be pretty or ordered.  Please have this in mind.

## The buildPiece Project

This one is a Vite + React + TS project that bundles a *CollageJS* piece using `@collagejs/react`'s  `buildPiece()` function.  It can be run standalone, and can serve the piece in DEV server mode.  It is configured to produce a built web application that only serves the piece.

The piece is a simple scoreboard display that accepts properties, which are used to test property reactivity in projects that mount it using the `Piece` component.

## The Piece Project

This project is also a Vite + React + TS project, but this one is just a regular React web application that happens to consume the *CollageJS* scoreboard piece that the other project produces.  It also has a simple, pure TypeScript *CollageJS* piece mounted as well.

This project is meant to test-drive `@collagejs/react`'s `Piece` component.  It mounts 2 scoreboards, plus one instance of the TypeScript piece.  It can be used to test property reactivity, shadow DOM mounting and CSS tricks, like a different border for pieces mounted in light DOM vs. shadow DOM.


## How To Use

Roughly, install packages, then start the development servers.  Do it for both projects.  Then browse the `Piece` project's homepage.

> ⚠️**The Projects are Unstable**
> 
> Being these test projects, sometimes the author might commit changes to them that may assume, for example, that the scoreboard project be served in its built form, not its DEV (pure source code) form.  In this case, you'll see errors.  This is the source of instability and why these projects aren't recommended as examples from where to learn.  Yes, one may learn from them, but the possibility of errors makes it more difficult.
