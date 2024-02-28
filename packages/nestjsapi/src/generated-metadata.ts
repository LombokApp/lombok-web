/* eslint-disable */
export default async () => {
    const t = {};
    return { "@nestjs/swagger": { "models": [], "controllers": [[import("./app.controller"), { "AppController": { "getAppInfo": { type: Object } } }], [import("./auth/auth.controller"), { "AuthController": { "login": { type: Object } } }]] } };
};