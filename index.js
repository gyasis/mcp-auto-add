#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

// Input mode detection
const jsonFlagIndex = args.findIndex(arg => arg === '--json' || arg === '-j');
const jsonFileFlagIndex = args.findIndex(arg => arg === '--json-file' || arg === '-jf');
const jsonInput = jsonFlagIndex !== -1 && args[jsonFlagIndex + 1] ? args[jsonFlagIndex + 1] : null;
const jsonFileInput = jsonFileFlagIndex !== -1 && args[jsonFileFlagIndex + 1] ? args[jsonFileFlagIndex + 1] : null;
const autoDetectMode = args.includes('.');

// Show help and exit if requested
if (showHelp) {
    console.log(`
🚀 MCP Auto-Add - Automatically detect and add MCP servers to Claude Code

USAGE:
    mcp-auto-add [OPTIONS]              # Interactive mode with menu
    mcp-auto-add . [OPTIONS]            # Auto-detect from current folder
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
    -g, --generate-command       Generate claude command and copy to clipboard
    -h, --help                   Show this help message

EXAMPLES:
    # Interactive mode - shows menu of choices (default)
    mcp-auto-add
    
    # Auto-detect mode - directly tries to detect from current folder
    mcp-auto-add .
    
    # Clipboard mode - reads JSON config from clipboard
    mcp-auto-add --clipboard
    
    # Direct JSON input
    mcp-auto-add --json '{"command":"npx","args":["-y","gemini-mcp-tool"]}'
    
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
    - Claude Code CLI installed and in PATH
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

// Get current working directory
const cwd = process.cwd();
const projectName = path.basename(cwd);

log(`🚀 MCP Auto-Add - Automatically adding MCP server to Claude Code`, 'title');
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
    
    try {
        // First try 'which node'
        const nodeExec = execSync('which node', { encoding: 'utf8' }).trim();
        if (nodeExec && fs.existsSync(nodeExec)) {
            logVerbose(`Found Node.js at: ${nodeExec}`);
            return nodeExec;
        }
    } catch (error) {
        logVerbose('Node.js not found with "which node"');
    }
    
    try {
        // Try nvm
        const nodeExec = execSync('nvm which node', { encoding: 'utf8' }).trim();
        if (nodeExec && fs.existsSync(nodeExec)) {
            logVerbose(`Found Node.js with nvm at: ${nodeExec}`);
            return nodeExec;
        }
    } catch (error) {
        logVerbose('Node.js not found with nvm');
    }
    
    // Try common locations
    const commonPaths = [
        '/usr/local/bin/node',
        '/usr/bin/node',
        path.join(process.env.HOME || '', '.nvm/versions/node/*/bin/node')
    ];
    
    for (const nodePath of commonPaths) {
        if (fs.existsSync(nodePath)) {
            logVerbose(`Found Node.js at: ${nodePath}`);
            return nodePath;
        }
    }
    
    logVerbose('Node.js not found in common locations');
    return '';
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
            config.extractedServerName = extractedServerName;
            return config;
        }
        
        // Handle URL-based configuration (like gitmcp)
        if (parsed.url) {
            log('📌 Detected URL-based MCP configuration', 'info');
            return {
                url: parsed.url,
                description: parsed.description || `URL-based MCP server: ${parsed.url}`,
                name: parsed.name || serverName
            };
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

// Function to copy text to clipboard
function copyToClipboard(text) {
    try {
        // Try xclip first (most common on Linux)
        execSync(`echo '${text.replace(/'/g, "'\\''")}' | xclip -selection clipboard`, { stdio: 'ignore' });
        return 'xclip';
    } catch (error) {
        try {
            // Try xsel as fallback
            execSync(`echo '${text.replace(/'/g, "'\\''")}' | xsel --clipboard --input`, { stdio: 'ignore' });
            return 'xsel';
        } catch (error) {
            try {
                // Try pbcopy on macOS
                execSync(`echo '${text.replace(/'/g, "'\\''")}' | pbcopy`, { stdio: 'ignore' });
                return 'pbcopy';
            } catch (error) {
                return null;
            }
        }
    }
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
        // Check if claude command is available
        log('🔍 Checking Claude CLI availability...', 'info');
        execSync('claude --version', { stdio: 'ignore' });
        logVerbose('✅ Claude CLI is available');
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
async function getInteractiveConfig(config) {
    const defaultServerName = config.extractedServerName || config.name || projectName || 'mcp-server';
    
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

// Main function
async function main() {
    try {
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
            log('⚠️  URL-based MCP servers require special handling', 'warning');
            log('📌 Please add this configuration manually to your Claude Code settings', 'info');
            log(`URL: ${config.url}`, 'info');
            if (config.description) {
                log(`Description: ${config.description}`, 'info');
            }
            log('💡 URL-based servers are typically handled differently than command-based servers', 'info');
            process.exit(0);
        }
        
        // Handle generate command mode
        if (generateCommand) {
            const defaultServerName = config.extractedServerName || config.name || projectName || 'mcp-server';
            const defaultScope = 'user';
            
            const command = generateClaudeCommand(config, defaultServerName, defaultScope);
            
            log('📋 Generated Claude MCP command:', 'title');
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
        const interactiveConfig = await getInteractiveConfig(config);
        
        if (!interactiveConfig.confirmed) {
            log('❌ Operation cancelled by user', 'warning');
            process.exit(0);
        }
        
        // Execute Claude MCP add command with chosen settings
        const success = await executeClaudeMCPAdd(
            interactiveConfig, 
            interactiveConfig.serverName, 
            interactiveConfig.scope
        );
        
        if (success) {
            log('🎉 MCP Auto-Add completed successfully!', 'success');
            log(`💡 MCP server "${interactiveConfig.serverName}" is now available in Claude Code`, 'info');
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
            
            log('🔄 Restart Claude Code if needed to see the new server', 'info');
            log('📋 Run "claude mcp list" to see all configured servers', 'info');
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