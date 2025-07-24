/**
 * Service for communicating with VSCode via the vscode-remote-control extension
 * https://github.com/estruyf/vscode-remote-control
 */

interface VSCodeRemoteControlConfig {
  host?: string;
  port?: number;
  timeout?: number;
}

interface VSCodeCommand {
  command: string;
  args?: unknown[];
}

class VSCodeRemoteControlService {
  private config: Required<VSCodeRemoteControlConfig>;

  constructor(config: VSCodeRemoteControlConfig = {}) {
    this.config = {
      host: config.host || "localhost",
      port: config.port || 3710, // Keep default for backward compatibility
      timeout: config.timeout || 5000,
    };
  }

  /**
   * Opens a file in VSCode with proper tab management
   * VSCode automatically focuses existing tabs when the same file is opened again
   * @param filePath - The path to the file to open
   * @param port - Optional port to use (overrides default/config port)
   */
  async openFile(filePath: string, port?: number): Promise<void> {
    // Use vscode.openWith for better control over how files are opened
    // This ensures files open in new tabs or focus existing ones properly
    // VSCode's built-in behavior automatically focuses existing tabs for the same file
    return this.sendCommand(
      {
        command: "vscode.open",
        args: [filePath, { preview: false }], // preview: false ensures files open in proper tabs, not preview mode
      },
      port,
    );
  }

  /**
   * Opens a file using VSCode's file opening command (alternative method)
   * This explicitly uses the workbench command for opening files
   * @param filePath - The path to the file to open
   * @param port - Optional port to use (overrides default/config port)
   */
  async openFileWithWorkbench(filePath: string, port?: number): Promise<void> {
    // Alternative approach using workbench command
    // This may provide different behavior for tab management
    return this.sendCommand(
      {
        command: "workbench.action.files.openFile",
        args: [filePath],
      },
      port,
    );
  }

  /**
   * Sends a command to VSCode via the remote control extension
   * @param command - The command to send
   * @param port - Optional port to use (overrides default/config port)
   */
  async sendCommand(command: VSCodeCommand, port?: number): Promise<void> {
    const targetPort = port ?? this.config.port;

    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.config.host}:${targetPort}`;

      try {
        const ws = new WebSocket(wsUrl);

        // Set up timeout
        const timeoutId = setTimeout(() => {
          ws.close();
          reject(
            new Error(
              `Connection timeout: VSCode remote control extension did not respond within ${this.config.timeout}ms on port ${targetPort}`,
            ),
          );
        }, this.config.timeout);

        ws.onopen = () => {
          try {
            ws.send(JSON.stringify(command));
            console.debug(
              `Sent VSCode command on port ${targetPort}:`,
              command,
            );

            // Close connection after a brief delay to ensure command is processed
            setTimeout(() => {
              clearTimeout(timeoutId);
              if (ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
              resolve();
            }, 500);
          } catch (error) {
            clearTimeout(timeoutId);
            ws.close();
            reject(new Error(`Failed to send command to VSCode: ${error}`));
          }
        };

        ws.onerror = (event) => {
          clearTimeout(timeoutId);
          console.error("VSCode remote control websocket error:", event);
          reject(
            new Error(
              `Cannot connect to VSCode remote control on port ${targetPort}. Please ensure:
1. VSCode is running in the container
2. The vscode-remote-control extension is installed and enabled
3. The extension is listening on port ${targetPort}`,
            ),
          );
        };

        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          if (!event.wasClean && event.code !== 1000) {
            console.warn(
              `VSCode remote control websocket closed unexpectedly: ${event.code} ${event.reason}`,
            );
          }
        };
      } catch (error) {
        reject(new Error(`Failed to create websocket connection: ${error}`));
      }
    });
  }

  /**
   * Executes a workbench command in VSCode
   * @param commandId - The command ID to execute
   * @param port - Optional port to use (overrides default/config port)
   * @param args - Additional arguments for the command
   */
  async executeCommand(
    commandId: string,
    port?: number,
    ...args: unknown[]
  ): Promise<void> {
    return this.sendCommand(
      {
        command: commandId,
        args,
      },
      port,
    );
  }

  /**
   * Opens a file at a specific line and column with proper tab management
   * @param filePath - The path to the file to open
   * @param line - Optional line number (1-based)
   * @param column - Optional column number (1-based)
   * @param port - Optional port to use (overrides default/config port)
   */
  async openFileAtPosition(
    filePath: string,
    line?: number,
    column?: number,
    port?: number,
  ): Promise<void> {
    if (line !== undefined) {
      // Use VSCode's URI format for opening at specific position with proper tab behavior
      const uri = `file://${filePath}`;
      const position = column !== undefined ? `${line}:${column}` : `${line}`;

      return this.sendCommand(
        {
          command: "vscode.open",
          args: [`${uri}#${position}`, { preview: false }], // Ensure it opens in a proper tab
        },
        port,
      );
    }

    return this.openFile(filePath, port);
  }

  /**
   * Opens a directory in the Explorer view
   * @param dirPath - The path to the directory to reveal
   * @param port - Optional port to use (overrides default/config port)
   */
  async openDirectory(dirPath: string, port?: number): Promise<void> {
    // Focus the Explorer view to show the directory structure
    await this.sendCommand(
      {
        command: "workbench.view.explorer",
      },
      port,
    );

    // For directories, we don't try to open them as files since that causes an error
    // VSCode doesn't have a direct API to navigate to a specific directory in the explorer
    // The explorer focus is the best we can do for directory navigation
    console.debug(`Focused Explorer view for directory: ${dirPath}`);
  }

  /**
   * Focuses the Explorer view (useful for directory browsing)
   * @param port - Optional port to use (overrides default/config port)
   */
  async focusExplorer(port?: number): Promise<void> {
    return this.sendCommand(
      {
        command: "workbench.view.explorer",
      },
      port,
    );
  }

  /**
   * Reveals a file or directory in the Explorer view
   * @param path - The path to reveal in the Explorer
   * @param port - Optional port to use (overrides default/config port)
   */
  async revealInExplorer(path: string, port?: number): Promise<void> {
    let finalPath = path;
    if (!finalPath.startsWith("/")) {
      finalPath = `/workspace/${finalPath}`;
    }

    // First ensure Explorer is visible
    await this.focusExplorer(port);

    // For files, try to open them which will also reveal them in explorer
    // For directories, just focus the explorer (don't try to open as file)
    if (this.isLikelyFile(path)) {
      return this.sendCommand(
        {
          command: "vscode.open",
          args: [finalPath],
        },
        port,
      );
    }

    // For directories, we've already focused the explorer above
    // VSCode doesn't have a direct API to reveal arbitrary directories
    // So we just ensure the explorer is focused
  }

  /**
   * Helper method to determine if a path is likely a file
   * @param path - The path to check
   */
  private isLikelyFile(path: string): boolean {
    // Directories typically end with / or have no file extension
    if (path.endsWith("/")) return false;

    // Check if it has a file extension (contains a dot after the last slash)
    const lastSlashIndex = path.lastIndexOf("/");
    const pathPart =
      lastSlashIndex >= 0 ? path.substring(lastSlashIndex + 1) : path;

    // Consider it a file if it has a dot (extension)
    return pathPart.includes(".");
  }
}

// Export singleton instance with default configuration
export const vscodeRemoteControl = new VSCodeRemoteControlService();

// Export class for custom configurations
export { VSCodeRemoteControlService };
export type { VSCodeRemoteControlConfig, VSCodeCommand };
