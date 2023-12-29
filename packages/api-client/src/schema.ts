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
          "accessToken": {
            "type": "string"
          },
          "refreshToken": {
            "type": "string"
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "accessToken",
          "refreshToken",
          "expiresAt"
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
      "ContentAttributesByHash": {
        "properties": {},
        "type": "object",
        "additionalProperties": {
          "$ref": "#/components/schemas/ContentAttributesType"
        }
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
          "isAdmin": {
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
          "isAdmin": {
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
      "ModuleAction": {
        "properties": {
          "key": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        },
        "required": [
          "key",
          "description"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ModuleConfig": {
        "properties": {
          "publicKey": {
            "type": "string"
          },
          "subscribedEvents": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "emitEvents": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "actions": {
            "properties": {
              "object": {
                "items": {
                  "$ref": "#/components/schemas/ModuleAction"
                },
                "type": "array"
              },
              "folder": {
                "items": {
                  "$ref": "#/components/schemas/ModuleAction"
                },
                "type": "array"
              }
            },
            "required": [
              "object",
              "folder"
            ],
            "type": "object"
          }
        },
        "required": [
          "publicKey",
          "subscribedEvents",
          "emitEvents",
          "actions"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ModuleData": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "config": {
            "$ref": "#/components/schemas/ModuleConfig"
          }
        },
        "required": [
          "id",
          "name",
          "config"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ModuleConnectionsMap": {
        "properties": {},
        "type": "object",
        "additionalProperties": {
          "properties": {},
          "additionalProperties": {
            "properties": {
              "ip": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "id": {
                "type": "string"
              }
            },
            "required": [
              "ip",
              "name",
              "id"
            ],
            "type": "object"
          },
          "type": "object"
        }
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
                "$ref": "#/components/schemas/SignupParams"
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
    "/server/modules": {
      "get": {
        "operationId": "listModules",
        "responses": {
          "200": {
            "description": "Ok",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "connected": {
                      "$ref": "#/components/schemas/ModuleConnectionsMap"
                    },
                    "installed": {
                      "items": {
                        "$ref": "#/components/schemas/ModuleData"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "connected",
                    "installed"
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
              "server_modules:read"
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
