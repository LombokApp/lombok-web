export const schema = {
  "components": {
    "examples": {},
    "headers": {},
    "parameters": {},
    "requestBodies": {},
    "responses": {},
    "schemas": {
      "SessionResponse": {
        "properties": {
          "data": {
            "properties": {
              "expiresAt": {
                "type": "string",
                "format": "date-time"
              },
              "refreshToken": {
                "type": "string"
              },
              "accessToken": {
                "type": "string"
              }
            },
            "required": [
              "expiresAt",
              "refreshToken",
              "accessToken"
            ],
            "type": "object"
          }
        },
        "required": [
          "data"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ErrorMetaData": {
        "properties": {},
        "type": "object",
        "additionalProperties": {}
      },
      "ErrorData": {
        "properties": {
          "code": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "detail": {
            "type": "string"
          },
          "meta": {
            "$ref": "#/components/schemas/ErrorMetaData"
          },
          "pointer": {
            "type": "string"
          }
        },
        "required": [
          "code"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ErrorResponse": {
        "properties": {
          "errors": {
            "items": {
              "$ref": "#/components/schemas/ErrorData"
            },
            "type": "array"
          }
        },
        "required": [
          "errors"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "PlatformRole": {
        "enum": [
          "ANONYMOUS",
          "USER",
          "ADMIN",
          "SERVICE"
        ],
        "type": "string"
      },
      "EmailFormat": {
        "type": "string",
        "format": "email",
        "maxLength": 255
      },
      "UsernameFormat": {
        "type": "string",
        "format": "email",
        "maxLength": 64
      },
      "UserData": {
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "role": {
            "$ref": "#/components/schemas/PlatformRole"
          },
          "name": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "allOf": [
              {
                "$ref": "#/components/schemas/EmailFormat"
              }
            ],
            "nullable": true
          },
          "emailVerified": {
            "type": "boolean"
          },
          "isAdmin": {
            "type": "boolean"
          },
          "username": {
            "$ref": "#/components/schemas/UsernameFormat"
          },
          "permissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "required": [
          "createdAt",
          "updatedAt",
          "id",
          "role",
          "name",
          "email",
          "emailVerified",
          "isAdmin",
          "permissions"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "SignupParams": {
        "properties": {
          "username": {
            "type": "string",
            "maxLength": 255
          },
          "email": {
            "type": "string",
            "maxLength": 255
          },
          "password": {
            "type": "string",
            "maxLength": 255
          }
        },
        "required": [
          "username",
          "email",
          "password"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "LoginParams": {
        "properties": {
          "login": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        },
        "required": [
          "login",
          "password"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "OutputUploadUrlsResponse": {
        "properties": {
          "folderId": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        },
        "required": [
          "folderId",
          "objectKey",
          "url"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "CreateOutputUploadUrlsPayload": {
        "properties": {
          "outputFiles": {
            "items": {
              "properties": {
                "objectKey": {
                  "type": "string"
                },
                "folderId": {
                  "type": "string"
                }
              },
              "required": [
                "objectKey",
                "folderId"
              ],
              "type": "object"
            },
            "type": "array"
          }
        },
        "required": [
          "outputFiles"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "MetadataUploadUrlsResponse": {
        "properties": {
          "folderId": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "urls": {
            "properties": {},
            "additionalProperties": {
              "type": "string"
            },
            "type": "object"
          }
        },
        "required": [
          "folderId",
          "objectKey",
          "urls"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "CreateMetadataUploadUrlsPayload": {
        "properties": {
          "contentHash": {
            "type": "string"
          },
          "metadataFiles": {
            "items": {
              "properties": {
                "metadataHashes": {
                  "properties": {},
                  "additionalProperties": {
                    "type": "string"
                  },
                  "type": "object"
                },
                "objectKey": {
                  "type": "string"
                },
                "folderId": {
                  "type": "string"
                }
              },
              "required": [
                "metadataHashes",
                "objectKey",
                "folderId"
              ],
              "type": "object"
            },
            "type": "array"
          }
        },
        "required": [
          "contentHash",
          "metadataFiles"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "MediaType": {
        "enum": [
          "IMAGE",
          "VIDEO",
          "AUDIO",
          "DOCUMENT",
          "UNKNOWN"
        ],
        "type": "string"
      },
      "ContentAttributesType": {
        "properties": {
          "mediaType": {
            "$ref": "#/components/schemas/MediaType"
          },
          "mimeType": {
            "type": "string"
          },
          "height": {
            "type": "number",
            "format": "double"
          },
          "width": {
            "type": "number",
            "format": "double"
          },
          "orientation": {
            "type": "number",
            "format": "double"
          },
          "lengthMs": {
            "type": "number",
            "format": "double"
          },
          "bitrate": {
            "type": "number",
            "format": "double"
          }
        },
        "required": [
          "mediaType",
          "mimeType",
          "height",
          "width",
          "orientation",
          "lengthMs",
          "bitrate"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ContentAttibutesPayload": {
        "properties": {
          "folderId": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "hash": {
            "type": "string"
          },
          "attributes": {
            "$ref": "#/components/schemas/ContentAttributesType"
          }
        },
        "required": [
          "folderId",
          "objectKey",
          "hash",
          "attributes"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "MetadataEntry": {
        "properties": {
          "mimeType": {
            "type": "string"
          },
          "size": {
            "type": "number",
            "format": "double"
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "mimeType",
          "size",
          "hash"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ContentMetadataType": {
        "properties": {},
        "type": "object",
        "additionalProperties": {
          "$ref": "#/components/schemas/MetadataEntry"
        }
      },
      "ContentMetadataPayload": {
        "properties": {
          "folderId": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "hash": {
            "type": "string"
          },
          "metadata": {
            "$ref": "#/components/schemas/ContentMetadataType"
          }
        },
        "required": [
          "folderId",
          "objectKey",
          "hash",
          "metadata"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "StorageLocationData": {
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "userId": {
            "type": "string"
          },
          "providerType": {
            "type": "string",
            "enum": [
              "SERVER",
              "USER"
            ]
          },
          "name": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "bucket": {
            "type": "string"
          },
          "prefix": {
            "type": "string"
          },
          "accessKeyId": {
            "type": "string"
          }
        },
        "required": [
          "createdAt",
          "updatedAt",
          "id",
          "providerType",
          "name",
          "endpoint",
          "bucket",
          "accessKeyId"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderData": {
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "ownerId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "metadataLocation": {
            "$ref": "#/components/schemas/StorageLocationData"
          },
          "contentLocation": {
            "$ref": "#/components/schemas/StorageLocationData"
          }
        },
        "required": [
          "createdAt",
          "updatedAt",
          "id",
          "name",
          "metadataLocation",
          "contentLocation"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "UserLocationInputData": {
        "properties": {
          "serverLocationId": {
            "type": "string"
          },
          "userLocationId": {
            "type": "string"
          },
          "userLocationBucketOverride": {
            "type": "string"
          },
          "userLocationPrefixOverride": {
            "type": "string"
          },
          "accessKeyId": {
            "type": "string"
          },
          "secretAccessKey": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "bucket": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "prefix": {
            "type": "string"
          }
        },
        "type": "object",
        "additionalProperties": false
      },
      "FolderPermissionName": {
        "enum": [
          "folder_refresh",
          "folder_manage_shares",
          "folder_forget",
          "object_edit",
          "object_manage",
          "tag_create",
          "tag_associate"
        ],
        "type": "string"
      },
      "FolderAndPermission": {
        "properties": {
          "folder": {
            "$ref": "#/components/schemas/FolderData"
          },
          "permissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "required": [
          "folder",
          "permissions"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ListFoldersResponse": {
        "properties": {
          "meta": {
            "properties": {
              "totalCount": {
                "type": "number",
                "format": "double"
              }
            },
            "required": [
              "totalCount"
            ],
            "type": "object"
          },
          "result": {
            "items": {
              "$ref": "#/components/schemas/FolderAndPermission"
            },
            "type": "array"
          }
        },
        "required": [
          "meta",
          "result"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ContentAttributesByHash": {
        "properties": {},
        "type": "object",
        "additionalProperties": {
          "$ref": "#/components/schemas/ContentAttributesType"
        }
      },
      "ContentMetadataByHash": {
        "properties": {},
        "type": "object",
        "additionalProperties": {
          "$ref": "#/components/schemas/ContentMetadataType"
        }
      },
      "FolderObjectData": {
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "folderId": {
            "type": "string"
          },
          "contentAttributes": {
            "$ref": "#/components/schemas/ContentAttributesByHash"
          },
          "contentMetadata": {
            "$ref": "#/components/schemas/ContentMetadataByHash"
          },
          "hash": {
            "type": "string",
            "nullable": true
          },
          "lastModified": {
            "type": "number",
            "format": "double"
          },
          "eTag": {
            "type": "string"
          },
          "sizeBytes": {
            "type": "number",
            "format": "double"
          },
          "mediaType": {
            "$ref": "#/components/schemas/MediaType"
          },
          "mimeType": {
            "type": "string"
          }
        },
        "required": [
          "createdAt",
          "updatedAt",
          "id",
          "objectKey",
          "folderId",
          "contentAttributes",
          "contentMetadata",
          "hash",
          "lastModified",
          "eTag",
          "sizeBytes",
          "mediaType",
          "mimeType"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderOperationName": {
        "enum": [
          "IndexFolderObject",
          "TranscribeAudio",
          "DetectObjects"
        ],
        "type": "string"
      },
      "FolderOperationData": {
        "properties": {
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "operationName": {
            "$ref": "#/components/schemas/FolderOperationName"
          },
          "operationData": {
            "properties": {},
            "additionalProperties": {},
            "type": "object"
          },
          "started": {
            "type": "boolean"
          },
          "completed": {
            "type": "boolean"
          },
          "error": {
            "type": "string",
            "nullable": true
          }
        },
        "required": [
          "createdAt",
          "updatedAt",
          "id",
          "operationName",
          "operationData",
          "started",
          "completed",
          "error"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderOperationRequestPayload": {
        "properties": {
          "operationName": {
            "$ref": "#/components/schemas/FolderOperationName"
          },
          "operationData": {
            "properties": {},
            "additionalProperties": {},
            "type": "object"
          }
        },
        "required": [
          "operationName",
          "operationData"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ListResponseMeta": {
        "properties": {
          "totalCount": {
            "type": "number",
            "format": "double"
          }
        },
        "required": [
          "totalCount"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "SignedURLsRequestMethod": {
        "enum": [
          "PUT",
          "DELETE",
          "GET"
        ],
        "type": "string"
      },
      "SignedURLsRequest": {
        "properties": {
          "objectIdentifier": {
            "type": "string"
          },
          "method": {
            "$ref": "#/components/schemas/SignedURLsRequestMethod"
          }
        },
        "required": [
          "objectIdentifier",
          "method"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderOperationsResponse": {
        "properties": {
          "meta": {
            "properties": {
              "totalCount": {
                "type": "number",
                "format": "double"
              }
            },
            "required": [
              "totalCount"
            ],
            "type": "object"
          },
          "result": {
            "items": {
              "$ref": "#/components/schemas/FolderOperationData"
            },
            "type": "array"
          }
        },
        "required": [
          "meta",
          "result"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderOperationSort": {
        "enum": [
          "createdAt-asc",
          "createdAt-desc",
          "updatedAt-asc",
          "updatedAt-desc"
        ],
        "type": "string"
      },
      "FolderOperationStatus": {
        "enum": [
          "PENDING",
          "FAILED",
          "COMPLETE"
        ],
        "type": "string"
      },
      "ServerLocationData": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "accessKeyId": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "bucket": {
            "type": "string"
          },
          "prefix": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "endpoint",
          "accessKeyId",
          "region",
          "bucket"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ServerLocationType": {
        "enum": [
          "USER_METADATA",
          "USER_CONTENT",
          "USER_BACKUP"
        ],
        "type": "string"
      },
      "ServerLocationInputData": {
        "properties": {
          "name": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "accessKeyId": {
            "type": "string"
          },
          "secretAccessKey": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "bucket": {
            "type": "string"
          },
          "prefix": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "endpoint",
          "accessKeyId",
          "secretAccessKey",
          "region",
          "bucket"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ListUsersResponse": {
        "properties": {
          "meta": {
            "properties": {
              "totalCount": {
                "type": "number",
                "format": "double"
              }
            },
            "required": [
              "totalCount"
            ],
            "type": "object"
          },
          "result": {
            "items": {
              "$ref": "#/components/schemas/UserData"
            },
            "type": "array"
          }
        },
        "required": [
          "meta",
          "result"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "CreateUserData": {
        "properties": {
          "admin": {
            "type": "boolean"
          },
          "emailVerified": {
            "type": "boolean"
          },
          "password": {
            "type": "string"
          },
          "name": {
            "type": "string",
            "maxLength": 255
          },
          "email": {
            "type": "string",
            "maxLength": 255
          },
          "permissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "username": {
            "type": "string",
            "maxLength": 64
          }
        },
        "required": [
          "username",
          "password"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "UpdateUserData": {
        "properties": {
          "admin": {
            "type": "boolean"
          },
          "emailVerified": {
            "type": "boolean"
          },
          "password": {
            "type": "string"
          },
          "name": {
            "type": "string",
            "maxLength": 255
          },
          "email": {
            "type": "string",
            "maxLength": 255
          },
          "permissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "type": "object",
        "additionalProperties": false
      },
      "ServerSettings": {
        "properties": {
          "SIGNUP_ENABLED": {
            "type": "boolean"
          }
        },
        "required": [
          "SIGNUP_ENABLED"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderWorkerKeyData": {
        "properties": {
          "id": {
            "type": "string"
          },
          "accessTokenExpiresAt": {
            "type": "string",
            "format": "date-time"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "id",
          "accessTokenExpiresAt",
          "createdAt",
          "updatedAt"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderWorkerKeySort": {
        "enum": [
          "createdAt-asc",
          "createdAt-desc",
          "updatedAt-asc",
          "updatedAt-desc"
        ],
        "type": "string"
      },
      "FolderWorkerData": {
        "properties": {
          "id": {
            "type": "string"
          },
          "externalId": {
            "type": "string"
          },
          "paused": {
            "type": "boolean"
          },
          "ips": {
            "properties": {},
            "additionalProperties": {
              "properties": {
                "lastSeen": {
                  "type": "string",
                  "format": "date-time"
                },
                "firstSeen": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "lastSeen",
                "firstSeen"
              ],
              "type": "object"
            },
            "type": "object"
          },
          "capabilities": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "firstSeen": {
            "type": "string",
            "format": "date-time"
          },
          "lastSeen": {
            "type": "string",
            "format": "date-time"
          },
          "keyId": {
            "type": "string",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "id",
          "externalId",
          "paused",
          "ips",
          "capabilities",
          "firstSeen",
          "lastSeen",
          "keyId",
          "createdAt",
          "updatedAt"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "FolderWorkerSort": {
        "enum": [
          "createdAt-asc",
          "createdAt-desc",
          "updatedAt-asc",
          "updatedAt-desc",
          "lastSeen-asc",
          "lastSeen-desc",
          "firstSeen-asc",
          "firstSeen-desc"
        ],
        "type": "string"
      },
      "ViewerUpdatePayload": {
        "properties": {
          "name": {
            "type": "string"
          }
        },
        "required": [
          "name"
        ],
        "type": "object",
        "additionalProperties": false
      }
    },
    "securitySchemes": {
      "RefreshToken": {
        "type": "apiKey",
        "in": "query",
        "name": "refresh_token"
      },
      "AccessToken": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      },
      "WorkerAccessToken": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "info": {
    "title": "@stellariscloud/api",
    "version": "1.0.0",
    "contact": {}
  },
  "openapi": "3.0.0",
  "paths": {
    "/token": {
      "post": {
        "operationId": "refreshToken",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionResponse"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ],
        "security": [
          {
            "RefreshToken": []
          }
        ],
        "parameters": []
      }
    },
    "/signup": {
      "post": {
        "operationId": "Signup",
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "user": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "user"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "description": "Given a user's credentials, this endpoint will create a new user.",
        "tags": [
          "Auth"
        ],
        "security": [],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "data": {
                    "$ref": "#/components/schemas/SignupParams"
                  }
                },
                "required": [
                  "data"
                ],
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/login": {
      "post": {
        "operationId": "Login",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionResponse"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ],
        "security": [
          {
            "Public": []
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginParams"
              }
            }
          }
        }
      }
    },
    "/logout": {
      "get": {
        "operationId": "logout",
        "responses": {
          "204": {
            "description": ""
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": []
      }
    },
    "/worker/{operationId}/start": {
      "get": {
        "operationId": "startJob",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "items": {
                    "properties": {
                      "url": {
                        "type": "string"
                      },
                      "objectKey": {
                        "type": "string"
                      },
                      "folderId": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "url",
                      "objectKey",
                      "folderId"
                    ],
                    "type": "object"
                  },
                  "type": "array"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "operationId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/worker/{operationId}/complete": {
      "post": {
        "operationId": "completeJob",
        "responses": {
          "204": {
            "description": "No content"
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "operationId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/worker/{operationId}/output-upload-urls": {
      "post": {
        "operationId": "createOutputUploadUrls",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "outputUploadUrls": {
                      "items": {
                        "$ref": "#/components/schemas/OutputUploadUrlsResponse"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "outputUploadUrls"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "operationId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOutputUploadUrlsPayload"
              }
            }
          }
        }
      }
    },
    "/worker/{operationId}/metadata-upload-urls": {
      "post": {
        "operationId": "createMetadataUploadUrls",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "metadataUploadUrls": {
                      "items": {
                        "$ref": "#/components/schemas/MetadataUploadUrlsResponse"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "metadataUploadUrls"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "operationId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateMetadataUploadUrlsPayload"
              }
            }
          }
        }
      }
    },
    "/worker/content-attributes": {
      "post": {
        "operationId": "updateContentAttributes",
        "responses": {
          "204": {
            "description": "No content"
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "items": {
                  "$ref": "#/components/schemas/ContentAttibutesPayload"
                },
                "type": "array"
              }
            }
          }
        }
      }
    },
    "/worker/content-metadata": {
      "post": {
        "operationId": "updateContentMetadata",
        "responses": {
          "204": {
            "description": "No content"
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "items": {
                  "$ref": "#/components/schemas/ContentMetadataPayload"
                },
                "type": "array"
              }
            }
          }
        }
      }
    },
    "/worker/socket": {
      "post": {
        "operationId": "createSocketAuthentication",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "token": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "token"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Worker"
        ],
        "security": [
          {
            "WorkerAccessToken": []
          }
        ],
        "parameters": []
      }
    },
    "/folders": {
      "post": {
        "operationId": "createFolder",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "folder": {
                      "$ref": "#/components/schemas/FolderData"
                    }
                  },
                  "required": [
                    "folder"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "metadataLocation": {
                    "$ref": "#/components/schemas/UserLocationInputData"
                  },
                  "contentLocation": {
                    "$ref": "#/components/schemas/UserLocationInputData"
                  },
                  "name": {
                    "type": "string"
                  }
                },
                "required": [
                  "contentLocation",
                  "name"
                ],
                "type": "object"
              }
            }
          }
        }
      },
      "get": {
        "operationId": "listFolders",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ListFoldersResponse"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": []
      }
    },
    "/folders/{folderId}": {
      "get": {
        "operationId": "getFolder",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "permissions": {
                      "items": {
                        "$ref": "#/components/schemas/FolderPermissionName"
                      },
                      "type": "array"
                    },
                    "folder": {
                      "$ref": "#/components/schemas/FolderData"
                    }
                  },
                  "required": [
                    "permissions",
                    "folder"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "delete": {
        "operationId": "deleteFolder",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "success": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "success"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/metadata": {
      "get": {
        "operationId": "getFolderMetadata",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "totalSizeBytes": {
                      "type": "number",
                      "format": "double"
                    },
                    "totalCount": {
                      "type": "number",
                      "format": "double"
                    }
                  },
                  "required": [
                    "totalSizeBytes",
                    "totalCount"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/objects/{objectKey}": {
      "get": {
        "operationId": "getFolderObject",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectData"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "objectKey",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "delete": {
        "operationId": "deleteFolderObject",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "success": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "success"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "objectKey",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "put": {
        "operationId": "refreshFolderObjectS3Metadata",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectData"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "objectKey",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "eTag": {
                    "type": "string"
                  }
                },
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/folders/{folderId}/operations": {
      "post": {
        "operationId": "enqueueFolderOperation",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderOperationData"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FolderOperationRequestPayload"
              }
            }
          }
        }
      },
      "get": {
        "operationId": "listFolderOperations",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderOperationsResponse"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "sort",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/FolderOperationSort"
            }
          },
          {
            "in": "query",
            "name": "status",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/FolderOperationStatus"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          },
          {
            "in": "query",
            "name": "offset",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/objects": {
      "get": {
        "operationId": "listFolderObjects",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "meta": {
                      "$ref": "#/components/schemas/ListResponseMeta"
                    },
                    "result": {
                      "items": {
                        "$ref": "#/components/schemas/FolderObjectData"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "meta",
                    "result"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "search",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "offset",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/index-all": {
      "post": {
        "operationId": "indexAllContent",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "type": "boolean"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/refresh": {
      "post": {
        "operationId": "refreshFolder",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "type": "boolean",
                  "enum": [
                    true
                  ],
                  "nullable": false
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/folders/{folderId}/presigned-urls": {
      "post": {
        "operationId": "createPresignedUrls",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "items": {
                    "type": "string"
                  },
                  "type": "array"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "items": {
                  "$ref": "#/components/schemas/SignedURLsRequest"
                },
                "type": "array"
              }
            }
          }
        }
      }
    },
    "/folders/{folderId}/socket-auth": {
      "post": {
        "operationId": "createSocketAuthentication",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "token": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "token"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "AccessToken": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "folderId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/server/settings/server-locations/{locationType}": {
      "get": {
        "operationId": "listServerLocations",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "items": {
                    "$ref": "#/components/schemas/ServerLocationData"
                  },
                  "type": "array"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user_folders_location:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "locationType",
            "required": true,
            "schema": {
              "$ref": "#/components/schemas/ServerLocationType"
            }
          }
        ]
      }
    },
    "/server/settings/locations/{locationType}": {
      "post": {
        "operationId": "addServerLocation",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ServerLocationData"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "metadata_location:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "locationType",
            "required": true,
            "schema": {
              "$ref": "#/components/schemas/ServerLocationType"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ServerLocationInputData"
              }
            }
          }
        }
      }
    },
    "/server/settings/locations/{locationType}/{locationId}": {
      "delete": {
        "operationId": "deleteServerLocation",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "type": "boolean"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "metadata_location:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "locationType",
            "required": true,
            "schema": {
              "$ref": "#/components/schemas/ServerLocationType"
            }
          },
          {
            "in": "path",
            "name": "locationId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/server/users": {
      "get": {
        "operationId": "listUsers",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ListUsersResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user:read"
            ]
          }
        ],
        "parameters": []
      },
      "post": {
        "operationId": "createUser",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "user": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "user"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user:create"
            ]
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateUserData"
              }
            }
          }
        }
      }
    },
    "/server/users/{userId}": {
      "get": {
        "operationId": "getUser",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "result": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "result"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "put": {
        "operationId": "updateUser",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "user": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "user"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user:create"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserData"
              }
            }
          }
        }
      },
      "delete": {
        "operationId": "deleteUser",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "type": "boolean"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "user:create"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/server/settings": {
      "get": {
        "operationId": "getSettings",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "settings": {
                      "$ref": "#/components/schemas/ServerSettings"
                    }
                  },
                  "required": [
                    "settings"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_settings:read"
            ]
          }
        ],
        "parameters": []
      }
    },
    "/server/settings/{settingsKey}": {
      "put": {
        "operationId": "updateSetting",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "settings": {
                      "$ref": "#/components/schemas/ServerSettings"
                    }
                  },
                  "required": [
                    "settings"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_settings:update"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "settingsKey",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "value": {}
                },
                "required": [
                  "value"
                ],
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "operationId": "resetSetting",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "settings": {
                      "$ref": "#/components/schemas/ServerSettings"
                    }
                  },
                  "required": [
                    "settings"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_settings:update"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "settingsKey",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/server/worker-keys": {
      "post": {
        "operationId": "createServerWorkerKey",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "workerKey": {
                      "$ref": "#/components/schemas/FolderWorkerKeyData"
                    },
                    "token": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "workerKey",
                    "token"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_worker_key:create"
            ]
          }
        ],
        "parameters": []
      },
      "get": {
        "operationId": "listServerWorkerKeys",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "result": {
                      "items": {
                        "$ref": "#/components/schemas/FolderWorkerKeyData"
                      },
                      "type": "array"
                    },
                    "meta": {
                      "properties": {
                        "totalCount": {
                          "type": "number",
                          "format": "double"
                        }
                      },
                      "required": [
                        "totalCount"
                      ],
                      "type": "object"
                    }
                  },
                  "required": [
                    "result",
                    "meta"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_worker_key:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "query",
            "name": "sort",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/FolderWorkerKeySort"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          },
          {
            "in": "query",
            "name": "offset",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          }
        ]
      }
    },
    "/server/worker-keys/{workerKeyId}": {
      "delete": {
        "operationId": "deleteServerWorkerKey",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "success": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "success"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_worker_key:delete"
            ]
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "workerKeyId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/server/workers": {
      "get": {
        "operationId": "listServerWorkers",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "result": {
                      "items": {
                        "$ref": "#/components/schemas/FolderWorkerData"
                      },
                      "type": "array"
                    },
                    "meta": {
                      "properties": {
                        "totalCount": {
                          "type": "number",
                          "format": "double"
                        }
                      },
                      "required": [
                        "totalCount"
                      ],
                      "type": "object"
                    }
                  },
                  "required": [
                    "result",
                    "meta"
                  ],
                  "type": "object"
                }
              }
            }
          },
          "4XX": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Server"
        ],
        "security": [
          {
            "AccessToken": [
              "server_worker_key:read"
            ]
          }
        ],
        "parameters": [
          {
            "in": "query",
            "name": "sort",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/FolderWorkerSort"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          },
          {
            "in": "query",
            "name": "offset",
            "required": false,
            "schema": {
              "format": "double",
              "type": "number"
            }
          }
        ]
      }
    },
    "/viewer": {
      "get": {
        "operationId": "getViewer",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "data": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "data"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Viewer"
        ],
        "security": [
          {
            "AccessToken": [
              "viewer:read"
            ]
          }
        ],
        "parameters": []
      },
      "put": {
        "operationId": "updateViewer",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "data": {
                      "$ref": "#/components/schemas/UserData"
                    }
                  },
                  "required": [
                    "data"
                  ],
                  "type": "object"
                }
              }
            }
          }
        },
        "tags": [
          "Viewer"
        ],
        "security": [
          {
            "AccessToken": [
              "viewer:update"
            ]
          }
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewerUpdatePayload"
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "http://localhost:3001/api/v1"
    }
  ]
} as const;
