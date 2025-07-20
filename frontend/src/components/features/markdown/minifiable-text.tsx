import React from "react";
import { cn } from "#/utils/utils";
import ArrowDown from "#/icons/angle-down-solid.svg?react";
import ArrowUp from "#/icons/angle-up-solid.svg?react";

interface MinifiableTextProps {
  children: React.ReactNode;
  className?: string;
  minifiedByDefault?: boolean;
  lineThreshold?: number; // Number of lines before we show mini view
}

export function MinifiableText({
  children,
  className,
  minifiedByDefault = true,
  lineThreshold = 10,
}: MinifiableTextProps) {
  const [isMinified, setIsMinified] = React.useState(minifiedByDefault);
  const [needsMinification, setNeedsMinification] = React.useState(false);
  const [miniView, setMiniView] = React.useState<React.ReactNode>(null);

  React.useEffect(() => {
    // Convert children to string to analyze lines
    const textContent = React.Children.toArray(children)
      .map((child) => {
        if (typeof child === "string") return child;
        if (React.isValidElement(child) && child.props.children) {
          return extractTextFromElement(child);
        }
        return "";
      })
      .join("");

    const lines = textContent.split("\n").filter((line) => line.trim() !== "");

    if (lines.length > lineThreshold) {
      setNeedsMinification(true);

      // Create mini view with 2 lines from beginning, middle, and end
      const beginning = lines.slice(0, 2);
      const middleIndex = Math.floor(lines.length / 2);
      const middle = lines.slice(middleIndex - 1, middleIndex + 1);
      const end = lines.slice(-2);

      const miniContent = (
        <div>
          <div>{beginning.join("\n")}</div>
          <div className="text-neutral-500 my-1">...</div>
          <div>{middle.join("\n")}</div>
          <div className="text-neutral-500 my-1">...</div>
          <div>{end.join("\n")}</div>
        </div>
      );

      setMiniView(miniContent);
    } else {
      setNeedsMinification(false);
    }
  }, [children, lineThreshold]);

  // Helper function to extract text from React elements
  function extractTextFromElement(element: React.ReactElement): string {
    if (typeof element.props.children === "string") {
      return element.props.children;
    }
    if (Array.isArray(element.props.children)) {
      return element.props.children
        .map((child: any) => {
          if (typeof child === "string") return child;
          if (React.isValidElement(child)) return extractTextFromElement(child);
          return "";
        })
        .join("");
    }
    return "";
  }

  if (!needsMinification) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {!isMinified && (
        <button
          type="button"
          onClick={() => setIsMinified(true)}
          className="mb-2 text-xs text-neutral-400 hover:text-neutral-300 flex items-center gap-1"
        >
          Show less
          <ArrowUp className="h-3 w-3 fill-current" />
        </button>
      )}
      <div
        className={cn(
          isMinified ? "overflow-x-auto overflow-y-hidden" : "overflow-x-auto",
        )}
      >
        {isMinified ? miniView : children}
      </div>
      <button
        type="button"
        onClick={() => setIsMinified((prev) => !prev)}
        className="mt-2 text-xs text-neutral-400 hover:text-neutral-300 flex items-center gap-1"
      >
        {isMinified ? (
          <>
            Show more
            <ArrowDown className="h-3 w-3 fill-current" />
          </>
        ) : (
          <>
            Show less
            <ArrowUp className="h-3 w-3 fill-current" />
          </>
        )}
      </button>
    </div>
  );
}
