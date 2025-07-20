import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";

interface DiffWithSyntaxProps {
  diff: string;
}

export function DiffWithSyntax({ diff }: DiffWithSyntaxProps) {
  const lines = diff.split("\n");
  const needsMinification = lines.length > 50;
  const [isMinified, setIsMinified] = React.useState(true);

  // Detect language from file path
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

  // Extract file path and detect language
  const filePathMatch = diff.match(/(?:---|\+\+\+)\s+([^\s]+)/);
  const language = filePathMatch ? getLanguageFromPath(filePathMatch[1]) : "";

  const getMiniView = () => {
    if (!needsMinification) return lines;

    // Show first 10 lines, some middle context, and last 10 lines
    const beginning = lines.slice(0, 10);
    const end = lines.slice(-10);
    const middleIndex = Math.floor(lines.length / 2);
    const middle = lines.slice(middleIndex - 2, middleIndex + 2);

    return [
      ...beginning,
      `... ${middleIndex - 10} lines omitted ...`,
      ...middle,
      `... ${lines.length - middleIndex - 10} lines omitted ...`,
      ...end,
    ];
  };

  const displayLines = needsMinification && isMinified ? getMiniView() : lines;

  const getLineType = (line: string) => {
    if (line.startsWith("+") && !line.startsWith("+++")) return "added";
    if (line.startsWith("-") && !line.startsWith("---")) return "removed";
    if (line.startsWith("@@")) return "header";
    if (line.startsWith("---") || line.startsWith("+++")) return "meta";
    if (line.includes("... ") && line.includes(" lines omitted ..."))
      return "meta";
    return "unchanged";
  };

  const renderLine = (line: string, index: number) => {
    const lineType = getLineType(line);
    const baseStyle: React.CSSProperties = {
      display: "block",
      whiteSpace: "pre",
      margin: 0,
      padding: "0 1em",
      lineHeight: 1.5,
    };

    // Apply background colors based on line type
    let style = { ...baseStyle };
    let className = "";

    if (lineType === "added") {
      style.backgroundColor = "rgba(46, 160, 67, 0.15)";
      className = "diff-line-added";
    } else if (lineType === "removed") {
      style.backgroundColor = "rgba(248, 81, 73, 0.15)";
      className = "diff-line-removed";
    } else if (lineType === "header") {
      style.color = "#58a6ff";
      style.fontWeight = "bold";
      className = "diff-line-header";
    } else if (lineType === "meta") {
      style.color = "#8b949e";
      className = "diff-line-meta";
    }

    // For added/removed lines with a language, apply syntax highlighting
    if ((lineType === "added" || lineType === "removed") && language) {
      const prefix = line[0];
      const codeContent = line.slice(1);
      const prefixColor = lineType === "added" ? "#3fb950" : "#f85149";

      // Use a flex layout to prevent overflow
      return (
        <div
          key={index}
          style={{
            ...style,
            display: "flex",
            alignItems: "flex-start",
            padding: 0,
            whiteSpace: "nowrap",
          }}
          className={className}
        >
          <span
            style={{
              color: prefixColor,
              paddingLeft: "1em",
              paddingRight: "0.2em",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {prefix}
          </span>
          <div
            style={{
              flexGrow: 1,
              paddingRight: "1em",
              whiteSpace: "pre",
              minWidth: 0,
            }}
          >
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                background: "transparent",
                padding: 0,
                margin: 0,
                display: "inline",
                whiteSpace: "pre",
              }}
              codeTagProps={{
                style: {
                  background: "transparent",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  whiteSpace: "pre",
                },
              }}
              PreTag="span"
              CodeTag="span"
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    }

    // For other lines (headers, meta, unchanged), just render as before
    if (lineType === "added" || lineType === "removed") {
      const prefix = line[0];
      const content = line.slice(1);
      const prefixColor = lineType === "added" ? "#3fb950" : "#f85149";

      return (
        <span key={index} style={style} className={className}>
          <span style={{ color: prefixColor }}>{prefix}</span>
          <span>{content}</span>
        </span>
      );
    }

    return (
      <span key={index} style={style} className={className}>
        {line}
      </span>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      {needsMinification && (
        <button
          type="button"
          onClick={() => setIsMinified(!isMinified)}
          className="mb-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
        >
          {isMinified ? (
            <>
              Show full diff ({lines.length} lines)
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
      <pre
        style={{
          backgroundColor: "#1e1e1e",
          padding: "1em",
          borderRadius: "0.375rem",
          color: "#e6edf3",
          border: "1px solid #3e3e3e",
          overflowX: "auto",
          margin: 0,
          fontSize: "13px",
          fontFamily:
            "Menlo, Monaco, Consolas, 'Andale Mono', 'Ubuntu Mono', 'Courier New', monospace",
          maxHeight: isMinified && needsMinification ? "400px" : "none",
          overflowY: isMinified && needsMinification ? "auto" : "visible",
        }}
      >
        <code
          style={{
            display: "block",
            whiteSpace: "pre",
            minWidth: "fit-content",
          }}
        >
          {displayLines.map((line, index) => renderLine(line, index))}
        </code>
      </pre>
      {needsMinification && (
        <button
          type="button"
          onClick={() => setIsMinified(!isMinified)}
          className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 font-mono"
        >
          {isMinified ? (
            <>
              Show full diff ({lines.length} lines)
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
    </div>
  );
}
