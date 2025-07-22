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
   * Opens a file in VSCode
   * @param filePath - The path to the file to open
   * @param port - Optional port to use (overrides default/config port)
   */
  async openFile(filePath: string, port?: number): Promise<void> {
    return this.sendCommand(
      {
        command: "vscode.open",
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
              `VSCode remote control connection timeout after ${this.config.timeout}ms`,
            ),
          );
        }, this.config.timeout);

        ws.onopen = () => {
          try {
            ws.send(JSON.stringify(command));
            // Sent VSCode command on port

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
            reject(new Error(`Failed to send command: ${error}`));
          }
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          // VSCode remote control connection error
          reject(
            new Error(
              `Failed to connect to VSCode remote control on port ${targetPort}. Make sure the vscode-remote-control extension is installed and enabled.`,
            ),
          );
        };

        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          if (!event.wasClean && event.code !== 1000) {
            // VSCode remote control websocket closed unexpectedly
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
   * Opens a file at a specific line and column
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
      // Use VSCode's URI format for opening at specific position
      const uri = `file://${filePath}`;
      const position = column !== undefined ? `${line}:${column}` : `${line}`;

      return this.sendCommand(
        {
          command: "vscode.open",
          args: [`${uri}#${position}`],
        },
        port,
      );
    }

    return this.openFile(filePath, port);
  }
}

// Export singleton instance with default configuration
export const vscodeRemoteControl = new VSCodeRemoteControlService();

// Export class for custom configurations
export { VSCodeRemoteControlService };
export type { VSCodeRemoteControlConfig, VSCodeCommand };
