type CloseFn = () => void;

const listeners = new Set<CloseFn>();

export function registerBuilderItemTooltipClose(fn: CloseFn) {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/** Cierra todos los tooltips de equipo (un solo portal activo a la vez). */
export function closeAllBuilderItemTooltips() {
    listeners.forEach((fn) => {
        fn();
    });
}
