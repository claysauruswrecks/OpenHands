import { OpenHandsObservation } from "#/types/core/observations";

export type ObservationResultStatus =
  | "success"
  | "error"
  | "timeout"
  | "partial";

/**
 * Check if content contains actual error indicators, not just informational messages
 */
const isActualError = (content: string): boolean => {
  const lowerContent = content.toLowerCase();

  // Don't treat these informational messages as errors
  const informationalPatterns = [
    /\[edit error: the range of lines to edit is too long\.\]/i,
    /\[\.\.\..*truncated.*\.\.\.\]/i,
    /due to the max output limit.*only part.*shown/i,
    /\[.*observation truncated due to length.*\]/i,
    /consider using.*to explore/i,
    /here are some snippets.*relevant/i,
  ];

  // If any informational pattern matches, don't treat as error
  if (informationalPatterns.some((pattern) => pattern.test(content))) {
    return false;
  }

  // Look for actual error patterns that indicate real failures
  const errorPatterns = [
    /^error:/i, // Lines starting with "Error:"
    /file not found/i, // File access errors
    /permission denied/i, // Permission errors
    /cannot read.*directory/i, // Directory read errors
    /could not be decoded.*utf-8/i, // Encoding errors
    /no such file or directory/i, // File system errors
    /is a directory.*you can only read files/i, // Directory vs file errors
  ];

  return errorPatterns.some((pattern) => pattern.test(content));
};

/**
 * Check if content indicates a partial result (truncated)
 */
const isPartialResult = (content: string): boolean => {
  const truncationPatterns = [
    /\[\.\.\..*truncated.*\.\.\.\]/i,
    /due to the max output limit.*only part.*shown/i,
    /\[.*observation truncated due to length.*\]/i,
    /\[edit error: the range of lines to edit is too long\.\]/i,
  ];

  return truncationPatterns.some((pattern) => pattern.test(content));
};

export const getObservationResult = (event: OpenHandsObservation) => {
  const hasContent = event.content.length > 0;
  const contentIncludesError = isActualError(event.content);
  const isPartial = isPartialResult(event.content);

  switch (event.observation) {
    case "run": {
      const exitCode = event.extras.metadata.exit_code;

      if (exitCode === -1) return "timeout"; // Command timed out
      if (exitCode === 0) return "success"; // Command executed successfully
      return "error"; // Command failed
    }
    case "run_ipython":
    case "read":
    case "edit":
    case "mcp":
      if (!hasContent || contentIncludesError) return "error";
      if (isPartial) return "partial"; // Content was truncated but operation succeeded
      return "success"; // Content is valid and complete
    default:
      return "success";
  }
};
