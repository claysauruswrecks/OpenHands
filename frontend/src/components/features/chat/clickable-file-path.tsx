import React, { ReactNode } from "react";
import { extractFilename } from "./path-component";
import { useWsClient } from "#/context/ws-client-provider";
import { createVSCodeOpenFileAction } from "#/services/chat-service";
import { decodeHtmlEntities } from "./path-component";

interface ClickableFilePathProps {
  children?: ReactNode;
}

/**
 * Component that displays only the filename in the text but shows the full path on hover
 * Makes the filename clickable to open in VSCode tab via websocket to runtime
 * Similar to PathComponent but adds click functionality for VSCode integration
 */
function ClickableFilePath({ children }: ClickableFilePathProps) {
  const { send } = useWsClient();

  const processPath = (path: string) => {
    const filename = extractFilename(path);

    const handleClick = async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Decode HTML entities in the file path (handles &#x2F; -> / etc.)
      let decodedPath = decodeHtmlEntities(path);

      // Ensure the path is workspace-relative for VSCode server
      // VSCode server in the container has /workspace as the working directory
      if (decodedPath.startsWith("/workspace/")) {
        decodedPath = decodedPath.substring("/workspace/".length);
      }

      // Send websocket action to runtime to open file in VSCode
      send(createVSCodeOpenFileAction(decodedPath));
    };

    return (
      <span
        className="cursor-pointer text-blue-400 hover:text-blue-300 hover:underline font-mono"
        onClick={handleClick}
        title={`Click to open ${path} in VSCode`}
      >
        {filename}
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
