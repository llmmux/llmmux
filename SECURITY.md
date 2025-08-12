# Security Policy

## 🔒 Reporting Security Vulnerabilities

We take the security of LLMMux seriously. If you discover a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

## 📧 How to Report

To report a security vulnerability, please email: **security@[your-domain].com**

Or create a private security advisory on GitHub.

Include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

## ⏱️ Response Timeline

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a detailed response within 7 days indicating next steps
- We will notify you when the vulnerability has been fixed

## 🛡️ Security Best Practices

When using LLMMux in production:

### Authentication
- Use strong, unique API keys
- Rotate API keys regularly
- Never commit API keys to version control
- Use environment variables for sensitive configuration

### Network Security
- Deploy behind a reverse proxy (nginx, Cloudflare, etc.)
- Use HTTPS in production
- Implement rate limiting
- Configure CORS appropriately for your use case

### Monitoring
- Monitor authentication failures
- Log and monitor API usage patterns
- Set up alerts for unusual activity
- Regularly review access logs

### Infrastructure
- Keep dependencies up to date
- Use container scanning tools
- Follow principle of least privilege
- Implement proper logging and monitoring

## 🔄 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Yes            |
| < 1.0   | ❌ No             |

## 🔍 Known Security Considerations

- This application proxies requests to vLLM servers - ensure your vLLM backends are properly secured
- API keys are stored in memory - consider using external secret management for enhanced security
- Health check endpoints expose server status - restrict access in production if needed

## 📝 Disclosure Policy

- We will coordinate the timing of any public disclosure with you
- We prefer to disclose vulnerabilities once fixes are available
- We will credit you in our security advisories (if desired)

## 🏆 Security Hall of Fame

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be listed here (with permission).

---

Thank you for helping keep LLMMux and our users safe!
