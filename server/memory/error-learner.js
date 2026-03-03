"use strict";
/**
 * Error Learner — Auto-captures build/test error patterns.
 *
 * When build output or test output contains errors, this module:
 * 1. Extracts the error pattern (TS error codes, common messages)
 * 2. Maps to a human-readable lesson ("TS2345: argument type mismatch")
 * 3. Stores as BUG_FIX memory so the AI avoids repeating the same mistake
 *
 * This is the #1 gap: the AI keeps making the same TS compile errors
 * because it forgets what went wrong last time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractErrorPatterns = extractErrorPatterns;
exports.containsErrors = containsErrors;
// ─── TypeScript Error Patterns ────────────────────────────────────────────────
const TS_ERROR_LESSONS = {
    'TS2345': 'Argument type mismatch — check function parameter types match expected signatures',
    'TS2322': 'Type assignment error — ensure the value matches the declared type',
    'TS2339': 'Property does not exist — check spelling or add the property to the interface',
    'TS2304': 'Cannot find name — missing import or undeclared variable',
    'TS2305': 'Module has no exported member — check the export name matches exactly',
    'TS2307': 'Cannot find module — check the import path is correct',
    'TS2554': 'Wrong number of arguments — check function signature for required params',
    'TS2769': 'No overload matches this call — check argument types against all overload signatures',
    'TS7006': 'Parameter implicitly has any type — add explicit type annotation',
    'TS2741': 'Missing property in type — add required properties to the object',
    'TS18046': 'Variable is of type unknown — add type assertion or type guard',
    'TS2352': 'Conversion of type may be a mistake — use "as unknown as T" for forced cast',
    'TS1005': 'Expected token — syntax error, check for missing brackets/semicolons',
    'TS2531': 'Object is possibly null — add null check or use optional chaining',
    'TS2532': 'Object is possibly undefined — add undefined check or use optional chaining',
    'TS2349': 'Not callable — value is not a function, check the type',
    'TS2551': 'Property does not exist, did you mean? — typo in property name',
    'TS6133': 'Declared but never used — remove unused variable or prefix with _',
};
/**
 * Extract error patterns from build/test output text.
 */
function extractErrorPatterns(text) {
    const errors = [];
    const seen = new Set();
    // 1. TypeScript errors: TS2345, TS2322, etc.
    const tsErrorRegex = /(?:error\s+)?(TS\d{4,5})\s*:\s*(.+?)(?:\r?\n|$)/gi;
    let match;
    while ((match = tsErrorRegex.exec(text)) !== null) {
        const code = match[1].toUpperCase();
        const msg = match[2].trim().slice(0, 150);
        if (seen.has(code))
            continue;
        seen.add(code);
        const lesson = TS_ERROR_LESSONS[code] || `${code}: ${msg}`;
        errors.push({
            errorType: code,
            message: lesson,
            confidence: 0.90,
        });
    }
    // 2. TypeScript "not assignable" pattern (without error code)
    if (!seen.has('TYPE_MISMATCH')) {
        const assignRegex = /Type '([^']+)' is not assignable to type '([^']+)'/gi;
        while ((match = assignRegex.exec(text)) !== null) {
            if (seen.has('TYPE_MISMATCH'))
                break;
            seen.add('TYPE_MISMATCH');
            errors.push({
                errorType: 'TYPE_MISMATCH',
                message: `Type mismatch: '${match[1].slice(0, 40)}' cannot be assigned to '${match[2].slice(0, 40)}' — check type compatibility`,
                confidence: 0.85,
            });
        }
    }
    // 3. Module not found
    const moduleRegex = /(?:Cannot find module|Module not found)[:\s]+['"]([^'"]+)['"]/gi;
    while ((match = moduleRegex.exec(text)) !== null) {
        const mod = match[1];
        if (seen.has(`MOD:${mod}`))
            continue;
        seen.add(`MOD:${mod}`);
        errors.push({
            errorType: 'MODULE_NOT_FOUND',
            message: `Module '${mod}' not found — verify it's installed in package.json and the import path is correct`,
            confidence: 0.90,
        });
    }
    // 4. Property does not exist on type
    const propRegex = /Property '(\w+)' does not exist on type '([^']+)'/gi;
    while ((match = propRegex.exec(text)) !== null) {
        const key = `PROP:${match[1]}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        errors.push({
            errorType: 'MISSING_PROPERTY',
            message: `Property '${match[1]}' not on type '${match[2].slice(0, 40)}' — check interface definition or use type assertion`,
            confidence: 0.85,
        });
    }
    // 5. Test failures
    const testFailRegex = /(?:FAIL|FAILED|Error)[\s:]+(.+?test.+?)(?:\r?\n|$)/gi;
    while ((match = testFailRegex.exec(text)) !== null) {
        const key = `TEST:${match[1].slice(0, 30)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        errors.push({
            errorType: 'TEST_FAILURE',
            message: `Test failed: ${match[1].trim().slice(0, 100)}`,
            file: match[1].trim(),
            confidence: 0.75,
        });
    }
    // 6. Function signature mismatch
    const sigRegex = /Expected (\d+) arguments?, but got (\d+)/gi;
    while ((match = sigRegex.exec(text)) !== null) {
        if (seen.has('SIG_MISMATCH'))
            continue;
        seen.add('SIG_MISMATCH');
        errors.push({
            errorType: 'SIGNATURE_MISMATCH',
            message: `Wrong argument count: expected ${match[1]} but got ${match[2]} — check the function signature`,
            confidence: 0.90,
        });
    }
    return errors;
}
/**
 * Check if text contains build/test error indicators.
 */
function containsErrors(text) {
    const errorIndicators = [
        /error TS\d{4}/i,
        /\bFAIL\b.*test/i,
        /Build failed/i,
        /compilation error/i,
        /Cannot find module/i,
        /SyntaxError:/i,
        /TypeError:/i,
        /ReferenceError:/i,
        /npm ERR!/,
        /Exit code: [1-9]/,
    ];
    return errorIndicators.some(r => r.test(text));
}
//# sourceMappingURL=error-learner.js.map