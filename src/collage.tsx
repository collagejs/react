import {
    createElement,
    type ComponentType,
} from "react";
import {
    createRoot,
    type Root,
    type RootOptions,
} from "react-dom/client";
import {
    mountPiece,
    mountPieceKey,
    type AcceptableTarget,
    type CorePiece,
    type MountPiece,
    type MountProps,
} from "@collagejs/core";
import { CollageProvider } from "./collageContext.js";

/**
 * Lifecycle options for `buildPiece()`.
 */
export type ComponentOperationOptions<
    TProps extends Record<string, any> = Record<string, any>,
> = {
    preMount?: (target: AcceptableTarget) => Promise<void> | void;
    postUnmount?: (target: AcceptableTarget) => Promise<void> | void;
    props?: Partial<TProps>;
    rootOptions?: RootOptions;
};

class ReactPiece<TProps extends Record<string, any> = Record<string, any>> {
    props = {} as TProps;
    target: AcceptableTarget | undefined = undefined;
    root: Root | undefined = undefined;
    parentMountPiece: MountPiece<TProps> | undefined = undefined;
    mounted = false;
    retired = false;
}

function getRuntimeProps<
    TProps extends Record<string, any> = Record<string, any>,
>(props?: MountProps<TProps>) {
    const runtimeProps = { ...(props ?? {}) } as Record<string | symbol, any>;
    const parentMountPiece = runtimeProps[mountPieceKey] as
        | MountPiece<TProps>
        | undefined;

    delete runtimeProps[mountPieceKey];

    return {
        parentMountPiece,
        runtimeProps: runtimeProps as TProps,
    };
}

function renderComponent<
    TProps extends Record<string, any> = Record<string, any>,
>(
    component: ComponentType<TProps>,
    root: Root,
    props: TProps,
    parentMountPiece?: MountPiece<TProps>,
) {
    const contextMountPiece: MountPiece =
        (parentMountPiece ?? mountPiece) as unknown as MountPiece;

    root.render(
        createElement(
            CollageProvider,
            { value: { mountPiece: contextMountPiece } },
            createElement(component, props),
        ),
    );
}

function buildPieceFactory() {
    return function <TProps extends Record<string, any> = Record<string, any>>(
        component: ComponentType<TProps>,
        options?: ComponentOperationOptions<TProps>,
    ) {
        if (!component) {
            throw new Error("No component was given to the function.");
        }

        const thisValue = new ReactPiece<TProps>();

        async function mountComponent(
            this: ReactPiece<TProps>,
            target: AcceptableTarget,
            props?: MountProps<TProps>,
        ) {
            if (this.retired) {
                throw new Error(
                    "Cannot mount: this CorePiece instance was already unmounted and cannot be remounted.",
                );
            }

            if (this.mounted) {
                throw new Error(
                    "Cannot mount: this CorePiece instance is already mounted.",
                );
            }

            this.target = target;
            await options?.preMount?.(target);

            const root = createRoot(target, options?.rootOptions);
            this.root = root;

            const {
                parentMountPiece,
                runtimeProps,
            } = getRuntimeProps(props);

            const mergedProps = {
                ...options?.props,
                ...runtimeProps,
            } as TProps;

            this.props = mergedProps;
            this.parentMountPiece = parentMountPiece;
            renderComponent(component, root, this.props, parentMountPiece);
            this.mounted = true;

            return async () => {
                if (!this.root || !this.target || !this.mounted) {
                    throw new Error(
                        "Cannot unmount: there is no mounted component instance to unmount.",
                    );
                }

                this.root.unmount();
                await options?.postUnmount?.(this.target);
                this.root = undefined;
                this.target = undefined;
                this.parentMountPiece = undefined;
                this.props = {} as TProps;
                this.mounted = false;
                this.retired = true;
            };
        }

        function updateComponent(this: ReactPiece<TProps>, newProps: TProps) {
            if (!this.root || !this.target || !this.mounted) {
                return Promise.reject(
                    new Error("Cannot update: no component has been mounted."),
                );
            }

            for (const key in newProps) {
                this.props[key] = newProps[key];
            }

            renderComponent(
                component,
                this.root,
                this.props,
                this.parentMountPiece,
            );
            return Promise.resolve();
        }

        return {
            mount: mountComponent.bind(thisValue),
            update: updateComponent.bind(thisValue),
        } satisfies CorePiece<TProps>;
    };
}

/**
 * Default factory function that wraps a React component into a `CorePiece`.
 */
export const buildPiece = buildPieceFactory();
