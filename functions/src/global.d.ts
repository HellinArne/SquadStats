declare module '../../src/app.js' {
  import type { Express } from 'express';
  export function createApp(): Express;
}
