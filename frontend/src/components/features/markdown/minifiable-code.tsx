import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "#/utils/utils";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";

interface MinifiableCodeProps {
  children: string;
  language?: string;
  className?: string;
  minifiedByDefault?: boolean;
  lineThreshold?: number;
}

// Language mapping from file extensions
const getLanguageFromPath = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    ps1: "powershell",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    md: "markdown",
    markdown: "markdown",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
    conf: "ini",
    zig: "zig",
  };
  return languageMap[ext || ""] || "";
};

interface ParsedLine {
  lineNumber: number | null;
  content: string;
}

// Parse cat -n output to extract line numbers and content
const parseCatNOutput = (
  content: string,
): {
  lines: ParsedLine[];
  isCatN: boolean;
  detectedLanguage?: string;
} => {
  const lines = content.split("\n");

  // Check if first line contains a file path indicator
  let startIndex = 0;
  let detectedLanguage: string | undefined;
  const firstLine = lines[0];
  if (
    firstLine &&
    (firstLine.includes("result of running `cat -n`") ||
      firstLine.includes("Here's the result") ||
      firstLine.includes("cat -n"))
  ) {
    // Try to extract file path for language detection
    const pathMatch = firstLine.match(/(?:on|to)\s+([\/\w\-_.]+\.\w+)/);
    if (pathMatch) {
      detectedLanguage = getLanguageFromPath(pathMatch[1]);
    }
    startIndex = 1;
  }

  // Check if this looks like cat -n output
  const catNPattern = /^\s*(\d+)\t(.*)$/;
  let parsedLines: ParsedLine[] = [];
  let isCatN = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(catNPattern);

    if (match) {
      isCatN = true;
      parsedLines.push({
        lineNumber: parseInt(match[1], 10),
        content: match[2],
      });
    } else if (isCatN) {
      // If we've been parsing cat -n but this line doesn't match,
      // it might be a continuation or empty line
      parsedLines.push({
        lineNumber: null,
        content: line,
      });
    } else {
      // Not cat -n format
      parsedLines.push({
        lineNumber: null,
        content: line,
      });
    }
  }

  // If we didn't detect cat -n format, return original lines
  if (!isCatN) {
    parsedLines = lines.map((line) => ({ lineNumber: null, content: line }));
  }

  return { lines: parsedLines, isCatN, detectedLanguage };
};

export function MinifiableCode({
  children,
  language,
  className,
  minifiedByDefault = true,
  lineThreshold = 10,
}: MinifiableCodeProps) {
  const [isMinified, setIsMinified] = React.useState(minifiedByDefault);

  // Parse the content to check for cat -n format
  const {
    lines: parsedLines,
    isCatN,
    detectedLanguage,
  } = parseCatNOutput(children);

  // Use detected language if not explicitly provided
  const effectiveLanguage = language || detectedLanguage;

  // Determine button text based on language
  const isCommandOutput =
    effectiveLanguage === "sh" ||
    effectiveLanguage === "bash" ||
    effectiveLanguage === "shell";
  const buttonText = isCommandOutput ? "output" : "code";

  // For cat -n output, we work with parsed lines
  const needsMinification = parsedLines.length > lineThreshold;

  const getMiniView = () => {
    if (!needsMinification) return parsedLines;

    const beginning = parsedLines.slice(0, 5);
    const middleIndex = Math.floor(parsedLines.length / 2);
    const middle = parsedLines.slice(middleIndex - 2, middleIndex + 2);
    const end = parsedLines.slice(-5);

    // Calculate how many lines are omitted
    const beforeMiddle = middleIndex - 5 - 2;
    const afterMiddle = parsedLines.length - middleIndex - 2 - 5;

    return [
      ...beginning,
      { lineNumber: null, content: `... ${beforeMiddle} lines omitted ...` },
      ...middle,
      { lineNumber: null, content: `... ${afterMiddle} lines omitted ...` },
      ...end,
    ];
  };

  const displayLines =
    needsMinification && isMinified ? getMiniView() : parsedLines;

  // Render content with custom line numbers for cat -n format
  if (isCatN) {
    const renderCatNContent = () => {
      return (
        <div className="flex min-w-0">
          {/* Line numbers column */}
          <div
            className="select-none pr-4 text-neutral-500 text-right flex-shrink-0"
            style={{ minWidth: "3em" }}
          >
            {displayLines.map((line, idx) => (
              <div key={idx} style={{ height: "1.5em", lineHeight: "1.5" }}>
                {line.lineNumber !== null ? line.lineNumber : "\u00A0"}
              </div>
            ))}
          </div>

          {/* Code content with syntax highlighting */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            {effectiveLanguage ? (
              <div>
                {displayLines.map((line, idx) => {
                  // Check if this is an omitted line marker
                  if (
                    line.content.startsWith("...") &&
                    line.content.includes("lines omitted")
                  ) {
                    return (
                      <div
                        key={idx}
                        style={{ height: "1.5em", lineHeight: "1.5" }}
                        className="text-neutral-500 italic"
                      >
                        {line.content}
                      </div>
                    );
                  }

                  // Apply syntax highlighting to individual lines
                  return (
                    <div
                      key={idx}
                      style={{ height: "1.5em", lineHeight: "1.5" }}
                    >
                      <SyntaxHighlighter
                        language={effectiveLanguage}
                        style={vscDarkPlus}
                        customStyle={{
                          background: "transparent",
                          padding: 0,
                          margin: 0,
                          fontSize: "inherit",
                          lineHeight: "1.5",
                          display: "inline",
                        }}
                        codeTagProps={{
                          style: {
                            fontSize: "inherit",
                            fontFamily: "inherit",
                            lineHeight: "1.5",
                            display: "inline",
                          },
                        }}
                        PreTag="span"
                        CodeTag="span"
                        showLineNumbers={false}
                      >
                        {line.content || " "}
                      </SyntaxHighlighter>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback to plain text if no language detected
              displayLines.map((line, idx) => (
                <div
                  key={idx}
                  style={{ height: "1.5em", lineHeight: "1.5" }}
                  className={cn(
                    "whitespace-pre",
                    line.content.startsWith("...")
                      ? "text-neutral-500 italic"
                      : "",
                  )}
                >
                  {line.content || "\u00A0"}
                </div>
              ))
            )}
          </div>
        </div>
      );
    };

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
                Show full {buttonText} ({parsedLines.length} lines)
                <ArrowDown className="h-3 w-3 fill-current" />
              </>
            ) : (
              <>
                Collapse ({parsedLines.length} lines)
                <ArrowUp className="h-3 w-3 fill-current" />
              </>
            )}
          </button>
        )}

        <div
          className={cn(
            "rounded-lg overflow-hidden",
            "bg-[#1e1e1e] border border-[#3e3e3e]",
            className,
          )}
          style={{
            fontSize: "13px",
            fontFamily:
              "Menlo, Monaco, Consolas, 'Andale Mono', 'Ubuntu Mono', 'Courier New', monospace",
          }}
        >
          <div
            className="p-4 overflow-x-auto"
            style={{
              maxHeight: isMinified && needsMinification ? "400px" : "none",
              overflowY: isMinified && needsMinification ? "auto" : "visible",
            }}
          >
            {renderCatNContent()}
          </div>
        </div>

        {needsMinification && (
          <button
            type="button"
            onClick={() => setIsMinified((prev) => !prev)}
            className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
          >
            {isMinified ? (
              <>
                Show full {buttonText} ({parsedLines.length} lines)
                <ArrowDown className="h-3 w-3 fill-current" />
              </>
            ) : (
              <>
                Collapse ({parsedLines.length} lines)
                <ArrowUp className="h-3 w-3 fill-current" />
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Regular code rendering (non cat -n format)
  const lines = children.split("\n");
  const regularNeedsMinification = lines.length > lineThreshold;

  const getRegularMiniView = () => {
    if (!regularNeedsMinification) return children;

    const beginning = lines.slice(0, 5);
    const middleIndex = Math.floor(lines.length / 2);
    const middle = lines.slice(middleIndex - 2, middleIndex + 2);
    const end = lines.slice(-5);

    // Combine with ellipsis markers
    const miniContent = [
      ...beginning,
      `// ... ${middleIndex - 5 - 2} lines omitted ...`,
      ...middle,
      `// ... ${lines.length - middleIndex - 2 - 5} lines omitted ...`,
      ...end,
    ].join("\n");

    return miniContent;
  };

  if (!regularNeedsMinification) {
    return (
      <SyntaxHighlighter
        className={cn("rounded-lg", className)}
        style={vscDarkPlus}
        language={effectiveLanguage}
        PreTag="div"
      >
        {children}
      </SyntaxHighlighter>
    );
  }

  return (
    <div className="relative">
      {regularNeedsMinification && (
        <button
          type="button"
          onClick={() => setIsMinified((prev) => !prev)}
          className="mb-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
        >
          {isMinified ? (
            <>
              Show full {buttonText} ({lines.length} lines)
              <ArrowDown className="h-3 w-3 fill-current" />
            </>
          ) : (
            <>
              Collapse ({lines.length} lines)
              <ArrowUp className="h-3 w-3 fill-current" />
            </>
          )}
        </button>
      )}
      <SyntaxHighlighter
        className={cn("rounded-lg overflow-x-auto", className)}
        style={vscDarkPlus}
        language={effectiveLanguage}
        PreTag="div"
        customStyle={{
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: isMinified ? "hidden" : "visible",
          maxHeight: isMinified ? "400px" : "none",
        }}
        showLineNumbers={
          effectiveLanguage === "sh" ||
          effectiveLanguage === "bash" ||
          effectiveLanguage === "shell"
        }
      >
        {isMinified ? getRegularMiniView() : children}
      </SyntaxHighlighter>
      <button
        type="button"
        onClick={() => setIsMinified((prev) => !prev)}
        className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
      >
        {isMinified ? (
          <>
            Show full {buttonText} ({lines.length} lines)
            <ArrowDown className="h-3 w-3 fill-current" />
          </>
        ) : (
          <>
            Collapse ({lines.length} lines)
            <ArrowUp className="h-3 w-3 fill-current" />
          </>
        )}
      </button>
    </div>
  );
}
