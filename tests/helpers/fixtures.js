// Tests run against a fixed catalog (tests/fixtures/store.json), independent of the store's own demo data.
import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/store.json');

export async function useFixture(context) {
  await context.route('**/data/store.json*', (route) => route.fulfill({ path: FIXTURE, contentType: 'application/json' }));
}

export const test = base.extend({
  context: async ({ context }, use) => { await useFixture(context); await use(context); },
});
export { expect };
