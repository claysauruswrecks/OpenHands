import React, { ReactNode, useEffect, useRef } from "react";
import { extractFilename, decodeHtmlEntities } from "./path-component";
import { useVSCodeRemoteControl } from "#/hooks/use-vscode-remote-control";

interface ClickableFilePathProps {
  children?: ReactNode;
}

/**
 * Component that displays only the filename in the text but shows the full path on hover
 * Automatically opens files in VSCode when displayed, with click functionality as fallback
 * Connects to the extension's websocket server on a dynamically allocated port per conversation
 */
function ClickableFilePath({ children }: ClickableFilePathProps) {
  const { openFile, isConnecting, lastError, clearError, port } =
    useVSCodeRemoteControl();
  const hasAutoOpened = useRef(new Set<string>());

  // Helper function to determine if a path is likely a file (not a directory)
  const isLikelyFile = (path: string): boolean => {
    // Avoid directories by checking for file extensions and avoiding trailing slashes
    if (path.endsWith("/")) return false;

    // Check if it has a file extension (contains a dot after the last slash)
    const lastSlashIndex = path.lastIndexOf("/");
    const pathPart =
      lastSlashIndex >= 0 ? path.substring(lastSlashIndex + 1) : path;

    // Consider it a file if it has a dot (extension) or if it doesn't look like a directory name
    return pathPart.includes(".") || pathPart.length > 0;
  };

  const processPath = (path: string) => {
    // Decode HTML entities first, before any other processing
    const decodedPath = decodeHtmlEntities(path);
    const filename = extractFilename(decodedPath);

    // Auto-open file when component renders (only once per path)
    useEffect(() => {
      const autoOpenFile = async () => {
        // Skip if already auto-opened this path
        if (hasAutoOpened.current.has(decodedPath)) return;

        // Skip if not likely a file
        if (!isLikelyFile(decodedPath)) return;

        // Skip if no port available
        if (!port) return;

        // Mark as attempted to avoid duplicate opens
        hasAutoOpened.current.add(decodedPath);

        // Clear any previous errors
        clearError();

        // Prepare the final path
        let finalPath = decodedPath;
        if (!finalPath.startsWith("/")) {
          finalPath = `/workspace/${finalPath}`;
        }

        try {
          await openFile(finalPath);
          console.debug(`Auto-opened file in VSCode: ${finalPath}`);
        } catch (error) {
          console.error(`Failed to auto-open file in VSCode:`, error);
          // Error is handled by the hook and stored in lastError
        }
      };

      autoOpenFile();
    }, [decodedPath, port, openFile, clearError]);

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

      // Use the already decoded path
      let finalPath = decodedPath;

      // Ensure the path is absolute for VSCode
      // If it's workspace-relative, make it absolute within the container
      if (!finalPath.startsWith("/")) {
        finalPath = `/workspace/${finalPath}`;
      } else if (finalPath.startsWith("/workspace/")) {
        // Already absolute workspace path, use as-is
      } else {
        // If it's some other absolute path, keep it as-is
      }

      try {
        await openFile(finalPath);
        console.debug(`Successfully opened file in VSCode: ${finalPath}`);
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
          title: `Opening ${decodedPath}...`,
          clickable: false,
        };
      }

      if (lastError) {
        return {
          text: `${filename} (connection failed)`,
          className:
            "text-red-400 hover:text-red-300 hover:underline cursor-pointer",
          title: `Failed to open ${decodedPath}: ${lastError.message}. Click to retry.`,
          clickable: true,
        };
      }

      // Show that it was auto-opened if it's likely a file
      const isFile = isLikelyFile(decodedPath);
      return {
        text: filename,
        className: isFile
          ? "text-green-400 hover:text-green-300 hover:underline cursor-pointer"
          : "text-blue-400 hover:text-blue-300 hover:underline cursor-pointer",
        title: isFile
          ? `Auto-opened ${decodedPath} in VSCode (click to re-open)`
          : `Click to open ${decodedPath} in VSCode`,
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
