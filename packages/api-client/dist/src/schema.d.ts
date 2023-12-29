export declare const schema: {
    readonly components: {
        readonly examples: {};
        readonly headers: {};
        readonly parameters: {};
        readonly requestBodies: {};
        readonly responses: {};
        readonly schemas: {
            readonly SessionResponse: {
                readonly properties: {
                    readonly accessToken: {
                        readonly type: "string";
                    };
                    readonly refreshToken: {
                        readonly type: "string";
                    };
                    readonly expiresAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
                readonly required: readonly ["accessToken", "refreshToken", "expiresAt"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ErrorMetaData: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {};
            };
            readonly ErrorData: {
                readonly properties: {
                    readonly code: {
                        readonly type: "string";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly detail: {
                        readonly type: "string";
                    };
                    readonly meta: {
                        readonly $ref: "#/components/schemas/ErrorMetaData";
                    };
                    readonly pointer: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["code"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ErrorResponse: {
                readonly properties: {
                    readonly errors: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/ErrorData";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["errors"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly EmailFormat: {
                readonly type: "string";
                readonly format: "email";
                readonly maxLength: 255;
            };
            readonly UsernameFormat: {
                readonly type: "string";
                readonly format: "email";
                readonly maxLength: 64;
            };
            readonly UserData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly email: {
                        readonly allOf: readonly [{
                            readonly $ref: "#/components/schemas/EmailFormat";
                        }];
                        readonly nullable: true;
                    };
                    readonly emailVerified: {
                        readonly type: "boolean";
                    };
                    readonly isAdmin: {
                        readonly type: "boolean";
                    };
                    readonly username: {
                        readonly $ref: "#/components/schemas/UsernameFormat";
                    };
                    readonly permissions: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "name", "email", "emailVerified", "isAdmin", "permissions"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly SignupParams: {
                readonly properties: {
                    readonly username: {
                        readonly type: "string";
                        readonly maxLength: 255;
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
                readonly required: readonly ["username", "email", "password"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly LoginParams: {
                readonly properties: {
                    readonly login: {
                        readonly type: "string";
                    };
                    readonly password: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["login", "password"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly StorageLocationData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly userId: {
                        readonly type: "string";
                    };
                    readonly providerType: {
                        readonly type: "string";
                        readonly enum: readonly ["SERVER", "USER"];
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
                readonly required: readonly ["createdAt", "updatedAt", "id", "providerType", "name", "endpoint", "bucket", "accessKeyId"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
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
                        readonly $ref: "#/components/schemas/StorageLocationData";
                    };
                    readonly contentLocation: {
                        readonly $ref: "#/components/schemas/StorageLocationData";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "name", "metadataLocation", "contentLocation"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly UserLocationInputData: {
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
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderPermissionName: {
                readonly enum: readonly ["folder_refresh", "folder_manage_shares", "folder_forget", "object_edit", "object_manage", "tag_create", "tag_associate"];
                readonly type: "string";
            };
            readonly FolderAndPermission: {
                readonly properties: {
                    readonly folder: {
                        readonly $ref: "#/components/schemas/FolderData";
                    };
                    readonly permissions: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["folder", "permissions"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ListFoldersResponse: {
                readonly properties: {
                    readonly meta: {
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                                readonly format: "double";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                        readonly type: "object";
                    };
                    readonly result: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/FolderAndPermission";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["meta", "result"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly MediaType: {
                readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                readonly type: "string";
            };
            readonly ContentAttributesType: {
                readonly properties: {
                    readonly mediaType: {
                        readonly $ref: "#/components/schemas/MediaType";
                    };
                    readonly mimeType: {
                        readonly type: "string";
                    };
                    readonly height: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly width: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly orientation: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly lengthMs: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly bitrate: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                };
                readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ContentAttributesByHash: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/ContentAttributesType";
                };
            };
            readonly MetadataEntry: {
                readonly properties: {
                    readonly mimeType: {
                        readonly type: "string";
                    };
                    readonly size: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly hash: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["mimeType", "size", "hash"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ContentMetadataType: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/MetadataEntry";
                };
            };
            readonly ContentMetadataByHash: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/ContentMetadataType";
                };
            };
            readonly FolderObjectData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly folderId: {
                        readonly type: "string";
                    };
                    readonly contentAttributes: {
                        readonly $ref: "#/components/schemas/ContentAttributesByHash";
                    };
                    readonly contentMetadata: {
                        readonly $ref: "#/components/schemas/ContentMetadataByHash";
                    };
                    readonly hash: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly lastModified: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly eTag: {
                        readonly type: "string";
                    };
                    readonly sizeBytes: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly mediaType: {
                        readonly $ref: "#/components/schemas/MediaType";
                    };
                    readonly mimeType: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "objectKey", "folderId", "contentAttributes", "contentMetadata", "hash", "lastModified", "eTag", "sizeBytes", "mediaType", "mimeType"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ListResponseMeta: {
                readonly properties: {
                    readonly totalCount: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                };
                readonly required: readonly ["totalCount"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly SignedURLsRequestMethod: {
                readonly enum: readonly ["PUT", "DELETE", "GET"];
                readonly type: "string";
            };
            readonly SignedURLsRequest: {
                readonly properties: {
                    readonly objectIdentifier: {
                        readonly type: "string";
                    };
                    readonly method: {
                        readonly $ref: "#/components/schemas/SignedURLsRequestMethod";
                    };
                };
                readonly required: readonly ["objectIdentifier", "method"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ServerLocationData: {
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly endpoint: {
                        readonly type: "string";
                    };
                    readonly accessKeyId: {
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
                };
                readonly required: readonly ["id", "name", "endpoint", "accessKeyId", "region", "bucket"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ServerLocationType: {
                readonly enum: readonly ["USER_METADATA", "USER_CONTENT", "USER_BACKUP"];
                readonly type: "string";
            };
            readonly ServerLocationInputData: {
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly endpoint: {
                        readonly type: "string";
                    };
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly secretAccessKey: {
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
                };
                readonly required: readonly ["name", "endpoint", "accessKeyId", "secretAccessKey", "region", "bucket"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ListUsersResponse: {
                readonly properties: {
                    readonly meta: {
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                                readonly format: "double";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                        readonly type: "object";
                    };
                    readonly result: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/UserData";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["meta", "result"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly CreateUserData: {
                readonly properties: {
                    readonly isAdmin: {
                        readonly type: "boolean";
                    };
                    readonly emailVerified: {
                        readonly type: "boolean";
                    };
                    readonly password: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly email: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly permissions: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                    readonly username: {
                        readonly type: "string";
                        readonly maxLength: 64;
                    };
                };
                readonly required: readonly ["username", "password"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly UpdateUserData: {
                readonly properties: {
                    readonly isAdmin: {
                        readonly type: "boolean";
                    };
                    readonly emailVerified: {
                        readonly type: "boolean";
                    };
                    readonly password: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly email: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly permissions: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                };
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ServerSettings: {
                readonly properties: {
                    readonly SIGNUP_ENABLED: {
                        readonly type: "boolean";
                    };
                };
                readonly required: readonly ["SIGNUP_ENABLED"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ModuleAction: {
                readonly properties: {
                    readonly key: {
                        readonly type: "string";
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["key", "description"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ModuleConfig: {
                readonly properties: {
                    readonly publicKey: {
                        readonly type: "string";
                    };
                    readonly subscribedEvents: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                    readonly emitEvents: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                    readonly actions: {
                        readonly properties: {
                            readonly object: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/ModuleAction";
                                };
                                readonly type: "array";
                            };
                            readonly folder: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/ModuleAction";
                                };
                                readonly type: "array";
                            };
                        };
                        readonly required: readonly ["object", "folder"];
                        readonly type: "object";
                    };
                };
                readonly required: readonly ["publicKey", "subscribedEvents", "emitEvents", "actions"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ModuleData: {
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly config: {
                        readonly $ref: "#/components/schemas/ModuleConfig";
                    };
                };
                readonly required: readonly ["id", "name", "config"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ModuleConnectionsMap: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly properties: {};
                    readonly additionalProperties: {
                        readonly properties: {
                            readonly ip: {
                                readonly type: "string";
                            };
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly id: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["ip", "name", "id"];
                        readonly type: "object";
                    };
                    readonly type: "object";
                };
            };
            readonly ViewerUpdatePayload: {
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["name"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
        };
        readonly securitySchemes: {
            readonly RefreshToken: {
                readonly type: "apiKey";
                readonly in: "query";
                readonly name: "refresh_token";
            };
            readonly AccessToken: {
                readonly type: "http";
                readonly scheme: "bearer";
                readonly bearerFormat: "JWT";
            };
            readonly WorkerAccessToken: {
                readonly type: "http";
                readonly scheme: "bearer";
                readonly bearerFormat: "JWT";
            };
        };
    };
    readonly info: {
        readonly title: "@stellariscloud/api";
        readonly version: "1.0.0";
        readonly contact: {};
    };
    readonly openapi: "3.0.0";
    readonly paths: {
        readonly "/token": {
            readonly post: {
                readonly operationId: "refreshToken";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SessionResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly RefreshToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/signup": {
            readonly post: {
                readonly operationId: "Signup";
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["user"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly description: "Given a user's credentials, this endpoint will create a new user.";
                readonly tags: readonly ["Auth"];
                readonly security: readonly [];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/SignupParams";
                            };
                        };
                    };
                };
            };
        };
        readonly "/login": {
            readonly post: {
                readonly operationId: "Login";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SessionResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly Public: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/LoginParams";
                            };
                        };
                    };
                };
            };
        };
        readonly "/logout": {
            readonly get: {
                readonly operationId: "logout";
                readonly responses: {
                    readonly "204": {
                        readonly description: "";
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/folders": {
            readonly post: {
                readonly operationId: "createFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly folder: {
                                            readonly $ref: "#/components/schemas/FolderData";
                                        };
                                    };
                                    readonly required: readonly ["folder"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly metadataLocation: {
                                        readonly $ref: "#/components/schemas/UserLocationInputData";
                                    };
                                    readonly contentLocation: {
                                        readonly $ref: "#/components/schemas/UserLocationInputData";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["contentLocation", "name"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
            readonly get: {
                readonly operationId: "listFolders";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ListFoldersResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/folders/{folderId}": {
            readonly get: {
                readonly operationId: "getFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly permissions: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/FolderPermissionName";
                                            };
                                            readonly type: "array";
                                        };
                                        readonly folder: {
                                            readonly $ref: "#/components/schemas/FolderData";
                                        };
                                    };
                                    readonly required: readonly ["permissions", "folder"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly delete: {
                readonly operationId: "deleteFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/metadata": {
            readonly get: {
                readonly operationId: "getFolderMetadata";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly totalSizeBytes: {
                                            readonly type: "number";
                                            readonly format: "double";
                                        };
                                        readonly totalCount: {
                                            readonly type: "number";
                                            readonly format: "double";
                                        };
                                    };
                                    readonly required: readonly ["totalSizeBytes", "totalCount"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/objects/{objectKey}": {
            readonly get: {
                readonly operationId: "getFolderObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly delete: {
                readonly operationId: "deleteFolderObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly put: {
                readonly operationId: "refreshFolderObjectS3Metadata";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly eTag: {
                                        readonly type: "string";
                                    };
                                };
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/objects": {
            readonly get: {
                readonly operationId: "listFolderObjects";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly meta: {
                                            readonly $ref: "#/components/schemas/ListResponseMeta";
                                        };
                                        readonly result: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/FolderObjectData";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["meta", "result"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "search";
                    readonly required: false;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "offset";
                    readonly required: false;
                    readonly schema: {
                        readonly format: "double";
                        readonly type: "number";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "limit";
                    readonly required: false;
                    readonly schema: {
                        readonly format: "double";
                        readonly type: "number";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/refresh": {
            readonly post: {
                readonly operationId: "refreshFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                    readonly enum: readonly [true];
                                    readonly nullable: false;
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/presigned-urls": {
            readonly post: {
                readonly operationId: "createPresignedUrls";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly type: "array";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/SignedURLsRequest";
                                };
                                readonly type: "array";
                            };
                        };
                    };
                };
            };
        };
        readonly "/server/settings/server-locations/{locationType}": {
            readonly get: {
                readonly operationId: "listServerLocations";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly items: {
                                        readonly $ref: "#/components/schemas/ServerLocationData";
                                    };
                                    readonly type: "array";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user_folders_location:read"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "locationType";
                    readonly required: true;
                    readonly schema: {
                        readonly $ref: "#/components/schemas/ServerLocationType";
                    };
                }];
            };
        };
        readonly "/server/settings/locations/{locationType}": {
            readonly post: {
                readonly operationId: "addServerLocation";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ServerLocationData";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["metadata_location:read"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "locationType";
                    readonly required: true;
                    readonly schema: {
                        readonly $ref: "#/components/schemas/ServerLocationType";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/ServerLocationInputData";
                            };
                        };
                    };
                };
            };
        };
        readonly "/server/settings/locations/{locationType}/{locationId}": {
            readonly delete: {
                readonly operationId: "deleteServerLocation";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["metadata_location:read"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "locationType";
                    readonly required: true;
                    readonly schema: {
                        readonly $ref: "#/components/schemas/ServerLocationType";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "locationId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/server/users": {
            readonly get: {
                readonly operationId: "listUsers";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ListUsersResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user:read"];
                }];
                readonly parameters: readonly [];
            };
            readonly post: {
                readonly operationId: "createUser";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["user"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user:create"];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/CreateUserData";
                            };
                        };
                    };
                };
            };
        };
        readonly "/server/users/{userId}": {
            readonly get: {
                readonly operationId: "getUser";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly result: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["result"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user:read"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "userId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly put: {
                readonly operationId: "updateUser";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["user"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user:create"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "userId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UpdateUserData";
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly operationId: "deleteUser";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["user:create"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "userId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/server/settings": {
            readonly get: {
                readonly operationId: "getSettings";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly settings: {
                                            readonly $ref: "#/components/schemas/ServerSettings";
                                        };
                                    };
                                    readonly required: readonly ["settings"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["server_settings:read"];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/server/modules": {
            readonly get: {
                readonly operationId: "listModules";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly connected: {
                                            readonly $ref: "#/components/schemas/ModuleConnectionsMap";
                                        };
                                        readonly installed: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/ModuleData";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["connected", "installed"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["server_modules:read"];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/server/settings/{settingsKey}": {
            readonly put: {
                readonly operationId: "updateSetting";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly settings: {
                                            readonly $ref: "#/components/schemas/ServerSettings";
                                        };
                                    };
                                    readonly required: readonly ["settings"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["server_settings:update"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "settingsKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly value: {};
                                };
                                readonly required: readonly ["value"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly operationId: "resetSetting";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly settings: {
                                            readonly $ref: "#/components/schemas/ServerSettings";
                                        };
                                    };
                                    readonly required: readonly ["settings"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Server"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["server_settings:update"];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "settingsKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/viewer": {
            readonly get: {
                readonly operationId: "getViewer";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["user"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Viewer"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["viewer:read"];
                }];
                readonly parameters: readonly [];
            };
            readonly put: {
                readonly operationId: "updateViewer";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["user"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Viewer"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["viewer:update"];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/ViewerUpdatePayload";
                            };
                        };
                    };
                };
            };
        };
    };
    readonly servers: readonly [{
        readonly url: "http://localhost:3001/api/v1";
    }];
};
