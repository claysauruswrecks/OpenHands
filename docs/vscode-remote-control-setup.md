# VSCode Remote Control Setup

This document explains how to set up the `vscode-remote-control` extension to enable clickable file paths in the OpenHands chat interface.

## Overview

The OpenHands frontend now uses the [vscode-remote-control extension](https://github.com/estruyf/vscode-remote-control) to open files directly in VSCode when clicking on file paths in the chat. This replaces the previous implementation that went through the OpenHands backend.

## Installation

1. **Install the extension in VSCode:**

   ```bash
   code --install-extension eliostruyf.vscode-remote-control
   ```

2. **Or install via the VSCode marketplace:**
   - Open VSCode
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Remote Control"
   - Install the extension by Elio Struyf

## Configuration

### Basic Setup

The extension works out of the box with default settings:

- **Host:** `localhost`
- **Port:** `3710`
- **Enable:** `true`

### Custom Configuration

You can customize the extension settings in VSCode's settings.json:

```json
{
  "remoteControl.enable": true,
  "remoteControl.host": "localhost",
  "remoteControl.port": 3710,
  "remoteControl.allowCommands": [
    "vscode.open",
    "workbench.action.files.openFile",
    "workbench.action.terminal.new"
  ]
}
```

### Security Settings

For security, you can restrict which commands are allowed:

```json
{
  "remoteControl.allowCommands": [
    "vscode.open"
  ]
}
```

## Runtime Container Setup

The vscode-remote-control extension is automatically installed in OpenHands runtime containers as of the latest version. The installation is handled during the container build process via the runtime Dockerfile template.

### Automatic Installation

The extension is installed automatically when runtime containers are built by manually downloading and extracting the VSIX file:

```dockerfile
RUN mkdir -p ${OPENVSCODE_SERVER_ROOT}/extensions && \
    wget -O /tmp/vscode-remote-control.vsix "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/eliostruyf/vsextensions/vscode-remote-control/1.8.0/vspackage" && \
    cd ${OPENVSCODE_SERVER_ROOT}/extensions && \
    unzip -q /tmp/vscode-remote-control.vsix && \
    mv extension eliostruyf.vscode-remote-control-1.8.0 && \
    rm /tmp/vscode-remote-control.vsix
```

This approach downloads the extension directly from the VSCode Marketplace API and manually installs it.

The runtime containers also automatically:

1. Configure VSCode settings to enable the extension
2. Expose port 3710 for the extension's websocket server
3. Start the extension when VSCode server launches

### Manual Installation (if needed)

If you're using an older runtime container or need to install manually:

1. **Install in the container:**

   ```bash
   code --install-extension eliostruyf.vscode-remote-control --force
   ```

2. **Start VSCode with the extension enabled:**

   ```bash
   code --enable-proposed-api eliostruyf.vscode-remote-control
   ```

## Usage

Once set up, clicking on any file path in the OpenHands chat will:

1. Connect to the extension's websocket server on port 3710
2. Send a `vscode.open` command with the file path
3. Open the file in the current VSCode window

### Port Configuration

The extension uses port 3710 by default, which is automatically exposed in OpenHands runtime containers. If you need to use a different port, you can configure it in your VSCode settings and ensure the corresponding port is exposed.

## API

The frontend communicates with the extension using JSON messages:

```json
{
  "command": "vscode.open",
  "args": ["/workspace/path/to/file.ts"]
}
```

### Supported Commands

- `vscode.open` - Opens a file
- `workbench.action.files.openFile` - Alternative file opening command
- Any other VSCode command ID (if allowed in settings)

## Troubleshooting

### Extension Not Found

- Ensure the extension is installed and enabled
- Check VSCode's Extension view to verify installation
- Restart VSCode after installation

### Connection Failed

- Verify the extension is running (check port 3710)
- Check if another application is using port 3710
- Try restarting VSCode

### Files Not Opening

- Check the file path format (should be absolute paths starting with `/workspace/`)
- Verify file permissions
- Check VSCode's output panel for error messages

### Port Issues

If port 3710 is unavailable, configure a different port:

1. **In VSCode settings:**

   ```json
   {
     "remoteControl.port": 3711
   }
   ```

2. **Update the frontend service configuration** (if needed):

   ```typescript
   const vscodeRemoteControl = new VSCodeRemoteControlService({
     port: 3711
   });
   ```

## Development

### Frontend Implementation

The frontend implementation consists of:

- **Service:** `src/services/vscode-remote-control.ts` - Handles websocket communication
- **Hook:** `src/hooks/use-vscode-remote-control.ts` - React hook for state management
- **Component:** `src/components/features/chat/clickable-file-path.tsx` - UI component

### Testing

To test the connection manually:

```bash
# Using websocat
echo '{"command": "vscode.open", "args": ["/workspace/test.txt"]}' | websocat ws://localhost:3710

# Using curl (for HTTP API if enabled)
curl -X POST http://localhost:3710/command \
  -H "Content-Type: application/json" \
  -d '{"command": "vscode.open", "args": ["/workspace/test.txt"]}'
```

## References

- [vscode-remote-control GitHub Repository](https://github.com/estruyf/vscode-remote-control)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
