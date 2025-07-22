import React, { ReactNode } from "react";
import { extractFilename, decodeHtmlEntities } from "./path-component";
import { useVSCodeRemoteControl } from "#/hooks/use-vscode-remote-control";

interface ClickableFilePathProps {
  children?: ReactNode;
}

/**
 * Component that displays only the filename in the text but shows the full path on hover
 * Makes the filename clickable to open in VSCode via vscode-remote-control extension
 * Connects to the extension's websocket server on a dynamically allocated port per conversation
 */
function ClickableFilePath({ children }: ClickableFilePathProps) {
  const { openFile, isConnecting, lastError, clearError, port } =
    useVSCodeRemoteControl();

  const processPath = (path: string) => {
    const filename = extractFilename(path);

    const handleClick = async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Clear any previous errors
      clearError();

      // Check if port is available
      if (!port) {
        console.warn("VSCode remote control port not available");
        return;
      }

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

      try {
        await openFile(decodedPath);
        console.debug(`Successfully opened file in VSCode: ${decodedPath}`);
      } catch (error) {
        console.error(`Failed to open file in VSCode:`, error);
        // Error is already handled by the hook and stored in lastError
      }
    };

    const getDisplayState = () => {
      if (!port) {
        return {
          text: `${filename} (VSCode not available)`,
          className: "text-gray-500 cursor-not-allowed",
          title: "VSCode remote control port not available",
          clickable: false,
        };
      }

      if (isConnecting) {
        return {
          text: `${filename} (opening...)`,
          className: "text-gray-400 hover:text-gray-300",
          title: `Opening ${path}...`,
          clickable: false,
        };
      }

      if (lastError) {
        return {
          text: `${filename} (connection failed)`,
          className:
            "text-red-400 hover:text-red-300 hover:underline cursor-pointer",
          title: `Failed to open ${path}: ${lastError.message}. Click to retry.`,
          clickable: true,
        };
      }

      return {
        text: filename,
        className:
          "text-blue-400 hover:text-blue-300 hover:underline cursor-pointer",
        title: `Click to open ${path} in VSCode`,
        clickable: true,
      };
    };

    const displayState = getDisplayState();

    return (
      <span
        className={`font-mono ${displayState.className}`}
        onClick={displayState.clickable ? handleClick : undefined}
        title={displayState.title}
      >
        {displayState.text}
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
