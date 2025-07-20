import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { code } from "../markdown/code";
import { cn } from "#/utils/utils";
import { ul, ol } from "../markdown/list";
import { pre } from "../markdown/pre";
import { CopyToClipboardButton } from "#/components/shared/buttons/copy-to-clipboard-button";
import { anchor } from "../markdown/anchor";
import { OpenHandsSourceType } from "#/types/core/base";
import { paragraph } from "../markdown/paragraph";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";
import { useSettings } from "#/hooks/query/use-settings";

interface ChatMessageProps {
  type: OpenHandsSourceType;
  message: string;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
  }>;
}

export function ChatMessage({
  type,
  message,
  children,
  actions,
}: React.PropsWithChildren<ChatMessageProps>) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [isCopy, setIsCopy] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(true);
  const { data: settings } = useSettings();

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(message);
    setIsCopy(true);
  };

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isCopy) {
      timeout = setTimeout(() => {
        setIsCopy(false);
      }, 2000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopy]);

  // Get model name for agent messages
  const getModelName = () => {
    if (type !== "agent" || !settings?.LLM_MODEL) return null;

    // Extract just the model name from the full model string
    const modelName = settings.LLM_MODEL;
    return modelName.includes("/")
      ? modelName.split("/").pop() || modelName
      : modelName;
  };

  // For user messages, use the existing simple styling
  if (type === "user") {
    return (
      <article
        data-testid={`${type}-message`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="rounded-xl relative w-fit max-w-[85%] p-4 bg-tertiary self-end flex flex-col gap-2"
      >
        <div
          className={cn(
            "absolute -top-2.5 -right-2.5",
            !isHovering ? "hidden" : "flex",
            "items-center gap-1",
          )}
        >
          {actions?.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.onClick}
              className="button-base p-1 cursor-pointer"
              aria-label={`Action ${index + 1}`}
            >
              {action.icon}
            </button>
          ))}

          <CopyToClipboardButton
            isHidden={!isHovering}
            isDisabled={isCopy}
            onClick={handleCopyToClipboard}
            mode={isCopy ? "copied" : "copy"}
          />
        </div>

        <div className="text-sm break-words">
          <Markdown
            components={{
              code,
              ul,
              ol,
              a: anchor,
              p: paragraph,
              pre,
            }}
            remarkPlugins={[remarkGfm, remarkBreaks]}
          >
            {message}
          </Markdown>
        </div>
        {children}
      </article>
    );
  }

  // For agent messages, use the expandable section styling
  const modelName = getModelName();

  return (
    <article
      data-testid={`${type}-message`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="rounded-xl relative w-fit mt-6 max-w-full bg-transparent flex flex-col gap-2"
    >
      <div
        className={cn(
          "absolute -top-2.5 -right-2.5",
          !isHovering ? "hidden" : "flex",
          "items-center gap-1",
        )}
      >
        {actions?.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            className="button-base p-1 cursor-pointer"
            aria-label={`Action ${index + 1}`}
          >
            {action.icon}
          </button>
        ))}

        <CopyToClipboardButton
          isHidden={!isHovering}
          isDisabled={isCopy}
          onClick={handleCopyToClipboard}
          mode={isCopy ? "copied" : "copy"}
        />
      </div>

      <div className="flex flex-col gap-2 border-l-2 pl-2 my-2 py-2 border-neutral-300 text-sm w-full overflow-hidden">
        <div className="flex items-center justify-between font-bold text-neutral-300">
          <div className="flex-1 min-w-0 mr-4">
            {modelName && (
              <div
                className="text-neutral-400 font-normal"
                style={{ fontSize: "8pt" }}
              >
                From: <span className="font-mono">{modelName}</span>
              </div>
            )}
            <div className="truncate">Agent Message</div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>
        </div>

        {showDetails && (
          <div className="overflow-x-auto">
            <div className="text-sm break-words">
              <Markdown
                components={{
                  code,
                  ul,
                  ol,
                  a: anchor,
                  p: paragraph,
                  pre,
                }}
                remarkPlugins={[remarkGfm, remarkBreaks]}
              >
                {message}
              </Markdown>
            </div>
            {children}
          </div>
        )}
      </div>
    </article>
  );
}
