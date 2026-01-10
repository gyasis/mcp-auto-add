#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

// CLI arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose') || args.includes('-v');
const isForce = args.includes('--force') || args.includes('-f');
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const showHelp = args.includes('--help') || args.includes('-h');
const generateCommand = args.includes('--generate-command') || args.includes('-g');
const useClipboard = args.includes('--clipboard') || args.includes('-c');
const editMode = args.includes('--edit') || args.includes('-e') || args[0] === 'edit';
const useGemini = args.includes('--gemini') || args.includes('--g');

// Input mode detection
const jsonFlagIndex = args.findIndex(arg => arg === '--json' || arg === '-j');
const jsonFileFlagIndex = args.findIndex(arg => arg === '--json-file' || arg === '-jf');
const jsonInput = jsonFlagIndex !== -1 && args[jsonFlagIndex + 1] ? args[jsonFlagIndex + 1] : null;
const jsonFileInput = jsonFileFlagIndex !== -1 && args[jsonFileFlagIndex + 1] ? args[jsonFileFlagIndex + 1] : null;
const autoDetectMode = args.includes('.');

// Show help and exit if requested
if (showHelp) {
    console.log(`
🚀 MCP Auto-Add - Automatically detect and add MCP servers to Claude Code or Gemini CLI

USAGE:
    mcp-auto-add [OPTIONS]              # Interactive mode with menu
    mcp-auto-add . [OPTIONS]            # Auto-detect from current folder
    mcp-auto-add edit                   # Edit MCP servers (interactive selection)
    mcp-auto-add --clipboard [OPTIONS]  # Read JSON from clipboard
    mcp-auto-add --json '<config>' [OPTIONS]      # Direct JSON input
    mcp-auto-add --json-file <path> [OPTIONS]     # JSON from file

OPTIONS:
    -f, --force                  Skip confirmation prompts and use defaults
    -v, --verbose                Show detailed verbose output
    -d, --dry-run                Show what would be done without executing
    -j, --json <config>          Provide JSON configuration directly
    -jf, --json-file <path>      Read JSON configuration from file
    -c, --clipboard              Read JSON configuration from clipboard
    -g, --generate-command       Generate claude/gemini command and copy to clipboard
    --gemini, --g                Use Gemini CLI instead of Claude Code
    -e, --edit                   Edit MCP configuration file
    -h, --help                   Show this help message

EXAMPLES:
    # Interactive mode - shows menu of choices (default)
    mcp-auto-add

    # Auto-detect mode - directly tries to detect from current folder
    mcp-auto-add .

    # Edit mode - interactive server selection
    mcp-auto-add edit              # List all servers, select one to edit
    mcp-auto-add --edit            # Same as 'mcp-auto-add edit'

    # Clipboard mode - reads JSON config from clipboard
    mcp-auto-add --clipboard
    
    # Direct JSON input
    mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}'
    
    # Use Gemini CLI instead of Claude
    mcp-auto-add --gemini .
    mcp-auto-add --gemini --clipboard
    mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --gemini
    
    # JSON from file
    mcp-auto-add --json-file ./mcp-config.json
    
    # Wrapped JSON format (copied from Claude settings)
    mcp-auto-add --json '{"gitmcp":{"url":"https://gitmcp.io/docs"}}'
    
    # Generate command for clipboard (no execution)
    mcp-auto-add --json '{"command":"npx","args":["-y","tool"]}' --generate-command
    mcp-auto-add --clipboard --generate-command
    
    # Force mode options
    mcp-auto-add --force            # Auto-add with user scope (no prompts)
    mcp-auto-add . --force          # Force auto-detect mode
    mcp-auto-add --clipboard --force # Force clipboard mode
    
    # Testing and debugging
    mcp-auto-add --dry-run          # See what would be done
    mcp-auto-add . --verbose        # Detailed logging with auto-detect

PROJECT DETECTION:
    Python      - pyproject.toml, requirements.txt, or setup.py
    TypeScript  - package.json + tsconfig.json  
    Node.js     - package.json (without tsconfig.json)

SCOPES:
    user        - Available across all your projects (default)
    local       - Available only in current project
    project     - Shared with team via .mcp.json file

REQUIREMENTS:
    - Claude Code CLI installed and in PATH (or use --gemini flag)
    - For Gemini CLI: npm install -g @google/gemini-cli
    - For Python: uv package manager and .venv environment
    - For TypeScript: Build tools (npm/yarn/pnpm/bun)

For more information, visit: https://github.com/gyasis/mcp-auto-add
`);
    process.exit(0);
}

// Colors for output
const colors = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    title: chalk.cyan.bold
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = colors[type] || colors.info;
    console.log(`[${timestamp}] ${color(message)}`);
}

function logVerbose(message) {
    if (isVerbose) {
        log(message, 'info');
    }
}

// ==========================================
// SECURITY: Input Validation Functions
// ==========================================

// Validate server name - only allow safe characters
function validateServerName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Server name is required');
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new Error('Server name cannot be empty');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        throw new Error('Server name can only contain letters, numbers, hyphens, and underscores');
    }
    if (trimmed.length > 64) {
        throw new Error('Server name exceeds maximum length (64 characters)');
    }
    return trimmed;
}

// Validate transport type
function validateTransport(transport) {
    const validTransports = ['sse', 'http', 'stdio'];
    if (transport && !validTransports.includes(transport)) {
        throw new Error(`Invalid transport type: ${transport}. Valid types: ${validTransports.join(', ')}`);
    }
    return transport || 'sse';  // Default to sse for Claude
}

// Validate scope
function validateScope(scope) {
    const validScopes = ['user', 'local', 'project'];
    if (scope && !validScopes.includes(scope)) {
        throw new Error(`Invalid scope: ${scope}. Valid scopes: ${validScopes.join(', ')}`);
    }
    return scope || 'user';
}

// Validate URL format
function validateURL(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('URL is required');
    }
    // Must start with http:// or https://
    if (!/^https?:\/\//i.test(url)) {
        throw new Error('URL must start with http:// or https://');
    }
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid URL protocol');
        }
        return url;
    } catch (e) {
        throw new Error('Invalid URL format');
    }
}

// Shell-safe escaping using single quotes (prevents all shell interpretation)
function shellEscape(arg) {
    if (!arg || typeof arg !== 'string') return "''";
    // Use single quotes and escape single quotes within
    return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
}

// Cross-platform executable finder
function findExecutable(name) {
    const isWindows = process.platform === 'win32';
    try {
        const cmd = isWindows ? `where ${name}` : `which ${name}`;
        return execSync(cmd, { encoding: 'utf8' }).trim().split('\n')[0];
    } catch (error) {
        return null;
    }
}

// Get current working directory
const cwd = process.cwd();
const projectName = path.basename(cwd);

const cliTarget = useGemini ? 'Gemini CLI' : 'Claude Code';
log(`🚀 MCP Auto-Add - Automatically adding MCP server to ${cliTarget}`, 'title');
log(`📁 Working directory: ${cwd}`, 'info');
log(`📦 Project name: ${projectName}`, 'info');

// Function to detect project type
function detectProjectType() {
    logVerbose('🔍 Detecting project type...');
    
    // Check for explicit PROJECT_TYPE environment variable
    if (process.env.PROJECT_TYPE) {
        logVerbose(`Found PROJECT_TYPE environment variable: ${process.env.PROJECT_TYPE}`);
        return process.env.PROJECT_TYPE;
    }
    
    // Auto-detect based on files
    if (fs.existsSync(path.join(cwd, 'pyproject.toml')) || 
        fs.existsSync(path.join(cwd, 'requirements.txt')) || 
        fs.existsSync(path.join(cwd, 'setup.py'))) {
        logVerbose('Detected Python project');
        return 'python';
    } else if (fs.existsSync(path.join(cwd, 'package.json'))) {
        if (fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
            logVerbose('Detected TypeScript project');
            return 'typescript';
        } else {
            logVerbose('Detected Node.js project');
            return 'node';
        }
    }
    
    logVerbose('Could not detect project type');
    return '';
}

// Function to find Node executable
function findNodeExecutable() {
    logVerbose('🔍 Finding Node.js executable...');
    
    // First, check if 'node' is available in PATH (preferred for portability)
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        if (nodeVersion) {
            logVerbose(`Found Node.js in PATH: ${nodeVersion}`);
            // If node is in PATH, prefer using just 'node' for portability
            // Only use absolute path if we need to specify a particular version
            try {
                const whichNode = execSync('which node', { encoding: 'utf8' }).trim();
                if (whichNode) {
                    logVerbose(`Node.js command is at: ${whichNode}`);
                    // Check if it's an nvm path - if so, we might want absolute path
                    // But prefer 'node' if it's already in PATH (nvm sets up PATH)
                    return 'node'; // Use command name for portability
                }
            } catch (error) {
                logVerbose('Could not determine node location');
            }
            return 'node'; // Use command name if available in PATH
        }
    } catch (error) {
        logVerbose('Node.js not available in PATH');
    }
    
    // If not in PATH, try to find absolute path
    try {
        const nodeExec = execSync('which node', { encoding: 'utf8' }).trim();
        if (nodeExec && fs.existsSync(nodeExec)) {
            logVerbose(`Found Node.js at: ${nodeExec}`);
            return nodeExec;
        }
    } catch (error) {
        logVerbose('Node.js not found with "which node"');
    }
    
    // Try nvm to get the active version path
    try {
        // Source nvm if available and get node path
        const nvmNode = execSync('bash -c "source ~/.nvm/nvm.sh && nvm which node"', { encoding: 'utf8' }).trim();
        if (nvmNode && fs.existsSync(nvmNode)) {
            logVerbose(`Found Node.js with nvm at: ${nvmNode}`);
            return nvmNode;
        }
    } catch (error) {
        try {
            // Alternative: direct nvm command if nvm is loaded
            const nodeExec = execSync('nvm which node', { encoding: 'utf8' }).trim();
            if (nodeExec && fs.existsSync(nodeExec)) {
                logVerbose(`Found Node.js with nvm at: ${nodeExec}`);
                return nodeExec;
            }
        } catch (error2) {
            logVerbose('Node.js not found with nvm');
        }
    }
    
    // Try common locations using environment variables
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const commonPaths = [
        '/usr/local/bin/node',
        '/usr/bin/node'
    ];
    
    // Try to find nvm node versions dynamically
    if (home) {
        try {
            const nvmVersionsDir = path.join(home, '.nvm', 'versions', 'node');
            if (fs.existsSync(nvmVersionsDir)) {
                const versions = fs.readdirSync(nvmVersionsDir);
                if (versions.length > 0) {
                    // Get the latest or use NVM_CURRENT if set
                    const currentVersion = process.env.NVM_CURRENT || versions[versions.length - 1];
                    const nodePath = path.join(nvmVersionsDir, currentVersion, 'bin', 'node');
                    if (fs.existsSync(nodePath)) {
                        logVerbose(`Found Node.js in nvm at: ${nodePath}`);
                        return nodePath;
                    }
                }
            }
        } catch (error) {
            logVerbose('Could not scan nvm versions directory');
        }
    }
    
    for (const nodePath of commonPaths) {
        if (fs.existsSync(nodePath)) {
            logVerbose(`Found Node.js at: ${nodePath}`);
            return nodePath;
        }
    }
    
    logVerbose('Node.js not found in common locations');
    return '';
}

// Function to detect Claude Code installation location
function findClaudeCodeInstallation() {
    logVerbose('🔍 Finding Claude Code installation...');
    
    // Try to find claude command in PATH
    try {
        const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
        if (claudePath && fs.existsSync(claudePath)) {
            logVerbose(`Found Claude CLI at: ${claudePath}`);
            return claudePath;
        }
    } catch (error) {
        logVerbose('Claude CLI not found in PATH');
    }
    
    // Try common installation locations
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const commonPaths = [
        path.join(home, '.local', 'bin', 'claude'),
        path.join(home, 'bin', 'claude'),
        '/usr/local/bin/claude',
        '/usr/bin/claude'
    ];
    
    for (const claudePath of commonPaths) {
        if (fs.existsSync(claudePath)) {
            logVerbose(`Found Claude CLI at: ${claudePath}`);
            return claudePath;
        }
    }
    
    logVerbose('Claude Code installation not found in common locations');
    return '';
}

// Function to detect MCP config file location based on scope
function findMCPConfigPath(scope = 'user') {
    logVerbose(`🔍 Finding MCP config file for scope: ${scope}...`);
    
    const home = process.env.HOME || process.env.USERPROFILE || '';
    
    if (scope === 'user') {
        // User scope: ~/.cursor/mcp.json or ~/.claude/mcp.json
        const userPaths = [
            path.join(home, '.cursor', 'mcp.json'),
            path.join(home, '.claude', 'mcp.json')
        ];
        
        for (const configPath of userPaths) {
            if (fs.existsSync(path.dirname(configPath))) {
                logVerbose(`User MCP config will be at: ${configPath}`);
                return configPath;
            }
        }
        
        // Default to .cursor if neither exists
        const defaultPath = path.join(home, '.cursor', 'mcp.json');
        logVerbose(`User MCP config will be created at: ${defaultPath}`);
        return defaultPath;
    } else if (scope === 'local') {
        // Local scope: .cursor/mcp.json or .vscode/mcp.json in project directory
        const localPaths = [
            path.join(cwd, '.cursor', 'mcp.json'),
            path.join(cwd, '.vscode', 'mcp.json')
        ];
        
        for (const configPath of localPaths) {
            if (fs.existsSync(path.dirname(configPath))) {
                logVerbose(`Local MCP config found at: ${configPath}`);
                return configPath;
            }
        }
        
        // Default to .cursor if neither exists
        const defaultPath = path.join(cwd, '.cursor', 'mcp.json');
        logVerbose(`Local MCP config will be created at: ${defaultPath}`);
        return defaultPath;
    } else if (scope === 'project') {
        // Project scope: .mcp.json in project root
        const projectPath = path.join(cwd, '.mcp.json');
        logVerbose(`Project MCP config will be at: ${projectPath}`);
        return projectPath;
    }
    
    // Default fallback
    return path.join(home, '.cursor', 'mcp.json');
}

// Function to check if package is installed globally
function isGlobalPackage(pkgName) {
    logVerbose(`🔍 Checking if ${pkgName} is a global package...`);
    
    // Check if we're in the package's own directory
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
            if (packageJson.name === pkgName) {
                logVerbose(`${pkgName} is not a global package (we're in its directory)`);
                return false;
            }
        } catch (error) {
            logVerbose('Error reading package.json');
        }
    }
    
    try {
        execSync(`npm list -g ${pkgName}`, { stdio: 'ignore' });
        logVerbose(`${pkgName} is a global package`);
        return true;
    } catch (error) {
        logVerbose(`${pkgName} is not a global package`);
        return false;
    }
}

// Function to read environment variables from .env file
function readEnvFile() {
    logVerbose('🔍 Reading environment variables from .env file...');
    
    const envPath = path.join(cwd, '.env');
    if (!fs.existsSync(envPath)) {
        logVerbose('No .env file found');
        return {};
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (match) {
            envVars[match[1]] = match[2];
        }
    });
    
    logVerbose(`Found ${Object.keys(envVars).length} environment variables`);
    return envVars;
}

// Function to build TypeScript project
function buildTypeScriptProject() {
    logVerbose('🔨 Building TypeScript project...');
    
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
        log('No package.json found, skipping build', 'warning');
        return false;
    }
    
    try {
        const currentDir = process.cwd();
        process.chdir(cwd);
        
        let buildCommand = 'npm run build';
        
        if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
            buildCommand = 'bun run build';
        } else if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
            buildCommand = 'pnpm build';
        } else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
            buildCommand = 'yarn build';
        }
        
        log(`Running build command: ${buildCommand}`, 'info');
        execSync(buildCommand, { stdio: 'inherit' });
        
        process.chdir(currentDir);
        log('✅ TypeScript build completed successfully', 'success');
        return true;
    } catch (error) {
        log('❌ TypeScript build failed', 'error');
        log(`Error: ${error.message}`, 'error');
        return false;
    }
}

// Function to parse JSON configuration from various formats
function parseJSONConfig(jsonStr, serverName = null) {
    let parsed;
    
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error) {
        // Try to fix common JSON fragment issues
        let fixedJson = jsonStr.trim();
        
        // Check if it looks like a JSON fragment (starts with a key)
        if (fixedJson.match(/^"[^"]+"\s*:\s*\{/) || fixedJson.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*\{/)) {
            // This looks like a JSON fragment, wrap it in braces
            fixedJson = `{${fixedJson}}`;
            log('🔧 Detected JSON fragment, attempting to wrap in braces...', 'info');
            
            try {
                parsed = JSON.parse(fixedJson);
                log('✅ Successfully parsed JSON fragment', 'success');
            } catch (secondError) {
                throw new Error(`Invalid JSON configuration: ${error.message}. Also tried wrapping as fragment: ${secondError.message}`);
            }
        } else {
            throw new Error(`Invalid JSON configuration: ${error.message}`);
        }
    }
    
    try {
        
        // Check if this is a wrapped format like {"server-name": { config }}
        const keys = Object.keys(parsed);
        if (keys.length === 1 && !parsed.command && !parsed.url && typeof parsed[keys[0]] === 'object') {
            // This looks like a wrapper format
            const extractedServerName = keys[0];
            const innerConfig = parsed[extractedServerName];
            
            log(`📦 Detected wrapped JSON format with server name: "${extractedServerName}"`, 'info');
            
            // Recursively parse the inner configuration
            const config = parseJSONConfig(JSON.stringify(innerConfig), extractedServerName);
            // Ensure extractedServerName is preserved from wrapper
            config.extractedServerName = extractedServerName;
            return config;
        }
        
        // Handle URL-based configuration (like gitmcp)
        if (parsed.url) {
            log('📌 Detected URL-based MCP configuration', 'info');
            const config = {
                url: parsed.url,
                description: parsed.description || `URL-based MCP server: ${parsed.url}`,
                name: parsed.name || serverName,
                isUrlBased: true,
                transport: parsed.transport || 'sse' // Default to SSE transport
            };
            // Preserve the extracted server name if provided
            if (serverName) {
                config.extractedServerName = serverName;
            }
            return config;
        }
        
        // Handle standard command-based configuration
        const config = {
            command: parsed.command,
            args: parsed.args || [],
            env: parsed.env || {},
            description: parsed.description || parsed.name || 'MCP server from JSON',
            cwd: parsed.cwd,
            enabled: parsed.enabled !== false
        };
        
        // Clean up undefined values
        Object.keys(config).forEach(key => {
            if (config[key] === undefined) {
                delete config[key];
            }
        });
        
        return config;
    } catch (error) {
        throw new Error(`Invalid JSON configuration: ${error.message}`);
    }
}

// Function to read JSON from file
function readJSONFromFile(filePath) {
    try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`JSON file not found: ${absolutePath}`);
        }
        
        const content = fs.readFileSync(absolutePath, 'utf8');
        return content;
    } catch (error) {
        throw new Error(`Failed to read JSON file: ${error.message}`);
    }
}

// Function to prompt for JSON input interactively
async function promptForJSONInput() {
    const { inputMethod } = await inquirer.prompt([
        {
            type: 'list',
            name: 'inputMethod',
            message: 'How would you like to input the JSON?',
            choices: [
                { name: 'Type/paste in terminal (single or multi-line)', value: 'input' },
                { name: 'Open nano editor', value: 'nano' },
                { name: 'Open default editor', value: 'editor' }
            ],
            default: 'input'
        }
    ]);
    
    if (inputMethod === 'input') {
        console.log(chalk.cyan('\n📋 Paste your JSON configuration below. Press Enter when done:\n'));
        
        const { jsonConfig } = await inquirer.prompt([
            {
                type: 'input',
                name: 'jsonConfig',
                message: 'JSON:',
                validate: (input) => {
                    if (!input || input.trim().length === 0) {
                        return 'JSON configuration cannot be empty';
                    }
                    try {
                        JSON.parse(input);
                        return true;
                    } catch (error) {
                        return `Invalid JSON: ${error.message}`;
                    }
                }
            }
        ]);
        
        return jsonConfig;
    } else if (inputMethod === 'nano') {
        const { jsonConfig } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'jsonConfig',
                message: 'JSON configuration (will open nano):',
                default: '{\n  "command": "",\n  "args": [],\n  "env": {}\n}',
                validate: (input) => {
                    if (!input || input.trim().length === 0) {
                        return 'JSON configuration cannot be empty';
                    }
                    try {
                        JSON.parse(input);
                        return true;
                    } catch (error) {
                        return `Invalid JSON: ${error.message}`;
                    }
                },
                waitUserInput: false,
                env: {
                    EDITOR: 'nano'
                }
            }
        ]);
        
        return jsonConfig;
    } else {
        const { jsonConfig } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'jsonConfig',
                message: 'JSON configuration (will open default editor):',
                default: '{\n  "command": "",\n  "args": [],\n  "env": {}\n}',
                validate: (input) => {
                    if (!input || input.trim().length === 0) {
                        return 'JSON configuration cannot be empty';
                    }
                    try {
                        JSON.parse(input);
                        return true;
                    } catch (error) {
                        return `Invalid JSON: ${error.message}`;
                    }
                }
            }
        ]);
        
        return jsonConfig;
    }
}

// Function to generate MCP configuration from JSON
function generateMCPConfigFromJSON(jsonStr, serverName = null) {
    log('🔧 Generating MCP configuration from JSON...', 'info');
    
    const config = parseJSONConfig(jsonStr, serverName);
    
    if (config.url) {
        // URL-based configuration needs special handling
        log('📌 URL-based configuration detected', 'info');
        log(`URL: ${config.url}`, 'info');
        
        // For URL-based configs, we'll create a special format
        return {
            url: config.url,
            description: config.description,
            name: config.name,
            extractedServerName: config.extractedServerName, // Preserve extracted server name
            transport: config.transport,
            isUrlBased: true
        };
    }
    
    log('✅ MCP configuration parsed from JSON successfully', 'success');
    logVerbose(`Command: ${config.command}`);
    logVerbose(`Args: ${JSON.stringify(config.args)}`);
    logVerbose(`Environment variables: ${Object.keys(config.env || {}).length} found`);
    
    return config;
}

// Function to generate MCP configuration
function generateMCPConfig() {
    log('🔧 Generating MCP configuration...', 'info');
    
    // Detect project type
    const projectType = detectProjectType();
    if (!projectType) {
        throw new Error('Could not detect project type. Please specify with PROJECT_TYPE environment variable.');
    }
    
    log(`📦 Detected project type: ${projectType}`, 'info');
    
    let command = '';
    let args = [];
    let description = '';
    let envVars = {};
    
    if (projectType === 'python') {
        // Python project configuration
        description = 'Python MCP server';
        
        // Check if uv is available
        try {
            execSync('uv --version', { stdio: 'ignore' });
        } catch (error) {
            throw new Error('uv is not installed. Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh');
        }
        
        // Define absolute paths
        const pythonExec = path.join(cwd, '.venv', 'bin', 'python');
        const serverScript = path.join(cwd, 'server.py');
        
        // Check if the virtual environment's Python executable exists
        if (!fs.existsSync(pythonExec)) {
            throw new Error(`Python executable not found at ${pythonExec}. Please ensure the virtual environment is created and synced. Run: uv venv && uv sync`);
        }
        
        // Check if server file exists
        if (!fs.existsSync(serverScript)) {
            throw new Error(`Server file not found at ${serverScript}`);
        }
        
        command = pythonExec;
        args = [serverScript];
        
    } else {
        // Node/TypeScript project configuration
        description = projectType === 'typescript' ? 'TypeScript MCP server' : 'Node.js MCP server';
        
        // Check if this is a global package
        if (isGlobalPackage(projectName)) {
            // Global package - use the command directly
            command = projectName;
            args = [];
        } else {
            // Local project - find node executable
            const nodeExec = findNodeExecutable();
            if (!nodeExec) {
                throw new Error('Could not find Node.js executable. Please ensure Node.js is installed.');
            }
            
            // Build TypeScript if needed
            if (projectType === 'typescript' && !isDryRun) {
                if (!buildTypeScriptProject()) {
                    throw new Error('TypeScript build failed. Please fix build issues before continuing.');
                }
            }
            
            // Check if entry file exists
            const entryFile = 'build/index.js';
            const entryPath = path.join(cwd, entryFile);
            if (!fs.existsSync(entryPath)) {
                if (projectType === 'typescript') {
                    throw new Error(`Entry file not found at ${entryPath}. Make sure to build the project first with 'npm run build' or similar.`);
                } else {
                    throw new Error(`Entry file not found at ${entryPath}`);
                }
            }
            
            command = nodeExec;
            args = [entryPath];
        }
    }
    
    // Read description from package.json if available
    if (fs.existsSync(path.join(cwd, 'package.json')) && projectType !== 'python') {
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
            if (packageJson.description) {
                description = packageJson.description;
            }
        } catch (error) {
            logVerbose('Error reading package.json description');
        }
    }
    
    // Read environment variables
    envVars = readEnvFile();
    
    // Generate the configuration JSON
    const config = {
        command: command,
        args: args,
        env: envVars,
        description: description
    };
    
    log('✅ MCP configuration generated successfully', 'success');
    logVerbose(`Command: ${command}`);
    logVerbose(`Args: ${JSON.stringify(args)}`);
    logVerbose(`Environment variables: ${Object.keys(envVars).length} found`);
    
    return config;
}

// Function to copy text to clipboard (SECURE: uses spawnSync with stdin, no shell interpolation)
function copyToClipboard(text) {
    // Try xclip first (most common on Linux)
    try {
        const result = spawnSync('xclip', ['-selection', 'clipboard'], {
            input: text,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        if (result.status === 0) return 'xclip';
    } catch (error) { /* continue to next method */ }

    // Try xsel as fallback
    try {
        const result = spawnSync('xsel', ['--clipboard', '--input'], {
            input: text,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        if (result.status === 0) return 'xsel';
    } catch (error) { /* continue to next method */ }

    // Try pbcopy on macOS
    try {
        const result = spawnSync('pbcopy', [], {
            input: text,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        if (result.status === 0) return 'pbcopy';
    } catch (error) { /* continue to next method */ }

    return null;
}

// Function to read text from clipboard
function readFromClipboard() {
    try {
        // Try xclip first (most common on Linux)
        const content = execSync('xclip -selection clipboard -o', { encoding: 'utf8' });
        return content;
    } catch (error) {
        try {
            // Try xsel as fallback
            const content = execSync('xsel --clipboard --output', { encoding: 'utf8' });
            return content;
        } catch (error) {
            try {
                // Try pbpaste on macOS
                const content = execSync('pbpaste', { encoding: 'utf8' });
                return content;
            } catch (error) {
                throw new Error('Could not read from clipboard. Please install xclip, xsel, or use macOS pbpaste.');
            }
        }
    }
}

// Function to generate claude command string
function generateClaudeCommand(config, serverName, scope = 'user') {
    // Create clean config for JSON (remove our added properties)
    const cleanConfig = {
        command: config.command,
        args: config.args,
        env: config.env,
        description: config.description
    };
    
    // Clean up undefined values
    Object.keys(cleanConfig).forEach(key => {
        if (cleanConfig[key] === undefined) {
            delete cleanConfig[key];
        }
    });
    
    const configJson = JSON.stringify(cleanConfig);
    const command = `claude mcp add-json ${serverName} '${configJson}' -s ${scope}`;
    
    return command;
}

// Function to execute claude mcp add command for URL-based servers
async function executeClaudeMCPAddURL(config, serverName, scope = 'user') {
    log('🚀 Executing Claude MCP add command for URL-based server...', 'info');
    
    const transport = config.transport || 'sse';
    const command = `claude mcp add --transport ${transport} ${serverName} ${config.url}`;
    
    logVerbose(`Full command: ${command}`);
    
    if (isDryRun) {
        log('🔍 DRY RUN - Command would be executed:', 'warning');
        log(command, 'info');
        log('🔍 URL Configuration:', 'info');
        log(`  Server Name: ${serverName}`, 'info');
        log(`  URL: ${config.url}`, 'info');
        log(`  Transport: ${transport}`, 'info');
        log(`  Scope: ${scope}`, 'info');
        return true;
    }
    
    try {
        // Check if claude command is available and detect installation location
        log('🔍 Checking Claude CLI availability...', 'info');
        const claudePath = findClaudeCodeInstallation();
        if (claudePath) {
            logVerbose(`✅ Claude CLI found at: ${claudePath}`);
        } else {
            try {
                execSync('claude --version', { stdio: 'ignore' });
                logVerbose('✅ Claude CLI is available in PATH');
            } catch (error) {
                throw new Error('Claude CLI is not installed or not in PATH. Please install Claude Code first.\nInstall from: https://claude.ai/download');
            }
        }
        
        // Detect and log MCP config file location
        const configPath = findMCPConfigPath(scope);
        logVerbose(`📝 MCP config will be written to: ${configPath}`);
    } catch (error) {
        throw new Error('Claude CLI is not installed or not in PATH. Please install Claude Code first.\nInstall from: https://claude.ai/download');
    }
    
    try {
        log(`📤 Adding URL-based MCP server "${serverName}" with ${transport.toUpperCase()} transport...`, 'info');
        const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
        
        // Parse result for success/error indicators
        if (result.includes('error') || result.includes('Error') || result.includes('failed')) {
            log('❌ Claude MCP command completed with errors:', 'error');
            log(result, 'error');
            return false;
        }
        
        log(`✅ URL-based MCP server added to Claude Code successfully!`, 'success');
        if (result && result.trim()) {
            logVerbose(`Claude output: ${result.trim()}`);
        }
        return true;
    } catch (error) {
        log('❌ Failed to add URL-based MCP server to Claude Code', 'error');
        
        // Enhanced error reporting
        if (error.status) {
            log(`Exit code: ${error.status}`, 'error');
        }
        if (error.stderr) {
            log(`STDERR: ${error.stderr}`, 'error');
        }
        if (error.stdout) {
            log(`STDOUT: ${error.stdout}`, 'error');
        }
        
        // Common error scenarios for URL servers
        const errorMsg = error.message || '';
        if (errorMsg.includes('Command failed')) {
            log('💡 This might be due to:', 'warning');
            log('  - Invalid URL format', 'warning');
            log('  - Server name already exists', 'warning');
            log('  - Network connectivity issues', 'warning');
            log('  - Invalid transport type', 'warning');
            
            // Suggest troubleshooting steps
            log('🔧 Try these troubleshooting steps:', 'info');
            log('  1. Verify the URL is accessible', 'info');
            log('  2. Try a different server name', 'info');
            log('  3. Check your internet connection', 'info');
            log('  4. Run "claude mcp list" to see existing servers', 'info');
        }
        
        log(`Detailed error: ${error.message}`, 'error');
        return false;
    }
}

// Function to execute claude mcp add-json command
async function executeClaudeMCPAdd(config, serverName, scope = 'user') {
    log('🚀 Executing Claude MCP add-json command...', 'info');
    
    // Create clean config for JSON (remove our added properties)
    const cleanConfig = {
        command: config.command,
        args: config.args,
        env: config.env,
        description: config.description
    };
    
    const configJson = JSON.stringify(cleanConfig);
    const command = `claude mcp add-json ${serverName} '${configJson}' -s ${scope}`;
    
    logVerbose(`Full command: ${command}`);
    
    if (isDryRun) {
        log('🔍 DRY RUN - Command would be executed:', 'warning');
        log(command, 'info');
        log('🔍 JSON Configuration:', 'info');
        log(JSON.stringify(cleanConfig, null, 2), 'info');
        return true;
    }
    
    try {
        // Check if claude command is available and detect installation location
        log('🔍 Checking Claude CLI availability...', 'info');
        const claudePath = findClaudeCodeInstallation();
        if (claudePath) {
            logVerbose(`✅ Claude CLI found at: ${claudePath}`);
        } else {
            try {
                execSync('claude --version', { stdio: 'ignore' });
                logVerbose('✅ Claude CLI is available in PATH');
            } catch (error) {
                throw new Error('Claude CLI is not installed or not in PATH. Please install Claude Code first.\nInstall from: https://claude.ai/download');
            }
        }
        
        // Detect and log MCP config file location
        const configPath = findMCPConfigPath(scope);
        logVerbose(`📝 MCP config will be written to: ${configPath}`);
    } catch (error) {
        throw new Error('Claude CLI is not installed or not in PATH. Please install Claude Code first.\nInstall from: https://claude.ai/download');
    }
    
    try {
        log(`📤 Adding MCP server "${serverName}" with scope "${scope}"...`, 'info');
        const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
        
        // Parse result for success/error indicators
        if (result.includes('error') || result.includes('Error') || result.includes('failed')) {
            log('❌ Claude MCP command completed with errors:', 'error');
            log(result, 'error');
            return false;
        }
        
        log('✅ MCP server added to Claude Code successfully!', 'success');
        if (result && result.trim()) {
            logVerbose(`Claude output: ${result.trim()}`);
        }
        return true;
    } catch (error) {
        log('❌ Failed to add MCP server to Claude Code', 'error');
        
        // Enhanced error reporting
        if (error.status) {
            log(`Exit code: ${error.status}`, 'error');
        }
        if (error.stderr) {
            log(`STDERR: ${error.stderr}`, 'error');
        }
        if (error.stdout) {
            log(`STDOUT: ${error.stdout}`, 'error');
        }
        
        // Common error scenarios
        const errorMsg = error.message || '';
        if (errorMsg.includes('Command failed')) {
            log('💡 This might be due to:', 'warning');
            log('  - Invalid JSON configuration', 'warning');
            log('  - Server name already exists', 'warning');
            log('  - Insufficient permissions', 'warning');
            log('  - Invalid scope specified', 'warning');
            
            // Suggest troubleshooting steps
            log('🔧 Try these troubleshooting steps:', 'info');
            log('  1. Run with --verbose to see the full command', 'info');
            log('  2. Try a different server name', 'info');
            log('  3. Check your Claude Code installation', 'info');
            log('  4. Run "claude mcp list" to see existing servers', 'info');
        }
        
        log(`Detailed error: ${error.message}`, 'error');
        return false;
    }
}

// ============================================================================
// GEMINI CLI FUNCTIONS
// ============================================================================

// Function to find Gemini CLI installation
function findGeminiCLIInstallation() {
    logVerbose('🔍 Finding Gemini CLI installation...');

    // Try to find gemini command in PATH (cross-platform)
    const geminiPath = findExecutable('gemini');
    if (geminiPath && fs.existsSync(geminiPath)) {
        logVerbose(`Found Gemini CLI at: ${geminiPath}`);
        return geminiPath;
    } else {
        logVerbose('Gemini CLI not found in PATH');
    }
    
    // Try common installation locations (npm global installs)
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const commonPaths = [
        path.join(home, '.nvm', 'versions', 'node', '*', 'bin', 'gemini'),
        path.join(home, '.npm-global', 'bin', 'gemini'),
        path.join(home, '.local', 'bin', 'gemini'),
        path.join(home, 'bin', 'gemini'),
        '/usr/local/bin/gemini',
        '/usr/bin/gemini'
    ];
    
    for (const geminiPath of commonPaths) {
        // Handle wildcards in path (for nvm node versions)
        if (geminiPath.includes('*')) {
            try {
                const { globSync } = require('glob');
                const matches = globSync(geminiPath);
                if (matches.length > 0 && fs.existsSync(matches[0])) {
                    logVerbose(`Found Gemini CLI at: ${matches[0]}`);
                    return matches[0];
                }
            } catch (error) {
                // glob not available, skip wildcard paths
                logVerbose('glob module not available, skipping wildcard paths');
            }
        } else if (fs.existsSync(geminiPath)) {
            logVerbose(`Found Gemini CLI at: ${geminiPath}`);
            return geminiPath;
        }
    }
    
    logVerbose('Gemini CLI installation not found in common locations');
    return '';
}

// Function to detect Gemini MCP config file location based on scope
function findGeminiMCPConfigPath(scope = 'user') {
    logVerbose(`🔍 Finding Gemini MCP config file for scope: ${scope}...`);
    
    const home = process.env.HOME || process.env.USERPROFILE || '';
    
    if (scope === 'user') {
        // User scope: ~/.gemini/settings.json or ~/.config/gemini/settings.json
        const userPaths = [
            path.join(home, '.gemini', 'settings.json'),
            path.join(home, '.config', 'gemini', 'settings.json')
        ];
        
        for (const configPath of userPaths) {
            if (fs.existsSync(path.dirname(configPath)) || fs.existsSync(path.dirname(path.dirname(configPath)))) {
                logVerbose(`Gemini user MCP config will be at: ${configPath}`);
                return configPath;
            }
        }
        
        // Default to .gemini if neither exists
        const defaultPath = path.join(home, '.gemini', 'settings.json');
        logVerbose(`Gemini user MCP config will be created at: ${defaultPath}`);
        return defaultPath;
    } else if (scope === 'project') {
        // Project scope: .gemini/settings.json in project root
        const projectPath = path.join(cwd, '.gemini', 'settings.json');
        logVerbose(`Gemini project MCP config will be at: ${projectPath}`);
        return projectPath;
    }
    
    // Default to user scope
    return path.join(home, '.gemini', 'settings.json');
}

// Function to generate Gemini MCP add command for local servers (for display purposes)
// SECURITY: This is only for display/logging. Actual execution uses spawnSync with arrays.
function generateGeminiMCPCommand(config, serverName, scope = 'user') {
    // Validate inputs first
    const validatedName = validateServerName(serverName);
    const validatedScope = validateScope(scope);

    // Gemini CLI uses: gemini mcp add <server-name> <command> [args...]
    // For local servers with args, we need to construct the command properly
    let command = `gemini mcp add`;

    // Add scope flag if not user (default)
    if (validatedScope !== 'user') {
        command += ` --scope ${validatedScope}`;
    }

    // Add server name (shell-escaped for display)
    command += ` ${shellEscape(validatedName)}`;

    // Add command and args (shell-escaped for display)
    command += ` ${shellEscape(config.command)}`;
    if (config.args && config.args.length > 0) {
        command += ` ${config.args.map(arg => shellEscape(arg)).join(' ')}`;
    }

    return command;
}

// Build argument array for spawnSync (SECURE: no shell interpretation)
function buildGeminiMCPAddArgs(config, serverName, scope = 'user') {
    const validatedName = validateServerName(serverName);
    const validatedScope = validateScope(scope);

    const args = ['mcp', 'add'];

    if (validatedScope !== 'user') {
        args.push('--scope', validatedScope);
    }

    args.push(validatedName);
    args.push(config.command);

    if (config.args && config.args.length > 0) {
        args.push(...config.args);
    }

    return args;
}

// Function to execute gemini mcp add command for URL-based servers
// SECURITY: Uses spawnSync with arrays to prevent command injection
async function executeGeminiMCPAddURL(config, serverName, scope = 'user') {
    log('🚀 Executing Gemini MCP add command for URL-based server...', 'info');

    // SECURITY: Validate all inputs FIRST
    let validatedName, validatedScope, validatedTransport, validatedURL;
    try {
        validatedName = validateServerName(serverName);
        validatedScope = validateScope(scope);
        validatedTransport = validateTransport(config.transport || 'http');
        validatedURL = validateURL(config.url);
    } catch (validationError) {
        log(`❌ Validation failed: ${validationError.message}`, 'error');
        return false;
    }

    // Build command display string for logging (shell-escaped)
    const displayCommand = `gemini mcp add --transport ${validatedTransport}${validatedScope !== 'user' ? ` --scope ${validatedScope}` : ''} ${shellEscape(validatedName)} ${shellEscape(validatedURL)}`;
    logVerbose(`Full command: ${displayCommand}`);

    if (isDryRun) {
        log('🔍 DRY RUN - Command would be executed:', 'warning');
        log(displayCommand, 'info');
        log('🔍 URL Configuration:', 'info');
        log(`  Server Name: ${validatedName}`, 'info');
        log(`  URL: ${validatedURL}`, 'info');
        log(`  Transport: ${validatedTransport}`, 'info');
        log(`  Scope: ${validatedScope}`, 'info');
        return true;
    }

    // Check if gemini command is available
    log('🔍 Checking Gemini CLI availability...', 'info');
    const geminiPath = findGeminiCLIInstallation();
    if (geminiPath) {
        logVerbose(`✅ Gemini CLI found at: ${geminiPath}`);
    } else {
        // Try direct execution to verify
        const versionCheck = spawnSync('gemini', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
        if (versionCheck.status !== 0) {
            log('❌ Gemini CLI is not installed or not in PATH', 'error');
            log('Install with: npm install -g @google/gemini-cli', 'info');
            return false;
        }
        logVerbose('✅ Gemini CLI is available in PATH');
    }

    // Detect and log MCP config file location
    const configPath = findGeminiMCPConfigPath(validatedScope);
    logVerbose(`📝 Gemini MCP config will be written to: ${configPath}`);

    // Build argument array (SECURE: no shell interpretation)
    const args = ['mcp', 'add', '--transport', validatedTransport];
    if (validatedScope !== 'user') {
        args.push('--scope', validatedScope);
    }
    args.push(validatedName, validatedURL);

    log(`📤 Adding URL-based MCP server "${validatedName}" to Gemini CLI with ${validatedTransport.toUpperCase()} transport...`, 'info');

    // Execute using spawnSync (SECURE: shell: false is default)
    const result = spawnSync('gemini', args, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
    });

    if (result.status === 0) {
        log(`✅ URL-based MCP server added to Gemini CLI successfully!`, 'success');
        if (result.stdout && result.stdout.trim()) {
            logVerbose(`Gemini output: ${result.stdout.trim()}`);
        }
        return true;
    } else {
        log('❌ Failed to add URL-based MCP server to Gemini CLI', 'error');

        if (result.status !== null) {
            log(`Exit code: ${result.status}`, 'error');
        }
        if (result.stderr && result.stderr.trim()) {
            log(`STDERR: ${result.stderr.trim()}`, 'error');
        }
        if (result.stdout && result.stdout.trim()) {
            log(`STDOUT: ${result.stdout.trim()}`, 'error');
        }

        log('💡 This might be due to:', 'warning');
        log('  - Invalid URL format', 'warning');
        log('  - Server name already exists', 'warning');
        log('  - Network connectivity issues', 'warning');
        log('  - Invalid transport type', 'warning');

        log('🔧 Try these troubleshooting steps:', 'info');
        log('  1. Verify the URL is accessible', 'info');
        log('  2. Try a different server name', 'info');
        log('  3. Check your internet connection', 'info');
        log('  4. Run "gemini mcp list" to see existing servers', 'info');

        return false;
    }
}

// Function to execute gemini mcp add command for local servers
// SECURITY: Uses spawnSync with arrays to prevent command injection
async function executeGeminiMCPAdd(config, serverName, scope = 'user') {
    log('🚀 Executing Gemini MCP add command...', 'info');

    // SECURITY: Validate inputs and build args (validation happens in buildGeminiMCPAddArgs)
    let args;
    try {
        args = buildGeminiMCPAddArgs(config, serverName, scope);
    } catch (validationError) {
        log(`❌ Validation failed: ${validationError.message}`, 'error');
        return false;
    }

    // Get display command for logging (shell-escaped)
    const displayCommand = generateGeminiMCPCommand(config, serverName, scope);
    logVerbose(`Full command: ${displayCommand}`);

    // Get validated values for display
    const validatedName = validateServerName(serverName);
    const validatedScope = validateScope(scope);

    if (isDryRun) {
        log('🔍 DRY RUN - Command would be executed:', 'warning');
        log(displayCommand, 'info');
        log('🔍 Configuration:', 'info');
        log(`  Server Name: ${validatedName}`, 'info');
        log(`  Command: ${config.command}`, 'info');
        log(`  Args: ${config.args ? config.args.join(' ') : 'none'}`, 'info');
        log(`  Scope: ${validatedScope}`, 'info');
        return true;
    }

    // Check if gemini command is available
    log('🔍 Checking Gemini CLI availability...', 'info');
    const geminiPath = findGeminiCLIInstallation();
    if (geminiPath) {
        logVerbose(`✅ Gemini CLI found at: ${geminiPath}`);
    } else {
        // Try direct execution to verify
        const versionCheck = spawnSync('gemini', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
        if (versionCheck.status !== 0) {
            log('❌ Gemini CLI is not installed or not in PATH', 'error');
            log('Install with: npm install -g @google/gemini-cli', 'info');
            return false;
        }
        logVerbose('✅ Gemini CLI is available in PATH');
    }

    // Detect and log MCP config file location
    const configPath = findGeminiMCPConfigPath(validatedScope);
    logVerbose(`📝 Gemini MCP config will be written to: ${configPath}`);

    log(`📤 Adding MCP server "${validatedName}" to Gemini CLI...`, 'info');

    // Execute using spawnSync (SECURE: shell: false is default)
    const result = spawnSync('gemini', args, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
    });

    if (result.status === 0) {
        log(`✅ MCP server added to Gemini CLI successfully!`, 'success');
        if (result.stdout && result.stdout.trim()) {
            logVerbose(`Gemini output: ${result.stdout.trim()}`);
        }
        return true;
    } else {
        log('❌ Failed to add MCP server to Gemini CLI', 'error');

        if (result.status !== null) {
            log(`Exit code: ${result.status}`, 'error');
        }
        if (result.stderr && result.stderr.trim()) {
            log(`STDERR: ${result.stderr.trim()}`, 'error');
        }
        if (result.stdout && result.stdout.trim()) {
            log(`STDOUT: ${result.stdout.trim()}`, 'error');
        }

        log('💡 This might be due to:', 'warning');
        log('  - Invalid command configuration', 'warning');
        log('  - Server name already exists', 'warning');
        log('  - Insufficient permissions', 'warning');
        log('  - Invalid scope specified', 'warning');

        log('🔧 Try these troubleshooting steps:', 'info');
        log('  1. Run with --verbose to see the full command', 'info');
        log('  2. Try a different server name', 'info');
        log('  3. Check your Gemini CLI installation', 'info');
        log('  4. Run "gemini mcp list" to see existing servers', 'info');

        return false;
    }
}

// ============================================================================
// END GEMINI CLI FUNCTIONS
// ============================================================================

// Function to test executable path
async function testExecutablePath(command) {
    logVerbose(`🧪 Testing executable path: ${command}`);
    
    try {
        // Test if command exists and is executable
        if (command.includes('/')) {
            // Absolute path - check if file exists and is executable
            if (!fs.existsSync(command)) {
                throw new Error(`Executable not found at path: ${command}`);
            }
            
            const stats = fs.statSync(command);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${command}`);
            }
            
            // Check if executable (approximate check)
            try {
                fs.accessSync(command, fs.constants.F_OK | fs.constants.X_OK);
            } catch (error) {
                throw new Error(`File is not executable: ${command}`);
            }
        } else {
            // Command name - check if it's in PATH
            try {
                execSync(`which ${command}`, { stdio: 'ignore' });
            } catch (error) {
                throw new Error(`Command not found in PATH: ${command}`);
            }
        }
        
        // Test command execution with --version or --help
        const testCommands = ['--version', '--help', '-v', '-h'];
        let testSuccessful = false;
        
        for (const testArg of testCommands) {
            try {
                execSync(`${command} ${testArg}`, { 
                    stdio: 'ignore', 
                    timeout: 5000 
                });
                testSuccessful = true;
                break;
            } catch (error) {
                // Continue to next test argument
                continue;
            }
        }
        
        if (!testSuccessful) {
            log(`⚠️  Warning: Could not test executable with standard flags, but path exists`, 'warning');
        } else {
            logVerbose(`✅ Executable test successful: ${command}`);
        }
        
        return true;
    } catch (error) {
        log(`❌ Executable test failed: ${error.message}`, 'error');
        return false;
    }
}

// Function to get interactive configuration
async function getInteractiveConfig(config, jsonMode = false) {
    // For JSON/clipboard input, prioritize extracted name; for auto-detect, use project name
    const defaultServerName = config.extractedServerName || config.name || (jsonMode ? 'mcp-server' : projectName) || 'mcp-server';
    
    if (isForce) {
        return { 
            ...config, 
            scope: 'user', 
            serverName: defaultServerName,
            confirmed: true 
        };
    }
    
    log('📋 MCP Configuration Summary:', 'title');
    log(`Server Name: ${defaultServerName}`, 'info');
    log(`Command: ${config.command}`, 'info');
    log(`Arguments: ${config.args ? config.args.join(' ') : '(none)'}`, 'info');
    log(`Description: ${config.description}`, 'info');
    log(`Environment Variables: ${Object.keys(config.env || {}).length}`, 'info');
    if (config.cwd) {
        log(`Working Directory: ${config.cwd}`, 'info');
    }
    
    // Test executable path only if it's not a standard command
    const shouldTestExecutable = config.command && !['npx', 'npm', 'yarn', 'pnpm', 'bun', 'uvx'].includes(config.command.split('/').pop());
    
    if (shouldTestExecutable) {
        const executableValid = await testExecutablePath(config.command);
        if (!executableValid) {
            const { continueAnyway } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'continueAnyway',
                    message: 'Executable test failed. Continue anyway?',
                    default: false
                }
            ]);
            
            if (!continueAnyway) {
                throw new Error('Cancelled due to executable validation failure');
            }
        }
    }
    
    const questions = [
        {
            type: 'list',
            name: 'scope',
            message: 'Choose MCP server scope:',
            choices: [
                { name: 'user - Available to you across all projects (recommended)', value: 'user' },
                { name: 'local - Available only in this project', value: 'local' },
                { name: 'project - Shared with everyone in the project (requires .mcp.json)', value: 'project' }
            ],
            default: 'user'
        },
        {
            type: 'input',
            name: 'serverName',
            message: 'Server name:',
            default: defaultServerName,
            validate: (input) => {
                if (!input || input.trim().length === 0) {
                    return 'Server name cannot be empty';
                }
                if (!/^[a-zA-Z0-9\-_]+$/.test(input.trim())) {
                    return 'Server name can only contain letters, numbers, hyphens, and underscores';
                }
                return true;
            }
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Add this MCP server to Claude Code?',
            default: true
        }
    ];
    
    const answers = await inquirer.prompt(questions);
    
    return {
        ...config,
        scope: answers.scope,
        serverName: answers.serverName.trim(),
        confirmed: answers.confirm
    };
}

// Function to find all available MCP config files
function findAllMCPConfigs() {
    logVerbose('🔍 Finding all MCP config files...');

    const home = process.env.HOME || process.env.USERPROFILE || '';
    const configs = [];

    // User scope configs
    const userPaths = [
        { path: path.join(home, '.cursor', 'mcp.json'), scope: 'user', label: 'Cursor (user)' },
        { path: path.join(home, '.claude', 'mcp.json'), scope: 'user', label: 'Claude (user)' }
    ];

    // Local scope configs
    const localPaths = [
        { path: path.join(cwd, '.cursor', 'mcp.json'), scope: 'local', label: 'Cursor (local)' },
        { path: path.join(cwd, '.vscode', 'mcp.json'), scope: 'local', label: 'VS Code (local)' }
    ];

    // Project scope config
    const projectPath = { path: path.join(cwd, '.mcp.json'), scope: 'project', label: 'Project (.mcp.json)' };

    // Check which files exist
    for (const config of [...userPaths, ...localPaths, projectPath]) {
        if (fs.existsSync(config.path)) {
            logVerbose(`Found config: ${config.path}`);
            configs.push(config);
        }
    }

    return configs;
}

// Function to list servers in a config file with line numbers
function listServersInConfig(configPath) {
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        const lines = content.split('\n');
        const servers = [];

        if (config.mcpServers) {
            const serverNames = Object.keys(config.mcpServers);

            // Find line number for each server
            serverNames.forEach(serverName => {
                for (let i = 0; i < lines.length; i++) {
                    // Look for the server name as a JSON key (e.g., "server-name": {)
                    if (lines[i].includes(`"${serverName}"`) && lines[i].includes(':')) {
                        servers.push({
                            name: serverName,
                            line: i + 1, // Line numbers are 1-based
                            config: config.mcpServers[serverName]
                        });
                        break;
                    }
                }
            });
        }

        return servers;
    } catch (error) {
        logVerbose(`Error reading config ${configPath}: ${error.message}`);
        return [];
    }
}

// Function to get preferred editor
function getEditor() {
    // Check EDITOR environment variable
    if (process.env.EDITOR) {
        logVerbose(`Using EDITOR from environment: ${process.env.EDITOR}`);
        return process.env.EDITOR;
    }

    // Check for common editors
    const editors = ['nano', 'vim', 'vi', 'code', 'emacs'];

    for (const editor of editors) {
        try {
            execSync(`which ${editor}`, { stdio: 'ignore' });
            logVerbose(`Found available editor: ${editor}`);
            return editor;
        } catch (error) {
            // Editor not found, continue
        }
    }

    // Fallback to nano
    return 'nano';
}

// Function to open editor at specific line
function openEditorAtLine(editor, filePath, lineNumber) {
    logVerbose(`Opening ${editor} at line ${lineNumber} in ${filePath}`);

    // Different editors have different syntax for jumping to a line
    let command;

    if (editor.includes('nano')) {
        command = `${editor} +${lineNumber} "${filePath}"`;
    } else if (editor.includes('vim') || editor.includes('vi') || editor.includes('nvim')) {
        command = `${editor} +${lineNumber} "${filePath}"`;
    } else if (editor.includes('code') || editor.includes('vscode')) {
        command = `${editor} -g "${filePath}:${lineNumber}"`;
    } else if (editor.includes('emacs')) {
        command = `${editor} +${lineNumber} "${filePath}"`;
    } else if (editor.includes('subl') || editor.includes('sublime')) {
        command = `${editor} "${filePath}:${lineNumber}"`;
    } else {
        // Fallback - just open the file
        log(`⚠️  Line jump not supported for ${editor}, opening at beginning`, 'warning');
        command = `${editor} "${filePath}"`;
    }

    return command;
}

// Function to handle edit mode
async function handleEditMode() {
    log('📝 MCP Configuration Editor', 'title');

    // Find all available config files
    const availableConfigs = findAllMCPConfigs();

    if (availableConfigs.length === 0) {
        log('❌ No MCP configuration files found', 'error');
        log('💡 MCP config files are typically created when you add your first MCP server', 'info');
        log('💡 Run "mcp-auto-add" to add a server first', 'info');
        process.exit(1);
    }

    log(`📁 Found ${availableConfigs.length} MCP configuration file(s)`, 'info');

    let selectedConfig;

    if (availableConfigs.length === 1) {
        selectedConfig = availableConfigs[0];
        log(`📂 Using: ${selectedConfig.label}`, 'info');
    } else {
        // Let user choose which config to edit
        const choices = availableConfigs.map(config => {
            const servers = listServersInConfig(config.path);
            const serverCount = servers.length;
            return {
                name: `${config.label} (${serverCount} server${serverCount !== 1 ? 's' : ''})`,
                value: config,
                short: config.label
            };
        });

        const { config } = await inquirer.prompt([
            {
                type: 'list',
                name: 'config',
                message: 'Which MCP configuration file?',
                choices: choices
            }
        ]);

        selectedConfig = config;
    }

    // List servers in the selected config
    const servers = listServersInConfig(selectedConfig.path);

    if (servers.length === 0) {
        log('ℹ️  No servers configured yet in this file', 'info');
        log('📝 Opening file for editing...', 'info');

        const editor = getEditor();
        try {
            execSync(`${editor} "${selectedConfig.path}"`, { stdio: 'inherit' });
            log('✅ Editor closed', 'success');
            const restartMsg = useGemini ? 'Restart Gemini CLI' : 'Restart Claude Code';
            log(`🔄 ${restartMsg} to apply changes`, 'info');
        } catch (error) {
            log(`❌ Failed to open editor: ${error.message}`, 'error');
            process.exit(1);
        }
        return;
    }

    // Show server selection menu
    log(`\n🔧 Found ${servers.length} MCP server${servers.length !== 1 ? 's' : ''}:`, 'info');

    const serverChoices = servers.map(server => {
        const command = server.config.command || server.config.url || 'No command';
        const shortCommand = command.length > 50 ? command.substring(0, 47) + '...' : command;

        return {
            name: `${chalk.cyan(server.name)} - ${shortCommand}`,
            value: server,
            short: server.name
        };
    });

    const { selectedServer } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedServer',
            message: 'Which server would you like to edit?',
            choices: serverChoices,
            pageSize: 15
        }
    ]);

    // Get editor
    const editor = getEditor();

    log(`\n📝 Opening ${chalk.cyan(selectedServer.name)} configuration...`, 'info');
    log(`📍 File: ${selectedConfig.path}`, 'info');
    log(`📄 Line: ${selectedServer.line}`, 'info');
    log(`✏️  Editor: ${editor}`, 'info');

    try {
        // Open the config file at the specific line
        const command = openEditorAtLine(editor, selectedConfig.path, selectedServer.line);
        execSync(command, { stdio: 'inherit' });

        log('\n✅ Editor closed', 'success');
        log('💡 Changes are saved when you exit the editor', 'info');
        log('🔄 Restart Claude Code to apply changes', 'info');
    } catch (error) {
        log(`❌ Failed to open editor: ${error.message}`, 'error');
        log(`💡 Try setting EDITOR environment variable`, 'info');
        log(`   Example: export EDITOR=nano`, 'info');
        process.exit(1);
    }
}

// Main function
async function main() {
    try {
        // Handle edit mode
        if (editMode) {
            await handleEditMode();
            process.exit(0);
        }

        let config;
        let jsonMode = false;

        // Check for clipboard mode first
        if (useClipboard) {
            log('📋 Reading JSON configuration from clipboard...', 'info');
            try {
                const clipboardContent = readFromClipboard();
                if (!clipboardContent || clipboardContent.trim().length === 0) {
                    throw new Error('Clipboard is empty or contains no text');
                }
                log('✅ Successfully read content from clipboard', 'success');
                config = generateMCPConfigFromJSON(clipboardContent.trim());
                jsonMode = true;
            } catch (error) {
                log(`❌ Failed to read from clipboard: ${error.message}`, 'error');
                log('💡 Make sure you have JSON configuration copied to your clipboard', 'info');
                process.exit(1);
            }
        } else if (jsonInput) {
            // Direct JSON from command line
            log('📄 Using JSON configuration from command line', 'info');
            config = generateMCPConfigFromJSON(jsonInput);
            jsonMode = true;
        } else if (jsonFileInput) {
            // JSON from file
            log(`📁 Reading JSON configuration from file: ${jsonFileInput}`, 'info');
            const jsonContent = readJSONFromFile(jsonFileInput);
            config = generateMCPConfigFromJSON(jsonContent);
            jsonMode = true;
        } else if (autoDetectMode) {
            // Auto-detect mode - directly try to detect from current folder
            log('🔍 Auto-detecting MCP configuration from current directory...', 'info');
            try {
                config = generateMCPConfig();
            } catch (error) {
                log(`❌ Auto-detection failed: ${error.message}`, 'error');
                log('💡 Try using --json or --json-file flags to provide configuration manually:', 'info');
                log('Examples:', 'info');
                log('  mcp-auto-add --json \'{"command":"npx","args":["-y","tool"]}\' --dry-run', 'info');
                log('  mcp-auto-add --json-file ./config.json --force', 'info');
                process.exit(1);
            }
        } else if (!isForce && !isDryRun) {
            // Interactive mode - always give user choice
            const { inputMode } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'inputMode',
                    message: 'How would you like to configure the MCP server?',
                    choices: [
                        { name: 'Auto-detect from current directory', value: 'auto' },
                        { name: 'Paste JSON configuration', value: 'json' },
                        { name: 'Load JSON from file', value: 'file' },
                        { name: 'Read JSON from clipboard', value: 'clipboard' }
                    ],
                    default: 'auto'
                }
            ]);
            
            if (inputMode === 'json') {
                const jsonStr = await promptForJSONInput();
                config = generateMCPConfigFromJSON(jsonStr);
                jsonMode = true;
            } else if (inputMode === 'file') {
                const { filePath } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'filePath',
                        message: 'Enter path to JSON file:',
                        validate: (input) => {
                            if (!input || input.trim().length === 0) {
                                return 'File path cannot be empty';
                            }
                            const absolutePath = path.isAbsolute(input) ? input : path.join(cwd, input);
                            if (!fs.existsSync(absolutePath)) {
                                return `File not found: ${absolutePath}`;
                            }
                            return true;
                        }
                    }
                ]);
                const jsonContent = readJSONFromFile(filePath);
                config = generateMCPConfigFromJSON(jsonContent);
                jsonMode = true;
            } else if (inputMode === 'clipboard') {
                try {
                    const clipboardContent = readFromClipboard();
                    if (!clipboardContent || clipboardContent.trim().length === 0) {
                        throw new Error('Clipboard is empty or contains no text');
                    }
                    log('✅ Successfully read content from clipboard', 'success');
                    config = generateMCPConfigFromJSON(clipboardContent.trim());
                    jsonMode = true;
                } catch (error) {
                    log(`❌ Failed to read from clipboard: ${error.message}`, 'error');
                    log('💡 Make sure you have JSON configuration copied to your clipboard', 'info');
                    process.exit(1);
                }
            } else {
                // Auto-detect mode - handle errors gracefully
                try {
                    config = generateMCPConfig();
                } catch (error) {
                    log(`⚠️  Auto-detection failed: ${error.message}`, 'warning');
                    log('🎯 Please choose an alternative input method:', 'info');
                    
                    const { fallbackMode } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'fallbackMode',
                            message: 'Auto-detection failed. What would you like to do?',
                            choices: [
                                { name: 'Paste JSON configuration', value: 'json' },
                                { name: 'Load JSON from file', value: 'file' },
                                { name: 'Read JSON from clipboard', value: 'clipboard' },
                                { name: 'Exit and use --json flags instead', value: 'exit' }
                            ],
                            default: 'json'
                        }
                    ]);
                    
                    if (fallbackMode === 'json') {
                        const jsonStr = await promptForJSONInput();
                        config = generateMCPConfigFromJSON(jsonStr);
                        jsonMode = true;
                    } else if (fallbackMode === 'file') {
                        const { filePath } = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'filePath',
                                message: 'Enter path to JSON file:',
                                validate: (input) => {
                                    if (!input || input.trim().length === 0) {
                                        return 'File path cannot be empty';
                                    }
                                    const absolutePath = path.isAbsolute(input) ? input : path.join(cwd, input);
                                    if (!fs.existsSync(absolutePath)) {
                                        return `File not found: ${absolutePath}`;
                                    }
                                    return true;
                                }
                            }
                        ]);
                        const jsonContent = readJSONFromFile(filePath);
                        config = generateMCPConfigFromJSON(jsonContent);
                        jsonMode = true;
                    } else if (fallbackMode === 'clipboard') {
                        try {
                            const clipboardContent = readFromClipboard();
                            if (!clipboardContent || clipboardContent.trim().length === 0) {
                                throw new Error('Clipboard is empty or contains no text');
                            }
                            log('✅ Successfully read content from clipboard', 'success');
                            config = generateMCPConfigFromJSON(clipboardContent.trim());
                            jsonMode = true;
                        } catch (error) {
                            log(`❌ Failed to read from clipboard: ${error.message}`, 'error');
                            log('💡 Make sure you have JSON configuration copied to your clipboard', 'info');
                            process.exit(1);
                        }
                    } else {
                        log('💡 Use --json or --json-file flags for direct configuration:', 'info');
                        log('Examples:', 'info');
                        log('  mcp-auto-add --json \'{"command":"npx","args":["-y","tool"]}\'', 'info');
                        log('  mcp-auto-add --json-file ./config.json', 'info');
                        log('  mcp-auto-add --clipboard', 'info');
                        process.exit(0);
                    }
                }
            }
        } else {
            // Force or dry-run mode - try auto-detect, but provide helpful error if it fails
            try {
                config = generateMCPConfig();
            } catch (error) {
                log(`❌ Auto-detection failed: ${error.message}`, 'error');
                log('💡 Try using --json or --json-file flags to provide configuration manually:', 'info');
                log('Examples:', 'info');
                log('  mcp-auto-add --json \'{"command":"npx","args":["-y","tool"]}\' --dry-run', 'info');
                log('  mcp-auto-add --json-file ./config.json --force', 'info');
                process.exit(1);
            }
        }
        
        // Handle URL-based configurations specially
        if (config.isUrlBased) {
            log('🌐 URL-based MCP server detected', 'info');
            log(`URL: ${config.url}`, 'info');
            log(`Transport: ${config.transport || 'sse'}`, 'info');
            
            // Handle generate command mode for URL servers
            if (generateCommand) {
                // For JSON/clipboard input, prioritize extracted name; for auto-detect, use project name
                const defaultServerName = config.extractedServerName || config.name || (!jsonMode ? projectName : null) || 'mcp-server';
                const transport = config.transport || (useGemini ? 'http' : 'sse');
                const cliName = useGemini ? 'Gemini' : 'Claude';
                const command = useGemini 
                    ? `gemini mcp add --transport ${transport} ${defaultServerName} ${config.url}`
                    : `claude mcp add --transport ${transport} ${defaultServerName} ${config.url}`;
                
                log(`📋 Generated ${cliName} MCP command:`, 'title');
                console.log('\n' + chalk.green(command) + '\n');
                
                // Try to copy to clipboard
                const clipboardTool = copyToClipboard(command);
                if (clipboardTool) {
                    log(`✅ Command copied to clipboard using ${clipboardTool}`, 'success');
                    log('📌 You can now paste it in your terminal with Ctrl+V', 'info');
                } else {
                    log('⚠️  Could not copy to clipboard (install xclip, xsel, or pbcopy)', 'warning');
                    log('📋 Please copy the command above manually', 'info');
                }
                
                log(`🎯 Server: ${defaultServerName}`, 'info');
                log(`🌐 URL: ${config.url}`, 'info');
                log(`🚀 Transport: ${transport}`, 'info');
                log('💡 To run: paste the command in your terminal', 'info');
                process.exit(0);
            }
            
            // Get interactive configuration for URL servers
            // For JSON/clipboard input, prioritize extracted name; for auto-detect, use project name
            const defaultServerName = config.extractedServerName || config.name || (jsonMode ? 'mcp-server' : projectName) || 'mcp-server';
            
            if (isForce) {
                // Force mode - use defaults
                const executeFn = useGemini ? executeGeminiMCPAddURL : executeClaudeMCPAddURL;
                const cliName = useGemini ? 'Gemini CLI' : 'Claude Code';
                const success = await executeFn(config, defaultServerName, 'user');
                
                if (success) {
                    log('🎉 URL-based MCP Auto-Add completed successfully!', 'success');
                    log(`💡 MCP server "${defaultServerName}" is now available in ${cliName}`, 'info');
                    const restartMsg = useGemini ? 'Restart Gemini CLI' : 'Restart Claude Code';
                    log(`🔄 ${restartMsg} if needed to see the new server`, 'info');
                } else {
                    log('❌ URL-based MCP Auto-Add failed', 'error');
                    process.exit(1);
                }
            } else {
                // Interactive mode for URL servers
                log('📋 URL-based MCP Configuration Summary:', 'title');
                log(`Server Name: ${defaultServerName}`, 'info');
                log(`URL: ${config.url}`, 'info');
                log(`Transport: ${config.transport}`, 'info');
                log(`Description: ${config.description}`, 'info');
                
                const questions = [
                    {
                        type: 'list',
                        name: 'scope',
                        message: 'Choose MCP server scope:',
                        choices: [
                            { name: 'user - Available to you across all projects (recommended)', value: 'user' },
                            { name: 'local - Available only in this project', value: 'local' },
                            { name: 'project - Shared with everyone in the project (requires .mcp.json)', value: 'project' }
                        ],
                        default: 'user'
                    },
                    {
                        type: 'input',
                        name: 'serverName',
                        message: 'Server name:',
                        default: defaultServerName,
                        validate: (input) => {
                            if (!input || input.trim().length === 0) {
                                return 'Server name cannot be empty';
                            }
                            if (!/^[a-zA-Z0-9\-_]+$/.test(input.trim())) {
                                return 'Server name can only contain letters, numbers, hyphens, and underscores';
                            }
                            return true;
                        }
                    },
                    {
                        type: 'list',
                        name: 'transport',
                        message: 'Choose transport type:',
                        choices: [
                            { name: 'SSE (Server-Sent Events) - recommended', value: 'sse' },
                            { name: 'HTTP', value: 'http' }
                        ],
                        default: config.transport || 'sse'
                    },
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Add this URL-based MCP server to Claude Code?',
                        default: true
                    }
                ];
                
                const answers = await inquirer.prompt(questions);
                
                if (!answers.confirm) {
                    log('❌ Operation cancelled by user', 'warning');
                    process.exit(0);
                }
                
                // Update config with user choices
                config.transport = answers.transport;
                
                // Execute MCP add command for URL server
                const executeFn = useGemini ? executeGeminiMCPAddURL : executeClaudeMCPAddURL;
                const cliName = useGemini ? 'Gemini CLI' : 'Claude Code';
                const success = await executeFn(config, answers.serverName.trim(), answers.scope);
                
                if (success) {
                    log('🎉 URL-based MCP Auto-Add completed successfully!', 'success');
                    log(`💡 MCP server "${answers.serverName}" is now available in ${cliName}`, 'info');
                    log(`📍 Scope: ${answers.scope}`, 'info');
                    log(`🌐 URL: ${config.url}`, 'info');
                    log(`🚀 Transport: ${config.transport}`, 'info');
                    
                    // Provide scope-specific guidance
                    if (answers.scope === 'user') {
                        log('🌟 This server is available across all your projects', 'info');
                    } else if (answers.scope === 'local') {
                        log('📁 This server is only available in the current project', 'info');
                    } else if (answers.scope === 'project') {
                        log('👥 This server will be shared with everyone in the project', 'info');
                        log('📝 Make sure to commit the .mcp.json file to your repository', 'warning');
                    }
                    
                    const restartMsg = useGemini ? 'Restart Gemini CLI' : 'Restart Claude Code';
                    log(`🔄 ${restartMsg} if needed to see the new server`, 'info');
                    log('📋 Run "claude mcp list" to see all configured servers', 'info');
                } else {
                    log('❌ URL-based MCP Auto-Add failed', 'error');
                    process.exit(1);
                }
            }
            
            process.exit(0);
        }
        
        // Handle generate command mode
        if (generateCommand) {
            // For JSON/clipboard input, prioritize extracted name; for auto-detect, use project name
            const defaultServerName = config.extractedServerName || config.name || (jsonMode ? 'mcp-server' : projectName) || 'mcp-server';
            const defaultScope = 'user';
            
            const command = useGemini 
                ? generateGeminiMCPCommand(config, defaultServerName, defaultScope)
                : generateClaudeCommand(config, defaultServerName, defaultScope);
            const cliName = useGemini ? 'Gemini' : 'Claude';
            
            log(`📋 Generated ${cliName} MCP command:`, 'title');
            console.log('\n' + chalk.green(command) + '\n');
            
            // Try to copy to clipboard
            const clipboardTool = copyToClipboard(command);
            if (clipboardTool) {
                log(`✅ Command copied to clipboard using ${clipboardTool}`, 'success');
                log('📌 You can now paste it in your terminal with Ctrl+V', 'info');
            } else {
                log('⚠️  Could not copy to clipboard (install xclip, xsel, or pbcopy)', 'warning');
                log('📋 Please copy the command above manually', 'info');
            }
            
            log(`🎯 Server: ${defaultServerName}`, 'info');
            log(`📍 Scope: ${defaultScope}`, 'info');
            log('💡 To run: paste the command in your terminal', 'info');
            process.exit(0);
        }
        
        // Get interactive configuration with scope and server name
        const interactiveConfig = await getInteractiveConfig(config, jsonMode);
        
        if (!interactiveConfig.confirmed) {
            log('❌ Operation cancelled by user', 'warning');
            process.exit(0);
        }
        
        // Execute MCP add command with chosen settings
        const executeFn = useGemini ? executeGeminiMCPAdd : executeClaudeMCPAdd;
        const cliName = useGemini ? 'Gemini CLI' : 'Claude Code';
        const success = await executeFn(
            interactiveConfig, 
            interactiveConfig.serverName, 
            interactiveConfig.scope
        );
        
        if (success) {
            log('🎉 MCP Auto-Add completed successfully!', 'success');
            log(`💡 MCP server "${interactiveConfig.serverName}" is now available in ${cliName}`, 'info');
            log(`📍 Scope: ${interactiveConfig.scope}`, 'info');
            
            // Provide scope-specific guidance
            if (interactiveConfig.scope === 'user') {
                log('🌟 This server is available across all your projects', 'info');
            } else if (interactiveConfig.scope === 'local') {
                log('📁 This server is only available in the current project', 'info');
            } else if (interactiveConfig.scope === 'project') {
                log('👥 This server will be shared with everyone in the project', 'info');
                log('📝 Make sure to commit the .mcp.json file to your repository', 'warning');
            }
            
            const restartMsg = useGemini ? 'Restart Gemini CLI' : 'Restart Claude Code';
            const listCmd = useGemini ? 'gemini mcp list' : 'claude mcp list';
            log(`🔄 ${restartMsg} if needed to see the new server`, 'info');
            log(`📋 Run "${listCmd}" to see all configured servers`, 'info');
        } else {
            log('❌ MCP Auto-Add failed', 'error');
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'error');
        if (isVerbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main, generateMCPConfig }; 