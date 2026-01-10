# Edit Command Feature

## Overview
The edit command provides an interactive way to edit specific MCP servers in your configuration files. It lists all configured servers, lets you select one, and opens your editor directly at that server's configuration line.

## Usage

### Basic Usage
```bash
# Interactive mode - select server to edit
mcp-auto-add edit

# Alternative syntax
mcp-auto-add --edit
```

## Features

### 1. **Automatic Config Discovery**
The command automatically finds all MCP configuration files:
- **User scope**: `~/.cursor/mcp.json` or `~/.claude/mcp.json`
- **Local scope**: `.cursor/mcp.json` or `.vscode/mcp.json`
- **Project scope**: `.mcp.json`

### 2. **Interactive Config Selection**
If multiple config files exist, you choose which one:
```
📁 Found 2 MCP configuration file(s)
? Which MCP configuration file?
  ❯ Cursor (user) (5 servers)
    Project (.mcp.json) (2 servers)
```

### 3. **Interactive Server Selection**
See all servers with their commands and select which one to edit:
```
🔧 Found 5 MCP servers:
? Which server would you like to edit?
  ❯ gemini-mcp - npx -y @gmcp/server
    tableau-mcp - npx -y @tableau/mcp-server
    atlassian-mcp - npx -y @atlassian/mcp
    filesystem - npx -y @modelcontextprotocol/server-filesys...
    snowflake-mcp - /usr/local/bin/node /path/to/build/index.js
```

### 4. **Direct Line Navigation**
The editor opens at the exact line where your selected server is defined:
```
📝 Opening gemini-mcp configuration...
📍 File: /home/user/.cursor/mcp.json
📄 Line: 15
✏️  Editor: nano
```

### 5. **Smart Editor Detection**
Supports line jumping for multiple editors:
- **nano**: `nano +15 file.json`
- **vim/vi/nvim**: `vim +15 file.json`
- **VS Code**: `code -g file.json:15`
- **Emacs**: `emacs +15 file.json`
- **Sublime**: `subl file.json:15`

Uses your preferred editor:
1. `$EDITOR` environment variable
2. Available common editors (nano, vim, vi, code, emacs)
3. Fallback to nano

Set your preferred editor:
```bash
export EDITOR=nano    # or vim, code, emacs, etc.
```

## Examples

### Example 1: Single config file workflow
```bash
$ mcp-auto-add edit
📝 MCP Configuration Editor
📁 Found 1 MCP configuration file(s)
📂 Using: Cursor (user)

🔧 Found 3 MCP servers:
? Which server would you like to edit?
  ❯ gemini-mcp - npx -y @gmcp/server
    tableau-mcp - npx -y @tableau/mcp-server
    atlassian-mcp - npx -y @atlassian/mcp

[User selects 'tableau-mcp']

📝 Opening tableau-mcp configuration...
📍 File: /home/user/.cursor/mcp.json
📄 Line: 23
✏️  Editor: nano

[nano opens at line 23, exactly where tableau-mcp is defined]
```

### Example 2: Multiple config files workflow
```bash
$ mcp-auto-add edit
📝 MCP Configuration Editor
📁 Found 3 MCP configuration file(s)
? Which MCP configuration file?
  ❯ Cursor (user) (5 servers)
    Cursor (local) (2 servers)
    Project (.mcp.json) (1 server)

[User selects 'Cursor (user)']

🔧 Found 5 MCP servers:
? Which server would you like to edit?
  ❯ gemini-mcp - npx -y @gmcp/server
    tableau-mcp - npx -y @tableau/mcp-server
    atlassian-mcp - npx -y @atlassian/mcp
    filesystem - npx -y @modelcontextprotocol/server-filesys...
    snowflake-mcp - /usr/local/bin/node /path/to/build/index.js

[User selects 'snowflake-mcp']

📝 Opening snowflake-mcp configuration...
📍 File: /home/user/.cursor/mcp.json
📄 Line: 45
✏️  Editor: nano

[nano opens at line 45]
```

### Example 3: Using VS Code as editor
```bash
$ export EDITOR=code
$ mcp-auto-add edit

📝 MCP Configuration Editor
📁 Found 1 MCP configuration file(s)
📂 Using: Cursor (user)

🔧 Found 3 MCP servers:
? Which server would you like to edit? gemini-mcp

📝 Opening gemini-mcp configuration...
📍 File: /home/user/.cursor/mcp.json
📄 Line: 15
✏️  Editor: code

[VS Code opens with cursor at line 15]
```

## Error Handling

### No config files found
```bash
$ mcp-auto-add edit
📝 MCP Configuration Editor
❌ No MCP configuration files found
💡 MCP config files are typically created when you add your first MCP server
💡 Run "mcp-auto-add" to add a server first
```

### Empty config file
```bash
$ mcp-auto-add edit
📝 MCP Configuration Editor
📁 Found 1 MCP configuration file(s)
📂 Using: Cursor (user)
ℹ️  No servers configured yet in this file
📝 Opening file for editing...

[Editor opens at beginning of file]
```

### Editor fails to open
```bash
❌ Failed to open editor: ...
💡 Try setting EDITOR environment variable
   Example: export EDITOR=nano
```

## Implementation Details

The edit command is implemented with four new functions:

1. **`findAllMCPConfigs()`** - Discovers all MCP config files across different scopes (user, local, project)

2. **`listServersInConfig(configPath)`** - Parses JSON config file and extracts:
   - Server names
   - Line numbers where each server is defined
   - Server configuration (command, args, etc.)

3. **`openEditorAtLine(editor, filePath, lineNumber)`** - Generates correct command syntax for different editors:
   - nano/vim/emacs: `+lineNumber` syntax
   - VS Code: `-g file:line` syntax
   - Sublime: `file:line` syntax
   - Fallback for unknown editors

4. **`handleEditMode()`** - Main workflow:
   - Find all config files
   - Let user select config (if multiple)
   - Parse and display servers
   - Let user select server
   - Open editor at exact line

### How Line Detection Works

The `listServersInConfig()` function:
1. Reads the config file as text
2. Parses it as JSON to get server names
3. Scans line-by-line to find where each server name appears
4. Matches pattern: `"server-name": {`
5. Stores 1-based line numbers for each server

This allows the editor to jump directly to the server definition instead of making you search through the entire file.
