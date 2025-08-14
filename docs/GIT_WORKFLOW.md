# Git Workflow & Branching Strategy

This document outlines the Git workflow and branching strategy for LLMMux (Open Source Project).

## Branch Structure

### Main Branches (Maintainer Only)

- **`main`** - Stable releases
  - Contains released versions
  - Protected branch with required reviews
  - Only maintainers can merge
  - Tagged with version numbers

- **`develop`** - Integration branch
  - Next release development
  - All feature PRs target this branch
  - Maintainers merge to main for releases

### Contributor Branches

#### Feature Branches
- **Pattern**: `feature/description` or `feature/issue-number-description`
- **Purpose**: Develop new features
- **Branch from**: `develop` (from your fork)
- **PR to**: `develop`
- **Examples**:
  - `feature/api-key-management`
  - `feature/123-rate-limiting`
  - `feature/docker-compose-setup`

#### Bugfix Branches
- **Pattern**: `fix/description` or `fix/issue-number-description`
- **Purpose**: Fix bugs
- **Branch from**: `develop` (from your fork)
- **PR to**: `develop`
- **Examples**:
  - `fix/auth-guard-timeout`
  - `fix/456-database-connection`

#### Documentation Branches
- **Pattern**: `docs/description`
- **Purpose**: Documentation improvements
- **Branch from**: `develop` (from your fork)
- **PR to**: `develop`
- **Examples**:
  - `docs/api-documentation`
  - `docs/installation-guide`

#### Hotfix Branches (Maintainer Only)
- **Pattern**: `hotfix/description`
- **Purpose**: Critical production fixes
- **Branch from**: `main`
- **Merge to**: `main` AND `develop`

## Contributor Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/llmmux.git
cd llmmux

# Add upstream remote
git remote add upstream https://github.com/llmmux/llmmux.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development environment
docker-compose up -d
npm run start:dev
```

### 3. Create Feature Branch

```bash
# Sync with upstream
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/my-awesome-feature

# Make changes and commit
git add .
git commit -m "feat: implement awesome feature"

# Push to your fork
git push origin feature/my-awesome-feature
```

### 4. Create Pull Request

1. Go to GitHub and create PR from your fork to `llmmux:develop`
2. Fill out the PR template
3. Wait for review and address feedback
4. Maintainer will merge when approved

### 5. Keep Fork Updated

```bash
# Regularly sync your fork
git checkout develop
git pull upstream develop
git push origin develop

# Update feature branch if needed
git checkout feature/my-feature
git merge develop
```

## Environment Configuration for Contributors

### Local Development Only
Contributors only need local development setup:

- **`.env`** - Your local configuration (not committed)
- **`.env.example`** - Template to copy from (committed)
- **`.env.test`** - Test configuration (committed)

### No Staging/Production Access
- Contributors don't have access to staging/production
- Deployment is handled by maintainers
- Focus on local development and testing

## Pull Request Guidelines

### Before Creating PR
- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`npm test`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] Branch is up to date with develop

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] New tests added for new features

## Screenshots (if applicable)

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples:
```
feat(auth): implement JWT authentication
fix(database): resolve connection timeout issue
docs(api): update API documentation
test(auth): add unit tests for authentication
chore: update dependencies
```

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Add JSDoc comments for public APIs

### Testing
- Write unit tests for new features
- Maintain test coverage above 80%
- Use Jest for testing framework
- Mock external dependencies

### Documentation
- Update README if needed
- Add JSDoc for new functions/classes
- Update API documentation
- Include examples in docs

## Local Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.service.spec.ts

# Run integration tests
npm run test:e2e

# Check test coverage
npm run test:cov

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples:
```
feat(auth): implement JWT authentication
fix(database): resolve connection timeout issue
docs(api): update API documentation
chore: update dependencies
```

## Pull Request Guidelines

### Feature/Fix PRs to Develop
- Include description of changes
- Link related issues
- Include tests for new features
- Update documentation if needed
- Ensure CI passes

### Release PRs to Staging/Main
- Include changelog updates
- Include version bump
- Include migration notes if needed
- Require additional review

### Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Changes work in all environments
```

## Environment Variables per Environment

Each environment should have its own configuration:

### Development (.env.development)
```bash
NODE_ENV=development
DATABASE_URL=mysql://dev_user:dev_pass@dev-db:3306/llmmux_dev
JWT_SECRET=dev-jwt-secret
LOG_LEVEL=debug
```

### Staging (.env.staging)
```bash
NODE_ENV=staging
DATABASE_URL=mysql://staging_user:staging_pass@staging-db:3306/llmmux_staging
JWT_SECRET=staging-jwt-secret
LOG_LEVEL=info
```

### Production (.env.production)
```bash
NODE_ENV=production
DATABASE_URL=mysql://prod_user:prod_pass@prod-db:3306/llmmux_prod
JWT_SECRET=secure-production-jwt-secret
LOG_LEVEL=warn
```

## Deployment Strategy

1. **Development**: Auto-deploy on push to `develop`
2. **Staging**: Auto-deploy on push to `staging`
3. **Production**: Auto-deploy on push to `main` (with manual approval)

## Quick Reference

| Action | Command |
|--------|---------|
| Start feature | `git checkout develop && git pull && git checkout -b feature/name` |
| Start hotfix | `git checkout main && git pull && git checkout -b hotfix/name` |
| Update feature | `git checkout develop && git pull && git checkout feature/name && git merge develop` |
| Finish feature | Create PR to `develop` |
| Finish hotfix | Create PR to `main` |
