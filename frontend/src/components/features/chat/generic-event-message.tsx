import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useTranslation } from "react-i18next";
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
import { useExpandCollapse } from "#/context/expand-collapse-context";

interface GenericEventMessageProps {
  title: React.ReactNode;
  details: string | React.ReactNode;
  success?: ObservationResultStatus;
  event?: OpenHandsObservation | OpenHandsAction;
  timestamp?: string;
}

// Helper function to extract line count information from truncated file reads
const extractLineCountInfo = (
  content: string,
): { shown: number; total: number; percentage: number } | null => {
  // Try to count actual lines in the content
  const lines = content.split("\n");

  // If content has truncation markers, try to estimate total lines
  if (content.includes("[... Observation truncated due to length ...]")) {
    // For middle-truncated content, we have beginning + end
    // This is an approximation since we don't know exact total
    const truncationIndex = content.indexOf(
      "[... Observation truncated due to length ...]",
    );
    const beforeTruncation = content
      .substring(0, truncationIndex)
      .split("\n").length;
    const afterTruncationStart =
      content.indexOf("[... Observation truncated due to length ...]") +
      "[... Observation truncated due to length ...]".length;
    const afterTruncation = content
      .substring(afterTruncationStart)
      .split("\n").length;

    // Estimate: if we have beginning + end, total is likely much larger
    // We'll estimate based on truncation typically happening around 50% showing
    const shownLines = beforeTruncation + afterTruncation - 2; // subtract for empty lines around truncation message
    const estimatedTotal = Math.round(shownLines / 0.5); // assume ~50% shown

    return {
      shown: Math.max(1, shownLines),
      total: Math.max(shownLines + 1, estimatedTotal),
      percentage: Math.round((shownLines / estimatedTotal) * 100),
    };
  }

  // Check for "Due to the max output limit" pattern
  if (
    content.includes("Due to the max output limit") &&
    content.includes("only part of this file has been shown")
  ) {
    // Count actual displayed lines (excluding the notice message)
    const noticePattern = /Due to the max output limit.*?you\./i;
    const contentWithoutNotice = content.replace(noticePattern, "").trim();
    const displayedLines = contentWithoutNotice
      .split("\n")
      .filter((line) => line.trim().length > 0).length;

    // For this type of truncation, typically shows beginning of file
    // Estimate total based on common truncation ratios
    const estimatedTotal = Math.round(displayedLines * 2.5); // conservative estimate

    return {
      shown: Math.max(1, displayedLines),
      total: Math.max(displayedLines + 1, estimatedTotal),
      percentage: Math.round((displayedLines / estimatedTotal) * 100),
    };
  }

  // Check for patterns like "16000 lines" mentioned in truncation context
  const lineNumberMatch = content.match(/(\d+)\s*lines?/i);
  if (
    lineNumberMatch &&
    (content.includes("truncated") ||
      content.includes("clipped") ||
      content.includes("max output"))
  ) {
    const totalLines = parseInt(lineNumberMatch[1], 10);
    // Count actual displayed content lines
    const displayedLines = lines.filter(
      (line) =>
        line.trim().length > 0 &&
        !line.includes("truncated") &&
        !line.includes("max output") &&
        !line.includes("clipped"),
    ).length;

    return {
      shown: Math.max(1, displayedLines),
      total: Math.max(displayedLines + 1, totalLines),
      percentage: Math.round((displayedLines / totalLines) * 100),
    };
  }

  return null;
};

// Helper function to count lines in successful file reads
const countFileLines = (content: string): number => {
  if (!content || content.trim().length === 0) {
    return 0;
  }

  // Split by newlines and count non-empty lines
  const lines = content.split("\n");

  // Filter out empty lines at the end (common in file reads)
  let endIndex = lines.length - 1;
  while (endIndex >= 0 && lines[endIndex].trim() === "") {
    endIndex -= 1;
  }

  return Math.max(1, endIndex + 1);
};

// Helper function to extract git diff statistics from edit content
const extractDiffStats = (
  content: string,
): {
  additions: number;
  deletions: number;
  isNewFile: boolean;
  isDeletedFile: boolean;
} | null => {
  // Look for git diff stat patterns first
  const diffStatMatch = content.match(
    /(\d+)\s+insertions?\s*\(\+\).*?(\d+)\s+deletions?\s*\(-\)/i,
  );
  if (diffStatMatch) {
    return {
      additions: parseInt(diffStatMatch[1], 10),
      deletions: parseInt(diffStatMatch[2], 10),
      isNewFile: false,
      isDeletedFile: false,
    };
  }

  // Check for file creation/deletion indicators in git diff
  const isNewFile =
    content.includes("new file mode") ||
    (content.includes("--- /dev/null") && content.includes("+++ "));
  const isDeletedFile =
    content.includes("deleted file mode") ||
    (content.includes("--- ") && content.includes("+++ /dev/null"));

  // Look for unified diff format (+/- lines)
  const lines = content.split("\n");
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    // Count actual diff lines (not headers)
    if (
      line.startsWith("+") &&
      !line.startsWith("+++") &&
      !line.startsWith("@@")
    ) {
      additions += 1;
    } else if (
      line.startsWith("-") &&
      !line.startsWith("---") &&
      !line.startsWith("@@")
    ) {
      deletions += 1;
    }
  }

  // Only return if we found actual diff lines or file operations
  if (additions > 0 || deletions > 0 || isNewFile || isDeletedFile) {
    return {
      additions,
      deletions,
      isNewFile,
      isDeletedFile,
    };
  }

  // Look for diff summary patterns like "5 changes applied"
  const changesMatch = content.match(/(\d+)\s+changes?\s+applied/i);
  if (changesMatch) {
    const changes = parseInt(changesMatch[1], 10);
    // Assume roughly equal additions and deletions if we don't have specifics
    return {
      additions: Math.ceil(changes / 2),
      deletions: Math.floor(changes / 2),
      isNewFile: false,
      isDeletedFile: false,
    };
  }

  return null;
};

// Helper function to extract key information from events for the preview
function getDetailsPreview(
  details: string | React.ReactNode,
  success?: ObservationResultStatus,
  event?: OpenHandsObservation | OpenHandsAction,
  t?: (key: string) => string,
): string | React.ReactNode {
  // First, try to extract specific metadata from the event
  if (event && isOpenHandsObservation(event)) {
    const parts: (string | React.ReactNode)[] = [];

    // For run observations, show exit code only
    if (
      event.observation === "run" &&
      event.extras?.metadata?.exit_code !== undefined
    ) {
      const exitCode = event.extras.metadata.exit_code;
      if (exitCode === -1) {
        return (
          <span>
            {t ? t("command.timeout") : "timeout"} (
            <code>
              $?=<span className="text-danger">-1</span>
            </code>
            )
          </span>
        );
      }
      return (
        <code>
          $?=
          <span className={exitCode === 0 ? "text-success" : "text-danger"}>
            {String(exitCode)}
          </span>
        </code>
      );
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
      }
      if (
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
        // For successful edits, try to extract diff statistics first
        // Use event.extras.diff if available, otherwise fall back to event.content
        const diffContent = event.extras?.diff || event.content || "";
        const diffStats = extractDiffStats(diffContent);
        if (diffStats) {
          const { additions, deletions, isNewFile, isDeletedFile } = diffStats;

          if (isNewFile) {
            // New file: "New +25"
            return (
              <span>
                {t ? t("file.new") : "New"}{" "}
                <span className="text-success">+{additions}</span>
              </span>
            );
          }
          if (isDeletedFile) {
            // Deleted file: "Deleted -300"
            return (
              <span>
                {t ? t("file.deleted") : "Deleted"}{" "}
                <span className="text-danger">-{deletions}</span>
              </span>
            );
          }
          if (additions > 0 && deletions > 0) {
            // Modified file: "Edited +25,-60"
            return (
              <span>
                {t ? t("file.edited") : "Edited"}{" "}
                <span className="text-success">+{additions}</span>,
                <span className="text-danger">-{deletions}</span>
              </span>
            );
          }
          if (additions > 0) {
            // Only additions: "Edited +15"
            return (
              <span>
                {t ? t("file.edited") : "Edited"}{" "}
                <span className="text-success">+{additions}</span>
              </span>
            );
          }
          if (deletions > 0) {
            // Only deletions: "Edited -8"
            return (
              <span>
                {t ? t("file.edited") : "Edited"}{" "}
                <span className="text-danger">-{deletions}</span>
              </span>
            );
          }
          return "No changes";
        }
      }
    }

    // For read observations
    if (event.observation === "read") {
      if (success === "success") {
        // For successful reads, show line count in x/x lines (100%) format
        const lineCount = countFileLines(event.content || "");
        if (lineCount > 0) {
          return `${lineCount}/${lineCount} lines (100%)`;
        }
        return "Empty file";
      }
      if (success === "partial") {
        // For partial reads, show line count and percentage
        const lineInfo = extractLineCountInfo(event.content || "");
        if (lineInfo) {
          return `${lineInfo.shown}/${lineInfo.total} lines (${lineInfo.percentage}%)`;
        }
        // Fallback if we can't extract line info
        const linesMatch = event.content?.match(/(\d+)\s+lines?/);
        if (linesMatch) {
          return `~${linesMatch[1]} lines (partial)`;
        }
        return "Partial file read";
      }
    }

    // If we found specific metadata, return it (this is mainly for other observation types)
    if (parts.length > 0) {
      // Handle mixed string and React node content
      if (parts.some((part) => typeof part !== "string")) {
        // If any part is a React node, return a fragment
        return (
          <>
            {parts.map((part, index) => (
              <React.Fragment key={index}>{part}</React.Fragment>
            ))}
          </>
        );
      }
      // All strings, join normally
      return parts.join(" | ");
    }
  }

  // Fallback to extracting from the details string
  if (typeof details === "string") {
    // Basic fallback for simple patterns
    const lines = details.split("\n");
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine.substring(0, 50);
    }
  }

  return "";
}

export function GenericEventMessage({
  title,
  details,
  success,
  event,
  timestamp,
}: GenericEventMessageProps) {
  const { t } = useTranslation();
  const [showDetailsLocal, setShowDetailsLocal] = React.useState(false);
  const { shouldShowDetails, setIndividualOverride } = useExpandCollapse();

  // Generate unique component ID for this message
  const componentId = React.useMemo(() => {
    const eventId = event?.id || "no-event-id";
    const titleStr = typeof title === "string" ? title : "no-title";
    return `generic-event-${eventId}-${titleStr.slice(0, 50).replace(/[^a-zA-Z0-9]/g, "")}`;
  }, [event?.id, title]);

  // Get the actual showDetails value from context
  const showDetails = shouldShowDetails(showDetailsLocal, componentId);

  // Format timestamp for display
  const formatTimestamp = (timestampValue: string) => {
    try {
      const date = new Date(timestampValue);
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestampValue;
    }
  };

  // Extract preview from details
  const detailsPreview = getDetailsPreview(details, success, event, t);

  // Determine "from" label based on source
  let fromLabel: string | null = null;
  let showSystemLabel = false;
  if (event && isOpenHandsObservation(event)) {
    if (event.source === "agent") {
      fromLabel = "Agent";
      showSystemLabel = true;
    } else if (event.source === "user") {
      fromLabel = "User";
      showSystemLabel = true;
    }
  } else if (event && isOpenHandsAction(event)) {
    if (event.source === "agent") {
      fromLabel = "Agent";
      showSystemLabel = true;
    } else if (event.source === "user") {
      fromLabel = "User";
      showSystemLabel = true;
    }
  }

  return (
    <div className="flex flex-col gap-2 border-l-2 pl-1 my-2 py-2 border-neutral-300 text-sm w-full overflow-hidden">
      <div className="flex flex-col gap-1 font-bold text-neutral-300">
        {/* Top row: From label (left) and status details (right) */}
        {(fromLabel || detailsPreview) && (
          <div className="flex items-center">
            {fromLabel ? (
              <div
                className="text-neutral-400 font-normal text-xs pr-4"
                style={{ fontSize: "9pt", lineHeight: "1rem" }}
              >
                {t("chat.from")}:{" "}
                {showSystemLabel ? (
                  fromLabel
                ) : (
                  <span className="font-mono">{fromLabel}</span>
                )}
              </div>
            ) : (
              <div />
            )}
            {detailsPreview && (
              <div
                className="flex-1 flex justify-end min-w-0"
                style={{ marginRight: "2rem" }}
              >
                <span
                  className="text-xs text-neutral-400 font-medium truncate"
                  style={{ lineHeight: "1rem" }}
                >
                  {detailsPreview}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom row: Action details (left) and status icon + chevron (right) */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-1 truncate">{title}</div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {success && (
              <SuccessIndicator
                status={success}
                observationType={
                  event && isOpenHandsObservation(event)
                    ? event.observation
                    : undefined
                }
              />
            )}
            {details && (
              <button
                type="button"
                onClick={() => {
                  setIndividualOverride(componentId);
                  setShowDetailsLocal((prev) => !prev);
                }}
                className="cursor-pointer p-1"
                style={{ transform: "translateY(-0.625rem)" }}
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

        {/* Third row: Timestamp (left-aligned) - for tool calls */}
        {timestamp && (
          <div className="flex items-center">
            <div
              className="text-neutral-400 font-normal text-xs"
              style={{ fontSize: "9pt", lineHeight: "1rem" }}
            >
              {formatTimestamp(timestamp)}
            </div>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="overflow-x-auto">
          {/* Show command display for run observations */}
          {(() => {
            if (
              event &&
              isOpenHandsObservation(event) &&
              event.observation === "run" &&
              event.extras?.command
            ) {
              return (
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
              );
            }

            if (
              event &&
              isOpenHandsObservation(event) &&
              event.observation === "edit" &&
              event.extras?.diff
            ) {
              // Special handling for edit observations with diffs
              return <DiffWithSyntax diff={event.extras.diff} />;
            }

            if (typeof details === "string") {
              return (
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
              );
            }

            return details;
          })()}
        </div>
      )}
    </div>
  );
}
