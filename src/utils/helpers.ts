import { useCallback, useState } from "react";

export const useCenteredTree = (defaultTranslate = { x: 0, y: 0 }) => {
  const [translate, setTranslate] = useState<{ x: number; y: number }>(
    defaultTranslate
  );

  const containerRef = useCallback((containerElem: HTMLDivElement | null) => {
    if (containerElem) {
      const { width, height } = containerElem.getBoundingClientRect();
      setTranslate({ x: width / 2, y: height / 2 });
    }
  }, []);

  return [translate, containerRef] as const;
};
