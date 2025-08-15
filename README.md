# MCP Auto-Add 🚀

**Automatically detect MCP projects and add them to Claude Code with one command!**

This global Node.js package revolutionizes MCP development by automatically detecting your project type, generating the correct configuration, and adding it to Claude Code with a single command.

## ✨ Features

- **🔍 Auto-Detection**: Automatically detects Python, Node.js, or TypeScript MCP projects
- **🔧 Smart Configuration**: Generates the correct MCP configuration based on project structure
- **🎯 Interactive Prompts**: Choose scope (user/local/project) and customize server name
- **🧪 Path Validation**: Tests executable paths before adding to ensure they work
- **🚀 One-Command Setup**: Automatically runs `claude mcp add-json` to add servers to Claude Code
- **📦 Global Installation**: Install once, use anywhere in your environment
- **🔨 Build Integration**: Automatically builds TypeScript projects when needed
- **🌍 Environment Support**: Reads `.env` files and handles environment variables
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

```bash
# Navigate to any MCP project directory
cd /path/to/your/mcp-project

# Run the magic command
mcp-auto-add
```

That's it! The tool will:
1. 🔍 Detect your project type (Python/Node.js/TypeScript)
2. 🧪 Validate the executable paths
3. 🎯 Prompt for scope selection (defaults to "user")
4. 📝 Allow server name customization
5. 🔧 Generate the correct MCP configuration
6. 🚀 Automatically add it to Claude Code
7. ✅ Confirm success

## 📋 Command Line Options

```bash
mcp-auto-add [OPTIONS]

Options:
  -f, --force      Skip confirmation prompts and use defaults
  -v, --verbose    Show detailed verbose output
  -d, --dry-run    Show what would be done without executing
  -h, --help       Show help information
```

### Examples

```bash
# Interactive mode with prompts (recommended)
mcp-auto-add

# Force mode - auto-add with user scope, no prompts
mcp-auto-add --force

# Dry run - see what would be done without executing
mcp-auto-add --dry-run

# Verbose mode - detailed logging for debugging
mcp-auto-add --verbose

# Combine options
mcp-auto-add --dry-run --verbose
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
# Automatically uses:
# - user scope
# - directory name as server name
# - no confirmation prompts
mcp-auto-add --force
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