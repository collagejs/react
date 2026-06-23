import type { AcceptableTarget, CorePiece, MountProps } from '@collagejs/core';

const pieceTestId = 'test-piece';

function delay(time = 1000) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function buildTestPiece<TProps extends Record<string, any> = Record<string, any>>(
    callbacks?: {
        mount: (target: AcceptableTarget, props?: MountProps<TProps>) => void | (() => void);
        unmount: () => void;
        update: (props: TProps) => void;
    }
): CorePiece<TProps> {
    let pre: HTMLElement;
    let styleEl: HTMLStyleElement;
    return {
        // Here's mount():
        async mount(target: AcceptableTarget, props?: MountProps<TProps>) {
            const delayMountCb = callbacks?.mount?.(target, props);
            styleEl = document.createElement('style');
            styleEl.textContent = `
            pre { color: yellow; margin-left: auto; margin-right: auto; text-align: left; width: min-content; }
            `;
            target.appendChild(styleEl);
            pre = document.createElement('pre');
            pre.setAttribute('data-testid', pieceTestId);
            pre.textContent = JSON.stringify(props, null, 2);
            target.appendChild(pre);
            if (delayMountCb) {
                await delay();
                delayMountCb();
            }
            // Here's the unmounting function:
            return () => {
                callbacks?.unmount?.();
                target.removeChild(pre);
                target.removeChild(styleEl);
                return Promise.resolve();
            };
        },
        // Here's update():
        update(props: TProps) {
            callbacks?.update?.(props);
            pre.textContent = JSON.stringify(props, null, 2);
            return Promise.resolve();
        }
    };
}
