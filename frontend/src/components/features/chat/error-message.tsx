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
import i18n from "#/i18n";

interface ErrorMessageProps {
  errorId?: string;
  defaultMessage: string;
}

export function ErrorMessage({ errorId, defaultMessage }: ErrorMessageProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = React.useState(false);

  const hasValidTranslationId = !!errorId && i18n.exists(errorId);
  const errorKey = hasValidTranslationId
    ? errorId
    : "CHAT_INTERFACE$AGENT_ERROR_MESSAGE";

  return (
    <div className="flex flex-col gap-2 border-l-2 pl-2 my-2 py-2 border-danger text-sm w-full overflow-hidden">
      <div className="flex items-center justify-between">
        {/* Error title - expands to fill space */}
        <div className="font-bold text-danger truncate flex-1 min-w-0 mr-4">
          {t(errorKey)}
        </div>

        {/* Error preview and expand/collapse button at the end */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Show truncated error preview when collapsed */}
          {!showDetails && defaultMessage && (
            <span className="text-xs text-danger/70">
              {defaultMessage.slice(0, 50).replace(/\n/g, " ").trim()}
            </span>
          )}

          {/* Expand/collapse button */}
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="cursor-pointer p-1"
            aria-label={showDetails ? "Collapse" : "Expand"}
          >
            {showDetails ? (
              <ArrowUp className="h-4 w-4 fill-danger" />
            ) : (
              <ArrowDown className="h-4 w-4 fill-danger" />
            )}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="overflow-x-auto">
          <Markdown
            components={{
              code,
              ul,
              ol,
              pre,
            }}
            remarkPlugins={[remarkGfm, remarkBreaks]}
          >
            {defaultMessage}
          </Markdown>
        </div>
      )}
    </div>
  );
}
