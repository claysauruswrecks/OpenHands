import { setCurrentAgentState } from "#/state/agent-slice";
import { setUrl, setScreenshotSrc } from "#/state/browser-slice";
import store from "#/store";
import { ObservationMessage } from "#/types/message";
import { appendOutput } from "#/state/command-slice";
import { appendJupyterOutput } from "#/state/jupyter-slice";
import ObservationType from "#/types/observation-type";
import { useVSCodeFileOpener } from "#/hooks/use-vscode-file-opener";
import { useNavigate } from "react-router";
import { useConversationId } from "#/hooks/use-conversation-id";

export function handleObservationMessage(message: ObservationMessage) {
  switch (message.observation) {
    case ObservationType.RUN: {
      if (message.extras.hidden) break;
      const { content } = message;
      store.dispatch(appendOutput(content));
      break;
    }
    case ObservationType.RUN_IPYTHON:
      store.dispatch(
        appendJupyterOutput({
          content: message.content,
          imageUrls: Array.isArray(message.extras?.image_urls)
            ? message.extras.image_urls
            : undefined,
        }),
      );
      break;
    case ObservationType.BROWSE:
    case ObservationType.BROWSE_INTERACTIVE:
      if (message.extras?.screenshot) {
        store.dispatch(setScreenshotSrc(message.extras?.screenshot));
      }
      if (message.extras?.url) {
        store.dispatch(setUrl(message.extras.url));
      }
      break;
    case ObservationType.AGENT_STATE_CHANGED:
      store.dispatch(setCurrentAgentState(message.extras.agent_state));
      break;
    case ObservationType.VSCODE_FILE_OPEN:
      // Handle VSCode file open observation
      handleVSCodeFileOpen(message);
      break;
    case ObservationType.DELEGATE:
    case ObservationType.READ:
    case ObservationType.EDIT:
    case ObservationType.THINK:
    case ObservationType.NULL:
    case ObservationType.RECALL:
    case ObservationType.ERROR:
    case ObservationType.MCP:
      break; // We don't display the default message for these observations
    default:
      break;
  }
  if (!message.extras?.hidden) {
    // Convert the message to the appropriate observation type
    const { observation } = message;

    switch (observation) {
      case "browse":
        if (message.extras?.screenshot) {
          store.dispatch(setScreenshotSrc(message.extras.screenshot));
        }
        if (message.extras?.url) {
          store.dispatch(setUrl(message.extras.url));
        }
        break;
      case "browse_interactive":
        if (message.extras?.screenshot) {
          store.dispatch(setScreenshotSrc(message.extras.screenshot));
        }
        if (message.extras?.url) {
          store.dispatch(setUrl(message.extras.url));
        }
        break;
      default:
        // For any unhandled observation types, just ignore them
        break;
    }
  }
}

function handleVSCodeFileOpen(message: ObservationMessage) {
  // Extract file path from the message extras
  const filePath = message.extras?.file_path as string;

  if (!filePath) {
    console.warn("VSCode file open observation missing file_path");
    return;
  }

  console.log(`Opening file in VSCode: ${filePath}`);

  // Navigate to VSCode tab first
  const currentUrl = window.location.pathname;
  const conversationIdMatch = currentUrl.match(/\/conversations\/([^\/]+)/);

  if (!conversationIdMatch) {
    console.warn("Could not extract conversation ID from URL");
    return;
  }

  const conversationId = conversationIdMatch[1];
  const vsCodeUrl = `/conversations/${conversationId}/vscode`;

  // Only navigate if we're not already on the VSCode tab
  if (!currentUrl.includes("/vscode")) {
    window.history.pushState(null, "", vsCodeUrl);
  }

  // Wait for navigation, then use proper VSCode command URI to open file
  setTimeout(() => {
    try {
      // Find the VSCode iframe
      const iframe = document.querySelector(
        'iframe[src*="tkn="]',
      ) as HTMLIFrameElement;

      if (iframe && iframe.contentWindow) {
        // Use VSCode's command URI system to open the file
        // This is the proper way according to VSCode documentation
        const fileUri = {
          scheme: "file",
          path: filePath,
          authority: "",
        };

        const commandUri = `command:vscode.open?${encodeURIComponent(JSON.stringify(fileUri))}`;

        // Method 1: Try to post a message with command URI
        iframe.contentWindow.postMessage(
          {
            type: "vscode-command",
            command: "vscode.open",
            args: [fileUri],
          },
          "*",
        );

        // Method 2: Create a temporary link in the iframe's document
        // This will trigger VSCode's command handling
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            const tempLink = iframeDoc.createElement("a");
            tempLink.href = commandUri;
            tempLink.style.display = "none";
            iframeDoc.body.appendChild(tempLink);
            tempLink.click();
            iframeDoc.body.removeChild(tempLink);

            console.log(
              `Successfully opened file using command URI: ${filePath}`,
            );
          } else {
            // Fallback: modify iframe URL with file parameter
            const url = new URL(iframe.src);
            url.searchParams.set("file", filePath);
            iframe.src = url.toString();

            console.log(`Opened file via iframe URL modification: ${filePath}`);
          }
        } catch (iframeError) {
          console.warn(
            `Command URI method failed, trying URL parameter: ${iframeError}`,
          );

          // Final fallback: modify iframe URL
          const url = new URL(iframe.src);
          url.searchParams.set("file", filePath);
          iframe.src = url.toString();

          console.log(`Opened file via iframe URL fallback: ${filePath}`);
        }
      } else {
        console.warn("VSCode iframe not found or no contentWindow available");
      }
    } catch (error) {
      console.error(`Failed to open file in VSCode: ${error}`);
    }
  }, 500); // Give time for navigation and iframe to load
}
