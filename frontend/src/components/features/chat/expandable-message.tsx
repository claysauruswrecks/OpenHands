import { PayloadAction } from "@reduxjs/toolkit";
import React, { useEffect, useState, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { Link } from "react-router";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useConfig } from "#/hooks/query/use-config";
import { I18nKey } from "#/i18n/declaration";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";
import CheckCircle from "#/icons/check-circle-solid.svg?react";
import XCircle from "#/icons/x-circle-solid.svg?react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { cn } from "#/utils/utils";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import { paragraph } from "../markdown/paragraph";
import { pre } from "../markdown/pre";
import { MonoComponent } from "./mono-component";
import { PathComponent } from "./path-component";
import { useExpandCollapse } from "#/context/expand-collapse-context";

const trimText = (text: string, maxLength: number): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
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
      additions++;
    } else if (
      line.startsWith("-") &&
      !line.startsWith("---") &&
      !line.startsWith("@@")
    ) {
      deletions++;
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

// Helper function to compute status text for edit observations
const getEditStatusText = (
  content: string,
  success?: boolean,
): string | React.ReactNode => {
  if (success === false && content?.toLowerCase().includes("error:")) {
    const errorMatch = content.match(/error:\s*([^\n]+)/i);
    if (errorMatch) {
      return errorMatch[1].trim();
    }
  } else if (success !== false) {
    // For successful edits, try to extract diff statistics first
    const diffStats = extractDiffStats(content || "");
    if (diffStats) {
      const { additions, deletions, isNewFile, isDeletedFile } = diffStats;

      if (isNewFile) {
        // New file: "New +25"
        return (
          <span>
            New <span className="text-success">+{additions}</span>
          </span>
        );
      } else if (isDeletedFile) {
        // Deleted file: "Deleted -300"
        return (
          <span>
            Deleted <span className="text-danger">-{deletions}</span>
          </span>
        );
      } else if (additions > 0 && deletions > 0) {
        // Modified file: "Edited +25,-60"
        return (
          <span>
            Edited <span className="text-success">+{additions}</span>,
            <span className="text-danger">-{deletions}</span>
          </span>
        );
      } else if (additions > 0) {
        // Only additions: "Edited +15"
        return (
          <span>
            Edited <span className="text-success">+{additions}</span>
          </span>
        );
      } else if (deletions > 0) {
        // Only deletions: "Edited -8"
        return (
          <span>
            Edited <span className="text-danger">-{deletions}</span>
          </span>
        );
      } else {
        return "No changes";
      }
    }
    // Fall back to existing logic if we can't extract diff stats
    if (content?.includes("created")) {
      return "File created";
    } else if (content?.includes("changes")) {
      const changesMatch = content.match(/(\d+)\s+changes?/);
      if (changesMatch) {
        return `${changesMatch[1]} change${changesMatch[1] === "1" ? "" : "s"}`;
      } else {
        return "File edited";
      }
    } else {
      return "File edited";
    }
  }
  return "Details available";
};

interface ExpandableMessageProps {
  id?: string;
  message: string;
  type: string;
  success?: boolean;
  observation?: PayloadAction<OpenHandsObservation>;
  action?: PayloadAction<OpenHandsAction>;
}

export function ExpandableMessage({
  id,
  message,
  type,
  success,
  observation,
  action,
}: ExpandableMessageProps) {
  const { data: config } = useConfig();
  const { t, i18n } = useTranslation();
  const [showDetailsLocal, setShowDetailsLocal] = useState(true);
  const [details, setDetails] = useState(message);
  const { shouldShowDetails, setIndividualOverride } = useExpandCollapse();

  // Generate unique component ID for this message
  const componentId = React.useMemo(
    () =>
      `expandable-message-${id || "no-id"}-${type}-${message.slice(0, 50).replace(/[^a-zA-Z0-9]/g, "")}`,
    [id, type, message],
  );

  // Get the actual showDetails value from context
  const showDetails = shouldShowDetails(showDetailsLocal, componentId);
  const [translationId, setTranslationId] = useState<string | undefined>(id);
  const [translationParams, setTranslationParams] = useState<
    Record<string, unknown>
  >({
    observation,
    action,
  });

  useEffect(() => {
    // If we have a translation ID, process it
    if (id && i18n.exists(id)) {
      let processedObservation = observation;
      let processedAction = action;

      if (action && action.payload.action === "run") {
        const trimmedCommand = trimText(action.payload.args.command, 80);
        processedAction = {
          ...action,
          payload: {
            ...action.payload,
            args: {
              ...action.payload.args,
              command: trimmedCommand,
            },
          },
        };
      }

      if (observation && observation.payload.observation === "run") {
        const trimmedCommand = trimText(observation.payload.extras.command, 80);
        processedObservation = {
          ...observation,
          payload: {
            ...observation.payload,
            extras: {
              ...observation.payload.extras,
              command: trimmedCommand,
            },
          },
        };
      }

      setTranslationId(id);
      setTranslationParams({
        observation: processedObservation,
        action: processedAction,
      });
      setDetails(message);
      setShowDetailsLocal(true);
    }
  }, [id, message, observation, action, i18n.language]);

  // Compute status text for edit observations
  const statusText = useMemo(() => {
    if (observation && observation.payload.observation === "edit") {
      return getEditStatusText(observation.payload.content, success);
    }

    // For other observations, show truncated details if available
    if (details && typeof details === "string") {
      return details.slice(0, 50).replace(/\n/g, " ").trim();
    }

    return "Details available";
  }, [observation, success, details]);

  const statusIconClasses = "h-4 w-4 ml-2 inline";

  if (
    config?.FEATURE_FLAGS.ENABLE_BILLING &&
    config?.APP_MODE === "saas" &&
    id === I18nKey.STATUS$ERROR_LLM_OUT_OF_CREDITS
  ) {
    return (
      <div
        data-testid="out-of-credits"
        className="flex gap-2 items-center justify-start border-l-2 pl-2 my-2 py-2 border-danger"
      >
        <div className="text-sm w-full">
          <div className="font-bold text-danger">
            {t(I18nKey.STATUS$ERROR_LLM_OUT_OF_CREDITS)}
          </div>
          <Link
            className="mt-2 mb-2 w-full h-10 rounded-sm flex items-center justify-center gap-2 bg-primary text-[#0D0F11]"
            to="/settings/billing"
          >
            {t(I18nKey.BILLING$CLICK_TO_TOP_UP)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 items-center justify-start border-l-2 pl-2 my-2 py-2 overflow-hidden",
        type === "error" ? "border-danger" : "border-neutral-300",
      )}
    >
      <div className="text-sm w-full overflow-hidden">
        <div className="flex flex-row justify-between items-center w-full">
          {/* Title with verb and command/filename - expands to fill space */}
          <span
            className={cn(
              "font-bold truncate flex-1 min-w-0 mr-4",
              type === "error" ? "text-danger" : "text-neutral-300",
            )}
          >
            {translationId && i18n.exists(translationId) ? (
              <Trans
                i18nKey={translationId}
                values={translationParams}
                components={{
                  bold: <strong />,
                  path: <PathComponent />,
                  cmd: <MonoComponent />,
                }}
              />
            ) : (
              message
            )}
          </span>

          {/* Status details, icon and expand/collapse button grouped at the end */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Show computed status text if available */}
            {details && !showDetails && (
              <span className="text-xs text-neutral-400">{statusText}</span>
            )}

            {type === "action" && success !== undefined && (
              <>
                {success ? (
                  <CheckCircle
                    data-testid="status-icon"
                    className={cn(statusIconClasses, "fill-success")}
                  />
                ) : (
                  <XCircle
                    data-testid="status-icon"
                    className={cn(statusIconClasses, "fill-danger")}
                  />
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setIndividualOverride(componentId);
                setShowDetailsLocal(!showDetailsLocal);
              }}
              className="cursor-pointer p-1"
              aria-label={showDetails ? "Collapse" : "Expand"}
            >
              {showDetails ? (
                <ArrowUp
                  className={cn(
                    "h-4 w-4",
                    type === "error" ? "fill-danger" : "fill-neutral-300",
                  )}
                />
              ) : (
                <ArrowDown
                  className={cn(
                    "h-4 w-4",
                    type === "error" ? "fill-danger" : "fill-neutral-300",
                  )}
                />
              )}
            </button>
          </div>
        </div>
        {showDetails && (
          <div className="text-sm overflow-x-auto">
            <Markdown
              components={{
                code,
                ul,
                ol,
                p: paragraph,
                pre,
              }}
              remarkPlugins={[remarkGfm, remarkBreaks]}
            >
              {details}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
