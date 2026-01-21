# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mcp-auto-add is a global Node.js CLI tool that automatically detects MCP (Model Context Protocol) projects and adds them to multiple AI coding assistants with a single command. It intelligently detects project types (Python, Node.js, TypeScript), generates appropriate MCP configurations, and integrates with Claude Code, Gemini CLI, and OpenCode.

### Supported Platforms
- **Claude Code** (default): Uses `claude mcp add-json` CLI command
- **Gemini CLI** (`--gemini`): Uses `gemini mcp add` CLI command
- **OpenCode** (`--opencode` or `--oc`): Writes directly to `opencode.json` config files

## Development Commands

```bash
# Install dependencies
npm install

# Start the tool (for development/testing)
npm start

# Install globally from current directory
npm install -g .

# Test the tool in different project directories
cd /path/to/any-mcp-project
mcp-auto-add
```

## Architecture

### Core Components

1. **index.js** - Main CLI entry point with comprehensive project detection and MCP configuration generation
   - Auto-detection of Python, Node.js, and TypeScript projects based on file patterns
   - Dynamic Node.js executable resolution (supports nvm, global installations)
   - Environment variable handling from `.env` files
   - TypeScript build automation with package manager detection
   - MCP configuration JSON generation with proper command/args structure

2. **Project Detection Logic** (`detectProjectType()`)
   - Python: Detects `pyproject.toml`, `requirements.txt`, or `setup.py`
   - TypeScript: Detects `package.json` + `tsconfig.json` combination
   - Node.js: Detects `package.json` without TypeScript configuration
   - Environment variable override support via `PROJECT_TYPE`

3. **Build System Integration** (`buildTypeScriptProject()`)
   - Automatic package manager detection (npm, yarn, pnpm, bun)
   - Build command execution with proper error handling
   - Build output validation before MCP configuration

4. **Claude CLI Integration** (`executeClaudeMCPAdd()`)
   - Validates Claude CLI availability before execution
   - Generates proper `claude mcp add-json` commands
   - Handles JSON escaping and command-line argument formatting

5. **MCP Configuration Editor** (`handleEditMode()`)
   - Finds all MCP configuration files across different scopes (user, local, project)
   - Parses JSON configs to extract server names, commands, and line numbers
   - Interactive menu for config selection (if multiple exist)
   - Interactive server selection with command preview
   - Opens editor at exact line where selected server is defined
   - Supports multiple editors with proper line-jump syntax (nano, vim, VS Code, emacs, sublime)
   - Auto-detects editor from `EDITOR` env var or scans for available editors

### Key Design Patterns

- **Smart Detection**: File-based project type detection with fallback mechanisms
- **Environment Awareness**: Supports various Node.js installation methods (nvm, global, system)
- **Build Integration**: Automatically handles TypeScript compilation before MCP setup
- **CLI Safety**: Confirmation prompts, dry-run mode, and verbose output options
- **Error Handling**: Comprehensive error messages with actionable guidance

## CLI Usage Patterns

### Command-Line Options
- `--force` / `-f`: Skip confirmation prompts
- `--verbose` / `-v`: Enable detailed logging
- `--dry-run` / `-d`: Show what would be done without executing
- `--edit` / `-e`: Edit existing MCP configuration files
- `--json` / `-j`: Provide JSON configuration directly
- `--json-file` / `-jf`: Read JSON configuration from file
- `--clipboard` / `-c`: Read JSON configuration from clipboard
- `--generate-command` / `-g`: Generate command/config and copy to clipboard
- `--gemini`: Target Gemini CLI instead of Claude Code
- `--opencode` / `--oc`: Target OpenCode instead of Claude Code

### Edit Command
The edit command provides an interactive way to edit specific MCP servers:
```bash
# Interactive mode - select config file, then select server
mcp-auto-add edit

# Alternative syntax
mcp-auto-add --edit
```

**Interactive Workflow:**
1. **Config Selection**: Choose which config file to edit (if multiple exist)
2. **Server List**: See all configured servers with their commands
3. **Server Selection**: Select which server to edit from the list
4. **Editor Opens**: Opens at the exact line where that server is defined

**Features:**
- Automatically finds all MCP config files (user, local, project scopes)
- Lists all servers with preview of their commands
- Detects line numbers for each server definition
- Opens editor directly at the selected server's configuration line
- Supports line jumping in multiple editors:
  - nano, vim, vi, nvim: `+line` syntax
  - VS Code: `-g file:line` syntax
  - Emacs: `+line` syntax
  - Sublime: `file:line` syntax
- Respects `EDITOR` environment variable
- Supports multiple config file locations:
  - **Claude/Cursor**:
    - User scope: `~/.cursor/mcp.json` or `~/.claude/mcp.json`
    - Local scope: `.cursor/mcp.json` or `.vscode/mcp.json`
    - Project scope: `.mcp.json`
  - **Gemini CLI**:
    - User scope: `~/.gemini/settings.json`
    - Project scope: `.gemini/settings.json`
  - **OpenCode**:
    - User scope: `~/.config/opencode/opencode.json`
    - Project scope: `./opencode.json`

### Environment Variables
- `PROJECT_TYPE`: Override automatic detection (python/node/typescript)
- `EDITOR`: Set preferred text editor for edit mode (e.g., nano, vim, code)
- Standard `.env` file support for project-specific environment variables

## Project Type Requirements

### Python Projects
- Requires `uv` package manager for dependency management
- Expects `.venv/bin/python` virtual environment structure  
- Assumes `server.py` as the MCP server entry point
- Validates both Python executable and server file existence

### TypeScript Projects
- Requires `tsconfig.json` for TypeScript detection
- Automatically runs build commands (`npm run build`, `yarn build`, etc.)
- Expects `build/index.js` as compiled output
- Validates build completion before MCP configuration

### Node.js Projects
- Detects via `package.json` without TypeScript configuration
- Assumes `build/index.js` as entry point
- Supports both local projects and global npm packages

## Integration Points

### Claude CLI Dependencies
- Requires `claude` command in PATH
- Uses `claude mcp add-json` for server registration
- Validates Claude CLI availability before execution

### Gemini CLI Dependencies
- Requires `gemini` command in PATH
- Uses `gemini mcp add` with positional arguments
- Supports user and project scopes (no local scope)

### OpenCode Integration
- **No CLI required** - writes directly to config files
- Config format uses `mcp` key with server objects containing:
  - `type`: "local" or "remote"
  - `command`: Array of command and args (for local)
  - `url`: Server URL (for remote)
  - `enabled`: true/false
  - `environment`: Environment variables object
- Automatically creates config directory if missing
- Backs up existing config if JSON is invalid
- Supports user scope (`~/.config/opencode/opencode.json`) and project scope (`./opencode.json`)

### Node.js Environment
- Uses `which node` and `nvm which node` for executable detection
- Supports common Node.js installation paths
- Handles global vs local package installation contexts

### Package Manager Support
- Auto-detects package managers by lockfile presence
- Supports npm, yarn, pnpm, and bun build commands
- Maintains compatibility across different Node.js ecosystems

## Development Guidelines

### Adding New Project Types
When extending project detection in `detectProjectType()`:
1. Add file pattern checks for the new project type
2. Implement configuration generation logic in `generateMCPConfig()`
3. Add appropriate error handling and validation
4. Update the CLI help text and documentation

### Modifying Build Logic
The build system in `buildTypeScriptProject()`:
- Maintains package manager compatibility across npm, yarn, pnpm, bun
- Provides clear error messages for build failures
- Validates build output before proceeding with MCP setup

### Error Handling Patterns
All error messages should:
- Provide actionable guidance (e.g., "Run: uv venv && uv sync")
- Include specific file paths and commands
- Support verbose mode for detailed debugging

## Testing Considerations

Since this is a CLI tool that integrates with external systems:
1. Test with different project structures (Python/Node.js/TypeScript)
2. Verify behavior with different package managers
3. Test with and without CLI availability (Claude, Gemini)
4. Validate dry-run mode accuracy
5. Test global vs local package detection logic
6. Test all three platforms: Claude Code, Gemini CLI, OpenCode
7. Test config file creation and merging for OpenCode
8. Verify correct JSON format generation for each platform