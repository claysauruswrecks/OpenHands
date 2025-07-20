import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import { pre } from "../markdown/pre";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";
import { SuccessIndicator } from "./success-indicator";
import { ObservationResultStatus } from "./event-content-helpers/get-observation-result";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsObservation, isOpenHandsAction } from "#/types/core/guards";
import { CommandDisplay } from "./command-display";
import { DiffWithSyntax } from "./diff-with-syntax";
import { OpenHandsAction } from "#/types/core/actions";
import { useSettings } from "#/hooks/query/use-settings";

interface GenericEventMessageProps {
  title: React.ReactNode;
  details: string | React.ReactNode;
  success?: ObservationResultStatus;
  event?: OpenHandsObservation | OpenHandsAction;
}

// Helper function to extract key information from events for the preview
function getDetailsPreview(
  details: string | React.ReactNode,
  success?: ObservationResultStatus,
  event?: OpenHandsObservation,
): string {
  // First, try to extract specific metadata from the event
  if (event && isOpenHandsObservation(event)) {
    const parts: string[] = [];

    // For run observations, show exit code only
    if (
      event.observation === "run" &&
      event.extras?.metadata?.exit_code !== undefined
    ) {
      const exitCode = event.extras.metadata.exit_code;
      if (exitCode === -1) {
        return "timeout (exit code: -1)";
      } else {
        return `exit code: ${exitCode}`;
      }
    }

    // For error observations, show the error message
    if (event.observation === "error" && event.message) {
      parts.push(event.message.substring(0, 100));
    }

    // For recall observations, show a brief summary
    if (event.observation === "recall") {
      if (event.extras?.recall_type === "workspace_context") {
        // Just show a simple indicator for workspace context
        return "";
      } else if (
        event.extras?.microagent_knowledge &&
        event.extras.microagent_knowledge.length > 0
      ) {
        // Show count of triggered microagents
        const count = event.extras.microagent_knowledge.length;
        return `${count} microagent${count === 1 ? "" : "s"} triggered`;
      }
      // For other recall types, show nothing in preview
      return "";
    }

    // For edit observations
    if (event.observation === "edit") {
      if (
        success === "error" &&
        event.content?.toLowerCase().includes("error:")
      ) {
        const errorMatch = event.content.match(/error:\s*([^\n]+)/i);
        if (errorMatch) {
          parts.push(errorMatch[1].trim());
        }
      } else if (success === "success") {
        // For successful edits, indicate the type of change
        if (event.content?.includes("created")) {
          parts.push("File created successfully");
        } else if (event.content?.includes("changes")) {
          const changesMatch = event.content.match(/(\d+)\s+changes?/);
          if (changesMatch) {
            parts.push(
              `${changesMatch[1]} change${changesMatch[1] === "1" ? "" : "s"} applied`,
            );
          } else {
            parts.push("File edited successfully");
          }
        } else {
          parts.push("Edit completed");
        }
      }
    }

    // For read observations
    if (event.observation === "read") {
      if (success === "success") {
        const linesMatch = event.content?.match(/(\d+)\s+lines?/);
        if (linesMatch) {
          parts.push(
            `Read ${linesMatch[1]} line${linesMatch[1] === "1" ? "" : "s"}`,
          );
        } else {
          parts.push("File read successfully");
        }
      }
    }

    // If we found specific metadata, return it
    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  // Fallback to extracting from the details string
  if (typeof details === "string") {
    // Skip generic prefixes
    const skipPrefixes = ["Output:", "**Output:**", "Content:", "**Content:**"];
    let processedDetails = details.trim();

    for (const prefix of skipPrefixes) {
      if (processedDetails.startsWith(prefix)) {
        processedDetails = processedDetails.substring(prefix.length).trim();
      }
    }

    // Remove markdown formatting and get first line
    const plainText = processedDetails
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/`([^`]+)`/g, "$1") // Remove inline code formatting
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/^#+\s*/gm, "") // Remove headers
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim();

    // Get first meaningful line or truncate if too long
    const firstLine = plainText.split(/[.!?]/).filter((line) => line.trim())[0];
    return firstLine ? firstLine.trim() : plainText.substring(0, 100);
  }
  return "";
}

export function GenericEventMessage({
  title,
  details,
  success,
  event,
}: GenericEventMessageProps) {
  const [showDetails, setShowDetails] = React.useState(true);
  const detailsPreview = getDetailsPreview(
    details,
    success,
    event && isOpenHandsObservation(event) ? event : undefined,
  );
  const { data: settings } = useSettings();

  // Check if this is a recall event or condensation event to show "From: System"
  const isRecallEvent =
    event && isOpenHandsObservation(event) && event.observation === "recall";

  // Check if this is a condensation action
  // Since "condensation" isn't in the TypeScript types, we'll check it as a string
  const isCondensationAction =
    event &&
    isOpenHandsAction(event) &&
    (event.action as string) === "condensation";

  const showSystemLabel = isRecallEvent || isCondensationAction;

  // Check if this is an agent event (run, edit, read, think observations)
  const isAgentEvent =
    event &&
    isOpenHandsObservation(event) &&
    (event.observation === "run" ||
      event.observation === "edit" ||
      event.observation === "read" ||
      event.observation === "think") &&
    event.source === "agent";

  let fromLabel = null;
  if (showSystemLabel) {
    fromLabel = "System";
  } else if (isAgentEvent) {
    // Extract model name from settings
    const modelName = settings?.LLM_MODEL || "AI";
    // If model name contains slash, take the part after the last slash
    const shortModelName = modelName.includes("/")
      ? modelName.split("/").pop() || modelName
      : modelName;
    fromLabel = shortModelName;
  }

  return (
    <div className="flex flex-col gap-2 border-l-2 pl-2 my-2 py-2 border-neutral-300 text-sm w-full overflow-hidden">
      <div className="flex items-center justify-between font-bold text-neutral-300">
        {/* Title section with verb and command/filename - expands to fill space */}
        <div className="flex-1 min-w-0 mr-4">
          {fromLabel && (
            <div
              className="text-neutral-400 font-normal"
              style={{ fontSize: "8pt" }}
            >
              From:{" "}
              {showSystemLabel ? (
                fromLabel
              ) : (
                <span className="font-mono">{fromLabel}</span>
              )}
            </div>
          )}
          <div className="truncate">{title}</div>
        </div>

        {/* Status details and icon grouped at the end */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status details preview */}
          {detailsPreview && (
            <span className="text-xs text-neutral-400">{detailsPreview}</span>
          )}

          {success && <SuccessIndicator status={success} />}

          {details && (
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="cursor-pointer p-1"
              aria-label={showDetails ? "Collapse" : "Expand"}
            >
              {showDetails ? (
                <ArrowUp className="h-4 w-4 fill-neutral-300" />
              ) : (
                <ArrowDown className="h-4 w-4 fill-neutral-300" />
              )}
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="overflow-x-auto">
          {/* Show command display for run observations */}
          {event &&
          isOpenHandsObservation(event) &&
          event.observation === "run" &&
          event.extras?.command ? (
            <>
              <CommandDisplay command={event.extras.command as string} />
              {/* Show output if available */}
              {event.content && (
                <div className="mt-2">
                  <Markdown
                    components={{
                      code,
                      ul,
                      ol,
                      pre,
                    }}
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                  >
                    {`\`\`\`sh\n${event.content.trim() || "[Command finished execution with no output]"}\n\`\`\``}
                  </Markdown>
                </div>
              )}
            </>
          ) : event &&
            isOpenHandsObservation(event) &&
            event.observation === "edit" &&
            event.extras?.diff ? (
            // Special handling for edit observations with diffs
            <DiffWithSyntax diff={event.extras.diff} />
          ) : typeof details === "string" ? (
            <Markdown
              components={{
                code,
                ul,
                ol,
                pre,
              }}
              remarkPlugins={[remarkGfm, remarkBreaks]}
            >
              {details}
            </Markdown>
          ) : (
            details
          )}
        </div>
      )}
    </div>
  );
}
