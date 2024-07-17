export const schema = {
  "openapi": "3.0.0",
  "paths": {
    "/auth/login": {
      "post": {
        "operationId": "login",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginCredentialsDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Authenticate the user and return access and refresh tokens.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ]
      }
    },
    "/auth/signup": {
      "post": {
        "operationId": "signup",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SignupCredentialsDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Register a new user.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignupResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ]
      }
    },
    "/auth/logout": {
      "post": {
        "operationId": "logout",
        "parameters": [],
        "responses": {
          "201": {
            "description": "Logout. Kill the current session.",
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
          "Auth"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/auth/refresh-token": {
      "post": {
        "operationId": "refreshToken",
        "parameters": [
          {
            "name": "refeshToken",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Refresh a session with a refresh token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TokenRefreshResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
        ]
      }
    },
    "/viewer": {
      "get": {
        "operationId": "getViewer",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ViewerGetResponse"
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
            "bearer": []
          }
        ]
      },
      "put": {
        "operationId": "updateViewer",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateViewerInputDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ViewerGetResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/server/users": {
      "post": {
        "operationId": "createUser",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserCreateInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Create a user.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Users"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "get": {
        "operationId": "listUsers",
        "parameters": [
          {
            "name": "offset",
            "required": false,
            "in": "query",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 0,
              "exclusiveMinimum": true,
              "type": "number"
            }
          },
          {
            "name": "isAdmin",
            "required": false,
            "in": "query",
            "schema": {
              "type": "boolean"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "email-asc",
                "email-desc",
                "name-asc",
                "name-desc",
                "role-asc",
                "role-desc",
                "status-asc",
                "status-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List the users.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Users"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/server/users/{userId}": {
      "patch": {
        "operationId": "updateUser",
        "parameters": [
          {
            "name": "userId",
            "required": true,
            "in": "path",
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
                "$ref": "#/components/schemas/UserUpdateInputDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Update a user.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Users"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "get": {
        "operationId": "getUser",
        "parameters": [
          {
            "name": "userId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get a user by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Users"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "delete": {
        "operationId": "deleteUser",
        "parameters": [
          {
            "name": "userId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Delete a server user by id."
          }
        },
        "tags": [
          "Users"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}": {
      "get": {
        "operationId": "getFolder",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get a folder by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderGetResponse"
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
            "bearer": []
          }
        ]
      },
      "delete": {
        "operationId": "deleteFolder",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Delete a folder by id."
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}/metadata": {
      "get": {
        "operationId": "getFolderMetadata",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get the metadata for a folder by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderGetMetadataResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/folders": {
      "get": {
        "operationId": "listFolders",
        "parameters": [
          {
            "name": "offset",
            "required": false,
            "in": "query",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 0,
              "exclusiveMinimum": true,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List folders.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderListResponse"
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
            "bearer": []
          }
        ]
      },
      "post": {
        "operationId": "createFolder",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FolderCreateInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Create a folder.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderCreateResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}/rescan": {
      "post": {
        "operationId": "rescanFolder",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Scan the underlying S3 location and update our local representation of it."
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}/objects": {
      "get": {
        "operationId": "listFolderObjects",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "offset",
            "required": false,
            "in": "query",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 0,
              "exclusiveMinimum": true,
              "type": "number"
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List folder objects by folderId.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectListResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}/objects/{objectKey}": {
      "get": {
        "operationId": "getFolderObject",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "objectKey",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get a folder object by folderId and objectKey.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectGetResponse"
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
            "bearer": []
          }
        ]
      },
      "delete": {
        "operationId": "deleteFolderObject",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "objectKey",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Delete a folder object by folderId and objectKey."
          }
        },
        "tags": [
          "Folders"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "post": {
        "operationId": "refreshFolderObjectS3Metadata",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "objectKey",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Scan the object again in the underlying storage, and update its state in our db.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectGetResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/folders/{folderId}/presigned-urls": {
      "post": {
        "operationId": "createPresignedUrls",
        "parameters": [
          {
            "name": "folderId",
            "required": true,
            "in": "path",
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
                "$ref": "#/components/schemas/FolderCreateSignedUrlInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Create presigned urls for objects in a folder.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderCreateSignedUrlsResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/server/settings": {
      "get": {
        "operationId": "getServerSettings",
        "parameters": [],
        "responses": {
          "200": {
            "description": "Get the server settings object.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingsGetResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/server/settings/{settingKey}": {
      "put": {
        "operationId": "setServerSetting",
        "parameters": [
          {
            "name": "settingKey",
            "required": true,
            "in": "path",
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
                "$ref": "#/components/schemas/SetSettingInputDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Set a setting in the server settings objects.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingSetResponse"
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
            "bearer": []
          }
        ]
      },
      "delete": {
        "operationId": "resetServerSetting",
        "parameters": [
          {
            "name": "settingKey",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reset a setting in the server settings objects.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingSetResponse"
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
            "bearer": []
          }
        ]
      }
    },
    "/server/storage-provisions": {
      "get": {
        "operationId": "listStorageProvisions",
        "parameters": [
          {
            "name": "provisionType",
            "required": false,
            "in": "query",
            "schema": {
              "enum": [
                "METADATA",
                "CONTENT",
                "BACKUP"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List the server provisions.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StorageProvisionListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "StorageProvisions"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "post": {
        "operationId": "createServerProvision",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/StorageProvisionInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Create a new server provision.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StorageProvisionListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "StorageProvisions"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/server/storage-provisions/{storageProvisionId}": {
      "put": {
        "operationId": "updateStorageProvision",
        "parameters": [
          {
            "name": "storageProvisionId",
            "required": true,
            "in": "path",
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
                "$ref": "#/components/schemas/StorageProvisionInputDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Update a server provision by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StorageProvisionListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "StorageProvisions"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      },
      "delete": {
        "operationId": "deleteStorageProvision",
        "parameters": [
          {
            "name": "storageProvisionId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Delete a server provision by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StorageProvisionListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "StorageProvisions"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/events/{eventId}": {
      "get": {
        "operationId": "getEvent",
        "parameters": [],
        "responses": {
          "200": {
            "description": "Get an event by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventGetResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Events"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    },
    "/server/apps": {
      "get": {
        "operationId": "listApps",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AppListResponse"
                }
              }
            }
          }
        },
        "tags": [
          "Apps"
        ],
        "security": [
          {
            "bearer": []
          }
        ]
      }
    }
  },
  "info": {
    "title": "@stellariscloud/api",
    "description": "The Stellaris Cloud core API",
    "version": "1.0",
    "contact": {}
  },
  "tags": [],
  "servers": [],
  "components": {
    "securitySchemes": {
      "bearer": {
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "type": "http"
      }
    },
    "schemas": {
      "LoginCredentialsDTO": {
        "type": "object",
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
        ]
      },
      "LoginResponse": {
        "type": "object",
        "properties": {
          "session": {
            "type": "object",
            "properties": {
              "accessToken": {
                "type": "string"
              },
              "refreshToken": {
                "type": "string"
              }
            },
            "required": [
              "accessToken",
              "refreshToken"
            ]
          }
        },
        "required": [
          "session"
        ]
      },
      "SignupCredentialsDTO": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string",
            "minLength": 3,
            "maxLength": 64
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
          "password"
        ]
      },
      "SignupResponse": {
        "type": "object",
        "properties": {
          "user": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "email": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "emailVerified": {
                "type": "boolean"
              },
              "isAdmin": {
                "type": "boolean"
              },
              "username": {
                "type": "string"
              },
              "permissions": {
                "type": "array",
                "items": {
                  "type": "string"
                }
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
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "user"
        ]
      },
      "TokenRefreshResponse": {
        "type": "object",
        "properties": {
          "session": {
            "type": "object",
            "properties": {
              "accessToken": {
                "type": "string"
              },
              "refreshToken": {
                "type": "string"
              }
            },
            "required": [
              "accessToken",
              "refreshToken"
            ]
          }
        },
        "required": [
          "session"
        ]
      },
      "ViewerGetResponse": {
        "type": "object",
        "properties": {
          "user": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "email": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "emailVerified": {
                "type": "boolean"
              },
              "isAdmin": {
                "type": "boolean"
              },
              "username": {
                "type": "string"
              },
              "permissions": {
                "type": "array",
                "items": {
                  "type": "string"
                }
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
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "user"
        ]
      },
      "UpdateViewerInputDTO": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        },
        "required": [
          "name"
        ]
      },
      "UserDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": [
              "string",
              "null"
            ]
          },
          "email": {
            "type": [
              "string",
              "null"
            ]
          },
          "emailVerified": {
            "type": "boolean"
          },
          "isAdmin": {
            "type": "boolean"
          },
          "username": {
            "type": "string"
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string"
            }
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
          "emailVerified",
          "isAdmin",
          "username",
          "permissions",
          "createdAt",
          "updatedAt"
        ]
      },
      "UserCreateInputDTO": {
        "type": "object",
        "properties": {
          "name": {
            "type": [
              "string",
              "null"
            ]
          },
          "email": {
            "type": [
              "string",
              "null"
            ]
          },
          "emailVerified": {
            "type": "boolean"
          },
          "isAdmin": {
            "type": "boolean"
          },
          "username": {
            "type": "string"
          },
          "password": {
            "type": "string"
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "username",
          "password"
        ]
      },
      "UserGetResponse": {
        "type": "object",
        "properties": {
          "user": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "email": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "emailVerified": {
                "type": "boolean"
              },
              "isAdmin": {
                "type": "boolean"
              },
              "username": {
                "type": "string"
              },
              "permissions": {
                "type": "array",
                "items": {
                  "type": "string"
                }
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
              "emailVerified",
              "isAdmin",
              "username",
              "permissions",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "user"
        ]
      },
      "UserUpdateInputDTO": {
        "type": "object",
        "properties": {
          "name": {
            "type": [
              "string",
              "null"
            ]
          },
          "email": {
            "type": [
              "string",
              "null"
            ]
          },
          "emailVerified": {
            "type": "boolean"
          },
          "isAdmin": {
            "type": "boolean"
          },
          "username": {
            "type": "string"
          },
          "password": {
            "type": "string"
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "UserListResponse": {
        "type": "object",
        "properties": {
          "meta": {
            "type": "object",
            "properties": {
              "totalCount": {
                "type": "number"
              }
            },
            "required": [
              "totalCount"
            ]
          },
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "email": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "emailVerified": {
                  "type": "boolean"
                },
                "isAdmin": {
                  "type": "boolean"
                },
                "username": {
                  "type": "string"
                },
                "permissions": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
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
                "emailVerified",
                "isAdmin",
                "username",
                "permissions",
                "createdAt",
                "updatedAt"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      },
      "FolderDTO": {
        "type": "object",
        "properties": {
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
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "userId": {
                "type": "string"
              },
              "label": {
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
              "id",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId"
            ]
          },
          "contentLocation": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "userId": {
                "type": "string"
              },
              "label": {
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
              "id",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId"
            ]
          }
        },
        "required": [
          "id",
          "ownerId",
          "name",
          "metadataLocation",
          "contentLocation"
        ]
      },
      "FolderObjectDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "objectKey": {
            "type": "string"
          },
          "folderId": {
            "type": "string"
          },
          "hash": {
            "type": [
              "string",
              "null"
            ]
          },
          "lastModified": {
            "type": "number"
          },
          "eTag": {
            "type": "string"
          },
          "sizeBytes": {
            "type": "number"
          },
          "mimeType": {
            "type": "string"
          },
          "mediaType": {
            "type": "string",
            "enum": [
              "IMAGE",
              "VIDEO",
              "AUDIO",
              "DOCUMENT",
              "UNKNOWN"
            ]
          },
          "contentAttributes": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "properties": {
                "mediaType": {
                  "type": "string",
                  "enum": [
                    "IMAGE",
                    "VIDEO",
                    "AUDIO",
                    "DOCUMENT",
                    "UNKNOWN"
                  ]
                },
                "mimeType": {
                  "type": "string"
                },
                "height": {
                  "type": "number"
                },
                "width": {
                  "type": "number"
                },
                "orientation": {
                  "type": "number"
                },
                "lengthMs": {
                  "type": "number"
                },
                "bitrate": {
                  "type": "number"
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
              ]
            }
          },
          "contentMetadata": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "mimeType": {
                    "type": "string"
                  },
                  "size": {
                    "type": "number"
                  },
                  "hash": {
                    "type": "string"
                  }
                },
                "required": [
                  "mimeType",
                  "size",
                  "hash"
                ]
              }
            }
          }
        },
        "required": [
          "id",
          "objectKey",
          "folderId",
          "lastModified",
          "eTag",
          "sizeBytes",
          "mimeType",
          "mediaType",
          "contentAttributes",
          "contentMetadata"
        ]
      },
      "FolderObjectContentMetadataDTO": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "mimeType": {
              "type": "string"
            },
            "size": {
              "type": "number"
            },
            "hash": {
              "type": "string"
            }
          },
          "required": [
            "mimeType",
            "size",
            "hash"
          ]
        }
      },
      "FolderObjectContentAttributesDTO": {
        "type": "object",
        "properties": {
          "mediaType": {
            "type": "string",
            "enum": [
              "IMAGE",
              "VIDEO",
              "AUDIO",
              "DOCUMENT",
              "UNKNOWN"
            ]
          },
          "mimeType": {
            "type": "string"
          },
          "height": {
            "type": "number"
          },
          "width": {
            "type": "number"
          },
          "orientation": {
            "type": "number"
          },
          "lengthMs": {
            "type": "number"
          },
          "bitrate": {
            "type": "number"
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
        ]
      },
      "FolderGetResponse": {
        "type": "object",
        "properties": {
          "folder": {
            "type": "object",
            "properties": {
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
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "userId": {
                    "type": "string"
                  },
                  "label": {
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
                  "id",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId"
                ]
              },
              "contentLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "userId": {
                    "type": "string"
                  },
                  "label": {
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
                  "id",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId"
                ]
              }
            },
            "required": [
              "id",
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation"
            ]
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "FOLDER_RESCAN",
                "FOLDER_FORGET",
                "OBJECT_EDIT",
                "OBJECT_MANAGE"
              ]
            }
          }
        },
        "required": [
          "folder",
          "permissions"
        ]
      },
      "FolderGetMetadataResponse": {
        "type": "object",
        "properties": {
          "totalCount": {
            "type": "number"
          },
          "totalSizeBytes": {
            "type": "number"
          }
        },
        "required": [
          "totalCount",
          "totalSizeBytes"
        ]
      },
      "FolderListResponse": {
        "type": "object",
        "properties": {
          "meta": {
            "type": "object",
            "properties": {
              "totalCount": {
                "type": "number"
              }
            },
            "required": [
              "totalCount"
            ]
          },
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "permissions": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "FOLDER_RESCAN",
                      "FOLDER_FORGET",
                      "OBJECT_EDIT",
                      "OBJECT_MANAGE"
                    ]
                  }
                },
                "folder": {
                  "type": "object",
                  "properties": {
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
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "userId": {
                          "type": "string"
                        },
                        "label": {
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
                        "id",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId"
                      ]
                    },
                    "contentLocation": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "userId": {
                          "type": "string"
                        },
                        "label": {
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
                        "id",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId"
                      ]
                    }
                  },
                  "required": [
                    "id",
                    "ownerId",
                    "name",
                    "metadataLocation",
                    "contentLocation"
                  ]
                }
              },
              "required": [
                "permissions",
                "folder"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      },
      "FolderCreateInputDTO": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "metadataLocation": {
            "type": "object",
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
            }
          },
          "contentLocation": {
            "type": "object",
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
            }
          }
        },
        "required": [
          "name",
          "metadataLocation",
          "contentLocation"
        ]
      },
      "FolderCreateResponse": {
        "type": "object",
        "properties": {
          "folder": {
            "type": "object",
            "properties": {
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
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "userId": {
                    "type": "string"
                  },
                  "label": {
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
                  "id",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId"
                ]
              },
              "contentLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "userId": {
                    "type": "string"
                  },
                  "label": {
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
                  "id",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId"
                ]
              }
            },
            "required": [
              "id",
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation"
            ]
          }
        },
        "required": [
          "folder"
        ]
      },
      "FolderObjectListResponse": {
        "type": "object",
        "properties": {
          "meta": {
            "type": "object",
            "properties": {
              "totalCount": {
                "type": "number"
              }
            },
            "required": [
              "totalCount"
            ]
          },
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "objectKey": {
                  "type": "string"
                },
                "folderId": {
                  "type": "string"
                },
                "hash": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "lastModified": {
                  "type": "number"
                },
                "eTag": {
                  "type": "string"
                },
                "sizeBytes": {
                  "type": "number"
                },
                "mimeType": {
                  "type": "string"
                },
                "mediaType": {
                  "type": "string",
                  "enum": [
                    "IMAGE",
                    "VIDEO",
                    "AUDIO",
                    "DOCUMENT",
                    "UNKNOWN"
                  ]
                },
                "contentAttributes": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "object",
                    "properties": {
                      "mediaType": {
                        "type": "string",
                        "enum": [
                          "IMAGE",
                          "VIDEO",
                          "AUDIO",
                          "DOCUMENT",
                          "UNKNOWN"
                        ]
                      },
                      "mimeType": {
                        "type": "string"
                      },
                      "height": {
                        "type": "number"
                      },
                      "width": {
                        "type": "number"
                      },
                      "orientation": {
                        "type": "number"
                      },
                      "lengthMs": {
                        "type": "number"
                      },
                      "bitrate": {
                        "type": "number"
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
                    ]
                  }
                },
                "contentMetadata": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "mimeType": {
                          "type": "string"
                        },
                        "size": {
                          "type": "number"
                        },
                        "hash": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "mimeType",
                        "size",
                        "hash"
                      ]
                    }
                  }
                }
              },
              "required": [
                "id",
                "objectKey",
                "folderId",
                "lastModified",
                "eTag",
                "sizeBytes",
                "mimeType",
                "mediaType",
                "contentAttributes",
                "contentMetadata"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      },
      "FolderObjectGetResponse": {
        "type": "object",
        "properties": {
          "folderObject": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "objectKey": {
                "type": "string"
              },
              "folderId": {
                "type": "string"
              },
              "hash": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "lastModified": {
                "type": "number"
              },
              "eTag": {
                "type": "string"
              },
              "sizeBytes": {
                "type": "number"
              },
              "mimeType": {
                "type": "string"
              },
              "mediaType": {
                "type": "string",
                "enum": [
                  "IMAGE",
                  "VIDEO",
                  "AUDIO",
                  "DOCUMENT",
                  "UNKNOWN"
                ]
              },
              "contentAttributes": {
                "type": "object",
                "additionalProperties": {
                  "type": "object",
                  "properties": {
                    "mediaType": {
                      "type": "string",
                      "enum": [
                        "IMAGE",
                        "VIDEO",
                        "AUDIO",
                        "DOCUMENT",
                        "UNKNOWN"
                      ]
                    },
                    "mimeType": {
                      "type": "string"
                    },
                    "height": {
                      "type": "number"
                    },
                    "width": {
                      "type": "number"
                    },
                    "orientation": {
                      "type": "number"
                    },
                    "lengthMs": {
                      "type": "number"
                    },
                    "bitrate": {
                      "type": "number"
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
                  ]
                }
              },
              "contentMetadata": {
                "type": "object",
                "additionalProperties": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "object",
                    "properties": {
                      "mimeType": {
                        "type": "string"
                      },
                      "size": {
                        "type": "number"
                      },
                      "hash": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "mimeType",
                      "size",
                      "hash"
                    ]
                  }
                }
              }
            },
            "required": [
              "id",
              "objectKey",
              "folderId",
              "lastModified",
              "eTag",
              "sizeBytes",
              "mimeType",
              "mediaType",
              "contentAttributes",
              "contentMetadata"
            ]
          }
        },
        "required": [
          "folderObject"
        ]
      },
      "FolderCreateSignedUrlInputDTO": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "objectIdentifier": {
              "type": "string"
            },
            "method": {
              "type": "string",
              "enum": [
                "DELETE",
                "PUT",
                "GET"
              ]
            }
          },
          "required": [
            "objectIdentifier",
            "method"
          ]
        }
      },
      "FolderCreateSignedUrlsResponse": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "SettingsGetResponse": {
        "type": "object",
        "properties": {
          "settings": {
            "type": "object",
            "properties": {
              "SIGNUP_ENABLED": {
                "type": "boolean"
              },
              "SIGNUP_PERMISSIONS": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "SERVER_HOSTNAME": {
                "type": "string"
              }
            }
          }
        },
        "required": [
          "settings"
        ]
      },
      "SetSettingInputDTO": {
        "type": "object",
        "properties": {
          "value": {}
        }
      },
      "SettingSetResponse": {
        "type": "object",
        "properties": {
          "settingKey": {
            "type": "string"
          },
          "settingValue": {}
        },
        "required": [
          "settingKey"
        ]
      },
      "StorageProvisionListResponse": {
        "type": "object",
        "properties": {
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "label": {
                  "type": "string",
                  "maxLength": 32
                },
                "description": {
                  "type": "string",
                  "maxLength": 128
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
                "accessKeyId": {
                  "type": "string"
                },
                "prefix": {
                  "type": "string"
                },
                "provisionTypes": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "METADATA",
                      "CONTENT",
                      "BACKUP"
                    ]
                  }
                }
              },
              "required": [
                "id",
                "label",
                "description",
                "endpoint",
                "bucket",
                "region",
                "accessKeyId",
                "provisionTypes"
              ]
            }
          }
        },
        "required": [
          "result"
        ]
      },
      "StorageProvisionInputDTO": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string",
            "maxLength": 32
          },
          "description": {
            "type": "string",
            "maxLength": 128
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
          "accessKeyId": {
            "type": "string"
          },
          "secretAccessKey": {
            "type": "string"
          },
          "prefix": {
            "type": "string"
          },
          "provisionTypes": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "METADATA",
                "CONTENT",
                "BACKUP"
              ]
            }
          }
        },
        "required": [
          "label",
          "description",
          "endpoint",
          "bucket",
          "region",
          "accessKeyId",
          "secretAccessKey",
          "provisionTypes"
        ]
      },
      "EventGetResponse": {
        "type": "object",
        "properties": {
          "event": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "eventKey": {
                "type": "string"
              },
              "data": {
                "type": "object",
                "properties": {
                  "folderId": {
                    "type": "string"
                  },
                  "objectKey": {
                    "type": "string"
                  }
                },
                "required": [
                  "folderId"
                ]
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
              "eventKey",
              "data",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "event"
        ]
      },
      "AppListResponse": {
        "type": "object",
        "properties": {
          "meta": {
            "type": "object",
            "properties": {
              "totalCount": {
                "type": "number"
              }
            },
            "required": [
              "totalCount"
            ]
          },
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "identifier": {
                  "type": "string"
                },
                "config": {
                  "type": "object",
                  "properties": {
                    "publicKey": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "subscribedEvents": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "emitEvents": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "actions": {
                      "type": "object",
                      "properties": {
                        "folder": {
                          "type": "array",
                          "items": {
                            "type": "object",
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
                            ]
                          }
                        },
                        "object": {
                          "type": "array",
                          "items": {
                            "type": "object",
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
                            ]
                          }
                        }
                      },
                      "required": [
                        "folder",
                        "object"
                      ]
                    },
                    "menuItems": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "label": {
                            "type": "string"
                          },
                          "iconPath": {
                            "type": "string"
                          },
                          "uiName": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "label",
                          "uiName"
                        ]
                      }
                    }
                  },
                  "required": [
                    "publicKey",
                    "description",
                    "subscribedEvents",
                    "emitEvents",
                    "actions",
                    "menuItems"
                  ]
                },
                "ui": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "object",
                    "properties": {
                      "path": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      },
                      "files": {
                        "type": "object",
                        "additionalProperties": {
                          "type": "object",
                          "properties": {
                            "size": {
                              "type": "number"
                            },
                            "hash": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "size",
                            "hash"
                          ]
                        }
                      }
                    },
                    "required": [
                      "path",
                      "name",
                      "files"
                    ]
                  }
                }
              },
              "required": [
                "identifier",
                "config",
                "ui"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      }
    }
  }
} as const;
