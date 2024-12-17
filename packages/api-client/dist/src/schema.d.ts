export declare const schema: {
    readonly openapi: "3.1.0";
    readonly paths: {
        readonly "/api/v1/auth/login": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/LoginResponse";
                                };
                            };
                        };
                    };
                };
                readonly summary: "Authenticate the user and return access and refresh tokens.";
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/api/v1/auth/signup": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SignupResponse";
                                };
                            };
                        };
                    };
                };
                readonly summary: "Register a new user.";
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/api/v1/auth/logout": {
            readonly post: {
                readonly operationId: "logout";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Logout. Kill the current session.";
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/api/v1/auth/{refreshToken}": {
            readonly post: {
                readonly operationId: "refreshToken";
                readonly parameters: readonly [{
                    readonly name: "refreshToken";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TokenRefreshResponse";
                                };
                            };
                        };
                    };
                };
                readonly summary: "Refresh a session with a refresh token.";
                readonly tags: readonly ["Auth"];
            };
        };
        readonly "/api/v1/viewer": {
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
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
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
                                readonly $ref: "#/components/schemas/ViewerUpdateInputDTO";
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
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly tags: readonly ["Viewer"];
            };
        };
        readonly "/api/v1/server/users": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Create a user.";
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
                        readonly enum: readonly ["createdAt-asc", "createdAt-desc", "email-asc", "email-desc", "name-asc", "name-desc", "username-asc", "username-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List the users.";
                readonly tags: readonly ["Users"];
            };
        };
        readonly "/api/v1/server/users/{userId}": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Update a user.";
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a user by id.";
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
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Delete a server user by id.";
                readonly tags: readonly ["Users"];
            };
        };
        readonly "/api/v1/folders/{folderId}": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a folder by id.";
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
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Delete a folder by id.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/metadata": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderGetMetadataResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get the metadata for a folder by id.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders": {
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
                }, {
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["name-asc", "name-desc", "createdAt-asc", "createdAt-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List folders.";
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderCreateResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Create a folder.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/rescan": {
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
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Scan the underlying S3 location and update our local representation of it.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/objects": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List folder objects by folderId.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/objects/{objectKey}": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a folder object by folderId and objectKey.";
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
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Delete a folder object by folderId and objectKey.";
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Scan the object again in the underlying storage, and update its state in our db.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/presigned-urls": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderCreateSignedUrlsResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Create presigned urls for objects in a folder.";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/folders/{folderId}/apps/{appIdentifier}/trigger/{taskKey}": {
            readonly post: {
                readonly operationId: "handleAppTaskTrigger";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "appIdentifier";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "taskKey";
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
                                readonly $ref: "#/components/schemas/TriggerAppTaskInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Handle app task trigger";
                readonly tags: readonly ["Folders"];
            };
        };
        readonly "/api/v1/access-keys": {
            readonly get: {
                readonly operationId: "listAccessKeys";
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
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["accessKeyId-asc", "accessKeyId-desc", "accessKeyHashId-asc", "accessKeyHashId-desc", "endpoint-asc", "endpoint-desc", "region-asc", "region-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List access keys.";
                readonly tags: readonly ["AccessKeys"];
            };
        };
        readonly "/api/v1/access-keys/{accessKeyHashId}": {
            readonly get: {
                readonly operationId: "getAccessKey";
                readonly parameters: readonly [{
                    readonly name: "accessKeyHashId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get an access key by id.";
                readonly tags: readonly ["AccessKeys"];
            };
            readonly post: {
                readonly operationId: "rotateAccessKey";
                readonly parameters: readonly [{
                    readonly name: "accessKeyHashId";
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
                                readonly $ref: "#/components/schemas/RotateAccessKeyInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyRotateResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Rotate an access key.";
                readonly tags: readonly ["AccessKeys"];
            };
        };
        readonly "/api/v1/access-keys/{accessKeyHashId}/buckets": {
            readonly get: {
                readonly operationId: "listAccessKeyBuckets";
                readonly parameters: readonly [{
                    readonly name: "accessKeyHashId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyBucketsListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List buckets for an access key.";
                readonly tags: readonly ["AccessKeys"];
            };
        };
        readonly "/api/v1/server/access-keys": {
            readonly get: {
                readonly operationId: "listServerAccessKeys";
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
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["accessKeyId-asc", "accessKeyId-desc", "accessKeyHashId-asc", "accessKeyHashId-desc", "endpoint-asc", "endpoint-desc", "region-asc", "region-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List server access keys.";
                readonly tags: readonly ["ServerAccessKeys"];
            };
        };
        readonly "/api/v1/server/access-keys/{accessKeyHashId}": {
            readonly get: {
                readonly operationId: "getServerAccessKey";
                readonly parameters: readonly [{
                    readonly name: "accessKeyHashId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get server access key by id.";
                readonly tags: readonly ["ServerAccessKeys"];
            };
            readonly post: {
                readonly operationId: "rotateServerAccessKey";
                readonly parameters: readonly [{
                    readonly name: "accessKeyHashId";
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
                                readonly $ref: "#/components/schemas/RotateAccessKeyInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AccessKeyRotateResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Rotate a server access key.";
                readonly tags: readonly ["ServerAccessKeys"];
            };
        };
        readonly "/api/v1/server/settings": {
            readonly get: {
                readonly operationId: "getServerSettings";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SettingsGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get the server settings object.";
                readonly tags: readonly ["Server"];
            };
        };
        readonly "/api/v1/server/settings/{settingKey}": {
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
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SettingSetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Set a setting in the server settings objects.";
                readonly tags: readonly ["Server"];
            };
            readonly delete: {
                readonly operationId: "resetServerSetting";
                readonly parameters: readonly [{
                    readonly name: "settingKey";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SettingSetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Reset a setting in the server settings objects.";
                readonly tags: readonly ["Server"];
            };
        };
        readonly "/api/v1/server/user-storage-provisions": {
            readonly get: {
                readonly operationId: "listUserStorageProvisions";
                readonly parameters: readonly [{
                    readonly name: "provisionType";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["CONTENT", "METADATA", "REDUNDANCY"];
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserStorageProvisionListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List the user storage provisions.";
                readonly tags: readonly ["UserStorageProvisions"];
            };
            readonly post: {
                readonly operationId: "createUserStorageProvision";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UserStorageProvisionInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserStorageProvisionListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Create a new user storage provision.";
                readonly tags: readonly ["UserStorageProvisions"];
            };
        };
        readonly "/api/v1/server/user-storage-provisions/{userStorageProvisionId}": {
            readonly get: {
                readonly operationId: "getUserStorageProvision";
                readonly parameters: readonly [{
                    readonly name: "userStorageProvisionId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserStorageProvisionGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a user storage provision by id.";
                readonly tags: readonly ["UserStorageProvisions"];
            };
            readonly put: {
                readonly operationId: "updateUserStorageProvision";
                readonly parameters: readonly [{
                    readonly name: "userStorageProvisionId";
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
                                readonly $ref: "#/components/schemas/UserStorageProvisionInputDTO";
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
                                    readonly $ref: "#/components/schemas/UserStorageProvisionListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Update a server provision by id.";
                readonly tags: readonly ["UserStorageProvisions"];
            };
            readonly delete: {
                readonly operationId: "deleteUserStorageProvision";
                readonly parameters: readonly [{
                    readonly name: "userStorageProvisionId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/UserStorageProvisionListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Delete a server provision by id.";
                readonly tags: readonly ["UserStorageProvisions"];
            };
        };
        readonly "/api/v1/server/server-storage-location": {
            readonly get: {
                readonly operationId: "getServerStorageLocation";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ServerStorageLocationGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get the server storage location.";
                readonly tags: readonly ["ServerStorageLocation"];
            };
            readonly post: {
                readonly operationId: "setServerStorageLocation";
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/ServerStorageLocationInputDTO";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ServerStorageLocationGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Create a new server provision.";
                readonly tags: readonly ["ServerStorageLocation"];
            };
            readonly delete: {
                readonly operationId: "deleteServerStorageLocation";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Delete any set server storage location.";
                readonly tags: readonly ["ServerStorageLocation"];
            };
        };
        readonly "/api/v1/server/tasks/{taskId}": {
            readonly get: {
                readonly operationId: "getTask";
                readonly parameters: readonly [{
                    readonly name: "taskId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TaskGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a task by id.";
                readonly tags: readonly ["ServerTasks"];
            };
        };
        readonly "/api/v1/server/tasks": {
            readonly get: {
                readonly operationId: "listTasks";
                readonly parameters: readonly [{
                    readonly name: "objectKey";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["createdAt-asc", "createdAt-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "search";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeWaiting";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeRunning";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeComplete";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeFailed";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
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
                    readonly name: "folderId";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly format: "uuid";
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TaskListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List tasks.";
                readonly tags: readonly ["ServerTasks"];
            };
        };
        readonly "/api/v1/folders/{folderId}/tasks/{taskId}": {
            readonly get: {
                readonly operationId: "getFolderTask";
                readonly parameters: readonly [{
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "taskId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TaskGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get a folder task by id.";
                readonly tags: readonly ["Tasks"];
            };
        };
        readonly "/api/v1/folders/{folderId}/tasks": {
            readonly get: {
                readonly operationId: "listFolderTasks";
                readonly parameters: readonly [{
                    readonly name: "objectKey";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["createdAt-asc", "createdAt-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "search";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeWaiting";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeRunning";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeComplete";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeFailed";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
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
                    readonly name: "folderId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/TaskListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List tasks.";
                readonly tags: readonly ["Tasks"];
            };
        };
        readonly "/api/v1/server/events/{eventId}": {
            readonly get: {
                readonly operationId: "getEvent";
                readonly parameters: readonly [{
                    readonly name: "eventId";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/EventGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "Get an event by id.";
                readonly tags: readonly ["ServerEvents"];
            };
        };
        readonly "/api/v1/server/events": {
            readonly get: {
                readonly operationId: "listEvents";
                readonly parameters: readonly [{
                    readonly name: "sort";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["createdAt-asc", "createdAt-desc", "updatedAt-asc", "updatedAt-desc"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "folderId";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly format: "uuid";
                        readonly type: "string";
                    };
                }, {
                    readonly name: "objectKey";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "search";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeTrace";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeDebug";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeInfo";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeWarning";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
                        readonly type: "string";
                    };
                }, {
                    readonly name: "includeError";
                    readonly required: false;
                    readonly in: "query";
                    readonly schema: {
                        readonly enum: readonly ["true"];
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
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/EventListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly summary: "List events.";
                readonly tags: readonly ["ServerEvents"];
            };
        };
        readonly "/api/v1/server/apps": {
            readonly get: {
                readonly operationId: "listApps";
                readonly parameters: readonly [];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AppListResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly tags: readonly ["Apps"];
            };
        };
        readonly "/api/v1/server/apps/{appIdentifier}": {
            readonly get: {
                readonly operationId: "getApp";
                readonly parameters: readonly [{
                    readonly name: "appIdentifier";
                    readonly required: true;
                    readonly in: "path";
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/AppGetResponse";
                                };
                            };
                        };
                    };
                };
                readonly security: readonly [{
                    readonly bearer: readonly [];
                }];
                readonly tags: readonly ["Apps"];
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
                        readonly minLength: 1;
                        readonly format: "email";
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
                                readonly format: "uuid";
                            };
                            readonly name: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
                            };
                            readonly email: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
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
                        readonly required: readonly ["id", "name", "email", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
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
                                readonly format: "uuid";
                            };
                            readonly name: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
                            };
                            readonly email: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
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
                        readonly required: readonly ["id", "name", "email", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly ViewerUpdateInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["name"];
            };
            readonly UserDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly name: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "null";
                        }];
                    };
                    readonly email: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "null";
                        }];
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
                readonly required: readonly ["id", "name", "email", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
            };
            readonly UserCreateInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly email: {
                        readonly type: "string";
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
                readonly required: readonly ["username", "password"];
            };
            readonly UserGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly user: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly name: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
                            };
                            readonly email: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "null";
                                }];
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
                        readonly required: readonly ["id", "name", "email", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["user"];
            };
            readonly UserUpdateInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly minLength: 1;
                        }, {
                            readonly type: "null";
                        }];
                    };
                    readonly email: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly format: "email";
                        }, {
                            readonly type: "null";
                        }];
                    };
                    readonly isAdmin: {
                        readonly type: "boolean";
                    };
                    readonly username: {
                        readonly type: "string";
                        readonly minLength: 2;
                    };
                    readonly password: {
                        readonly type: "string";
                        readonly minLength: 1;
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
                                    readonly format: "uuid";
                                };
                                readonly name: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "null";
                                    }];
                                };
                                readonly email: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "null";
                                    }];
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
                            readonly required: readonly ["id", "name", "email", "emailVerified", "isAdmin", "username", "permissions", "createdAt", "updatedAt"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly FolderDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly ownerId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly metadataLocation: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly userId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly providerType: {
                                readonly type: "string";
                                readonly enum: readonly ["SERVER", "USER"];
                            };
                            readonly label: {
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
                            readonly accessKeyHashId: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
                    };
                    readonly contentLocation: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly userId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly providerType: {
                                readonly type: "string";
                                readonly enum: readonly ["SERVER", "USER"];
                            };
                            readonly label: {
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
                            readonly accessKeyHashId: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
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
                readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation", "createdAt", "updatedAt"];
            };
            readonly FolderObjectDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly folderId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly hash: {
                        readonly type: "string";
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
                    readonly contentAttributes: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "object";
                            readonly properties: {
                                readonly mediaType: {
                                    readonly type: "string";
                                    readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                                };
                                readonly mimeType: {
                                    readonly type: "string";
                                };
                                readonly height: {
                                    readonly type: "number";
                                };
                                readonly width: {
                                    readonly type: "number";
                                };
                                readonly orientation: {
                                    readonly type: "number";
                                };
                                readonly lengthMs: {
                                    readonly type: "number";
                                };
                                readonly bitrate: {
                                    readonly type: "number";
                                };
                            };
                            readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
                        };
                    };
                    readonly contentMetadata: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "object";
                            readonly additionalProperties: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly mimeType: {
                                        readonly type: "string";
                                    };
                                    readonly size: {
                                        readonly type: "number";
                                    };
                                    readonly hash: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["mimeType", "size", "hash"];
                            };
                        };
                    };
                };
                readonly required: readonly ["id", "objectKey", "folderId", "lastModified", "eTag", "sizeBytes", "mimeType", "mediaType", "contentAttributes", "contentMetadata"];
            };
            readonly FolderObjectContentMetadataDTO: {
                readonly type: "object";
                readonly additionalProperties: {
                    readonly type: "object";
                    readonly properties: {
                        readonly mimeType: {
                            readonly type: "string";
                        };
                        readonly size: {
                            readonly type: "number";
                        };
                        readonly hash: {
                            readonly type: "string";
                        };
                    };
                    readonly required: readonly ["mimeType", "size", "hash"];
                };
            };
            readonly FolderObjectContentAttributesDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly mediaType: {
                        readonly type: "string";
                        readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                    };
                    readonly mimeType: {
                        readonly type: "string";
                    };
                    readonly height: {
                        readonly type: "number";
                    };
                    readonly width: {
                        readonly type: "number";
                    };
                    readonly orientation: {
                        readonly type: "number";
                    };
                    readonly lengthMs: {
                        readonly type: "number";
                    };
                    readonly bitrate: {
                        readonly type: "number";
                    };
                };
                readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
            };
            readonly StorageLocationInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly storageProvisionId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly userLocationId: {
                        readonly type: "string";
                        readonly format: "uuid";
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
            readonly FolderGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly folder: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly metadataLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly providerType: {
                                        readonly type: "string";
                                        readonly enum: readonly ["SERVER", "USER"];
                                    };
                                    readonly label: {
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
                                    readonly accessKeyHashId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
                            };
                            readonly contentLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly providerType: {
                                        readonly type: "string";
                                        readonly enum: readonly ["SERVER", "USER"];
                                    };
                                    readonly label: {
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
                                    readonly accessKeyHashId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
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
                        readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation", "createdAt", "updatedAt"];
                    };
                    readonly permissions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly enum: readonly ["FOLDER_RESCAN", "FOLDER_FORGET", "OBJECT_EDIT", "OBJECT_MANAGE"];
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
                                        readonly enum: readonly ["FOLDER_RESCAN", "FOLDER_FORGET", "OBJECT_EDIT", "OBJECT_MANAGE"];
                                    };
                                };
                                readonly folder: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly id: {
                                            readonly type: "string";
                                            readonly format: "uuid";
                                        };
                                        readonly ownerId: {
                                            readonly type: "string";
                                            readonly format: "uuid";
                                        };
                                        readonly name: {
                                            readonly type: "string";
                                        };
                                        readonly metadataLocation: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                    readonly format: "uuid";
                                                };
                                                readonly userId: {
                                                    readonly type: "string";
                                                    readonly format: "uuid";
                                                };
                                                readonly providerType: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["SERVER", "USER"];
                                                };
                                                readonly label: {
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
                                                readonly accessKeyHashId: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
                                        };
                                        readonly contentLocation: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                    readonly format: "uuid";
                                                };
                                                readonly userId: {
                                                    readonly type: "string";
                                                    readonly format: "uuid";
                                                };
                                                readonly providerType: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["SERVER", "USER"];
                                                };
                                                readonly label: {
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
                                                readonly accessKeyHashId: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
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
                                    readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation", "createdAt", "updatedAt"];
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
                            readonly storageProvisionId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly userLocationId: {
                                readonly type: "string";
                                readonly format: "uuid";
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
                            readonly storageProvisionId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly userLocationId: {
                                readonly type: "string";
                                readonly format: "uuid";
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
                                readonly format: "uuid";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly metadataLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly providerType: {
                                        readonly type: "string";
                                        readonly enum: readonly ["SERVER", "USER"];
                                    };
                                    readonly label: {
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
                                    readonly accessKeyHashId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
                            };
                            readonly contentLocation: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly userId: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly providerType: {
                                        readonly type: "string";
                                        readonly enum: readonly ["SERVER", "USER"];
                                    };
                                    readonly label: {
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
                                    readonly accessKeyHashId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["id", "providerType", "label", "endpoint", "region", "bucket", "accessKeyId", "accessKeyHashId"];
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
                        readonly required: readonly ["id", "ownerId", "name", "metadataLocation", "contentLocation", "createdAt", "updatedAt"];
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
                                    readonly format: "uuid";
                                };
                                readonly objectKey: {
                                    readonly type: "string";
                                };
                                readonly folderId: {
                                    readonly type: "string";
                                    readonly format: "uuid";
                                };
                                readonly hash: {
                                    readonly type: "string";
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
                                readonly contentAttributes: {
                                    readonly type: "object";
                                    readonly additionalProperties: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly mediaType: {
                                                readonly type: "string";
                                                readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                                            };
                                            readonly mimeType: {
                                                readonly type: "string";
                                            };
                                            readonly height: {
                                                readonly type: "number";
                                            };
                                            readonly width: {
                                                readonly type: "number";
                                            };
                                            readonly orientation: {
                                                readonly type: "number";
                                            };
                                            readonly lengthMs: {
                                                readonly type: "number";
                                            };
                                            readonly bitrate: {
                                                readonly type: "number";
                                            };
                                        };
                                        readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
                                    };
                                };
                                readonly contentMetadata: {
                                    readonly type: "object";
                                    readonly additionalProperties: {
                                        readonly type: "object";
                                        readonly additionalProperties: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly mimeType: {
                                                    readonly type: "string";
                                                };
                                                readonly size: {
                                                    readonly type: "number";
                                                };
                                                readonly hash: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["mimeType", "size", "hash"];
                                        };
                                    };
                                };
                            };
                            readonly required: readonly ["id", "objectKey", "folderId", "lastModified", "eTag", "sizeBytes", "mimeType", "mediaType", "contentAttributes", "contentMetadata"];
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
                                readonly format: "uuid";
                            };
                            readonly objectKey: {
                                readonly type: "string";
                            };
                            readonly folderId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly hash: {
                                readonly type: "string";
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
                            readonly contentAttributes: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly mediaType: {
                                            readonly type: "string";
                                            readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                                        };
                                        readonly mimeType: {
                                            readonly type: "string";
                                        };
                                        readonly height: {
                                            readonly type: "number";
                                        };
                                        readonly width: {
                                            readonly type: "number";
                                        };
                                        readonly orientation: {
                                            readonly type: "number";
                                        };
                                        readonly lengthMs: {
                                            readonly type: "number";
                                        };
                                        readonly bitrate: {
                                            readonly type: "number";
                                        };
                                    };
                                    readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
                                };
                            };
                            readonly contentMetadata: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "object";
                                    readonly additionalProperties: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly mimeType: {
                                                readonly type: "string";
                                            };
                                            readonly size: {
                                                readonly type: "number";
                                            };
                                            readonly hash: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["mimeType", "size", "hash"];
                                    };
                                };
                            };
                        };
                        readonly required: readonly ["id", "objectKey", "folderId", "lastModified", "eTag", "sizeBytes", "mimeType", "mediaType", "contentAttributes", "contentMetadata"];
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
                readonly type: "object";
                readonly properties: {
                    readonly urls: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: readonly ["urls"];
            };
            readonly TriggerAppTaskInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly inputParams: {};
                };
            };
            readonly AccessKeyDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly accessKeyHashId: {
                        readonly type: "string";
                    };
                    readonly endpoint: {
                        readonly type: "string";
                    };
                    readonly endpointDomain: {
                        readonly type: "string";
                    };
                    readonly region: {
                        readonly type: "string";
                    };
                    readonly folderCount: {
                        readonly type: "number";
                    };
                };
                readonly required: readonly ["accessKeyId", "accessKeyHashId", "endpoint", "endpointDomain", "region", "folderCount"];
            };
            readonly AccessKeyListResponse: {
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
                                readonly accessKeyId: {
                                    readonly type: "string";
                                };
                                readonly accessKeyHashId: {
                                    readonly type: "string";
                                };
                                readonly endpoint: {
                                    readonly type: "string";
                                };
                                readonly endpointDomain: {
                                    readonly type: "string";
                                };
                                readonly region: {
                                    readonly type: "string";
                                };
                                readonly folderCount: {
                                    readonly type: "number";
                                };
                            };
                            readonly required: readonly ["accessKeyId", "accessKeyHashId", "endpoint", "endpointDomain", "region", "folderCount"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly AccessKeyGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKey: {
                        readonly type: "object";
                        readonly properties: {
                            readonly accessKeyId: {
                                readonly type: "string";
                            };
                            readonly accessKeyHashId: {
                                readonly type: "string";
                            };
                            readonly endpoint: {
                                readonly type: "string";
                            };
                            readonly endpointDomain: {
                                readonly type: "string";
                            };
                            readonly region: {
                                readonly type: "string";
                            };
                            readonly folderCount: {
                                readonly type: "number";
                            };
                        };
                        readonly required: readonly ["accessKeyId", "accessKeyHashId", "endpoint", "endpointDomain", "region", "folderCount"];
                    };
                };
                readonly required: readonly ["accessKey"];
            };
            readonly RotateAccessKeyInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly secretAccessKey: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["accessKeyId", "secretAccessKey"];
            };
            readonly AccessKeyRotateResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKeyHashId: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["accessKeyHashId"];
            };
            readonly AccessKeyBucketsListResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly result: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                };
                                readonly createdDate: {
                                    readonly type: "string";
                                    readonly format: "date-time";
                                };
                            };
                            readonly required: readonly ["name"];
                        };
                    };
                };
                readonly required: readonly ["result"];
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
                            readonly SIGNUP_PERMISSIONS: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
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
                    readonly settingKey: {
                        readonly type: "string";
                    };
                    readonly settingValue: {};
                };
                readonly required: readonly ["settingKey"];
            };
            readonly UserStorageProvisionDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly accessKeyHashId: {
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
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly prefix: {
                        readonly type: "string";
                    };
                    readonly provisionTypes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly enum: readonly ["CONTENT", "METADATA", "REDUNDANCY"];
                        };
                        readonly minItems: 1;
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly maxLength: 32;
                    };
                    readonly description: {
                        readonly type: "string";
                        readonly maxLength: 128;
                    };
                };
                readonly required: readonly ["id", "accessKeyHashId", "endpoint", "bucket", "region", "accessKeyId", "provisionTypes", "label", "description"];
            };
            readonly UserStorageProvisionListResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly result: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly format: "uuid";
                                };
                                readonly accessKeyHashId: {
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
                                readonly accessKeyId: {
                                    readonly type: "string";
                                };
                                readonly prefix: {
                                    readonly type: "string";
                                };
                                readonly provisionTypes: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly enum: readonly ["CONTENT", "METADATA", "REDUNDANCY"];
                                    };
                                    readonly minItems: 1;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly maxLength: 32;
                                };
                                readonly description: {
                                    readonly type: "string";
                                    readonly maxLength: 128;
                                };
                            };
                            readonly required: readonly ["id", "accessKeyHashId", "endpoint", "bucket", "region", "accessKeyId", "provisionTypes", "label", "description"];
                        };
                    };
                };
                readonly required: readonly ["result"];
            };
            readonly UserStorageProvisionGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly userStorageProvision: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly accessKeyHashId: {
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
                            readonly accessKeyId: {
                                readonly type: "string";
                            };
                            readonly prefix: {
                                readonly type: "string";
                            };
                            readonly provisionTypes: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                    readonly enum: readonly ["CONTENT", "METADATA", "REDUNDANCY"];
                                };
                                readonly minItems: 1;
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly maxLength: 32;
                            };
                            readonly description: {
                                readonly type: "string";
                                readonly maxLength: 128;
                            };
                        };
                        readonly required: readonly ["id", "accessKeyHashId", "endpoint", "bucket", "region", "accessKeyId", "provisionTypes", "label", "description"];
                    };
                };
                readonly required: readonly ["userStorageProvision"];
            };
            readonly UserStorageProvisionInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                        readonly maxLength: 32;
                    };
                    readonly description: {
                        readonly type: "string";
                        readonly maxLength: 128;
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
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly secretAccessKey: {
                        readonly type: "string";
                    };
                    readonly prefix: {
                        readonly type: "string";
                    };
                    readonly provisionTypes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly enum: readonly ["CONTENT", "METADATA", "REDUNDANCY"];
                        };
                        readonly minItems: 1;
                    };
                };
                readonly required: readonly ["label", "description", "endpoint", "bucket", "region", "accessKeyId", "secretAccessKey", "provisionTypes"];
            };
            readonly ServerStorageLocationDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKeyHashId: {
                        readonly type: "string";
                    };
                    readonly accessKeyId: {
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
                readonly required: readonly ["accessKeyHashId", "accessKeyId", "endpoint", "bucket", "region"];
            };
            readonly ServerStorageLocationGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly serverStorageLocation: {
                        readonly type: "object";
                        readonly properties: {
                            readonly accessKeyHashId: {
                                readonly type: "string";
                            };
                            readonly accessKeyId: {
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
                        readonly required: readonly ["accessKeyHashId", "accessKeyId", "endpoint", "bucket", "region"];
                    };
                };
            };
            readonly ServerStorageLocationInputDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly accessKeyId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly secretAccessKey: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly endpoint: {
                        readonly type: "string";
                        readonly format: "uri";
                    };
                    readonly bucket: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly region: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly prefix: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly minLength: 1;
                        }, {
                            readonly type: "null";
                        }];
                    };
                };
                readonly required: readonly ["accessKeyId", "secretAccessKey", "endpoint", "bucket", "region", "prefix"];
            };
            readonly TaskGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly task: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly taskKey: {
                                readonly type: "string";
                            };
                            readonly ownerIdentifier: {
                                readonly type: "string";
                            };
                            readonly triggeringEventId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly subjectFolderId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly subjectObjectKey: {
                                readonly type: "string";
                            };
                            readonly handlerId: {
                                readonly type: "string";
                            };
                            readonly inputData: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "number";
                                    }];
                                };
                            };
                            readonly errorAt: {
                                readonly type: "string";
                                readonly format: "date-time";
                            };
                            readonly errorCode: {
                                readonly type: "string";
                            };
                            readonly errorMessage: {
                                readonly type: "string";
                            };
                            readonly taskDescription: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly textKey: {
                                        readonly type: "string";
                                    };
                                    readonly variables: {
                                        readonly type: "object";
                                        readonly additionalProperties: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly required: readonly ["textKey", "variables"];
                            };
                            readonly updates: {
                                readonly type: "array";
                                readonly items: {};
                            };
                            readonly startedAt: {
                                readonly type: "string";
                                readonly format: "date-time";
                            };
                            readonly completedAt: {
                                readonly type: "string";
                                readonly format: "date-time";
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
                        readonly required: readonly ["id", "taskKey", "ownerIdentifier", "triggeringEventId", "inputData", "taskDescription", "updates", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["task"];
            };
            readonly TaskListResponse: {
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
                                    readonly format: "uuid";
                                };
                                readonly taskKey: {
                                    readonly type: "string";
                                };
                                readonly ownerIdentifier: {
                                    readonly type: "string";
                                };
                                readonly triggeringEventId: {
                                    readonly type: "string";
                                    readonly format: "uuid";
                                };
                                readonly subjectFolderId: {
                                    readonly type: "string";
                                    readonly format: "uuid";
                                };
                                readonly subjectObjectKey: {
                                    readonly type: "string";
                                };
                                readonly handlerId: {
                                    readonly type: "string";
                                };
                                readonly inputData: {
                                    readonly type: "object";
                                    readonly additionalProperties: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }];
                                    };
                                };
                                readonly errorAt: {
                                    readonly type: "string";
                                    readonly format: "date-time";
                                };
                                readonly errorCode: {
                                    readonly type: "string";
                                };
                                readonly errorMessage: {
                                    readonly type: "string";
                                };
                                readonly taskDescription: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly textKey: {
                                            readonly type: "string";
                                        };
                                        readonly variables: {
                                            readonly type: "object";
                                            readonly additionalProperties: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly required: readonly ["textKey", "variables"];
                                };
                                readonly updates: {
                                    readonly type: "array";
                                    readonly items: {};
                                };
                                readonly startedAt: {
                                    readonly type: "string";
                                    readonly format: "date-time";
                                };
                                readonly completedAt: {
                                    readonly type: "string";
                                    readonly format: "date-time";
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
                            readonly required: readonly ["id", "taskKey", "ownerIdentifier", "triggeringEventId", "inputData", "taskDescription", "updates", "createdAt", "updatedAt"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly TaskDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly taskKey: {
                        readonly type: "string";
                    };
                    readonly ownerIdentifier: {
                        readonly type: "string";
                    };
                    readonly triggeringEventId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly subjectFolderId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly subjectObjectKey: {
                        readonly type: "string";
                    };
                    readonly handlerId: {
                        readonly type: "string";
                    };
                    readonly inputData: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }];
                        };
                    };
                    readonly errorAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly errorCode: {
                        readonly type: "string";
                    };
                    readonly errorMessage: {
                        readonly type: "string";
                    };
                    readonly taskDescription: {
                        readonly type: "object";
                        readonly properties: {
                            readonly textKey: {
                                readonly type: "string";
                            };
                            readonly variables: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly required: readonly ["textKey", "variables"];
                    };
                    readonly updates: {
                        readonly type: "array";
                        readonly items: {};
                    };
                    readonly startedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly completedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
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
                readonly required: readonly ["id", "taskKey", "ownerIdentifier", "triggeringEventId", "inputData", "taskDescription", "updates", "createdAt", "updatedAt"];
            };
            readonly EventDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly eventKey: {
                        readonly type: "string";
                    };
                    readonly level: {
                        readonly type: "string";
                        readonly enum: readonly ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
                    };
                    readonly emitterIdentifier: {
                        readonly type: "string";
                    };
                    readonly locationContext: {
                        readonly type: "object";
                        readonly properties: {
                            readonly folderId: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly objectKey: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["folderId"];
                    };
                    readonly data: {};
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
                readonly required: readonly ["id", "eventKey", "level", "emitterIdentifier", "createdAt"];
            };
            readonly EventGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly event: {
                        readonly type: "object";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly format: "uuid";
                            };
                            readonly eventKey: {
                                readonly type: "string";
                            };
                            readonly level: {
                                readonly type: "string";
                                readonly enum: readonly ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
                            };
                            readonly emitterIdentifier: {
                                readonly type: "string";
                            };
                            readonly locationContext: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly folderId: {
                                        readonly type: "string";
                                        readonly format: "uuid";
                                    };
                                    readonly objectKey: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["folderId"];
                            };
                            readonly data: {};
                            readonly createdAt: {
                                readonly type: "string";
                                readonly format: "date-time";
                            };
                        };
                        readonly required: readonly ["id", "eventKey", "level", "emitterIdentifier", "createdAt"];
                    };
                };
                readonly required: readonly ["event"];
            };
            readonly EventListResponse: {
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
                                    readonly format: "uuid";
                                };
                                readonly eventKey: {
                                    readonly type: "string";
                                };
                                readonly level: {
                                    readonly type: "string";
                                    readonly enum: readonly ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
                                };
                                readonly emitterIdentifier: {
                                    readonly type: "string";
                                };
                                readonly locationContext: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly folderId: {
                                            readonly type: "string";
                                            readonly format: "uuid";
                                        };
                                        readonly objectKey: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly required: readonly ["folderId"];
                                };
                                readonly data: {};
                                readonly createdAt: {
                                    readonly type: "string";
                                    readonly format: "date-time";
                                };
                            };
                            readonly required: readonly ["id", "eventKey", "level", "emitterIdentifier", "createdAt"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly AppDTO: {
                readonly type: "object";
                readonly properties: {
                    readonly identifier: {
                        readonly type: "string";
                    };
                    readonly publicKey: {
                        readonly type: "string";
                    };
                    readonly config: {
                        readonly type: "object";
                        readonly properties: {
                            readonly description: {
                                readonly type: "string";
                            };
                            readonly requiresStorage: {
                                readonly type: "boolean";
                            };
                            readonly emittableEvents: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly tasks: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly key: {
                                            readonly type: "string";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly eventTriggers: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly folderAction: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly description: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["description"];
                                        };
                                        readonly objectAction: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly description: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["description"];
                                        };
                                        readonly description: {
                                            readonly type: "string";
                                        };
                                        readonly inputParams: {
                                            readonly type: "object";
                                            readonly additionalProperties: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly type: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["boolean", "string", "number"];
                                                    };
                                                    readonly default: {
                                                        readonly oneOf: readonly [{
                                                            readonly type: "string";
                                                        }, {
                                                            readonly type: "number";
                                                        }, {
                                                            readonly type: "boolean";
                                                        }];
                                                        readonly type: "null";
                                                    };
                                                };
                                                readonly required: readonly ["type"];
                                            };
                                        };
                                    };
                                    readonly required: readonly ["key", "label", "eventTriggers", "description"];
                                };
                            };
                            readonly menuItems: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly iconPath: {
                                            readonly type: "string";
                                        };
                                        readonly uiName: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly required: readonly ["label", "uiName"];
                                };
                            };
                        };
                        readonly required: readonly ["description", "requiresStorage", "emittableEvents", "tasks", "menuItems"];
                    };
                    readonly manifest: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly path: {
                                    readonly type: "string";
                                };
                                readonly hash: {
                                    readonly type: "string";
                                };
                                readonly size: {
                                    readonly type: "number";
                                };
                            };
                            readonly required: readonly ["path", "hash", "size"];
                        };
                    };
                    readonly connectedWorkers: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly appIdentifier: {
                                    readonly type: "string";
                                };
                                readonly workerId: {
                                    readonly type: "string";
                                };
                                readonly handledTaskKeys: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly socketClientId: {
                                    readonly type: "string";
                                };
                                readonly ip: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["appIdentifier", "workerId", "handledTaskKeys", "socketClientId", "ip"];
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
                readonly required: readonly ["identifier", "publicKey", "config", "manifest", "connectedWorkers", "createdAt", "updatedAt"];
            };
            readonly AppListResponse: {
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
                                readonly identifier: {
                                    readonly type: "string";
                                };
                                readonly publicKey: {
                                    readonly type: "string";
                                };
                                readonly config: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly description: {
                                            readonly type: "string";
                                        };
                                        readonly requiresStorage: {
                                            readonly type: "boolean";
                                        };
                                        readonly emittableEvents: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly tasks: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly key: {
                                                        readonly type: "string";
                                                    };
                                                    readonly label: {
                                                        readonly type: "string";
                                                    };
                                                    readonly eventTriggers: {
                                                        readonly type: "array";
                                                        readonly items: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                    readonly folderAction: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly description: {
                                                                readonly type: "string";
                                                            };
                                                        };
                                                        readonly required: readonly ["description"];
                                                    };
                                                    readonly objectAction: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly description: {
                                                                readonly type: "string";
                                                            };
                                                        };
                                                        readonly required: readonly ["description"];
                                                    };
                                                    readonly description: {
                                                        readonly type: "string";
                                                    };
                                                    readonly inputParams: {
                                                        readonly type: "object";
                                                        readonly additionalProperties: {
                                                            readonly type: "object";
                                                            readonly properties: {
                                                                readonly type: {
                                                                    readonly type: "string";
                                                                    readonly enum: readonly ["boolean", "string", "number"];
                                                                };
                                                                readonly default: {
                                                                    readonly oneOf: readonly [{
                                                                        readonly type: "string";
                                                                    }, {
                                                                        readonly type: "number";
                                                                    }, {
                                                                        readonly type: "boolean";
                                                                    }];
                                                                    readonly type: "null";
                                                                };
                                                            };
                                                            readonly required: readonly ["type"];
                                                        };
                                                    };
                                                };
                                                readonly required: readonly ["key", "label", "eventTriggers", "description"];
                                            };
                                        };
                                        readonly menuItems: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly label: {
                                                        readonly type: "string";
                                                    };
                                                    readonly iconPath: {
                                                        readonly type: "string";
                                                    };
                                                    readonly uiName: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly required: readonly ["label", "uiName"];
                                            };
                                        };
                                    };
                                    readonly required: readonly ["description", "requiresStorage", "emittableEvents", "tasks", "menuItems"];
                                };
                                readonly manifest: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly path: {
                                                readonly type: "string";
                                            };
                                            readonly hash: {
                                                readonly type: "string";
                                            };
                                            readonly size: {
                                                readonly type: "number";
                                            };
                                        };
                                        readonly required: readonly ["path", "hash", "size"];
                                    };
                                };
                                readonly connectedWorkers: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly appIdentifier: {
                                                readonly type: "string";
                                            };
                                            readonly workerId: {
                                                readonly type: "string";
                                            };
                                            readonly handledTaskKeys: {
                                                readonly type: "array";
                                                readonly items: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly socketClientId: {
                                                readonly type: "string";
                                            };
                                            readonly ip: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["appIdentifier", "workerId", "handledTaskKeys", "socketClientId", "ip"];
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
                            readonly required: readonly ["identifier", "publicKey", "config", "manifest", "connectedWorkers", "createdAt", "updatedAt"];
                        };
                    };
                };
                readonly required: readonly ["meta", "result"];
            };
            readonly AppGetResponse: {
                readonly type: "object";
                readonly properties: {
                    readonly app: {
                        readonly type: "object";
                        readonly properties: {
                            readonly identifier: {
                                readonly type: "string";
                            };
                            readonly publicKey: {
                                readonly type: "string";
                            };
                            readonly config: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly description: {
                                        readonly type: "string";
                                    };
                                    readonly requiresStorage: {
                                        readonly type: "boolean";
                                    };
                                    readonly emittableEvents: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly tasks: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly key: {
                                                    readonly type: "string";
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                                readonly eventTriggers: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly folderAction: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly description: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                    readonly required: readonly ["description"];
                                                };
                                                readonly objectAction: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly description: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                    readonly required: readonly ["description"];
                                                };
                                                readonly description: {
                                                    readonly type: "string";
                                                };
                                                readonly inputParams: {
                                                    readonly type: "object";
                                                    readonly additionalProperties: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["boolean", "string", "number"];
                                                            };
                                                            readonly default: {
                                                                readonly oneOf: readonly [{
                                                                    readonly type: "string";
                                                                }, {
                                                                    readonly type: "number";
                                                                }, {
                                                                    readonly type: "boolean";
                                                                }];
                                                                readonly type: "null";
                                                            };
                                                        };
                                                        readonly required: readonly ["type"];
                                                    };
                                                };
                                            };
                                            readonly required: readonly ["key", "label", "eventTriggers", "description"];
                                        };
                                    };
                                    readonly menuItems: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                                readonly iconPath: {
                                                    readonly type: "string";
                                                };
                                                readonly uiName: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["label", "uiName"];
                                        };
                                    };
                                };
                                readonly required: readonly ["description", "requiresStorage", "emittableEvents", "tasks", "menuItems"];
                            };
                            readonly manifest: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly path: {
                                            readonly type: "string";
                                        };
                                        readonly hash: {
                                            readonly type: "string";
                                        };
                                        readonly size: {
                                            readonly type: "number";
                                        };
                                    };
                                    readonly required: readonly ["path", "hash", "size"];
                                };
                            };
                            readonly connectedWorkers: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly appIdentifier: {
                                            readonly type: "string";
                                        };
                                        readonly workerId: {
                                            readonly type: "string";
                                        };
                                        readonly handledTaskKeys: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly socketClientId: {
                                            readonly type: "string";
                                        };
                                        readonly ip: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly required: readonly ["appIdentifier", "workerId", "handledTaskKeys", "socketClientId", "ip"];
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
                        readonly required: readonly ["identifier", "publicKey", "config", "manifest", "connectedWorkers", "createdAt", "updatedAt"];
                    };
                };
                readonly required: readonly ["app"];
            };
        };
    };
};
