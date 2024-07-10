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
        readonly "/auth/logout": {
            readonly post: {
                readonly operationId: "logout";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Logout. Kill the current session.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/auth/refresh-token": {
            readonly post: {
                readonly operationId: "refreshToken";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Logout. Kill the current session.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TokenRefreshResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
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
        readonly "/server/users": {
            readonly post: {
                readonly operationId: "createUser";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UserCreateInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Create a user.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Users"];
            };
            readonly get: {
                readonly operationId: "listUsers";
                readonly parameters: readonly [{
                    readonly name: "offset";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }, {
                    readonly name: "limit";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }, {
                    readonly name: "isAdmin";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "boolean";
                    };
                }, {
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["createdAt-asc", "createdAt-desc", "email-asc", "email-desc", "name-asc", "name-desc", "role-asc", "role-desc", "status-asc", "status-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "List the users.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserListResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Users"];
            };
        };
        readonly "/server/users/{userId}": {
            readonly patch: {
                readonly operationId: "updateUser";
                readonly parameters: readonly [{
                    readonly name: "userId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UserUpdateInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Update a user.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Users"];
            };
            readonly get: {
                readonly operationId: "getUser";
                readonly parameters: readonly [{
                    readonly name: "userId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get a user by id.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Users"];
            };
            readonly delete: {
                readonly operationId: "deleteUser";
                readonly parameters: readonly [{
                    readonly name: "userId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Delete a server user by id.";
                    };
                };
                readonly tags: readonly ["Users"];
            };
        };
        readonly "/folders/{folderId}": {
            readonly get: {
                readonly operationId: "getFolder";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get a folder by id.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
            readonly delete: {
                readonly operationId: "deleteFolder";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Delete a folder by id.";
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders/{folderId}/metadata": {
            readonly get: {
                readonly operationId: "getFolderMetadata";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get the metadata for a folder by id.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderGetMetadataResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders": {
            readonly get: {
                readonly operationId: "listFolders";
                readonly parameters: readonly [{
                    readonly name: "offset";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }, {
                    readonly name: "limit";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "List folders.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderListResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
            readonly post: {
                readonly operationId: "createFolder";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/FolderCreateInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Create a folder.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderCreateResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders/{folderId}/rescan": {
            readonly post: {
                readonly operationId: "rescanFolder";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Scan the underlying S3 location and update our local representation of it.";
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders/{folderId}/objects": {
            readonly get: {
                readonly operationId: "listFolderObjects";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "offset";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }, {
                    readonly name: "limit";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "number";
                    };
                }, {
                    readonly name: "search";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "List folder objects by folderId.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectListResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders/{folderId}/objects/{objectKey}": {
            readonly get: {
                readonly operationId: "getFolderObject";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Get a folder object by folderId and objectKey.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
            readonly delete: {
                readonly operationId: "deleteFolderObject";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Delete a folder object by folderId and objectKey.";
                    };
                };
                readonly tags: readonly ["Folders"];
            };
            readonly post: {
                readonly operationId: "refreshFolderObjectS3Metadata";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Scan the object again in the underlying storage, and update its state in our db.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/folders/{folderId}/presigned-urls": {
            readonly post: {
                readonly operationId: "createPresignedUrls";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/FolderCreateSignedUrlInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Create presigned urls for objects in a folder.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderCreateSignedUrlsResponse";
                                };
                            };
                        };
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
                                    readonly $ref: "#/components/schemas/SettingsGetResponse";
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
                readonly parameters: readonly [{
                    readonly name: "settingKey";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/SetSettingInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Set a setting in the server settings objects.";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SettingSetResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
            };
        };
        readonly "/events/{eventId}": {
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
            readonly SignupResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
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
                        readonly required: readonly ["id", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly TokenRefreshResponse: {
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
            readonly ViewerGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
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
                        readonly required: readonly ["id", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
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
            readonly UserCreateInputDTO: {
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
                    readonly password: {
                        readonly type: "string";
                    };
                    readonly permissions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: readonly ["isAdmin", "username", "password"];
            };
            readonly UserGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
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
                        readonly required: readonly ["id", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly UserUpdateInputDTO: {
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
                    readonly password: {
                        readonly type: "string";
                    };
                    readonly permissions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly UserListResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly meta: {
                        readonly type: "object";
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                    };
                    readonly result: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                };
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
                            readonly required: readonly ["id", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly FolderGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly folder: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                            };
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly metadataLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly bucket: {
                                        readonly type: "string";
                                    };
                                    readonly prefix: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                            };
                            readonly contentLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly bucket: {
                                        readonly type: "string";
                                    };
                                    readonly prefix: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                            };
                        };
                        readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation"];
                    };
                    readonly permissions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: readonly ["folder", "permissions"];
            };
            readonly FolderGetMetadataResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly totalCount: {
                        readonly type: "number";
                    };
                    readonly totalSizeBytes: {
                        readonly type: "number";
                    };
                };
                readonly required: readonly ["totalCount", "totalSizeBytes"];
            };
            readonly FolderListResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly meta: {
                        readonly type: "object";
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                    };
                    readonly result: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly permissions: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly folder: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly id: {
                                            readonly type: "string";
                                        };
                                        readonly ownerId: {
                                            readonly type: "string";
                                        };
                                        readonly name: {
                                            readonly type: "string";
                                        };
                                        readonly metadataLocation: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly userId: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly endpoint: {
                                                    readonly type: "string";
                                                };
                                                readonly region: {
                                                    readonly type: "string";
                                                };
                                                readonly bucket: {
                                                    readonly type: "string";
                                                };
                                                readonly prefix: {
                                                    readonly type: "string";
                                                };
                                                readonly accessKeyId: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                                        };
                                        readonly contentLocation: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly userId: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly endpoint: {
                                                    readonly type: "string";
                                                };
                                                readonly region: {
                                                    readonly type: "string";
                                                };
                                                readonly bucket: {
                                                    readonly type: "string";
                                                };
                                                readonly prefix: {
                                                    readonly type: "string";
                                                };
                                                readonly accessKeyId: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                                        };
                                    };
                                    readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation"];
                                };
                            };
                            readonly required: readonly ["permissions", "folder"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly FolderCreateInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly metadataLocation: {
                        readonly type: "object";
                        readonly properties: {
                            readonly serverLocationId: {
                                readonly type: "string";
                            };
                            readonly userLocationId: {
                                readonly type: "string";
                            };
                            readonly userLocationBucketOverride: {
                                readonly type: "string";
                            };
                            readonly userLocationPrefixOverride: {
                                readonly type: "string";
                            };
                            readonly accessKeyId: {
                                readonly type: "string";
                            };
                            readonly secretAccessKey: {
                                readonly type: "string";
                            };
                            readonly endpoint: {
                                readonly type: "string";
                            };
                            readonly bucket: {
                                readonly type: "string";
                            };
                            readonly region: {
                                readonly type: "string";
                            };
                            readonly prefix: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly contentLocation: {
                        readonly type: "object";
                        readonly properties: {
                            readonly serverLocationId: {
                                readonly type: "string";
                            };
                            readonly userLocationId: {
                                readonly type: "string";
                            };
                            readonly userLocationBucketOverride: {
                                readonly type: "string";
                            };
                            readonly userLocationPrefixOverride: {
                                readonly type: "string";
                            };
                            readonly accessKeyId: {
                                readonly type: "string";
                            };
                            readonly secretAccessKey: {
                                readonly type: "string";
                            };
                            readonly endpoint: {
                                readonly type: "string";
                            };
                            readonly bucket: {
                                readonly type: "string";
                            };
                            readonly region: {
                                readonly type: "string";
                            };
                            readonly prefix: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly required: readonly ["name", "metadataLocation", "contentLocation"];
            };
            readonly FolderCreateResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly folder: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                            };
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly metadataLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly bucket: {
                                        readonly type: "string";
                                    };
                                    readonly prefix: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                            };
                            readonly contentLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly bucket: {
                                        readonly type: "string";
                                    };
                                    readonly prefix: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "name", "endpoint", "region", "bucket", "accessKeyId"];
                            };
                        };
                        readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation"];
                    };
                };
                readonly required: readonly ["folder"];
            };
            readonly FolderObjectListResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly meta: {
                        readonly type: "object";
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                    };
                    readonly result: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                };
                                readonly objectKey: {
                                    readonly type: "string";
                                };
                                readonly folderId: {
                                    readonly type: "string";
                                };
                                readonly hash: {
                                    readonly type: readonly ["string", "null"];
                                };
                                readonly lastModified: {
                                    readonly type: "number";
                                };
                                readonly eTag: {
                                    readonly type: "string";
                                };
                                readonly sizeBytes: {
                                    readonly type: "number";
                                };
                                readonly mimeType: {
                                    readonly type: "string";
                                };
                                readonly mediaType: {
                                    readonly type: "string";
                                    readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                                };
                            };
                            readonly required: readonly ["id", "objectKey", "folderId", "lastModified", "eTag", "sizeBytes", "mimeType", "mediaType"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly FolderObjectGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly folderObject: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly objectKey: {
                                readonly type: "string";
                            };
                            readonly folderId: {
                                readonly type: "string";
                            };
                            readonly hash: {
                                readonly type: readonly ["string", "null"];
                            };
                            readonly lastModified: {
                                readonly type: "number";
                            };
                            readonly eTag: {
                                readonly type: "string";
                            };
                            readonly sizeBytes: {
                                readonly type: "number";
                            };
                            readonly mimeType: {
                                readonly type: "string";
                            };
                            readonly mediaType: {
                                readonly type: "string";
                                readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                            };
                        };
                        readonly required: readonly ["id", "objectKey", "folderId", "lastModified", "eTag", "sizeBytes", "mimeType", "mediaType"];
                    };
                };
                readonly required: readonly ["folderObject"];
            };
            readonly FolderCreateSignedUrlInputDTO: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly objectIdentifier: {
                            readonly type: "string";
                        };
                        readonly method: {
                            readonly type: "string";
                            readonly enum: readonly ["DELETE", "PUT", "GET"];
                        };
                    };
                    readonly required: readonly ["objectIdentifier", "method"];
                };
            };
            readonly FolderCreateSignedUrlsResponse: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly SettingsGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly settings: {
                        readonly type: "object";
                        readonly properties: {
                            readonly SIGNUP_ENABLED: {
                                readonly type: "boolean";
                            };
                            readonly SERVER_HOSTNAME: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly required: readonly ["settings"];
            };
            readonly SetSettingInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly value: {};
                };
            };
            readonly SettingSetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly key: {
                        readonly type: "string";
                    };
                    readonly value: {};
                };
                readonly required: readonly ["key"];
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
        };
    };
};
