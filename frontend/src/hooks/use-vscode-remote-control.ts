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
  openFileWithWorkbench: (filePath: string) => Promise<void>;
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<void>;
  openDirectory: (dirPath: string) => Promise<void>;
  focusExplorer: () => Promise<void>;
  revealInExplorer: (path: string) => Promise<void>;
  clearError: () => void;
  port: number | null;
  isPortLoading: boolean;
  isPortError: boolean;
}

/**
 * React hook for VSCode remote control operations
 * Provides convenient methods for opening files and executing commands in VSCode
 * via the vscode-remote-control extension with dynamic port discovery
 */
export function useVSCodeRemoteControl(
  conversationId?: string,
): UseVSCodeRemoteControlReturn {
  const [state, setState] = useState<UseVSCodeRemoteControlState>({
    isConnecting: false,
    lastError: null,
  });

  // Get the dynamic port for this conversation's runtime container
  const {
    data: portData,
    isLoading: isPortLoading,
    error: portError,
  } = useVSCodeRemoteControlPort(conversationId);
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
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(`Opening file in VSCode on port ${port}: ${filePath}`);
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
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(
          `Opening file at position in VSCode on port ${port}: ${filePath}:${line}:${column}`,
        );
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

  const openFileWithWorkbench = useCallback(
    async (filePath: string) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(
          `Opening file with workbench command on port ${port}:`,
          filePath,
        );
        await vscodeRemoteControl.openFileWithWorkbench(filePath, port);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        throw err;
      } finally {
        setConnecting(false);
      }
    },
    [port, portError],
  );

  const executeCommand = useCallback(
    async (commandId: string, ...args: unknown[]) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(
          `Executing VSCode command on port ${port}:`,
          commandId,
          args,
        );
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

  const openDirectory = useCallback(
    async (dirPath: string) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(
          `Opening directory in VSCode on port ${port}: ${dirPath}`,
        );
        await vscodeRemoteControl.openDirectory(dirPath, port);
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

  const focusExplorer = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);

      if (!port) {
        const errorMsg = portError
          ? `Failed to get VSCode remote control port: ${portError}`
          : "VSCode remote control port not available";
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }

      console.debug(`Focusing Explorer view on port ${port}`);
      await vscodeRemoteControl.focusExplorer(port);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [setConnecting, setError, port, portError]);

  const revealInExplorer = useCallback(
    async (path: string) => {
      try {
        setConnecting(true);
        setError(null);

        if (!port) {
          const errorMsg = portError
            ? `Failed to get VSCode remote control port: ${portError}`
            : "VSCode remote control port not available";
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }

        console.debug(`Revealing path in Explorer on port ${port}: ${path}`);
        await vscodeRemoteControl.revealInExplorer(path, port);
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
    openFileWithWorkbench,
    executeCommand,
    openDirectory,
    focusExplorer,
    revealInExplorer,
    clearError,
    port,
    isPortLoading,
    isPortError: !!portError,
  };
}
