# CLI Configuration Commands

FAJ provides powerful command-line tools to configure AI settings, language preferences, and API keys without manually editing files.

## Quick Start

```bash
# Show current configuration
faj config show

# Interactive configuration (recommended)
faj config ai --interactive

# Set language to Chinese
faj config language zh

# Configure API key securely
faj config api-key
```

## Available Commands

### `faj config show`
Display current AI configuration including provider, model, language, and API key status.

```bash
$ faj config show

📋 Current AI Configuration

AI Provider: gemini
AI Model: gemini-1.5-flash
Resume Language: zh (default)

API Keys:
  Gemini: ✓ Configured
  OpenAI: ✗ Not set
  Anthropic: ✗ Not set
```

### `faj config ai`
Configure AI settings with multiple options.

#### Interactive Mode (Recommended)
```bash
faj config ai --interactive
```
This launches a guided setup with:
- Provider selection
- Model configuration
- API key input (masked)
- Language selection

#### Direct Configuration
```bash
# Set provider
faj config ai -p gemini

# Set model
faj config ai -m gemini-1.5-flash

# Set language
faj config ai -l zh

# Set API key (not recommended - use interactive mode)
faj config ai -k YOUR_API_KEY

# Combine multiple settings
faj config ai -p gemini -m gemini-1.5-flash -l zh
```

#### Options
- `-p, --provider <provider>` - AI provider (gemini, openai, anthropic)
- `-m, --model <model>` - AI model (e.g., gemini-1.5-flash, gpt-4)
- `-k, --api-key <key>` - API key for the provider
- `-l, --language <lang>` - Resume language (zh, en, ja, etc.)
- `--interactive` - Interactive configuration mode

### `faj config language`
Set the language for resume generation.

```bash
# Set to Chinese (default)
faj config language zh

# Set to English
faj config language en

# Set to Japanese
faj config language ja
```

#### Supported Languages
| Code | Language | 语言 |
|------|----------|------|
| `zh` | Chinese | 中文 |
| `en` | English | 英语 |
| `ja` | Japanese | 日语 |
| `ko` | Korean | 韩语 |
| `es` | Spanish | 西班牙语 |
| `fr` | French | 法语 |
| `de` | German | 德语 |

### `faj config api-key`
Securely configure API keys with masked input.

```bash
# Interactive provider selection
faj config api-key

# Specify provider directly
faj config api-key -p gemini
faj config api-key -p openai
faj config api-key -p anthropic
```

The command will:
1. Prompt for API key with masked input
2. Save to `.env` file securely
3. Validate the key format

### `faj config set/get`
Low-level configuration commands.

```bash
# Get a configuration value
faj config get ai.provider

# Set a configuration value
faj config set profile.name "John Doe"

# List all configuration
faj config list
```

## Configuration Examples

### Example 1: Complete Setup for Chinese Users
```bash
# 1. Interactive setup (推荐)
faj config ai --interactive

# 2. Or step by step
faj config ai -p gemini
faj config ai -m gemini-1.5-flash
faj config language zh
faj config api-key -p gemini
```

### Example 2: Switch to English Resume
```bash
# Change language to English
faj config language en

# Generate English resume
faj analyze .
```

### Example 3: Switch AI Providers
```bash
# Switch from Gemini to OpenAI
faj config ai -p openai -m gpt-4

# Configure OpenAI API key
faj config api-key -p openai

# Use new provider
faj analyze .
```

### Example 4: Use Different Models
```bash
# Use Gemini Pro for higher quality
faj config ai -m gemini-1.5-pro

# Use Flash for faster generation
faj config ai -m gemini-1.5-flash
```

## Configuration Storage

All settings are saved to `.env` file in your project directory:

```env
# AI Configuration
FAJ_AI_PROVIDER=gemini
FAJ_AI_MODEL=gemini-1.5-flash
FAJ_RESUME_LANGUAGE=zh

# API Keys (keep secure!)
FAJ_GEMINI_API_KEY=your_key_here
FAJ_OPENAI_API_KEY=your_key_here
FAJ_ANTHROPIC_API_KEY=your_key_here
```

## Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Contains sensitive API keys

2. **Use interactive mode for API keys**
   ```bash
   faj config api-key  # Masked input
   ```

3. **Rotate keys regularly**
   - Update keys periodically
   - Revoke old keys after updating

4. **Check configuration before sharing**
   ```bash
   faj config show  # Shows key status, not actual keys
   ```

## Troubleshooting

### API Key Not Working
```bash
# Re-configure API key
faj config api-key -p gemini

# Verify configuration
faj config show
```

### Wrong Language Generated
```bash
# Check current language
faj config show

# Set correct language
faj config language zh  # For Chinese
faj config language en  # For English
```

### Model Not Found
```bash
# List available models in docs
cat docs/AI_MODEL_CONFIGURATION.md

# Set valid model
faj config ai -m gemini-1.5-flash
```

## Advanced Usage

### Environment Variables Override
Environment variables take precedence over config file:

```bash
# Temporary override
FAJ_RESUME_LANGUAGE=en faj analyze .

# Export for session
export FAJ_AI_MODEL=gemini-1.5-pro
faj analyze .
```

### Batch Configuration
Create a script for team setup:

```bash
#!/bin/bash
# setup.sh
faj config ai -p gemini -m gemini-1.5-flash
faj config language zh
echo "Please configure your API key:"
faj config api-key -p gemini
```

## Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `config show` | Display current settings | `faj config show` |
| `config ai` | Configure AI settings | `faj config ai --interactive` |
| `config language` | Set resume language | `faj config language zh` |
| `config api-key` | Configure API keys | `faj config api-key -p gemini` |
| `config get` | Get configuration value | `faj config get ai.provider` |
| `config set` | Set configuration value | `faj config set profile.name "张三"` |
| `config list` | List all configuration | `faj config list` |

## Tips

1. **First Time Setup**: Use `faj config ai --interactive`
2. **Quick Language Switch**: `faj config language en/zh/ja`
3. **Check Status**: `faj config show`
4. **Secure API Keys**: Always use `config api-key` command
5. **Test Configuration**: Run `faj analyze .` after changes