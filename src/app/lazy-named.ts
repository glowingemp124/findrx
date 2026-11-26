import { lazy, type ComponentType } from "react";

/** `React.lazy` for modules that use named exports. */
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M & string>(load: () => Promise<M>, name: K) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}
