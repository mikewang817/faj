# AI Model Configuration Guide

## Overview

FAJ supports configuring AI models through environment variables, allowing you to choose the best model for your needs.

## Configuration

### Setting the AI Model

Add the `FAJ_AI_MODEL` variable to your `.env` file:

```env
# AI Provider
FAJ_AI_PROVIDER=gemini

# AI Model (optional - uses provider default if not set)
FAJ_AI_MODEL=gemini-1.5-flash
```

## Supported Models

### Google Gemini Models

| Model | Description | Rate Limits | Best For |
|-------|-------------|-------------|----------|
| `gemini-1.5-flash` | Fast, efficient model | Higher limits | **Recommended** - Quick resume generation |
| `gemini-1.5-pro` | Advanced reasoning | Lower limits | Complex analysis, premium quality |
| `gemini-1.0-pro` | Stable, older model | Moderate limits | Fallback option |

### OpenAI Models (Coming Soon)

| Model | Description | Best For |
|-------|-------------|----------|
| `gpt-4` | Most capable | Best quality results |
| `gpt-4-turbo-preview` | Faster GPT-4 | Balance of speed and quality |
| `gpt-3.5-turbo` | Fast and affordable | Quick iterations |

### Anthropic Models (Coming Soon)

| Model | Description | Best For |
|-------|-------------|----------|
| `claude-3-opus` | Most powerful | Complex reasoning |
| `claude-3-sonnet` | Balanced | General use |
| `claude-2.1` | Previous generation | Budget option |

## Usage Examples

### Using Default Model

If you don't set `FAJ_AI_MODEL`, the provider's default model will be used:

```env
FAJ_AI_PROVIDER=gemini
# FAJ_AI_MODEL not set - will use gemini-1.5-flash by default
```

### Switching Models

To use a different model, simply update your `.env`:

```env
# For higher quality (but with stricter rate limits)
FAJ_AI_MODEL=gemini-1.5-pro

# For fastest response
FAJ_AI_MODEL=gemini-1.5-flash
```

### Testing Different Models

```bash
# Test with flash model
FAJ_AI_MODEL=gemini-1.5-flash faj analyze .

# Test with pro model
FAJ_AI_MODEL=gemini-1.5-pro faj analyze .
```

## Rate Limits and Quotas

### Free Tier Limits (Gemini)

| Model | Requests/Minute | Requests/Day | Input Tokens/Minute |
|-------|-----------------|--------------|---------------------|
| `gemini-1.5-flash` | 15 | 1,500 | 1,000,000 |
| `gemini-1.5-pro` | 2 | 50 | 32,000 |

### Handling Rate Limits

If you encounter rate limit errors:

1. **Switch to a different model**:
   ```env
   # If pro model hits limits, switch to flash
   FAJ_AI_MODEL=gemini-1.5-flash
   ```

2. **Wait and retry**:
   - The system automatically retries 3 times with delays
   - Wait a minute between requests for pro models

3. **Upgrade your API plan**:
   - Consider upgrading to a paid plan for higher limits

## Troubleshooting

### Model Not Found

If you see "model not found" errors:
- Check the model name is spelled correctly
- Ensure the model is available in your region
- Try using the default model (remove `FAJ_AI_MODEL`)

### Quota Exceeded

```
Error: You exceeded your current quota
```

Solutions:
1. Switch to `gemini-1.5-flash` (higher limits)
2. Wait before making more requests
3. Check your [Google AI Studio](https://makersuite.google.com) quota

### Verifying Configuration

Check which model is being used:

```bash
# View current configuration
grep FAJ_AI_MODEL .env

# Test with verbose output
node dist/index.js analyze . 2>&1 | grep -i model
```

## Best Practices

1. **Development**: Use `gemini-1.5-flash` for faster iteration
2. **Production**: Use `gemini-1.5-pro` for best quality (with proper rate limiting)
3. **Testing**: Keep multiple API keys for different models
4. **Monitoring**: Track your usage in the provider's dashboard

## Environment Variable Priority

The system checks for models in this order:
1. `FAJ_AI_MODEL` environment variable
2. Command-line flag (future feature)
3. Provider's default model

## Example Configuration

Complete `.env` setup:

```env
# Provider Configuration
FAJ_AI_PROVIDER=gemini
FAJ_AI_MODEL=gemini-1.5-flash

# API Keys
FAJ_GEMINI_API_KEY=your_api_key_here

# Development Settings
FAJ_ENV=development
FAJ_LOG_LEVEL=info
```

## Future Enhancements

- [ ] Model selection via CLI flag: `faj analyze . --model gpt-4`
- [ ] Automatic fallback to different models on rate limits
- [ ] Model performance comparison tool
- [ ] Cost estimation per model