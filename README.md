# MCP Auto-Add 🚀

**Automatically detect MCP projects and add them to Claude Code with one command!**

This global Node.js package revolutionizes MCP development by automatically detecting your project type, generating the correct configuration, and adding it to Claude Code with a single command.

## ✨ Features

- **🔍 Auto-Detection**: Automatically detects Python, Node.js, or TypeScript MCP projects
- **🎯 Multiple Input Modes**: Interactive menu, auto-detect, clipboard, JSON paste, or file input
- **📋 Clipboard Integration**: Read JSON configurations directly from system clipboard
- **🔧 Smart Configuration**: Generates the correct MCP configuration based on project structure
- **🎯 Interactive Prompts**: Choose scope (user/local/project) and customize server name
- **🧪 Path Validation**: Tests executable paths before adding to ensure they work
- **🚀 One-Command Setup**: Automatically runs `claude mcp add-json` to add servers to Claude Code
- **📦 Global Installation**: Install once, use anywhere in your environment
- **🔨 Build Integration**: Automatically builds TypeScript projects when needed
- **🌍 Environment Support**: Reads `.env` files and handles environment variables
- **📤 Command Generation**: Generate ready-to-paste `claude mcp add-json` commands
- **🎨 Beautiful Output**: Colored, timestamped logging with progress indicators
- **🛡️ Production Ready**: Comprehensive error handling with actionable guidance

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

The tool supports three main usage patterns:

```bash
# 1. Interactive mode (default) - Shows menu with choices
mcp-auto-add

# 2. Auto-detect mode - Directly detects from current folder
cd /path/to/your/mcp-project
mcp-auto-add .

# 3. Clipboard mode - Reads JSON config from clipboard
mcp-auto-add --clipboard
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
  -g, --generate-command       Generate claude command and copy to clipboard
  -h, --help                   Show help information
```

### Examples

```bash
# Interactive mode - shows menu of choices (recommended)
mcp-auto-add

# Auto-detect mode - directly tries to detect from current folder
mcp-auto-add .

# Clipboard mode - reads JSON config from clipboard
mcp-auto-add --clipboard

# Direct JSON input
mcp-auto-add --json '{"command":"npx","args":["-y","gemini-mcp-tool"]}'

# JSON from file
mcp-auto-add --json-file ./mcp-config.json

# Generate command for clipboard (no execution)
mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --generate-command
mcp-auto-add --clipboard --generate-command

# Force mode options
mcp-auto-add --force            # Interactive with defaults
mcp-auto-add . --force          # Force auto-detect mode
mcp-auto-add --clipboard --force # Force clipboard mode

# Testing and debugging
mcp-auto-add --dry-run          # See what would be done
mcp-auto-add . --verbose        # Detailed logging with auto-detect
```

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

### Generate Commands for Later Use

```bash
# Generate command and copy to clipboard for manual execution
$ mcp-auto-add --clipboard --generate-command

[2025-08-15T14:30:00.000Z] 📋 Reading JSON configuration from clipboard...
[2025-08-15T14:30:00.000Z] ✅ Successfully read content from clipboard
[2025-08-15T14:30:00.000Z] 📋 Generated Claude MCP command:

claude mcp add-json gitmcp '{"url":"https://gitmcp.io/docs"}' -s user

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Related Projects

- [Claude Code](https://claude.ai/download) - AI coding assistant
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Official MCP servers

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