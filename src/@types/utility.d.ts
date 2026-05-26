import type { Dispatch, SetStateAction } from 'react';

declare global {
  // Legacy escape hatches are centralized here while historical call sites are typed incrementally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type _ = any;

  // @see https://youtu.be/QSIXYMIJkQg?si=CyycYgaAGNZCEuYj&t=188
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type TODO = any;

  type AnyFunction = (...args: TODO[]) => TODO;

  type URLType = `http${'s' | ''}://${string}.${string}`;

  // https://stackoverflow.com/a/69288824/8440230
  type Expand<T> = T extends (...args: infer A) => infer R
    ? (...args: Expand<A>) => Expand<R>
    : T extends infer O
      ? { [K in keyof O]: O[K] }
      : never;

  type ExpandRecursively<T> = T extends (...args: infer A) => infer R
    ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
    : T extends object
      ? T extends infer O
        ? { [K in keyof O]: ExpandRecursively<O[K]> }
        : never
      : T;
}

declare module 'react' {
  type SetState<S> = Dispatch<SetStateAction<S>>;
}
