import { useEffect, useRef } from 'react';

/**
 * Simulate componentDidUpdate() method of Class Component
 * https://reactjs.org/docs/react-component.html#componentdidupdate
 */
const useUpdateEffect = (effect: AnyFunction, deps: TODO[] | undefined = undefined): void => {
  const mounted = useRef<boolean>(false);
  useEffect(() => {
    if (!mounted.current) {
      // fire componentDidMount
      mounted.current = true;
    } else {
      effect();
    }
  }, deps);
};

export default useUpdateEffect;
