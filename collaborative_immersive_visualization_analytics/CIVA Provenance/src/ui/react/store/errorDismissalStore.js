// In a new file: src/ui/react/store/errorDismissalStore.js
// This is personal UI state, not collaborative data

const dismissedDatasetErrors = new Map(); // datasetId -> timestamp

export function dismissDatasetError(datasetId) {
  dismissedDatasetErrors.set(datasetId, Date.now());
  // Store in localStorage so it persists across page reloads
  const dismissed = Array.from(dismissedDatasetErrors.entries());
  localStorage.setItem("dismissedDatasetErrors", JSON.stringify(dismissed));
}

export function isDismissed(datasetId) {
  return dismissedDatasetErrors.has(datasetId);
}

export function clearDismissed(datasetId) {
  dismissedDatasetErrors.delete(datasetId);
  // Update localStorage
  const dismissed = Array.from(dismissedDatasetErrors.entries());
  localStorage.setItem("dismissedDatasetErrors", JSON.stringify(dismissed));
}

// When a dataset successfully loads, automatically clear its dismissal
export function onDatasetLoaded(datasetId) {
  clearDismissed(datasetId);
}
