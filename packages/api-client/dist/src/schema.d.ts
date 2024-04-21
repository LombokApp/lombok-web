export declare const schema: {
    readonly openapi: "3.0.0";
    readonly paths: {
        readonly "/auth/login": {
            readonly post: {
                readonly operationId: "login";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/LoginCredentialsDTO";
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
                                    readonly $ref: "#/components/schemas/LoginResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/auth/signup": {
            readonly post: {
                readonly operationId: "signup";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/SignupCredentialsDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Register a new user.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SignupResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/{eventId}": {
            readonly get: {
                readonly operationId: "getAppInfo";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get an event by id.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/EventDTO";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Event"];
            };
        };
        readonly "/{folderId}": {
            readonly get: {
                readonly operationId: "getAppInfo";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get a folder by id.";
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/server/settings": {
            readonly get: {
                readonly operationId: "getServerSettings";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get the server settings object.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
            };
        };
        readonly "/server/settings/{settingKey}": {
            readonly put: {
                readonly operationId: "setServerSetting";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Set a setting in the server settings objects.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
            };
        };
        readonly "/viewer": {
            readonly get: {
                readonly operationId: "getViewer";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ViewerGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Viewer"];
            };
            readonly put: {
                readonly operationId: "updateViewer";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UpdateViewerInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ViewerGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Viewer"];
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
            readonly LoginCredentialsDTO: {
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
            readonly LoginResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly session: {
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
                readonly required: readonly ["session"];
            };
            readonly SignupCredentialsDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly username: {
                        readonly type: "string";
                        readonly minLength: 3;
                        readonly maxLength: 64;
                    };
                    readonly email: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly password: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                };
                readonly required: readonly ["username", "password"];
            };
            readonly UserDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: readonly ["string", "null"];
                    };
                    readonly email: {
                        readonly type: readonly ["string", "null"];
                    };
                    readonly emailVerified: {
                        readonly type: "boolean";
                    };
                    readonly isAdmin: {
                        readonly type: "boolean";
                    };
                    readonly username: {
                        readonly type: "string";
                    };
                    readonly permissions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
                readonly required: readonly ["emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
            };
            readonly SignupResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly $ref: "#/components/schemas/UserDTO";
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly EventDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly eventKey: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["id", "eventKey"];
            };
            readonly ViewerGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly $ref: "#/components/schemas/UserDTO";
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly UpdateViewerInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["name"];
            };
        };
    };
};
