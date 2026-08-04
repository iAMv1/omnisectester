# Publishing OmniSec Tester to npm

## Prerequisites

1. **npm account**: Create at https://www.npmjs.com/
2. **Package name**: Ensure `omnisectester` is available (or use scoped name like `@omnisectester/omnisectester`)
3. **GitHub repository**: https://github.com/omnisectester/omnisectester
4. **Python core**: https://github.com/omnisectester/omnisectester-core

## Step 1: Prepare Package

```bash
cd npm-package

# Verify package.json
cat package.json

# Test locally
npm install
npm test
npm link
omnisectester --version
```

## Step 2: Login to npm

```bash
npm login
# Enter username, password, email
```

## Step 3: Verify Package

```bash
# Check what will be published
npm pack --dry-run

# Verify package contents
npm pack
```

## Step 4: Publish

```bash
# First publish
npm publish

# Future publishes (update version first)
npm version patch  # 2.0.0 -> 2.0.1
npm publish
```

## Step 5: Verify Publication

```bash
# Check npm
npm info omnisectester

# Install globally
npm install -g omnisectester

# Test
omnisectester --version
omnisectester verify-tools
```

## Package Name Considerations

If `omnisectester` is taken:
- Use scoped package: `@omnisectester/cli`
- Update package.json name field
- Update all documentation

## Post-Publish

1. Update README with install instructions
2. Create GitHub release
3. Update documentation site
4. Announce on security channels
5. Update Homebrew formula (if applicable)