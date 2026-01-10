# Gemini CLI Support - Feature Documentation

## Overview

This document describes the Gemini CLI support added to `mcp-auto-add`, allowing users to automatically add MCP servers to Google's Gemini CLI in addition to Claude Code.

## What Was Added

### 1. Command Line Flag

**New Flag:** `--gemini` or `--g`

This flag switches the tool from using Claude Code to Gemini CLI for all MCP server operations.

```bash
# Use Gemini CLI instead of Claude
mcp-auto-add --gemini .
mcp-auto-add --gemini --clipboard
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --gemini
```

### 2. New Functions

#### `findGeminiCLIInstallation()`
- Detects Gemini CLI installation location
- Checks PATH first, then common installation directories
- Supports npm global installs and nvm-managed installations
- Returns the path to the `gemini` executable

#### `findGeminiMCPConfigPath(scope)`
- Determines the correct config file location for Gemini CLI
- Supports two scopes:
  - `user`: `~/.gemini/settings.json` or `~/.config/gemini/settings.json`
  - `project`: `.gemini/settings.json` in project root
- Returns the appropriate config file path

#### `generateGeminiMCPCommand(config, serverName, scope)`
- Generates the correct `gemini mcp add` command
- Handles local (STDIO) servers with command and args
- Properly escapes arguments with spaces or special characters
- Adds `--scope` flag when not using default `user` scope

#### `executeGeminiMCPAdd(config, serverName, scope)`
- Executes `gemini mcp add` for local (STDIO-based) MCP servers
- Validates Gemini CLI installation before execution
- Provides detailed error messages and troubleshooting tips
- Supports dry-run mode for testing

#### `executeGeminiMCPAddURL(config, serverName, scope)`
- Executes `gemini mcp add --transport` for remote (URL-based) MCP servers
- Defaults to `http` transport (vs Claude's `sse`)
- Validates Gemini CLI installation
- Handles network errors and provides guidance

### 3. Conditional Logic Updates

All execution paths now check the `useGemini` flag and route to appropriate functions:

- **Command Generation**: Uses `generateGeminiMCPCommand()` or `generateClaudeCommand()`
- **Local Server Execution**: Uses `executeGeminiMCPAdd()` or `executeClaudeMCPAdd()`
- **Remote Server Execution**: Uses `executeGeminiMCPAddURL()` or `executeClaudeMCPAddURL()`
- **Messages**: All user-facing messages adapt to show "Gemini CLI" or "Claude Code"

## Usage Examples

### Basic Usage

```bash
# Auto-detect project and add to Gemini CLI
cd /path/to/mcp-project
mcp-auto-add --gemini .

# Add from clipboard to Gemini CLI
mcp-auto-add --clipboard --gemini

# Direct JSON input to Gemini CLI
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/path"]}' --gemini
```

### Remote Servers

```bash
# Add URL-based server to Gemini CLI
mcp-auto-add --json '{"url":"https://api.example.com/mcp"}' --gemini

# With custom transport
mcp-auto-add --json '{"url":"https://api.example.com/mcp","transport":"http"}' --gemini
```

### Command Generation

```bash
# Generate Gemini command without executing
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --gemini --generate-command

# Output: gemini mcp add server-name npx -y tool
```

### Force Mode

```bash
# Auto-add with defaults (no prompts)
mcp-auto-add . --gemini --force

# Force clipboard mode
mcp-auto-add --clipboard --gemini --force
```

## Command Format Differences

### Claude Code Commands

**Local Servers:**
```bash
claude mcp add-json server-name '{"command":"npx","args":["-y","tool"]}' -s user
```

**Remote Servers:**
```bash
claude mcp add --transport sse server-name https://api.example.com/mcp
```

### Gemini CLI Commands

**Local Servers:**
```bash
gemini mcp add --scope user server-name npx -y tool
```

**Remote Servers:**
```bash
gemini mcp add --transport http server-name https://api.example.com/mcp
```

### Key Differences

1. **Local Server Format:**
   - Claude: Uses JSON format with `add-json` subcommand
   - Gemini: Uses direct command/args format with `add` subcommand

2. **Transport Default:**
   - Claude: Defaults to `sse` (Server-Sent Events)
   - Gemini: Defaults to `http`

3. **Scope Flag:**
   - Claude: Uses `-s` or `--scope` flag
   - Gemini: Uses `--scope` flag (no short form)

4. **Config File Locations:**
   - Claude: `~/.cursor/mcp.json` or `~/.claude/mcp.json`
   - Gemini: `~/.gemini/settings.json` or `~/.config/gemini/settings.json`

## Configuration File Structure

### Gemini CLI Config Format

The tool writes to Gemini CLI's `settings.json` file:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

### Scope Behavior

- **`user` scope (default):** Config written to `~/.gemini/settings.json`
- **`project` scope:** Config written to `.gemini/settings.json` in project root
- **Note:** Gemini CLI doesn't support `local` scope like Claude Code

## Error Handling

The Gemini implementation includes comprehensive error handling:

1. **Installation Detection:**
   - Checks if `gemini` command is in PATH
   - Searches common installation locations
   - Provides clear error if not found with installation instructions

2. **Command Execution Errors:**
   - Parses stderr/stdout for error messages
   - Provides context-specific troubleshooting tips
   - Suggests running `gemini mcp list` to verify

3. **Validation:**
   - Tests executable paths before adding
   - Validates server names (alphanumeric, hyphens, underscores)
   - Checks URL accessibility for remote servers

## Troubleshooting

### Gemini CLI Not Found

**Error:**
```
Gemini CLI is not installed or not in PATH
```

**Solution:**
```bash
npm install -g @google/gemini-cli
```

### Server Name Already Exists

**Error:**
```
Server name already exists
```

**Solution:**
```bash
# List existing servers
gemini mcp list

# Use a different server name
mcp-auto-add . --gemini
# When prompted, enter a unique server name
```

### Invalid Transport Type

**Error:**
```
Invalid transport type
```

**Solution:**
- Gemini CLI supports: `http` (default) or `sse`
- Ensure transport matches server capabilities

## Testing

### Dry Run Mode

Test commands without executing:

```bash
mcp-auto-add . --gemini --dry-run
```

### Verbose Mode

See detailed execution information:

```bash
mcp-auto-add . --gemini --verbose
```

## Integration Points

The Gemini support integrates seamlessly with existing features:

- ✅ **Auto-detection:** Works with project detection
- ✅ **Clipboard mode:** Reads JSON and adds to Gemini
- ✅ **JSON input:** Direct JSON configuration support
- ✅ **Interactive mode:** Prompts adapt for Gemini CLI
- ✅ **Force mode:** Non-interactive execution
- ✅ **Command generation:** Generates correct Gemini commands
- ✅ **Edit mode:** (Future: Edit Gemini config files)

## Code Locations

### New Functions
- Lines ~1058-1133: `findGeminiCLIInstallation()`
- Lines ~1135-1155: `findGeminiMCPConfigPath()`
- Lines ~1157-1180: `generateGeminiMCPCommand()`
- Lines ~1182-1280: `executeGeminiMCPAddURL()`
- Lines ~1282-1380: `executeGeminiMCPAdd()`

### Modified Sections
- Line 18: Added `useGemini` flag detection
- Line 139: Dynamic CLI target message
- Lines 1949-1950: Command generation routing
- Lines 1965, 2039, 2115: Execution function routing
- Multiple locations: Message updates for Gemini CLI

## Future Enhancements

Potential improvements for Gemini CLI support:

1. **Edit Mode:** Support editing Gemini config files
2. **List Mode:** Show Gemini CLI servers
3. **Remove Mode:** Remove servers from Gemini CLI
4. **Status Check:** Verify Gemini CLI server connectivity
5. **Environment Variables:** Better handling of Gemini-specific env vars
6. **Scope Support:** Full support for all Gemini CLI scopes

## Compatibility

- **Node.js:** Requires Node.js 18+ (same as base tool)
- **Gemini CLI:** Requires `@google/gemini-cli` v1.0.0+
- **Platforms:** Works on macOS, Linux, and Windows (WSL2)

## Summary

The Gemini CLI support provides feature parity with Claude Code integration, allowing users to manage MCP servers for both platforms using a single tool. The implementation follows the same patterns and conventions as the existing Claude Code support, ensuring consistency and maintainability.

