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
        readonly "/viewer": {
            readonly get: {
                readonly operationId: "getViewer";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
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
