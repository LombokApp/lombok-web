/* eslint-disable */
export default async () => {
    const t = {};
    return { "@nestjs/swagger": { "models": [], "controllers": [[import("./app.controller"), { "AppController": { "getHello": { type: String } } }], [import("./auth/auth.controller"), { "AuthController": { "login": { type: String }, "test": { type: String } } }]] } };
};