export declare const schema: {
    readonly openapi: "3.0.0";
    readonly paths: {
        readonly "/": {
            readonly get: {
                readonly operationId: "getAppInfo";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "The app info.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AppInfoDTO";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["App"];
            };
        };
        readonly "/auth/login": {
            readonly post: {
                readonly operationId: "login";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/LoginDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Authenticate the user and return access and refresh tokens.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserSessionDTO";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
            };
        };
    };
    readonly info: {
        readonly title: "@stellariscloud/api";
        readonly description: "The Stellaris Cloud core API";
        readonly version: "1.0";
        readonly contact: {};
    };
    readonly tags: readonly [];
    readonly servers: readonly [];
    readonly components: {
        readonly securitySchemes: {
            readonly bearer: {
                readonly scheme: "bearer";
                readonly bearerFormat: "JWT";
                readonly type: "http";
            };
        };
        readonly schemas: {
            readonly AppInfoDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly version: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["version"];
            };
            readonly LoginDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly login: {
                        readonly type: "string";
                    };
                    readonly password: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["login", "password"];
            };
            readonly UserSessionDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly accessToken: {
                        readonly type: "string";
                    };
                    readonly refreshToken: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["accessToken", "refreshToken"];
            };
        };
    };
};
