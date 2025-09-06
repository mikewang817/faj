# Environment Variables Setup Guide

## Quick Start

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:
```bash
# Open in your favorite editor
nano .env
# or
vim .env
# or
code .env
```

3. Add your API key(s):
```env
FAJ_GEMINI_API_KEY=your_actual_gemini_key_here
```

## Supported Environment Variables

### AI Provider Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `FAJ_AI_PROVIDER` | Default AI provider to use | No | `gemini`, `openai`, `anthropic` |
| `FAJ_GEMINI_API_KEY` | Google Gemini API key | If using Gemini | `AIza...` |
| `FAJ_OPENAI_API_KEY` | OpenAI API key | If using OpenAI | `sk-...` |
| `FAJ_ANTHROPIC_API_KEY` | Anthropic Claude API key | If using Anthropic | `sk-ant-...` |

### Getting API Keys

#### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and add to `.env`:
   ```env
   FAJ_GEMINI_API_KEY=AIzaSyC...
   ```

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key and add to `.env`:
   ```env
   FAJ_OPENAI_API_KEY=sk-...
   ```

#### Anthropic Claude
1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Click "Create Key"
3. Copy the key and add to `.env`:
   ```env
   FAJ_ANTHROPIC_API_KEY=sk-ant-...
   ```

## Usage Examples

### Basic Setup (Gemini)
```env
# .env
FAJ_AI_PROVIDER=gemini
FAJ_GEMINI_API_KEY=AIzaSyC_your_key_here
```

### Multiple Providers Setup
```env
# .env
FAJ_AI_PROVIDER=gemini  # Default provider
FAJ_GEMINI_API_KEY=AIzaSyC_your_gemini_key
FAJ_OPENAI_API_KEY=sk-your_openai_key
FAJ_ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
```

### Development Configuration
```env
# .env
FAJ_AI_PROVIDER=gemini
FAJ_GEMINI_API_KEY=your_key_here
FAJ_LOG_LEVEL=debug
FAJ_ENV=development
```

## Security Best Practices

1. **Never commit `.env` to version control**
   - The `.env` file is already in `.gitignore`
   - Use `.env.example` as a template

2. **Use different keys for different environments**
   - Development: `.env.development`
   - Production: `.env.production`

3. **Rotate keys regularly**
   - Update your API keys periodically
   - Revoke old keys after updating

4. **Set minimal permissions**
   - Use restricted API keys when possible
   - Set project/domain restrictions in provider dashboards

## Troubleshooting

### API Key Not Found
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.FAJ_AI_PROVIDER)"
```

### Invalid API Key
```bash
# Test your API key
faj config test-ai
```

### Permission Denied
```bash
# Fix file permissions
chmod 600 .env
```

## Priority Order

FAJ checks for API keys in this order:
1. Environment variables (from `.env` or system)
2. Command-line flags (if provided)
3. Encrypted config file (`~/.faj/config.json`)

Environment variables always take precedence for security.

## CI/CD Integration

For CI/CD pipelines, set environment variables directly:

### GitHub Actions
```yaml
env:
  FAJ_AI_PROVIDER: gemini
  FAJ_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

### GitLab CI
```yaml
variables:
  FAJ_AI_PROVIDER: gemini
  FAJ_GEMINI_API_KEY: ${GEMINI_API_KEY}
```

### Docker
```dockerfile
ENV FAJ_AI_PROVIDER=gemini
ENV FAJ_GEMINI_API_KEY=${GEMINI_API_KEY}
```

## Example Commands

```bash
# Test configuration
node test-env.js

# Run with environment variables
FAJ_AI_PROVIDER=openai FAJ_OPENAI_API_KEY=sk-... faj analyze .

# Use .env file (automatic)
faj analyze .
```