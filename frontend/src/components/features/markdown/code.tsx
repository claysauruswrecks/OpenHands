import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ExtraProps } from "react-markdown";
import { MinifiableCode } from "./minifiable-code";

interface CodeProps extends ExtraProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Check if content looks like cat -n output
const isCatNOutput = (content: string): boolean => {
  const lines = content.split("\n");
  if (lines.length < 2) return false;

  // Check if first line mentions cat -n or if lines start with line numbers
  const firstLine = lines[0];
  if (firstLine.includes("cat -n") || firstLine.includes("result of running")) {
    return true;
  }

  // Check if at least the first few content lines match cat -n pattern
  const catNPattern = /^\s*\d+\t/;
  let matchCount = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (catNPattern.test(lines[i])) {
      matchCount++;
    }
  }

  return matchCount >= 2; // At least 2 lines should match the pattern
};

export function code({ inline, className, children, ...props }: CodeProps) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : undefined;

  const codeString = String(children).replace(/\n$/, "");
  const lines = codeString.split("\n");

  // Explicitly check if this should be treated as inline code
  // Inline code is either explicitly marked as inline OR is single-line without a language
  const isInlineCode =
    inline === true || (lines.length === 1 && !lang && codeString.length < 100);

  // For non-inline code blocks, decide whether to use MinifiableCode
  if (!isInlineCode) {
    // Use MinifiableCode for:
    // 1. cat -n output (regardless of size)
    // 2. Code blocks with 10 or more lines (to match lineThreshold)
    // 3. Code blocks without a language (to ensure consistency)
    if (isCatNOutput(codeString) || lines.length >= 10 || !lang) {
      return (
        <MinifiableCode
          language={lang}
          className="rounded-lg"
          minifiedByDefault={true}
          lineThreshold={10}
        >
          {codeString}
        </MinifiableCode>
      );
    }

    // For smaller code blocks with a language, use SyntaxHighlighter directly
    if (lang) {
      return (
        <div style={{ position: "relative", marginTop: "0.5rem" }}>
          <SyntaxHighlighter
            language={lang}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              fontSize: "13px",
              borderRadius: "0.375rem",
              padding: "1rem",
            }}
            codeTagProps={{
              style: {
                fontSize: "inherit",
                fontFamily: "inherit",
              },
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }
  }

  // Inline code
  return (
    <code
      className={className}
      style={{
        padding: "0.125rem 0.25rem",
        borderRadius: "0.25rem",
        backgroundColor: "#1e1e1e",
        fontSize: "14px",
        fontWeight: "bold",
      }}
      {...props}
    >
      {children}
    </code>
  );
}
