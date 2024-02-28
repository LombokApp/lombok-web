/* eslint-disable */
export default async () => {
    const t = {
        ["./app-info.dto"]: await import("./app-info.dto"),
        ["./auth/user-session.dto"]: await import("./auth/user-session.dto")
    };
    return { "@nestjs/swagger": { "models": [[import("./app-info.dto"), { "AppInfoDTO": { version: { required: true, type: () => String } } }], [import("./auth/login.dto"), { "LoginDTO": { login: { required: true, type: () => String }, password: { required: true, type: () => String } } }], [import("./auth/user-session.dto"), { "UserSessionDTO": { accessToken: { required: true, type: () => String }, refreshToken: { required: true, type: () => String } } }]], "controllers": [[import("./app.controller"), { "AppController": { "getAppInfo": { type: t["./app-info.dto"].AppInfoDTO } } }], [import("./auth/auth.controller"), { "AuthController": { "login": { type: t["./auth/user-session.dto"].UserSessionDTO } } }]] } };
};