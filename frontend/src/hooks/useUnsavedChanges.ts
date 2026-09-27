import { useCallback, useState } from "react";

/**
 * Settings forms: compares the current values with the last saved / loaded ones.
 * Call `markSaved(values)` once the data is loaded and again after each successful save.
 */
export function useUnsavedChanges<T>(values: T) {
  const [baseline, setBaseline] = useState<string | null>(null);
  const isDirty = baseline !== null && JSON.stringify(values) !== baseline;
  const markSaved = useCallback((saved: T) => setBaseline(JSON.stringify(saved)), []);
  return { isDirty, markSaved };
}
