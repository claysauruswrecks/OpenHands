import { useNavigate } from "react-router";
import { useConversationId } from "#/hooks/use-conversation-id";
import { decodeHtmlEntities } from "#/components/features/chat/path-component";
import EventLogger from "#/utils/event-logger";

/**
 * Custom hook for opening files in the embedded VSCode editor
 */
export function useVSCodeFileOpener() {
  const navigate = useNavigate();
  const { conversationId } = useConversationId();

  const openFileInVSCode = async (filePath: string) => {
    if (!filePath || !conversationId) {
      EventLogger.error("Invalid file path or conversation ID");
      return;
    }

    try {
      // Decode HTML entities in the file path (handles &#x2F; -> / etc.)
      let decodedPath = decodeHtmlEntities(filePath);

      // Ensure the path is workspace-relative for VSCode server
      // VSCode server in the container has /workspace as the working directory
      if (decodedPath.startsWith("/workspace/")) {
        decodedPath = decodedPath.substring("/workspace/".length);
      }

      // Navigate to the VSCode tab first
      navigate(`/conversations/${conversationId}/vscode`);

      // Wait a moment for the navigation to complete, then modify the iframe URL
      setTimeout(() => {
        try {
          // Find the VSCode iframe
          const iframe = document.querySelector(
            'iframe[src*="tkn="]', // VSCode iframe has a token parameter
          ) as HTMLIFrameElement;

          if (iframe && iframe.src) {
            const url = new URL(iframe.src);

            // Add the file parameter to open the specific file
            // VSCode server supports ?file= parameter to open files
            url.searchParams.set("file", `/workspace/${decodedPath}`);

            // Update the iframe src to open the file
            iframe.src = url.toString();
          } else {
            EventLogger.error("VSCode iframe not found or has no src");
          }
        } catch (error) {
          EventLogger.error(
            `Failed to modify VSCode iframe URL: ${String(error)}`,
          );
        }
      }, 500); // Give time for navigation and iframe to load
    } catch (error) {
      EventLogger.error(`Failed to open file in VSCode: ${String(error)}`);
    }
  };

  return { openFileInVSCode };
}
