export declare const schema: {
    readonly openapi: "3.0.0";
    readonly paths: {
        readonly "/": {
            readonly get: {
                readonly operationId: "AppController_getAppInfo";
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
            };
        };
        readonly "/auth/login": {
            readonly post: {
                readonly operationId: "AuthController_login";
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
                    readonly "200": {
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
                readonly properties: {};
            };
            readonly LoginDTO: {
                readonly type: "object";
                readonly properties: {};
            };
            readonly UserSessionDTO: {
                readonly type: "object";
                readonly properties: {};
            };
        };
    };
};
