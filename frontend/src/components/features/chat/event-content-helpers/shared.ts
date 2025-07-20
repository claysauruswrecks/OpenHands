import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";

export const MAX_CONTENT_LENGTH = 30000; // Match backend MAX_CMD_OUTPUT_SIZE

export const getDefaultEventContent = (
  event: OpenHandsAction | OpenHandsObservation,
): string => `\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``;
