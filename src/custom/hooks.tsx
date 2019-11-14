import { useRef, useEffect } from 'react';

/**
 * @description Returns previous value, usually created to be used as a container for prev props
 * @param {T} value to be chached
 * @returns {?T}
 */
export function usePrevious<T>(value: T): T | undefined {
	const previousRef = useRef<T>();

	useEffect((): void => {
		previousRef.current = value;
	});

	return previousRef.current;
}
