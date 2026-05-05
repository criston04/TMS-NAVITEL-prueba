---
description: "Use when reviewing code for security concerns, handling authentication, authorization, input validation, XSS prevention, secret management, or OWASP Top 10 risks. Applies a security review mindset to all TMS-NAVITEL code."
---

# Security Instructions — TMS-NAVITEL

## Threat Model Context

TMS-NAVITEL is a transport management system handling:
- **Authentication/authorization**: User sessions, roles, permissions, tenant isolation
- **Sensitive data**: Customer addresses, delivery routes, financial records, driver info
- **External integrations**: Geocoding APIs, map tile servers, potential payment gateways
- **File processing**: CSV/Excel import for delivery points, PDF report generation

## Always Check

### Input Validation
- Validate all external inputs at the boundary (forms, URL params, imported files).
- Use Zod schemas for runtime validation — never trust client data.
- Sanitize filenames and file contents on upload (CSV/Excel import in route-planner).
- Validate and limit pagination params to prevent resource exhaustion.

### Authentication & Authorization
- The auth context (`src/contexts/auth-context.tsx`) manages user state.
- Navigation items have `requiredPermission`, `requiredModule`, `allowedTiers`, and `platformOnly` metadata.
- Always verify that permission checks happen before rendering protected content.
- Never expose admin-only data in client-accessible API responses.
- Separate authentication (who are you?) from authorization (what can you do?).

### XSS Prevention
- React's JSX auto-escapes by default — never bypass with `dangerouslySetInnerHTML`.
- When rendering user-provided content, ensure it's sanitized.
- Never inject user data into `href`, `src`, or event handler attributes without validation.
- Map popups (Leaflet) that display user data must escape HTML.

### Secret Management
- **Never hardcode** API keys, tokens, passwords, or credentials in source code.
- Use `NEXT_PUBLIC_` env vars only for non-sensitive client configuration.
- Sensitive keys must stay server-side (API routes, server components).
- Check that `apiConfig` doesn't leak sensitive URLs in client bundles.

### Data Exposure
- Don't log sensitive data (credentials, full customer records, financial details).
- Error messages shown to users must not contain stack traces or internal details.
- API error responses should return safe, generic messages.
- Audit that exported PDFs and Excel files don't contain hidden sensitive columns.

## Security Patterns for This Codebase

### Forms (React Hook Form + Zod)
```typescript
// ✅ Always validate with Zod schemas
const orderSchema = z.object({
  customerName: z.string().min(1).max(200),
  deliveryAddress: z.string().min(1).max(500),
  quantity: z.number().int().positive().max(99999),
});
```

### Service Layer
```typescript
// ✅ Type-safe error handling without leaking internals
try {
  return await apiClient.post('/orders', data);
} catch (error) {
  throw new AppError('Failed to create order', { cause: error });
}
```

### File Import
```typescript
// ✅ Validate file type and size before processing
if (!['text/csv', 'application/vnd.ms-excel'].includes(file.type)) {
  throw new ValidationError('Invalid file type');
}
if (file.size > MAX_IMPORT_SIZE) {
  throw new ValidationError('File too large');
}
```

## Risk Classification for Code Changes

| Risk Level | Description | Examples |
|-----------|-------------|----------|
| **Low** | Local UI change, no data flow change | Styling, static text, layout |
| **Medium** | Shared flow or behavior change | Form validation, filter logic, state management |
| **High** | Touches auth, data, API contracts, or file I/O | Auth context, service endpoints, CSV import, PDF export |

## What to Avoid

- `dangerouslySetInnerHTML` without sanitization
- Storing tokens in localStorage (prefer httpOnly cookies)
- Disabling TypeScript strict mode for convenience
- Bypassing auth checks for "quick testing"
- Exposing internal implementation details in error messages
- Using `eval()`, `Function()`, or `setTimeout/setInterval` with strings
