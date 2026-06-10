/**
 * Vercel Serverless Entry Point
 * Este arquivo exporta o app para ser executado no Vercel
 */

const app = require('./dist/app').default;

module.exports = app;