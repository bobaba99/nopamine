# JSON Configuration Report

**Generated:** January 23, 2026  
**Scope:** Root, apps/api, apps/web, apps/mobile, packages/shared

---

## Summary

| Status | Critical | Warnings | Info |
|--------|----------|----------|------|
| 2 | 4 | 5 | 3 |

---

## Critical Issues

### 1. apps/api/package.json - Wrong Configuration (CRITICAL)

**File:** `apps/api/package.json`

**Problem:** This file contains mobile/Expo configuration instead of API backend configuration.

- **Name mismatch:** Currently `"name": "mobile"` should be `"api"`
- **Wrong dependencies:** Contains `expo`, `react-native` instead of backend packages (e.g., express, fastify)
- **Wrong scripts:** Contains `expo start`, `android`, `ios` scripts instead of dev/start scripts for a backend server
- **Duplicate content:** Identical to `apps/mobile/package.json`

**Expected content for backend API:**
```json
{
  "name": "api",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

---

### 2. Duplicate Package Names (CRITICAL)

**Affected files:**
- `apps/api/package.json` - name: "mobile"
- `apps/mobile/package.json` - name: "mobile"

**Impact:** NPM workspaces may have naming conflicts when publishing or linking packages.

---

### 3. Missing apps/api/src Directory (CRITICAL)

**Observation:** The `apps/api/` directory lacks a `src/` directory.

**Required:** Create `apps/api/src/index.ts` and other backend source files.

---

### 4. Root package.json - Unused main Entry (CRITICAL)

**File:** `package.json:6`

```json
"main": "index.js"
```

**Problem:** No `index.js` exists in root directory. This field is unnecessary for workspace root and can be removed.

---

## Warnings

### 5. React Version Inconsistency

| Package | React Version |
|---------|---------------|
| apps/web | ^19.2.0 |
| apps/mobile | 19.1.0 |

**Recommendation:** Align React versions across web and mobile for shared component compatibility.

---

### 6. TypeScript Version Mismatch

| Package | TypeScript Version |
|---------|-------------------|
| apps/web | ~5.9.3 |
| apps/mobile/api | ~5.9.2 |

**Recommendation:** Use consistent TypeScript versions (e.g., ~5.9.3 across all packages).

---

### 7. apps/api Missing tsconfig include Paths

**File:** `apps/api/tsconfig.json:8`

```json
"include": ["src"]
```

**Problem:** `src` directory doesn't exist yet. Will cause TypeScript errors when created.

---

### 8. Mobile app.json - Deprecated Predictive Back Gesture

**File:** `apps/mobile/app.json:24`

```json
"predictiveBackGestureEnabled": false
```

**Note:** This setting may be deprecated in newer Expo SDK versions. Verify against Expo 54 documentation.

---

### 9. Root package.json - Empty Keywords

**File:** `package.json:26`

```json
"keywords": []
```

**Recommendation:** Add relevant keywords for npm discoverability.

---

## Informational

### 10. Workspace Configuration - Correct

**File:** `package.json:7-10`

```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

✅ Properly configured npm workspaces for monorepo structure.

---

### 11. Path Aliases - Configured

**File:** `tsconfig.base.json:11-13`

```json
"paths": {
  "@shared/*": ["packages/shared/src/*"]
}
```

✅ Path alias `@shared/*` configured for all apps to reference shared package.

**Status by app:**
- ✅ apps/web - extends base config
- ✅ apps/api - extends base config  
- ✅ apps/mobile - extends base config

---

### 12. Expo Configuration - Valid

**File:** `apps/mobile/app.json`

✅ All required fields present (name, slug, version, icons, splash)

---

## Recommendations

### Immediate Actions

1. **Fix apps/api/package.json** - Replace with proper backend configuration
2. **Rename package** - Change apps/api name from "mobile" to "api"
3. **Create apps/api/src/** - Add backend entry point
4. **Remove root main field** - Delete `"main": "index.js"` from root package.json

### Short-term

1. Align React versions (use ^19.2.0 across web and mobile)
2. Align TypeScript versions (use ~5.9.3)
3. Add src directory to apps/api with proper TypeScript entry point
4. Consider adding workspace dependencies for shared package usage

### Long-term

1. Add inter-package dependencies where needed:
   - web → shared (for UI components)
   - api → shared (for utilities/types)
   - mobile → shared (for shared types)
2. Add tsconfig references for project references build (apps/web/tsconfig.app.json pattern)
3. Consider adding turbo or nx for optimized builds

---

## File Reference Summary

| File | Status | Issues |
|------|--------|--------|
| package.json | ⚠️ | Unused main field, empty keywords |
| apps/api/package.json | ❌ | Wrong configuration, duplicate name |
| apps/web/package.json | ✅ | Correctly configured |
| apps/mobile/package.json | ✅ | Correctly configured |
| packages/shared/package.json | ✅ | Correctly configured |
| apps/mobile/app.json | ⚠️ | Deprecated setting warning |
| tsconfig.base.json | ✅ | Path aliases configured |
| apps/api/tsconfig.json | ⚠️ | include paths to non-existent src |
| apps/web/tsconfig.json | ✅ | Properly extends base |
| apps/mobile/tsconfig.json | ✅ | Properly extends base |
