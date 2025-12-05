/// <reference path="./global.d.ts" />
import * as functions from 'firebase-functions';
// Export an HTTPS function and mount the app under /api via rewrite rules
export const api = functions.region('europe-west1').https.onRequest(async (req, res) => {
    // Dynamically resolve and import the root app factory so paths work both locally and in Cloud Functions
    // Compiled file is /workspace/functions/lib/index.js; project app is at /workspace/src/app.js
    // So we need to go up three segments: functions/lib -> .. -> functions -> .. -> workspace root
    const appModuleUrl = new URL('../../../src/app.js', import.meta.url);
    // @ts-ignore - external JS module from root project provides createApp
    const { createApp } = await import(appModuleUrl.href);
    const app = createApp();
    return app(req, res);
});
