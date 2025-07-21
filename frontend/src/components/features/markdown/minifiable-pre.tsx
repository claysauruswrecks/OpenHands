import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";

interface MinifiablePreProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  minifiedByDefault?: boolean;
  lineThreshold?: number;
  showLineNumbers?: boolean;
}

export function MinifiablePre({
  children,
  className,
  style,
  minifiedByDefault = true,
  lineThreshold = 10,
  showLineNumbers = false,
}: MinifiablePreProps) {
  const { t } = useTranslation();
  const [isMinified, setIsMinified] = React.useState(minifiedByDefault);

  // Clean up cat -n output if detected
  let processedContent = children;
  const lines = children.split("\n");

  // Check if this looks like cat -n output (lines starting with spaces and numbers)
  const isCatNOutput =
    lines.length > 1 &&
    lines.every((line) => {
      if (line.trim() === "") return true; // Empty lines are ok
      // Check if line starts with optional spaces followed by a number
      return /^\s*\d+\s/.test(line);
    });

  if (isCatNOutput) {
    // Remove the line numbers and clean up spacing
    processedContent = lines
      .map((line, idx) => {
        if (line.trim() === "") return line;
        // Remove line number and following spaces, but keep content indentation
        const match = line.match(/^\s*\d+\s+(.*)/);
        if (match) {
          // For lines after the first, remove 2 leading spaces if present
          let content = match[1];
          if (idx > 0 && content.startsWith("  ")) {
            content = content.substring(2);
          }
          return content;
        }
        return line;
      })
      .join("\n");
  }

  const processedLines = processedContent.split("\n");
  const needsMinification = processedLines.length > lineThreshold;

  const renderWithLineNumbers = (
    content: string | string[],
    isMini: boolean = false,
  ) => {
    const linesToRender =
      typeof content === "string" ? content.split("\n") : content;
    let lineNum = 1;

    return (
      <div className="flex min-w-0">
        <div
          className="select-none pr-4 text-neutral-500 text-right flex-shrink-0"
          style={{ minWidth: "3em" }}
        >
          {linesToRender.map((line, idx) => {
            if (isMini && line.startsWith("...")) {
              return <div key={idx}>&nbsp;</div>;
            }
            const currentLineNum = lineNum;
            lineNum += 1;
            return <div key={idx}>{currentLineNum}</div>;
          })}
        </div>
        <div className="flex-1 min-w-0 overflow-x-auto">
          {linesToRender.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "whitespace-pre",
                line.startsWith("...") ? "text-neutral-500 my-1" : "",
              )}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getMiniView = () => {
    if (!needsMinification) return processedContent;

    const beginning = processedLines.slice(0, 2);
    const middleIndex = Math.floor(processedLines.length / 2);
    const middle = processedLines.slice(middleIndex - 1, middleIndex + 1);
    const end = processedLines.slice(-2);

    if (showLineNumbers) {
      return renderWithLineNumbers(
        [
          ...beginning,
          `... ${middleIndex - 2} lines omitted ...`,
          ...middle,
          `... ${processedLines.length - middleIndex - 1 - 2} lines omitted ...`,
          ...end,
        ],
        true,
      );
    }

    return (
      <>
        <div>{beginning.join("\n")}</div>
        <div className="text-neutral-500 my-1">
          ... {middleIndex - 2} lines omitted ...
        </div>
        <div>{middle.join("\n")}</div>
        <div className="text-neutral-500 my-1">
          ... {processedLines.length - middleIndex - 1 - 2} lines omitted ...
        </div>
        <div>{end.join("\n")}</div>
      </>
    );
  };

  if (!needsMinification) {
    if (showLineNumbers) {
      return (
        <pre
          className={cn("overflow-x-auto m-0", className)}
          style={{
            ...style,
            maxWidth: "100%",
            background: style?.background || "transparent",
            border: style?.border || "none",
            padding: style?.padding || 0,
          }}
        >
          <code>{renderWithLineNumbers(processedContent)}</code>
        </pre>
      );
    }
    return (
      <pre
        className={cn("overflow-x-auto", className)}
        style={{
          ...style,
          maxWidth: "100%",
        }}
      >
        <code>{processedContent}</code>
      </pre>
    );
  }

  return (
    <div className="relative">
      {needsMinification && (
        <button
          type="button"
          onClick={() => setIsMinified((prev) => !prev)}
          className="mb-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
        >
          {isMinified ? (
            <>
              {t("markdown.minifiablePre.showFullOutput", {
                count: processedLines.length,
              })}
              <ArrowDown className="h-3 w-3 fill-current" />
            </>
          ) : (
            <>
              {t("markdown.minifiablePre.collapse", {
                count: processedLines.length,
              })}
              <ArrowUp className="h-3 w-3 fill-current" />
            </>
          )}
        </button>
      )}
      <pre
        className={cn(
          className,
          "overflow-x-auto",
          isMinified && "overflow-y-hidden",
        )}
        style={{
          ...style,
          maxWidth: "100%",
        }}
      >
        <code>
          {(() => {
            if (isMinified) {
              return getMiniView();
            }
            if (showLineNumbers) {
              return renderWithLineNumbers(processedContent);
            }
            return processedContent;
          })()}
        </code>
      </pre>
      <button
        type="button"
        onClick={() => setIsMinified((prev) => !prev)}
        className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
      >
        {isMinified ? (
          <>
            {t("markdown.minifiablePre.showFullOutput", {
              count: processedLines.length,
            })}
            <ArrowDown className="h-3 w-3 fill-current" />
          </>
        ) : (
          <>
            {t("markdown.minifiablePre.collapse", {
              count: processedLines.length,
            })}
            <ArrowUp className="h-3 w-3 fill-current" />
          </>
        )}
      </button>
    </div>
  );
}
