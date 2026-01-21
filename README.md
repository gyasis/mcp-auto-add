# MCP Auto-Add 🚀

**Automatically detect MCP projects and add them to Claude Code, Gemini CLI, or OpenCode with one command!**

This global Node.js package revolutionizes MCP development by automatically detecting your project type, generating the correct configuration, and adding it to **Claude Code**, **Gemini CLI**, or **OpenCode** with a single command.

## ✨ Features

- **🔍 Auto-Detection**: Automatically detects Python, Node.js, or TypeScript MCP projects
- **🎯 Multiple Input Modes**: Interactive menu, auto-detect, clipboard, JSON paste, or file input
- **📋 Clipboard Integration**: Read JSON configurations directly from system clipboard
- **🔧 Smart Configuration**: Generates the correct MCP configuration based on project structure
- **🌐 Dual Server Support**: Handles both local (STDIO) and remote (URL-based) MCP servers
- **🤖 Triple Platform Support**: Works with **Claude Code**, **Gemini CLI**, and **OpenCode**
- **🎯 Interactive Prompts**: Choose scope (user/local/project) and customize server name
- **🧪 Path Validation**: Tests executable paths before adding to ensure they work
- **🚀 One-Command Setup**: Automatically runs correct CLI command for server type
- **📦 Global Installation**: Install once, use anywhere in your environment
- **🔨 Build Integration**: Automatically builds TypeScript projects when needed
- **🌍 Environment Support**: Reads `.env` files and handles environment variables
- **📤 Command Generation**: Generate ready-to-paste CLI commands
- **🎨 Beautiful Output**: Colored, timestamped logging with progress indicators
- **🛡️ Security Hardened**: Input validation and command injection protection

## 🚀 Quick Start

### Installation

```bash
# Install globally from npm
npm install -g mcp-auto-add

# Or install from source
git clone https://github.com/gyasis/mcp-auto-add.git
cd mcp-auto-add
npm install -g .
```

### Basic Usage

The tool supports multiple usage patterns for **Claude Code** (default), **Gemini CLI**, and **OpenCode**:

```bash
# Claude Code (default)
mcp-auto-add                    # Interactive mode
mcp-auto-add .                  # Auto-detect from current folder
mcp-auto-add --clipboard        # Read JSON config from clipboard

# Gemini CLI (use --gemini flag)
mcp-auto-add --gemini           # Interactive mode for Gemini
mcp-auto-add . --gemini         # Auto-detect for Gemini
mcp-auto-add --clipboard --gemini  # Clipboard mode for Gemini

# OpenCode (use --opencode or --oc flag)
mcp-auto-add --opencode         # Interactive mode for OpenCode
mcp-auto-add . --opencode       # Auto-detect for OpenCode
mcp-auto-add --clipboard --oc   # Clipboard mode for OpenCode
```

**Interactive Mode** will:
1. 🎯 Show you a menu of configuration options
2. 🔍 Auto-detect, JSON paste, file input, or clipboard reading
3. 🧪 Validate executable paths and configuration
4. 📝 Allow scope and server name customization  
5. 🚀 Add the server to Claude Code

**Auto-detect Mode** will:
1. 🔍 Directly detect your project type (Python/Node.js/TypeScript)
2. 🧪 Validate the executable paths
3. 🎯 Prompt for scope selection (defaults to "user")
4. 📝 Allow server name customization
5. 🔧 Generate the correct MCP configuration
6. 🚀 Automatically add it to Claude Code

## 📋 Command Line Options

```bash
mcp-auto-add [OPTIONS]              # Interactive mode with menu
mcp-auto-add . [OPTIONS]            # Auto-detect from current folder
mcp-auto-add --clipboard [OPTIONS]  # Read JSON from clipboard

Options:
  -f, --force                  Skip confirmation prompts and use defaults
  -v, --verbose                Show detailed verbose output
  -d, --dry-run                Show what would be done without executing
  -j, --json <config>          Provide JSON configuration directly
  -jf, --json-file <path>      Read JSON configuration from file
  -c, --clipboard              Read JSON configuration from clipboard
  -g, --generate-command       Generate CLI command and copy to clipboard
  --gemini                     Use Gemini CLI instead of Claude Code
  --opencode, --oc             Use OpenCode instead of Claude Code
  -e, --edit                   Edit existing MCP configuration files
  -h, --help                   Show help information
```

### Examples

```bash
# === CLAUDE CODE (Default) ===

# Interactive mode - shows menu of choices (recommended)
mcp-auto-add

# Auto-detect mode - directly tries to detect from current folder
mcp-auto-add .

# Clipboard mode - reads JSON config from clipboard
mcp-auto-add --clipboard

# Direct JSON input
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/path"]}'

# JSON from file
mcp-auto-add --json-file ./mcp-config.json

# Generate command for clipboard (no execution)
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --generate-command

# === GEMINI CLI ===

# Interactive mode for Gemini CLI
mcp-auto-add --gemini

# Auto-detect and add to Gemini CLI
mcp-auto-add . --gemini

# Clipboard mode for Gemini CLI
mcp-auto-add --clipboard --gemini

# Direct JSON input for Gemini
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --gemini

# URL-based server for Gemini
mcp-auto-add --json '{"url":"https://api.example.com/mcp"}' --gemini

# === OPENCODE ===

# Interactive mode for OpenCode
mcp-auto-add --opencode

# Auto-detect and add to OpenCode (short flag)
mcp-auto-add . --oc

# Clipboard mode for OpenCode
mcp-auto-add --clipboard --opencode

# Direct JSON input for OpenCode
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/home"]}' --opencode

# URL-based (remote) server for OpenCode
mcp-auto-add --json '{"url":"https://mcp.context7.com/mcp"}' --opencode

# Generate OpenCode config snippet (outputs JSON, not CLI command)
mcp-auto-add --json '{"command":"node","args":["server.js"]}' --opencode --generate-command

# Force mode for scripting/automation
mcp-auto-add --clipboard --opencode --force

# === COMMON OPTIONS ===

# Force mode options (works with both platforms)
mcp-auto-add --force            # Interactive with defaults
mcp-auto-add . --force          # Force auto-detect mode
mcp-auto-add --clipboard --force --gemini # Force Gemini clipboard mode

# Testing and debugging
mcp-auto-add --dry-run          # See what would be done
mcp-auto-add . --verbose        # Detailed logging
mcp-auto-add . --gemini --dry-run # Test Gemini mode
```

## 🔄 MCP Server Types

The tool automatically detects and handles two types of MCP servers:

### 📱 **Local Servers (STDIO-based)**
- **Description**: Run locally on your machine
- **Communication**: Via standard input/output streams  
- **Command Format**: `claude mcp add-json server-name '{"command":"...","args":[...]}' -s scope`
- **Examples**: Python scripts, TypeScript/Node.js applications, local executables
- **Detection**: Auto-detected from project files in current directory

```bash
# Local server examples
{"command": "python", "args": ["server.py"]}
{"command": "npx", "args": ["-y", "@modelcontextprotocol/server-everything"]}
{"command": "/path/to/executable", "args": ["--config", "file.json"]}
```

### 🌐 **Remote Servers (URL-based)**
- **Description**: Run on external servers accessed via HTTP/SSE
- **Communication**: Via HTTP requests or Server-Sent Events
- **Command Format**: `claude mcp add --transport sse server-name https://api.example.com/mcp`
- **Examples**: GitMCP, Linear, Sentry, GitHub integrations
- **Detection**: Auto-detected from JSON with `"url"` field

```bash
# Remote server examples  
{"url": "https://gitmcp.io/docs"}
{"url": "https://mcp.linear.app/sse", "transport": "sse"}
{"url": "https://mcp.sentry.io/sse", "transport": "sse"}
```

### 🔧 **How Detection Works**

1. **JSON Input** (clipboard, --json, --json-file):
   - **URL detected**: `{"url": "https://..."}` → Uses `claude mcp add --transport`
   - **Command detected**: `{"command": "...", "args": [...]}` → Uses `claude mcp add-json`
   - **Wrapped format**: `{"gitmcp": {"url": "..."}}` → Extracts server name + config

2. **Auto-detection** (current directory):
   - **Always local**: Scans project files to generate STDIO configuration
   - **Never remote**: Cannot auto-detect remote servers from local files

## 🔍 Project Detection

The tool automatically detects project types based on file presence:

### Python Projects
- **Detects**: `pyproject.toml`, `requirements.txt`, or `setup.py`
- **Entry Point**: `server.py`
- **Requirements**: 
  - `uv` package manager installed
  - `.venv` virtual environment created with `uv venv && uv sync`

### TypeScript Projects
- **Detects**: `package.json` + `tsconfig.json`
- **Entry Point**: `build/index.js` (after build)
- **Build Support**: Automatically runs build command
- **Package Managers**: npm, yarn, pnpm, or bun

### Node.js Projects
- **Detects**: `package.json` (without `tsconfig.json`)
- **Entry Point**: `build/index.js`
- **Global Packages**: Detects if package is installed globally

## 🎯 Interactive Features

### Scope Selection
When running interactively, you'll be prompted to choose the MCP server scope:

- **`user`** (default) - Available to you across all projects
- **`local`** - Available only in the current project
- **`project`** - Shared with everyone via `.mcp.json` file

### Server Name Customization
You can customize the server name instead of using the default directory name.

### Executable Validation
The tool tests executable paths before adding them to ensure they're valid and accessible.

## 📋 Clipboard Integration

The clipboard feature allows you to copy JSON configurations from anywhere and paste them directly into the tool:

### Using Clipboard Mode

```bash
# Copy any MCP JSON configuration to your clipboard, then:
mcp-auto-add --clipboard
```

### Supported JSON Formats

The tool handles various JSON configuration formats:

```bash
# Standard MCP configuration
{"command": "npx", "args": ["-y", "gemini-mcp-tool"]}

# Wrapped format (from Claude settings)
{"gitmcp": {"url": "https://gitmcp.io/docs"}}

# URL-based configuration
{"url": "https://example.com/mcp-server"}

# Full configuration with environment
{
  "command": "python",
  "args": ["server.py"],
  "env": {"API_KEY": "value"},
  "description": "My MCP server"
}
```

### Cross-Platform Support

The clipboard integration works across platforms:
- **Linux**: Uses `xclip` or `xsel`
- **macOS**: Uses `pbpaste`
- **Auto-detection**: Tries each tool automatically

### Generate Commands for Clipboard

You can also generate `claude mcp add-json` commands and copy them to clipboard:

```bash
# Generate command from JSON and copy to clipboard
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --generate-command

# Generate command from clipboard JSON
mcp-auto-add --clipboard --generate-command
```

## 🔧 Configuration

### Environment Variables

The tool automatically reads `.env` files from your project directory:

```bash
# .env file example
API_KEY=your-api-key
DEBUG=true
LOG_LEVEL=info
```

### Project Type Override

Force a specific project type detection:

```bash
export PROJECT_TYPE=python
mcp-auto-add
```

## 🛠️ Requirements

### System Requirements
- **Node.js**: Version 18 or higher
- **Claude Code**: Must be installed with `claude` command available in PATH
- **Git**: For repository management

### Project-Specific Requirements

#### Python Projects
```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment
uv venv && uv sync

# Ensure server.py exists in project root
```

#### TypeScript Projects
```bash
# Ensure package.json has build script
{
  "scripts": {
    "build": "tsc"
  }
}

# Install dependencies
npm install

# Tool will automatically run build
```

## 🎉 Real-World Examples

### Adding a TypeScript MCP Server

```bash
$ cd /path/to/typescript-mcp-project
$ mcp-auto-add

[2025-08-15T14:30:00.000Z] 🚀 MCP Auto-Add - Automatically adding MCP server to Claude Code
[2025-08-15T14:30:00.000Z] 📁 Working directory: /path/to/typescript-mcp-project
[2025-08-15T14:30:00.000Z] 📦 Project name: typescript-mcp-project
[2025-08-15T14:30:00.000Z] 📦 Detected project type: typescript
[2025-08-15T14:30:00.000Z] 🔨 Building TypeScript project...
[2025-08-15T14:30:05.000Z] ✅ TypeScript build completed successfully
[2025-08-15T14:30:05.000Z] ✅ MCP configuration generated successfully
[2025-08-15T14:30:05.000Z] 📋 MCP Configuration Summary:
[2025-08-15T14:30:05.000Z] Server Name: typescript-mcp-project
[2025-08-15T14:30:05.000Z] Command: /home/user/.nvm/versions/node/v22.9.0/bin/node
[2025-08-15T14:30:05.000Z] Arguments: /path/to/typescript-mcp-project/build/index.js
[2025-08-15T14:30:05.000Z] 🧪 Testing executable path...
[2025-08-15T14:30:06.000Z] ✅ Executable test successful

? Choose MCP server scope: user - Available to you across all projects (recommended)
? Server name: typescript-mcp-project
? Add this MCP server to Claude Code? Yes

[2025-08-15T14:30:10.000Z] 🚀 Executing Claude MCP add-json command...
[2025-08-15T14:30:10.000Z] 📤 Adding MCP server "typescript-mcp-project" with scope "user"...
[2025-08-15T14:30:11.000Z] ✅ MCP server added to Claude Code successfully!
[2025-08-15T14:30:11.000Z] 🎉 MCP Auto-Add completed successfully!
[2025-08-15T14:30:11.000Z] 💡 MCP server "typescript-mcp-project" is now available in Claude Code
[2025-08-15T14:30:11.000Z] 📍 Scope: user
[2025-08-15T14:30:11.000Z] 🌟 This server is available across all your projects
[2025-08-15T14:30:11.000Z] 🔄 Restart Claude Code if needed to see the new server
```

### Adding Multiple Projects

```bash
# Add first project
cd /path/to/project1
mcp-auto-add

# Add second project  
cd /path/to/project2
mcp-auto-add

# Add third project
cd /path/to/project3
mcp-auto-add

# View all configured servers
claude mcp list
```

### Using Clipboard for Quick Setup

```bash
# Copy a JSON configuration to clipboard from anywhere, then:
$ mcp-auto-add --clipboard

[2025-08-15T14:30:00.000Z] 🚀 MCP Auto-Add - Automatically adding MCP server to Claude Code
[2025-08-15T14:30:00.000Z] 📋 Reading JSON configuration from clipboard...
[2025-08-15T14:30:00.000Z] ✅ Successfully read content from clipboard
[2025-08-15T14:30:00.000Z] 📦 Detected wrapped JSON format with server name: "gitmcp"
[2025-08-15T14:30:00.000Z] 📌 Detected URL-based MCP configuration
[2025-08-15T14:30:00.000Z] ✅ MCP configuration parsed from JSON successfully

? Choose MCP server scope: user - Available to you across all projects (recommended)
? Server name: gitmcp
? Add this MCP server to Claude Code? Yes

[2025-08-15T14:30:05.000Z] 🚀 Executing Claude MCP add-json command...
[2025-08-15T14:30:05.000Z] ✅ MCP server added to Claude Code successfully!
[2025-08-15T14:30:05.000Z] 🎉 MCP Auto-Add completed successfully!
```

### Adding Remote (URL-based) Servers

```bash
# Copy URL-based JSON configuration to clipboard, then:
$ mcp-auto-add --clipboard

[2025-08-15T14:30:00.000Z] 🚀 MCP Auto-Add - Automatically adding MCP server to Claude Code
[2025-08-15T14:30:00.000Z] 📋 Reading JSON configuration from clipboard...
[2025-08-15T14:30:00.000Z] ✅ Successfully read content from clipboard
[2025-08-15T14:30:00.000Z] 🔧 Detected JSON fragment, attempting to wrap in braces...
[2025-08-15T14:30:00.000Z] ✅ Successfully parsed JSON fragment
[2025-08-15T14:30:00.000Z] 📦 Detected wrapped JSON format with server name: "gitmcp"
[2025-08-15T14:30:00.000Z] 📌 Detected URL-based MCP configuration
[2025-08-15T14:30:00.000Z] 🌐 URL-based MCP server detected
[2025-08-15T14:30:00.000Z] URL: https://gitmcp.io/docs
[2025-08-15T14:30:00.000Z] Transport: sse

? Choose MCP server scope: user - Available to you across all projects (recommended)
? Server name: gitmcp
? Choose transport type: SSE (Server-Sent Events) - recommended
? Add this URL-based MCP server to Claude Code? Yes

[2025-08-15T14:30:05.000Z] 🚀 Executing Claude MCP add command for URL-based server...
[2025-08-15T14:30:05.000Z] ✅ URL-based MCP server added to Claude Code successfully!
[2025-08-15T14:30:05.000Z] 🎉 URL-based MCP Auto-Add completed successfully!
```

### Generate Commands for Later Use

```bash
# Generate command and copy to clipboard for manual execution
$ mcp-auto-add --clipboard --generate-command

[2025-08-15T14:30:00.000Z] 📋 Reading JSON configuration from clipboard...
[2025-08-15T14:30:00.000Z] ✅ Successfully read content from clipboard
[2025-08-15T14:30:00.000Z] 📋 Generated Claude MCP command:

claude mcp add --transport sse gitmcp https://gitmcp.io/docs

[2025-08-15T14:30:00.000Z] ✅ Command copied to clipboard using xclip
[2025-08-15T14:30:00.000Z] 📌 You can now paste it in your terminal with Ctrl+V
[2025-08-15T14:30:00.000Z] 💡 To run: paste the command in your terminal
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### "Could not detect project type"
- Ensure you're in a valid MCP project directory
- Check for required files (`package.json`, `pyproject.toml`, etc.)
- Use `PROJECT_TYPE` environment variable to override

#### "Claude CLI is not installed"
- Install Claude Code from https://claude.ai/download
- Ensure `claude` command is in your PATH
- Try running `claude --version` to verify

#### "Gemini CLI is not installed"
- Install Gemini CLI: `npm install -g @google/gemini-cli`
- Ensure `gemini` command is in your PATH
- Try running `gemini --version` to verify

#### "OpenCode not installed" (only relevant if using `opencode mcp list`)
- Install OpenCode: `curl -fsSL https://opencode.ai/install | bash`
- Or via Homebrew: `brew install anomalyco/tap/opencode`
- **Note**: mcp-auto-add does NOT require OpenCode CLI - it writes directly to config files

#### "TypeScript build failed"
- Fix build errors in your TypeScript project
- Ensure all dependencies are installed
- Check that build script exists in `package.json`

#### "Python executable not found"
- Create virtual environment: `uv venv && uv sync`
- Ensure `uv` is installed
- Check that `server.py` exists

#### "Executable test failed"
- The tool will prompt to continue anyway
- Check file permissions
- Ensure the path is correct

#### "URL-based server connection failed"
- Verify the URL is accessible in your browser
- Check your internet connection
- Ensure the transport type (SSE/HTTP) is correct
- Try a different transport option

#### "Invalid JSON configuration"  
- Check JSON syntax with a validator
- Ensure proper escaping of quotes
- Verify the configuration format matches the server type:
  - Local servers: `{"command": "...", "args": [...]}`
  - Remote servers: `{"url": "https://..."}`

### Debug Mode

Use verbose mode for detailed debugging:

```bash
mcp-auto-add --verbose
```

### Dry Run Testing

Test what would be done without executing:

```bash
mcp-auto-add --dry-run --verbose
```

## 🚀 Advanced Usage

### Force Mode for Automation

Skip all prompts and use defaults:

```bash
# Force auto-detect mode
mcp-auto-add . --force

# Force clipboard mode  
mcp-auto-add --clipboard --force

# Force interactive mode with defaults
mcp-auto-add --force
```

### Clipboard Workflows

Streamline configuration sharing and automation:

```bash
# Copy JSON config from documentation/emails/chat
# Then paste directly into tool
mcp-auto-add --clipboard

# Generate commands for team sharing
mcp-auto-add --clipboard --generate-command

# Chain clipboard operations
echo '{"command":"npx","args":["-y","tool"]}' | xclip -selection clipboard
mcp-auto-add --clipboard --dry-run
```

### Custom Entry Points

For projects with different entry points, you can:
1. Set environment variables
2. Modify the detection logic
3. Use symbolic links

### CI/CD Integration

```bash
# In your CI/CD pipeline
npm install -g mcp-auto-add
mcp-auto-add --force --dry-run  # Test first
mcp-auto-add --force             # Actually add
```

## 🔄 Platform Comparison: Claude Code vs Gemini CLI vs OpenCode

This tool supports **Claude Code**, **Gemini CLI**, and **OpenCode** for MCP server management. Here's a detailed comparison:

### Command Format Differences

| Feature | Claude Code | Gemini CLI | OpenCode |
|---------|-------------|------------|----------|
| **Add Local Server** | `claude mcp add-json <name> '<json>' -s <scope>` | `gemini mcp add --scope <scope> <name> <command> <args...>` | Direct config file edit |
| **Add Remote Server** | `claude mcp add --transport sse <name> <url>` | `gemini mcp add --transport http <name> <url>` | Direct config file edit |
| **List Servers** | `claude mcp list` | `gemini mcp list` | `opencode mcp list` |
| **Remove Server** | `claude mcp remove <name>` | `gemini mcp remove <name>` | Edit config file |
| **Default Transport** | `sse` (Server-Sent Events) | `http` (Streamable HTTP) | N/A |
| **Scope Flag** | `-s` or `--scope` | `--scope` (no short form) | N/A |
| **CLI Required** | Yes | Yes | **No** (writes directly to JSON) |

### Configuration File Locations

| Scope | Claude Code | Gemini CLI | OpenCode |
|-------|-------------|------------|----------|
| **User** | `~/.claude.json` or `~/.claude/settings.json` | `~/.gemini/settings.json` | `~/.config/opencode/opencode.json` |
| **Local** | `.claude/settings.local.json` | N/A | N/A |
| **Project** | `.mcp.json` (shared) | `.gemini/settings.json` (project root) | `./opencode.json` |

### Transport Types

| Transport | Claude Code | Gemini CLI | OpenCode | Description |
|-----------|-------------|------------|----------|-------------|
| **stdio** | Default for local | Default for local | `"type": "local"` | Standard input/output streams |
| **sse** | Default for remote | Supported | `"type": "remote"` | Server-Sent Events |
| **http** | Supported | Default for remote | `"type": "remote"` | Streamable HTTP |

### Scope Behavior

**Claude Code Scopes:**
- `user` - Available across all projects (recommended)
- `local` - Available only in current project (private)
- `project` - Shared with team via `.mcp.json` file

**Gemini CLI Scopes:**
- `user` - Available across all projects (default)
- `project` - Available only in current project

**OpenCode Scopes:**
- `user` - Global config at `~/.config/opencode/opencode.json` (recommended)
- `project` - Project-local config at `./opencode.json`
- ⚠️ **Note**: OpenCode does NOT support a `local` scope

### Example Commands

```bash
# === Adding a local MCP server ===

# Claude Code
claude mcp add-json my-server '{"command":"npx","args":["-y","@example/server"]}' -s user

# Gemini CLI
gemini mcp add --scope user my-server npx -y @example/server

# OpenCode (via mcp-auto-add - writes directly to config)
mcp-auto-add --json '{"command":"npx","args":["-y","@example/server"]}' --opencode

# === Adding a remote MCP server ===

# Claude Code (uses SSE by default)
claude mcp add --transport sse github-mcp https://api.github.com/mcp

# Gemini CLI (uses HTTP by default)
gemini mcp add --transport http github-mcp https://api.github.com/mcp

# OpenCode (via mcp-auto-add - writes directly to config)
mcp-auto-add --json '{"url":"https://api.github.com/mcp"}' --opencode
```

## 📝 Manual Configuration Guide

If you prefer to configure MCP servers manually without CLI commands, you can edit configuration files directly.

### Claude Code Configuration

**User-level configuration** (`~/.claude.json` or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "my-local-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": {
        "API_KEY": "your-api-key"
      }
    },
    "my-remote-server": {
      "url": "https://api.example.com/mcp",
      "transport": "sse"
    }
  }
}
```

**Project-level configuration** (`.mcp.json` in project root):

```json
{
  "mcpServers": {
    "project-server": {
      "command": "python",
      "args": ["./server.py"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

### Gemini CLI Configuration

**User-level configuration** (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### OpenCode Configuration

OpenCode uses a **different JSON structure** than Claude Code and Gemini CLI. The key differences are:
- Uses `"mcp"` key instead of `"mcpServers"`
- Commands are stored as a single array (not separate `command` and `args`)
- Has a `"type"` field: `"local"` or `"remote"`
- Has an `"enabled"` field for toggling servers on/off
- Uses `"environment"` instead of `"env"`

**User-level configuration** (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "mcp": {
    "filesystem": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/home"],
      "environment": {
        "LOG_LEVEL": "debug"
      }
    },
    "context7": {
      "type": "remote",
      "enabled": true,
      "url": "https://mcp.context7.com/mcp"
    },
    "github": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Project-level configuration** (`./opencode.json` in project root):

```json
{
  "mcp": {
    "project-tool": {
      "type": "local",
      "enabled": true,
      "command": ["python", "./tools/server.py"],
      "environment": {
        "PROJECT_ROOT": "${PWD}"
      }
    }
  }
}
```

**OpenCode Server Configuration Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"local"` \| `"remote"` | Yes | Server type |
| `enabled` | boolean | No | Toggle server on/off (default: true) |
| `command` | string[] | For local | Command + args as array |
| `url` | string | For remote | Server URL |
| `environment` | object | No | Environment variables |

### Configuration Schema

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "string (required for local servers)",
      "args": ["array", "of", "strings"],
      "env": {
        "KEY": "value"
      },
      "url": "string (required for remote servers)",
      "transport": "stdio | sse | http",
      "description": "optional description"
    }
  }
}
```

### Environment Variable Expansion

Both platforms support environment variable expansion in configuration:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["server.py"],
      "env": {
        "API_KEY": "${MY_API_KEY}",
        "HOME_DIR": "${HOME}/mcp"
      }
    }
  }
}
```

## 🛡️ Security Best Practices

### Input Validation

This tool implements several security measures:
- **Server name validation**: Only alphanumeric characters, hyphens, and underscores allowed
- **Path traversal protection**: Executable paths are validated
- **Command injection prevention**: Arguments are properly escaped
- **URL validation**: Remote server URLs are verified before use

### Authentication & Authorization

**For remote MCP servers:**
- Use OAuth 2.0 when available (recommended)
- Store API keys in environment variables, not in configuration files
- Use `${VAR_NAME}` syntax for sensitive values

**Example with environment variables:**

```bash
# Set API key in environment
export GITHUB_TOKEN="your-token-here"

# Configuration uses variable reference
{
  "mcpServers": {
    "github": {
      "url": "https://api.github.com/mcp",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Permission Scopes

- **User scope**: Best for personal tools and global utilities
- **Project scope**: Use for team-shared configurations (committed to Git)
- **Local scope** (Claude Code only): For sensitive or experimental configurations

### Security Checklist

- [ ] Store secrets in environment variables, not config files
- [ ] Use project scope only for non-sensitive configurations
- [ ] Validate server URLs before adding remote servers
- [ ] Review MCP server permissions before installation
- [ ] Keep MCP servers updated for security patches
- [ ] Use `--dry-run` to preview commands before execution

## 📖 Common MCP Servers

Here are some popular MCP servers you can add:

### File System Access

```bash
# Claude Code
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/path"]}'

# Gemini CLI
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/path"]}' --gemini
```

### GitHub Integration

```bash
# Using URL-based server
mcp-auto-add --json '{"url":"https://gitmcp.io/docs"}' --gemini
```

### Brave Search

```bash
mcp-auto-add --json '{"command":"npx","args":["-y","@anthropic/brave-search"],"env":{"BRAVE_API_KEY":"${BRAVE_API_KEY}"}}'
```

### Memory/Knowledge Graph

```bash
mcp-auto-add --json '{"command":"npx","args":["-y","@modelcontextprotocol/server-memory"]}'
```

## 🔧 Edit Mode

The edit mode allows you to quickly open and modify existing MCP configuration files:

```bash
# Open interactive editor
mcp-auto-add --edit

# Or use the command alias
mcp-auto-add edit
```

**Features:**
- Auto-discovers all MCP config files (user, local, project scopes)
- Lists all configured servers with command previews
- Opens editor directly at the selected server's line number
- Supports multiple editors (nano, vim, VS Code, emacs, sublime)
- Respects `EDITOR` environment variable

**Workflow:**
1. Run `mcp-auto-add --edit`
2. Select config file (if multiple exist)
3. Select server to edit from the list
4. Editor opens at the exact line of that server's configuration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Related Projects

- [Claude Code](https://claude.ai/download) - AI coding assistant by Anthropic
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - AI coding assistant by Google
- [OpenCode](https://opencode.ai) - Terminal-native open-source AI coding assistant
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Official MCP servers
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Build custom MCP servers
- [Context7 MCP](https://mcp.context7.com) - Library documentation server

## 👤 Author

**gyasis**

- GitHub: [@gyasis](https://github.com/gyasis)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to Anthropic for Claude Code and MCP
- Thanks to the open source community

---

**🎉 Transform your MCP development workflow with one command!**

If you find this tool helpful, please consider giving it a ⭐ on [GitHub](https://github.com/gyasis/mcp-auto-add)!