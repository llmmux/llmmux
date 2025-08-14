# Release Process Guide

This document outlines the release process for vLLM Router, including automated workflows and manual steps required for creating releases.

## 🔄 Release Workflow Overview

We use a structured release process with two main GitHub Actions workflows:

1. **`prepare-release.yml`** - Prepares release candidates
2. **`release.yml`** - Builds and publishes releases

## 🚀 How to Create a Release

### Step 1: Prepare the Release

1. **Go to GitHub Actions** → **"🔖 Prepare Release"** workflow
2. **Click "Run workflow"** and provide:
   - **Version**: e.g., `0.3.1` (without the 'v' prefix)
   - **Release Type**: `patch`, `minor`, `major`, or `prerelease`

3. **The workflow will automatically**:
   - Create a release branch `release/v[VERSION]`
   - Update `package.json` version
   - Create draft release notes if they don't exist
   - Open a Pull Request

### Step 2: Review and Update

1. **Review the Pull Request** created by the workflow
2. **Edit `docs/releases/RELEASE_NOTES_v0.3.1.md`** with actual features:
   - Replace placeholder content with actual features
   - Document breaking changes and migration steps
   - Include relevant technical improvements
3. **Verify all tests pass** in the PR
4. **Update documentation** if needed

### Step 3: Merge and Tag

1. **Merge the Pull Request** when ready
2. **Create and push the release tag**:
   ```bash
   git checkout main
   git pull origin main
   git tag v[VERSION]
   git push origin v[VERSION]
   ```

### Step 4: Automatic Release

Once the tag is pushed, the **release workflow** automatically:
- ✅ Runs full test suite with database
- 🔍 Performs security audit
- 🏗️ Builds multi-architecture Docker images
- 📦 Pushes to GitHub Container Registry (GHCR)
- 🐳 Pushes to Docker Hub
- 📝 Creates GitHub release with notes
- 🎉 Publishes the release

## 📋 Release Types

### Patch Release (0.3.0 → 0.3.1)
- Bug fixes
- Security patches
- Documentation updates
- No breaking changes

### Minor Release (0.3.0 → 0.4.0)
- New features
- Enhancements
- Deprecations (with backward compatibility)
- Database schema additions (backward compatible)

### Major Release (0.3.0 → 1.0.0)
- Breaking changes
- API modifications
- Database schema changes requiring migration
- Architecture changes

### Pre-release (0.3.0 → 0.4.0-beta.1)
- Beta/alpha releases
- Release candidates
- Testing new features

## 🔍 Release Checklist

### Before Creating Release PR
- [ ] All features are complete and tested
- [ ] Documentation is updated
- [ ] Breaking changes are documented
- [ ] Database migrations are tested
- [ ] Docker builds are verified

### Before Merging Release PR
- [ ] Release notes are comprehensive and accurate
- [ ] Version number follows semantic versioning
- [ ] All CI/CD checks pass
- [ ] Manual testing is complete
- [ ] Security review is done (for major releases)

### After Release
- [ ] Verify Docker images are available
- [ ] Test deployment with new release
- [ ] Update deployment documentation if needed
- [ ] Announce release in relevant channels

## 🐳 Docker Images

Releases are published to two registries:

### GitHub Container Registry (GHCR)
- **Image**: `ghcr.io/llmmux/llmmux`
- **Tags**: `latest`, `v[VERSION]`, `[MAJOR].[MINOR]`, `[MAJOR]`

### Docker Hub
- **Image**: `llmmux/llmmux`
- **Tags**: `latest`, `v[VERSION]`, `[MAJOR].[MINOR]`, `[MAJOR]`

### Image Features
- **Multi-architecture**: `linux/amd64`, `linux/arm64`
- **Optimized**: Multi-stage builds with caching
- **Production-ready**: Includes all dependencies and migrations

## 🔒 Permissions Required

### GitHub Repository Permissions
- **Contents**: `write` (for creating tags and releases)
- **Packages**: `write` (for publishing to GHCR)
- **Pull Requests**: `write` (for creating release PRs)

### Docker Hub Secrets
- `DOCKERHUB_USERNAME`: Docker Hub username
- `DOCKERHUB_TOKEN`: Docker Hub access token

## 🚨 Emergency Releases

For critical security fixes or urgent bug fixes:

1. **Create hotfix branch** from `main`:
   ```bash
   git checkout main
   git checkout -b hotfix/v[VERSION]
   ```

2. **Apply fix and test thoroughly**

3. **Use manual release process**:
   - Update version in `package.json`
   - Create release notes
   - Push tag directly (skip PR process if urgent)

4. **Follow up with proper documentation**

## 🔄 Rollback Process

If a release has critical issues:

1. **Create rollback tag** pointing to previous stable version
2. **Update Docker image tags** to point to stable version
3. **Communicate rollback** to users
4. **Fix issues** and create new release

## 📞 Support

For questions about the release process:
- Check existing [GitHub Issues](https://github.com/llmmux/llmmux/issues)
- Create new issue with `release` label
- Contact maintainers for urgent release matters

---

**Note**: This process is designed for the v0.3.0+ architecture with database authentication and Docker deployment. Earlier versions may require different procedures.
