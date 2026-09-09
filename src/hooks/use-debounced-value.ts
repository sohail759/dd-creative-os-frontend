"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A value that settles `delay` ms after it stops changing.
 *
 * Both search boxes hand-rolled this with `setTimeout` inside an effect that
 * also wrote to the URL and reset pagination, so the debounce and the side
 * effects were tangled: the timer had to be re-read to know what was actually
 * being delayed, and the two copies had already drifted apart in what they
 * reset. Here the hook does one thing, and the caller reacts to the settled
 * value.
 *
 * Two details that the hand-rolled versions got wrong:
 *
 *   - **Clearing is immediate.** Emptying the box should show everything at
 *     once; waiting 300ms to remove a filter feels broken in a way that
 *     waiting 300ms to apply one does not.
 *   - **The first value is not delayed.** A page opened with `?q=B438` in the
 *     URL rendered unfiltered for 300ms and then jumped.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setSettled(value);
      return;
    }
    // Removing a filter applies straight away; adding one waits.
    if (value === "" || value == null) {
      setSettled(value);
      return;
    }
    const handle = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return settled;
}
