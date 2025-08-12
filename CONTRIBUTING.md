# Contributing to LLMMux

Thank you for considering contributing to LLMMux! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Environment details (OS, Node.js version, Docker version if applicable)
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Relevant logs or error messages

### Submitting Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the coding guidelines below
3. **Add tests** for any new functionality
4. **Update documentation** if necessary
5. **Ensure all tests pass** by running `npm test`
6. **Lint your code** with `npm run lint`
7. **Format your code** with `npm run format`
8. **Submit a pull request** with a clear description of changes

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/llmmux.git
cd llmmux

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run start:dev
```

## 📝 Coding Guidelines

### TypeScript/NestJS Standards

- Follow existing code style and patterns
- Use TypeScript strict mode
- Document public APIs with JSDoc comments
- Use meaningful variable and function names
- Keep functions focused and small

### Code Quality

- **ESLint**: Fix all linting errors (`npm run lint`)
- **Prettier**: Format code consistently (`npm run format`)
- **Tests**: Maintain or improve test coverage
- **Type Safety**: Avoid `any` types when possible

### Commit Messages

Follow conventional commit format:

```
type(scope): description

Examples:
feat(proxy): add streaming support for chat completions
fix(auth): handle missing bearer token gracefully
docs(readme): update installation instructions
test(models): add unit tests for model controller
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Test Guidelines

- Write unit tests for new features
- Mock external dependencies
- Test error cases and edge conditions
- Aim for high test coverage

## 📖 Documentation

When adding new features:

1. Update the README.md if it affects usage
2. Add JSDoc comments for public APIs
3. Update environment variable documentation
4. Include examples where helpful

## 🔄 Pull Request Process

1. **Update version** in package.json if making a release
2. **Update CHANGELOG.md** with your changes
3. **Ensure CI passes** (tests, linting, build)
4. **Request review** from maintainers
5. **Address feedback** promptly

## 🏷️ Release Process

Maintainers will handle releases:

1. Version bump following semantic versioning
2. Update CHANGELOG.md
3. Create GitHub release with notes
4. Publish to npm (if applicable)

## 💬 Getting Help

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Security**: Report security issues privately to the maintainers

## � Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 📄 License

This project uses a custom license that allows free use for non-commercial purposes. By contributing, you agree that your contributions will be licensed under the same terms. For commercial use, explicit permission from the project owner is required.

Thank you for contributing to LLMMux! 🚀
