import { useCallback, useState } from "react";
import { vscodeRemoteControl } from "#/services/vscode-remote-control";
import { useVSCodeRemoteControlPort } from "#/hooks/query/use-vscode-remote-control-port";

interface UseVSCodeRemoteControlState {
  isConnecting: boolean;
  lastError: Error | null;
}

interface UseVSCodeRemoteControlReturn extends UseVSCodeRemoteControlState {
  openFile: (filePath: string) => Promise<void>;
  openFileAtPosition: (
    filePath: string,
    line?: number,
    column?: number,
  ) => Promise<void>;
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<void>;
  clearError: () => void;
  port: number | null;
  isPortLoading: boolean;
}

/**
 * React hook for VSCode remote control operations
 * Provides convenient methods for opening files and executing commands in VSCode
 * via the vscode-remote-control extension with dynamic port discovery
 */
export function useVSCodeRemoteControl(): UseVSCodeRemoteControlReturn {
  const [state, setState] = useState<UseVSCodeRemoteControlState>({
    isConnecting: false,
    lastError: null,
  });

  // Get the dynamic port for this conversation's runtime container
  const {
    data: portData,
    isLoading: isPortLoading,
    error: portError,
  } = useVSCodeRemoteControlPort();
  const port = portData?.vscode_remote_control_port || null;

  const setConnecting = useCallback((connecting: boolean) => {
    setState((prev) => ({ ...prev, isConnecting: connecting }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState((prev) => ({ ...prev, lastError: error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const openFile = useCallback(
    async (filePath: string) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          throw new Error(
            portError
              ? `Failed to get VSCode remote control port: ${portError}`
              : "VSCode remote control port not available",
          );
        }

        await vscodeRemoteControl.openFile(filePath, port);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        throw err;
      } finally {
        setConnecting(false);
      }
    },
    [setConnecting, setError, port, portError],
  );

  const openFileAtPosition = useCallback(
    async (filePath: string, line?: number, column?: number) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          throw new Error(
            portError
              ? `Failed to get VSCode remote control port: ${portError}`
              : "VSCode remote control port not available",
          );
        }

        await vscodeRemoteControl.openFileAtPosition(
          filePath,
          line,
          column,
          port,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        throw err;
      } finally {
        setConnecting(false);
      }
    },
    [setConnecting, setError, port, portError],
  );

  const executeCommand = useCallback(
    async (commandId: string, ...args: unknown[]) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          throw new Error(
            portError
              ? `Failed to get VSCode remote control port: ${portError}`
              : "VSCode remote control port not available",
          );
        }

        await vscodeRemoteControl.executeCommand(commandId, port, ...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        throw err;
      } finally {
        setConnecting(false);
      }
    },
    [setConnecting, setError, port, portError],
  );

  return {
    ...state,
    openFile,
    openFileAtPosition,
    executeCommand,
    clearError,
    port,
    isPortLoading,
  };
}
