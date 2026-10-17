#!/usr/bin/env node
/**
 * Validate openapi.json structure and syntax
 */
const fs = require('fs');
const path = require('path');

const openApiPath = path.join(__dirname, '..', 'openapi.json');

try {
  const content = fs.readFileSync(openApiPath, 'utf8');
  const spec = JSON.parse(content);

  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    console.error('FAIL: openapi version must be 3.x');
    process.exit(1);
  }

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    console.error('FAIL: No paths defined in openapi.json');
    process.exit(1);
  }

  if (!spec.components || !spec.components.schemas) {
    console.error('FAIL: No schemas defined in components');
    process.exit(1);
  }

  console.log(`OK: openapi.json is valid OpenAPI ${spec.openapi}`);
  console.log(`Endpoints: ${Object.keys(spec.paths).length}`);
  console.log(`Schemas: ${Object.keys(spec.components.schemas).length}`);
  process.exit(0);
} catch (err) {
  console.error('FAIL: Error validating openapi.json:', err.message);
  process.exit(1);
}
