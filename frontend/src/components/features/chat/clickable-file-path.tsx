import React, { ReactNode } from "react";
import { extractFilename, decodeHtmlEntities } from "./path-component";
import { useVSCodeRemoteControl } from "#/hooks/use-vscode-remote-control";

interface ClickableFilePathProps {
  children?: ReactNode;
}

/**
 * Component that displays only the filename in the text but shows the full path on hover
 * Makes the filename clickable to open in VSCode via vscode-remote-control extension
 * Connects directly to the extension's websocket server running on port 3710
 */
function ClickableFilePath({ children }: ClickableFilePathProps) {
  const { openFile, isConnecting } = useVSCodeRemoteControl();

  const processPath = (path: string) => {
    const filename = extractFilename(path);

    const handleClick = async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Decode HTML entities in the file path (handles &#x2F; -> / etc.)
      let decodedPath = decodeHtmlEntities(path);

      // Ensure the path is absolute for VSCode
      // If it's workspace-relative, make it absolute within the container
      if (!decodedPath.startsWith("/")) {
        decodedPath = `/workspace/${decodedPath}`;
      } else if (decodedPath.startsWith("/workspace/")) {
        // Already absolute workspace path, use as-is
      } else {
        // If it's some other absolute path, keep it as-is
      }

      await openFile(decodedPath);
      // Successfully opened file in VSCode
    };

    return (
      <span
        className={`cursor-pointer font-mono ${
          isConnecting
            ? "text-gray-400 hover:text-gray-300"
            : "text-blue-400 hover:text-blue-300 hover:underline"
        }`}
        onClick={isConnecting ? undefined : handleClick}
        title={
          isConnecting
            ? `Opening ${path}...`
            : `Click to open ${path} in VSCode`
        }
      >
        {isConnecting ? `${filename} (opening...)` : filename}
      </span>
    );
  };

  if (Array.isArray(children)) {
    const processedChildren = children.map((child) =>
      typeof child === "string" ? processPath(child) : child,
    );

    return <strong className="font-mono">{processedChildren}</strong>;
  }

  if (typeof children === "string") {
    return <strong>{processPath(children)}</strong>;
  }

  return <strong className="font-mono">{children}</strong>;
}

export { ClickableFilePath };
