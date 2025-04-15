export const schema = {
  "openapi": "3.1.0",
  "paths": {
    "/api/v1/auth/login": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginResponse"
                }
              }
            }
          }
        },
        "summary": "Authenticate the user and return access and refresh tokens.",
        "tags": [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/signup": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignupResponse"
                }
              }
            }
          }
        },
        "summary": "Register a new user.",
        "tags": [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/logout": {
      "post": {
        "operationId": "logout",
        "parameters": [],
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "boolean"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Logout. Kill the current session.",
        "tags": [
          "Auth"
        ]
      }
    },
    "/api/v1/auth/{refreshToken}": {
      "post": {
        "operationId": "refreshToken",
        "parameters": [
          {
            "name": "refreshToken",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TokenRefreshResponse"
                }
              }
            }
          }
        },
        "summary": "Refresh a session with a refresh token.",
        "tags": [
          "Auth"
        ]
      }
    },
    "/api/v1/viewer": {
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
        "security": [
          {
            "bearer": []
          }
        ],
        "tags": [
          "Viewer"
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
                "$ref": "#/components/schemas/ViewerUpdateInputDTO"
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
        "security": [
          {
            "bearer": []
          }
        ],
        "tags": [
          "Viewer"
        ]
      }
    },
    "/api/v1/server/users": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Create a user.",
        "tags": [
          "Users"
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
              "type": "string",
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "email-asc",
                "email-desc",
                "name-asc",
                "name-desc",
                "username-asc",
                "username-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List the users.",
        "tags": [
          "Users"
        ]
      }
    },
    "/api/v1/server/users/{userId}": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Update a user.",
        "tags": [
          "Users"
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a user by id.",
        "tags": [
          "Users"
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
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Delete a server user by id.",
        "tags": [
          "Users"
        ]
      }
    },
    "/api/v1/folders/{folderId}": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a folder by id.",
        "tags": [
          "Folders"
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
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Delete a folder by id.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/metadata": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderGetMetadataResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get the metadata for a folder by id.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders": {
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
              "type": "number"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "name-asc",
                "name-desc",
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List folders.",
        "tags": [
          "Folders"
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderCreateResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Create a folder.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/reindex": {
      "post": {
        "operationId": "reindexFolder",
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
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Scan the underlying S3 location and update our local representation of it.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/objects": {
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
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "size-asc",
                "size-desc",
                "filename-asc",
                "filename-desc",
                "objectKey-asc",
                "objectKey-desc",
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List folder objects by folderId.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/objects/{objectKey}": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a folder object by folderId and objectKey.",
        "tags": [
          "Folders"
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
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Delete a folder object by folderId and objectKey.",
        "tags": [
          "Folders"
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderObjectGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Scan the object again in the underlying storage, and update its state in our db.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/presigned-urls": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FolderCreateSignedUrlsResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Create presigned urls for objects in a folder.",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/folders/{folderId}/apps/{appIdentifier}/trigger/{taskKey}": {
      "post": {
        "operationId": "handleAppTaskTrigger",
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
            "name": "appIdentifier",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "taskKey",
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
                "$ref": "#/components/schemas/TriggerAppTaskInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Handle app task trigger",
        "tags": [
          "Folders"
        ]
      }
    },
    "/api/v1/access-keys": {
      "get": {
        "operationId": "listAccessKeys",
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
              "type": "number"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "accessKeyId-asc",
                "accessKeyId-desc",
                "accessKeyHashId-asc",
                "accessKeyHashId-desc",
                "endpoint-asc",
                "endpoint-desc",
                "region-asc",
                "region-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List access keys.",
        "tags": [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/access-keys/{accessKeyHashId}": {
      "get": {
        "operationId": "getAccessKey",
        "parameters": [
          {
            "name": "accessKeyHashId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get an access key by id.",
        "tags": [
          "AccessKeys"
        ]
      },
      "post": {
        "operationId": "rotateAccessKey",
        "parameters": [
          {
            "name": "accessKeyHashId",
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
                "$ref": "#/components/schemas/RotateAccessKeyInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyRotateResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Rotate an access key.",
        "tags": [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/access-keys/{accessKeyHashId}/buckets": {
      "get": {
        "operationId": "listAccessKeyBuckets",
        "parameters": [
          {
            "name": "accessKeyHashId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyBucketsListResponseDTO"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List buckets for an access key.",
        "tags": [
          "AccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys": {
      "get": {
        "operationId": "listServerAccessKeys",
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
              "type": "number"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "accessKeyId-asc",
                "accessKeyId-desc",
                "accessKeyHashId-asc",
                "accessKeyHashId-desc",
                "endpoint-asc",
                "endpoint-desc",
                "region-asc",
                "region-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List server access keys.",
        "tags": [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/access-keys/{accessKeyHashId}": {
      "get": {
        "operationId": "getServerAccessKey",
        "parameters": [
          {
            "name": "accessKeyHashId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get server access key by id.",
        "tags": [
          "ServerAccessKeys"
        ]
      },
      "post": {
        "operationId": "rotateServerAccessKey",
        "parameters": [
          {
            "name": "accessKeyHashId",
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
                "$ref": "#/components/schemas/RotateAccessKeyInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccessKeyRotateResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Rotate a server access key.",
        "tags": [
          "ServerAccessKeys"
        ]
      }
    },
    "/api/v1/server/settings": {
      "get": {
        "operationId": "getServerSettings",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingsGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get the server settings object.",
        "tags": [
          "Server"
        ]
      }
    },
    "/api/v1/server/settings/{settingKey}": {
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingSetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Set a setting in the server settings objects.",
        "tags": [
          "Server"
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SettingSetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Reset a setting in the server settings objects.",
        "tags": [
          "Server"
        ]
      }
    },
    "/api/v1/server/user-storage-provisions": {
      "get": {
        "operationId": "listUserStorageProvisions",
        "parameters": [
          {
            "name": "provisionType",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List the user storage provisions.",
        "tags": [
          "UserStorageProvisions"
        ]
      },
      "post": {
        "operationId": "createUserStorageProvision",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserStorageProvisionInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Create a new user storage provision.",
        "tags": [
          "UserStorageProvisions"
        ]
      }
    },
    "/api/v1/server/user-storage-provisions/{userStorageProvisionId}": {
      "get": {
        "operationId": "getUserStorageProvision",
        "parameters": [
          {
            "name": "userStorageProvisionId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserStorageProvisionGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a user storage provision by id.",
        "tags": [
          "UserStorageProvisions"
        ]
      },
      "put": {
        "operationId": "updateUserStorageProvision",
        "parameters": [
          {
            "name": "userStorageProvisionId",
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
                "$ref": "#/components/schemas/UserStorageProvisionInputDTO"
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
                  "$ref": "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Update a server provision by id.",
        "tags": [
          "UserStorageProvisions"
        ]
      },
      "delete": {
        "operationId": "deleteUserStorageProvision",
        "parameters": [
          {
            "name": "userStorageProvisionId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserStorageProvisionListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Delete a server provision by id.",
        "tags": [
          "UserStorageProvisions"
        ]
      }
    },
    "/api/v1/server/server-storage-location": {
      "get": {
        "operationId": "getServerStorageLocation",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ServerStorageLocationGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get the server storage location.",
        "tags": [
          "ServerStorageLocation"
        ]
      },
      "post": {
        "operationId": "setServerStorageLocation",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ServerStorageLocationInputDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ServerStorageLocationGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Create a new server provision.",
        "tags": [
          "ServerStorageLocation"
        ]
      },
      "delete": {
        "operationId": "deleteServerStorageLocation",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Delete any set server storage location.",
        "tags": [
          "ServerStorageLocation"
        ]
      }
    },
    "/api/v1/server/tasks/{taskId}": {
      "get": {
        "operationId": "getTask",
        "parameters": [
          {
            "name": "taskId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TaskGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a task by id.",
        "tags": [
          "ServerTasks"
        ]
      }
    },
    "/api/v1/server/tasks": {
      "get": {
        "operationId": "listTasks",
        "parameters": [
          {
            "name": "objectKey",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "includeWaiting",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeRunning",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeComplete",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeFailed",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
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
              "type": "number"
            }
          },
          {
            "name": "folderId",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TaskListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List tasks.",
        "tags": [
          "ServerTasks"
        ]
      }
    },
    "/api/v1/folders/{folderId}/tasks/{taskId}": {
      "get": {
        "operationId": "getFolderTask",
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
            "name": "taskId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TaskGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a folder task by id.",
        "tags": [
          "Tasks"
        ]
      }
    },
    "/api/v1/folders/{folderId}/tasks": {
      "get": {
        "operationId": "listFolderTasks",
        "parameters": [
          {
            "name": "objectKey",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "includeWaiting",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeRunning",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeComplete",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeFailed",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
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
              "type": "number"
            }
          },
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TaskListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List tasks.",
        "tags": [
          "Tasks"
        ]
      }
    },
    "/api/v1/server/events/{eventId}": {
      "get": {
        "operationId": "getEvent",
        "parameters": [
          {
            "name": "eventId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get an event by id.",
        "tags": [
          "ServerEvents"
        ]
      }
    },
    "/api/v1/server/events": {
      "get": {
        "operationId": "listEvents",
        "parameters": [
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            "name": "folderId",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "objectKey",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "includeTrace",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeDebug",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeInfo",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeWarning",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeError",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
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
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List events.",
        "tags": [
          "ServerEvents"
        ]
      }
    },
    "/api/v1/folders/{folderId}/events/{eventId}": {
      "get": {
        "operationId": "getFolderEvent",
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
            "name": "eventId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Get a folder event by id.",
        "tags": [
          "FolderEvents"
        ]
      }
    },
    "/api/v1/folders/{folderId}/events": {
      "get": {
        "operationId": "listFolderEvents",
        "parameters": [
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "createdAt-asc",
                "createdAt-desc",
                "updatedAt-asc",
                "updatedAt-desc"
              ]
            }
          },
          {
            "name": "objectKey",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "includeTrace",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeDebug",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeInfo",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeWarning",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
            }
          },
          {
            "name": "includeError",
            "required": false,
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "true"
              ]
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
              "type": "number"
            }
          },
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
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventListResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "List tasks.",
        "tags": [
          "FolderEvents"
        ]
      }
    },
    "/api/v1/server/apps": {
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
        "security": [
          {
            "bearer": []
          }
        ],
        "tags": [
          "Apps"
        ]
      }
    },
    "/api/v1/server/apps/{appIdentifier}": {
      "get": {
        "operationId": "getApp",
        "parameters": [
          {
            "name": "appIdentifier",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AppGetResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "tags": [
          "Apps"
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
            "minLength": 1,
            "format": "email"
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
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "nullable": true
              },
              "email": {
                "type": "string",
                "nullable": true
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
              "name",
              "email",
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
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "nullable": true
              },
              "email": {
                "type": "string",
                "nullable": true
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
              "name",
              "email",
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
      "ViewerUpdateInputDTO": {
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
            "type": "string",
            "format": "uuid"
          },
          "name": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "type": "string",
            "nullable": true
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
          "name",
          "email",
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
            "type": "string",
            "minLength": 1
          },
          "email": {
            "type": "string",
            "minLength": 1
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
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "nullable": true
              },
              "email": {
                "type": "string",
                "nullable": true
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
              "name",
              "email",
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
            "type": "string",
            "minLength": 1
          },
          "email": {
            "type": "string",
            "minLength": 1
          },
          "isAdmin": {
            "type": "boolean"
          },
          "username": {
            "type": "string",
            "minLength": 2
          },
          "password": {
            "type": "string",
            "minLength": 1
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
                  "type": "string",
                  "format": "uuid"
                },
                "name": {
                  "oneOf": [
                    {
                      "type": "string"
                    },
                    {}
                  ],
                  "nullable": true
                },
                "email": {
                  "oneOf": [
                    {
                      "type": "string"
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
                "email",
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
            "type": "string",
            "format": "uuid"
          },
          "ownerId": {
            "type": "string",
            "format": "uuid"
          },
          "name": {
            "type": "string"
          },
          "metadataLocation": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "userId": {
                "type": "string",
                "format": "uuid"
              },
              "providerType": {
                "type": "string",
                "enum": [
                  "SERVER",
                  "USER"
                ]
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
              },
              "accessKeyHashId": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "providerType",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId",
              "accessKeyHashId"
            ]
          },
          "contentLocation": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "userId": {
                "type": "string",
                "format": "uuid"
              },
              "providerType": {
                "type": "string",
                "enum": [
                  "SERVER",
                  "USER"
                ]
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
              },
              "accessKeyHashId": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "providerType",
              "label",
              "endpoint",
              "region",
              "bucket",
              "accessKeyId",
              "accessKeyHashId"
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
          "ownerId",
          "name",
          "metadataLocation",
          "contentLocation",
          "createdAt",
          "updatedAt"
        ]
      },
      "FolderObjectDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "objectKey": {
            "type": "string"
          },
          "folderId": {
            "type": "string",
            "format": "uuid"
          },
          "hash": {
            "type": "string"
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
      "StorageLocationInputDTO": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
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
            "required": [
              "accessKeyId",
              "secretAccessKey",
              "endpoint",
              "bucket",
              "region"
            ]
          },
          {
            "type": "object",
            "properties": {
              "storageProvisionId": {
                "type": "string",
                "format": "uuid"
              }
            },
            "required": [
              "storageProvisionId"
            ]
          },
          {
            "type": "object",
            "properties": {
              "userLocationId": {
                "type": "string",
                "format": "uuid"
              },
              "userLocationBucketOverride": {
                "type": "string"
              },
              "userLocationPrefixOverride": {
                "type": "string"
              }
            },
            "required": [
              "userLocationId",
              "userLocationBucketOverride"
            ]
          }
        ]
      },
      "FolderGetResponse": {
        "type": "object",
        "properties": {
          "folder": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "ownerId": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              },
              "metadataLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "providerType": {
                    "type": "string",
                    "enum": [
                      "SERVER",
                      "USER"
                    ]
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
                  },
                  "accessKeyHashId": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              "contentLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "providerType": {
                    "type": "string",
                    "enum": [
                      "SERVER",
                      "USER"
                    ]
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
                  },
                  "accessKeyHashId": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
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
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation",
              "createdAt",
              "updatedAt"
            ]
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "FOLDER_REINDEX",
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
                      "FOLDER_REINDEX",
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
                      "type": "string",
                      "format": "uuid"
                    },
                    "ownerId": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "name": {
                      "type": "string"
                    },
                    "metadataLocation": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "format": "uuid"
                        },
                        "userId": {
                          "type": "string",
                          "format": "uuid"
                        },
                        "providerType": {
                          "type": "string",
                          "enum": [
                            "SERVER",
                            "USER"
                          ]
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
                        },
                        "accessKeyHashId": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "id",
                        "providerType",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId",
                        "accessKeyHashId"
                      ]
                    },
                    "contentLocation": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "format": "uuid"
                        },
                        "userId": {
                          "type": "string",
                          "format": "uuid"
                        },
                        "providerType": {
                          "type": "string",
                          "enum": [
                            "SERVER",
                            "USER"
                          ]
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
                        },
                        "accessKeyHashId": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "id",
                        "providerType",
                        "label",
                        "endpoint",
                        "region",
                        "bucket",
                        "accessKeyId",
                        "accessKeyHashId"
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
                    "ownerId",
                    "name",
                    "metadataLocation",
                    "contentLocation",
                    "createdAt",
                    "updatedAt"
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
            "oneOf": [
              {
                "type": "object",
                "properties": {
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
                "required": [
                  "accessKeyId",
                  "secretAccessKey",
                  "endpoint",
                  "bucket",
                  "region"
                ]
              },
              {
                "type": "object",
                "properties": {
                  "storageProvisionId": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "required": [
                  "storageProvisionId"
                ]
              },
              {
                "type": "object",
                "properties": {
                  "userLocationId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userLocationBucketOverride": {
                    "type": "string"
                  },
                  "userLocationPrefixOverride": {
                    "type": "string"
                  }
                },
                "required": [
                  "userLocationId",
                  "userLocationBucketOverride"
                ]
              }
            ]
          },
          "contentLocation": {
            "oneOf": [
              {
                "type": "object",
                "properties": {
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
                "required": [
                  "accessKeyId",
                  "secretAccessKey",
                  "endpoint",
                  "bucket",
                  "region"
                ]
              },
              {
                "type": "object",
                "properties": {
                  "storageProvisionId": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "required": [
                  "storageProvisionId"
                ]
              },
              {
                "type": "object",
                "properties": {
                  "userLocationId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userLocationBucketOverride": {
                    "type": "string"
                  },
                  "userLocationPrefixOverride": {
                    "type": "string"
                  }
                },
                "required": [
                  "userLocationId",
                  "userLocationBucketOverride"
                ]
              }
            ]
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
                "type": "string",
                "format": "uuid"
              },
              "ownerId": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              },
              "metadataLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "providerType": {
                    "type": "string",
                    "enum": [
                      "SERVER",
                      "USER"
                    ]
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
                  },
                  "accessKeyHashId": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
                ]
              },
              "contentLocation": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "userId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "providerType": {
                    "type": "string",
                    "enum": [
                      "SERVER",
                      "USER"
                    ]
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
                  },
                  "accessKeyHashId": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "providerType",
                  "label",
                  "endpoint",
                  "region",
                  "bucket",
                  "accessKeyId",
                  "accessKeyHashId"
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
              "ownerId",
              "name",
              "metadataLocation",
              "contentLocation",
              "createdAt",
              "updatedAt"
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
                  "type": "string",
                  "format": "uuid"
                },
                "objectKey": {
                  "type": "string"
                },
                "folderId": {
                  "type": "string",
                  "format": "uuid"
                },
                "hash": {
                  "type": "string"
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
                "type": "string",
                "format": "uuid"
              },
              "objectKey": {
                "type": "string"
              },
              "folderId": {
                "type": "string",
                "format": "uuid"
              },
              "hash": {
                "type": "string"
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
        "type": "object",
        "properties": {
          "urls": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "urls"
        ]
      },
      "TriggerAppTaskInputDTO": {
        "type": "object",
        "properties": {
          "objectKey": {
            "type": "string"
          },
          "inputParams": {}
        }
      },
      "AccessKeyDTO": {
        "type": "object",
        "properties": {
          "accessKeyId": {
            "type": "string"
          },
          "accessKeyHashId": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "endpointDomain": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "folderCount": {
            "type": "number"
          }
        },
        "required": [
          "accessKeyId",
          "accessKeyHashId",
          "endpoint",
          "endpointDomain",
          "region",
          "folderCount"
        ]
      },
      "AccessKeyListResponse": {
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
                "accessKeyId": {
                  "type": "string"
                },
                "accessKeyHashId": {
                  "type": "string"
                },
                "endpoint": {
                  "type": "string"
                },
                "endpointDomain": {
                  "type": "string"
                },
                "region": {
                  "type": "string"
                },
                "folderCount": {
                  "type": "number"
                }
              },
              "required": [
                "accessKeyId",
                "accessKeyHashId",
                "endpoint",
                "endpointDomain",
                "region",
                "folderCount"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      },
      "AccessKeyGetResponse": {
        "type": "object",
        "properties": {
          "accessKey": {
            "type": "object",
            "properties": {
              "accessKeyId": {
                "type": "string"
              },
              "accessKeyHashId": {
                "type": "string"
              },
              "endpoint": {
                "type": "string"
              },
              "endpointDomain": {
                "type": "string"
              },
              "region": {
                "type": "string"
              },
              "folderCount": {
                "type": "number"
              }
            },
            "required": [
              "accessKeyId",
              "accessKeyHashId",
              "endpoint",
              "endpointDomain",
              "region",
              "folderCount"
            ]
          }
        },
        "required": [
          "accessKey"
        ]
      },
      "RotateAccessKeyInputDTO": {
        "type": "object",
        "properties": {
          "accessKeyId": {
            "type": "string"
          },
          "secretAccessKey": {
            "type": "string"
          }
        },
        "required": [
          "accessKeyId",
          "secretAccessKey"
        ]
      },
      "AccessKeyRotateResponse": {
        "type": "object",
        "properties": {
          "accessKeyHashId": {
            "type": "string"
          }
        },
        "required": [
          "accessKeyHashId"
        ]
      },
      "AccessKeyBucketsListResponseDTO": {
        "type": "object",
        "properties": {
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "createdDate": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "name"
              ]
            }
          }
        },
        "required": [
          "result"
        ]
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
      "UserStorageProvisionDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "accessKeyHashId": {
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
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            },
            "minItems": 1
          },
          "label": {
            "type": "string",
            "maxLength": 32
          },
          "description": {
            "type": "string",
            "maxLength": 128
          }
        },
        "required": [
          "id",
          "accessKeyHashId",
          "endpoint",
          "bucket",
          "region",
          "accessKeyId",
          "provisionTypes",
          "label",
          "description"
        ]
      },
      "UserStorageProvisionListResponse": {
        "type": "object",
        "properties": {
          "result": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "accessKeyHashId": {
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
                      "CONTENT",
                      "METADATA",
                      "REDUNDANCY"
                    ]
                  },
                  "minItems": 1
                },
                "label": {
                  "type": "string",
                  "maxLength": 32
                },
                "description": {
                  "type": "string",
                  "maxLength": 128
                }
              },
              "required": [
                "id",
                "accessKeyHashId",
                "endpoint",
                "bucket",
                "region",
                "accessKeyId",
                "provisionTypes",
                "label",
                "description"
              ]
            }
          }
        },
        "required": [
          "result"
        ]
      },
      "UserStorageProvisionGetResponse": {
        "type": "object",
        "properties": {
          "userStorageProvision": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "accessKeyHashId": {
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
                    "CONTENT",
                    "METADATA",
                    "REDUNDANCY"
                  ]
                },
                "minItems": 1
              },
              "label": {
                "type": "string",
                "maxLength": 32
              },
              "description": {
                "type": "string",
                "maxLength": 128
              }
            },
            "required": [
              "id",
              "accessKeyHashId",
              "endpoint",
              "bucket",
              "region",
              "accessKeyId",
              "provisionTypes",
              "label",
              "description"
            ]
          }
        },
        "required": [
          "userStorageProvision"
        ]
      },
      "UserStorageProvisionInputDTO": {
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
                "CONTENT",
                "METADATA",
                "REDUNDANCY"
              ]
            },
            "minItems": 1
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
      "ServerStorageLocationDTO": {
        "type": "object",
        "properties": {
          "accessKeyHashId": {
            "type": "string"
          },
          "accessKeyId": {
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
            "type": "string",
            "minLength": 1,
            "nullable": true
          }
        },
        "required": [
          "accessKeyHashId",
          "accessKeyId",
          "endpoint",
          "bucket",
          "region",
          "prefix"
        ]
      },
      "ServerStorageLocationGetResponse": {
        "type": "object",
        "properties": {
          "serverStorageLocation": {
            "type": "object",
            "properties": {
              "accessKeyHashId": {
                "type": "string"
              },
              "accessKeyId": {
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
                "type": "string",
                "minLength": 1,
                "nullable": true
              }
            },
            "required": [
              "accessKeyHashId",
              "accessKeyId",
              "endpoint",
              "bucket",
              "region",
              "prefix"
            ]
          }
        }
      },
      "ServerStorageLocationInputDTO": {
        "type": "object",
        "properties": {
          "accessKeyId": {
            "type": "string",
            "minLength": 1
          },
          "secretAccessKey": {
            "type": "string",
            "minLength": 1
          },
          "endpoint": {
            "type": "string",
            "format": "uri"
          },
          "bucket": {
            "type": "string",
            "minLength": 1
          },
          "region": {
            "type": "string",
            "minLength": 1
          },
          "prefix": {
            "oneOf": [
              {
                "type": "string",
                "minLength": 1,
                "nullable": true
              },
              {}
            ]
          }
        },
        "required": [
          "accessKeyId",
          "secretAccessKey",
          "endpoint",
          "bucket",
          "region"
        ]
      },
      "TaskGetResponse": {
        "type": "object",
        "properties": {
          "task": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "taskKey": {
                "type": "string"
              },
              "ownerIdentifier": {
                "type": "string"
              },
              "triggeringEventId": {
                "type": "string",
                "format": "uuid"
              },
              "subjectFolderId": {
                "type": "string",
                "format": "uuid"
              },
              "subjectObjectKey": {
                "type": "string"
              },
              "handlerId": {
                "type": "string"
              },
              "inputData": {
                "type": "object",
                "additionalProperties": {
                  "oneOf": [
                    {
                      "type": "string"
                    },
                    {
                      "type": "number"
                    }
                  ]
                }
              },
              "errorAt": {
                "type": "string",
                "format": "date-time"
              },
              "errorCode": {
                "type": "string"
              },
              "errorMessage": {
                "type": "string"
              },
              "taskDescription": {
                "type": "object",
                "properties": {
                  "textKey": {
                    "type": "string"
                  },
                  "variables": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "textKey",
                  "variables"
                ]
              },
              "updates": {
                "type": "array",
                "items": {}
              },
              "startedAt": {
                "type": "string",
                "format": "date-time"
              },
              "completedAt": {
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
              "taskKey",
              "ownerIdentifier",
              "triggeringEventId",
              "inputData",
              "taskDescription",
              "updates",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "task"
        ]
      },
      "TaskListResponse": {
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
                  "type": "string",
                  "format": "uuid"
                },
                "taskKey": {
                  "type": "string"
                },
                "ownerIdentifier": {
                  "type": "string"
                },
                "triggeringEventId": {
                  "type": "string",
                  "format": "uuid"
                },
                "subjectFolderId": {
                  "type": "string",
                  "format": "uuid"
                },
                "subjectObjectKey": {
                  "type": "string"
                },
                "handlerId": {
                  "type": "string"
                },
                "inputData": {
                  "type": "object",
                  "additionalProperties": {
                    "oneOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "number"
                      }
                    ]
                  }
                },
                "errorAt": {
                  "type": "string",
                  "format": "date-time"
                },
                "errorCode": {
                  "type": "string"
                },
                "errorMessage": {
                  "type": "string"
                },
                "taskDescription": {
                  "type": "object",
                  "properties": {
                    "textKey": {
                      "type": "string"
                    },
                    "variables": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    }
                  },
                  "required": [
                    "textKey",
                    "variables"
                  ]
                },
                "updates": {
                  "type": "array",
                  "items": {}
                },
                "startedAt": {
                  "type": "string",
                  "format": "date-time"
                },
                "completedAt": {
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
                "taskKey",
                "ownerIdentifier",
                "triggeringEventId",
                "inputData",
                "taskDescription",
                "updates",
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
      "TaskDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "taskKey": {
            "type": "string"
          },
          "ownerIdentifier": {
            "type": "string"
          },
          "triggeringEventId": {
            "type": "string",
            "format": "uuid"
          },
          "subjectFolderId": {
            "type": "string",
            "format": "uuid"
          },
          "subjectObjectKey": {
            "type": "string"
          },
          "handlerId": {
            "type": "string"
          },
          "inputData": {
            "type": "object",
            "additionalProperties": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                }
              ]
            }
          },
          "errorAt": {
            "type": "string",
            "format": "date-time"
          },
          "errorCode": {
            "type": "string"
          },
          "errorMessage": {
            "type": "string"
          },
          "taskDescription": {
            "type": "object",
            "properties": {
              "textKey": {
                "type": "string"
              },
              "variables": {
                "type": "object",
                "additionalProperties": {
                  "type": "string"
                }
              }
            },
            "required": [
              "textKey",
              "variables"
            ]
          },
          "updates": {
            "type": "array",
            "items": {}
          },
          "startedAt": {
            "type": "string",
            "format": "date-time"
          },
          "completedAt": {
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
          "taskKey",
          "ownerIdentifier",
          "triggeringEventId",
          "inputData",
          "taskDescription",
          "updates",
          "createdAt",
          "updatedAt"
        ]
      },
      "EventDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "eventKey": {
            "type": "string"
          },
          "level": {
            "type": "string",
            "enum": [
              "TRACE",
              "DEBUG",
              "INFO",
              "WARN",
              "ERROR"
            ]
          },
          "emitterIdentifier": {
            "type": "string"
          },
          "locationContext": {
            "type": "object",
            "properties": {
              "folderId": {
                "type": "string",
                "format": "uuid"
              },
              "objectKey": {
                "type": "string"
              }
            },
            "required": [
              "folderId"
            ]
          },
          "data": {},
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "id",
          "eventKey",
          "level",
          "emitterIdentifier",
          "createdAt"
        ]
      },
      "EventGetResponse": {
        "type": "object",
        "properties": {
          "event": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "eventKey": {
                "type": "string"
              },
              "level": {
                "type": "string",
                "enum": [
                  "TRACE",
                  "DEBUG",
                  "INFO",
                  "WARN",
                  "ERROR"
                ]
              },
              "emitterIdentifier": {
                "type": "string"
              },
              "locationContext": {
                "type": "object",
                "properties": {
                  "folderId": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "objectKey": {
                    "type": "string"
                  }
                },
                "required": [
                  "folderId"
                ]
              },
              "data": {},
              "createdAt": {
                "type": "string",
                "format": "date-time"
              }
            },
            "required": [
              "id",
              "eventKey",
              "level",
              "emitterIdentifier",
              "createdAt"
            ]
          }
        },
        "required": [
          "event"
        ]
      },
      "EventListResponse": {
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
                  "type": "string",
                  "format": "uuid"
                },
                "eventKey": {
                  "type": "string"
                },
                "level": {
                  "type": "string",
                  "enum": [
                    "TRACE",
                    "DEBUG",
                    "INFO",
                    "WARN",
                    "ERROR"
                  ]
                },
                "emitterIdentifier": {
                  "type": "string"
                },
                "locationContext": {
                  "type": "object",
                  "properties": {
                    "folderId": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "objectKey": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "folderId"
                  ]
                },
                "data": {},
                "createdAt": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "id",
                "eventKey",
                "level",
                "emitterIdentifier",
                "createdAt"
              ]
            }
          }
        },
        "required": [
          "meta",
          "result"
        ]
      },
      "AppDTO": {
        "type": "object",
        "properties": {
          "identifier": {
            "type": "string"
          },
          "publicKey": {
            "type": "string"
          },
          "config": {
            "type": "object",
            "properties": {
              "description": {
                "type": "string"
              },
              "requiresStorage": {
                "type": "boolean"
              },
              "emittableEvents": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "tasks": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string"
                    },
                    "label": {
                      "type": "string"
                    },
                    "eventTriggers": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "folderAction": {
                      "type": "object",
                      "properties": {
                        "description": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "description"
                      ]
                    },
                    "objectAction": {
                      "type": "object",
                      "properties": {
                        "description": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "description"
                      ]
                    },
                    "description": {
                      "type": "string"
                    },
                    "inputParams": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "object",
                        "properties": {
                          "type": {
                            "type": "string",
                            "enum": [
                              "boolean",
                              "string",
                              "number"
                            ]
                          },
                          "default": {
                            "oneOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              }
                            ],
                            "nullable": true
                          }
                        },
                        "required": [
                          "type"
                        ]
                      }
                    }
                  },
                  "required": [
                    "key",
                    "label",
                    "eventTriggers",
                    "description"
                  ]
                }
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
              "description",
              "requiresStorage",
              "emittableEvents",
              "tasks",
              "menuItems"
            ]
          },
          "manifest": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string"
                },
                "hash": {
                  "type": "string"
                },
                "size": {
                  "type": "number"
                }
              },
              "required": [
                "path",
                "hash",
                "size"
              ]
            }
          },
          "connectedWorkers": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "appIdentifier": {
                  "type": "string"
                },
                "workerId": {
                  "type": "string"
                },
                "handledTaskKeys": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "socketClientId": {
                  "type": "string"
                },
                "ip": {
                  "type": "string"
                }
              },
              "required": [
                "appIdentifier",
                "workerId",
                "handledTaskKeys",
                "socketClientId",
                "ip"
              ]
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
          "identifier",
          "publicKey",
          "config",
          "manifest",
          "connectedWorkers",
          "createdAt",
          "updatedAt"
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
                "publicKey": {
                  "type": "string"
                },
                "config": {
                  "type": "object",
                  "properties": {
                    "description": {
                      "type": "string"
                    },
                    "requiresStorage": {
                      "type": "boolean"
                    },
                    "emittableEvents": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "tasks": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "key": {
                            "type": "string"
                          },
                          "label": {
                            "type": "string"
                          },
                          "eventTriggers": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "folderAction": {
                            "type": "object",
                            "properties": {
                              "description": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "description"
                            ]
                          },
                          "objectAction": {
                            "type": "object",
                            "properties": {
                              "description": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "description"
                            ]
                          },
                          "description": {
                            "type": "string"
                          },
                          "inputParams": {
                            "type": "object",
                            "additionalProperties": {
                              "type": "object",
                              "properties": {
                                "type": {
                                  "type": "string",
                                  "enum": [
                                    "boolean",
                                    "string",
                                    "number"
                                  ]
                                },
                                "default": {
                                  "oneOf": [
                                    {
                                      "type": "string"
                                    },
                                    {
                                      "type": "number"
                                    },
                                    {
                                      "type": "boolean"
                                    }
                                  ],
                                  "nullable": true
                                }
                              },
                              "required": [
                                "type"
                              ]
                            }
                          }
                        },
                        "required": [
                          "key",
                          "label",
                          "eventTriggers",
                          "description"
                        ]
                      }
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
                    "description",
                    "requiresStorage",
                    "emittableEvents",
                    "tasks",
                    "menuItems"
                  ]
                },
                "manifest": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "path": {
                        "type": "string"
                      },
                      "hash": {
                        "type": "string"
                      },
                      "size": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "path",
                      "hash",
                      "size"
                    ]
                  }
                },
                "connectedWorkers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "appIdentifier": {
                        "type": "string"
                      },
                      "workerId": {
                        "type": "string"
                      },
                      "handledTaskKeys": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      "socketClientId": {
                        "type": "string"
                      },
                      "ip": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "appIdentifier",
                      "workerId",
                      "handledTaskKeys",
                      "socketClientId",
                      "ip"
                    ]
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
                "identifier",
                "publicKey",
                "config",
                "manifest",
                "connectedWorkers",
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
      "AppGetResponse": {
        "type": "object",
        "properties": {
          "app": {
            "type": "object",
            "properties": {
              "identifier": {
                "type": "string"
              },
              "publicKey": {
                "type": "string"
              },
              "config": {
                "type": "object",
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "requiresStorage": {
                    "type": "boolean"
                  },
                  "emittableEvents": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "tasks": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "key": {
                          "type": "string"
                        },
                        "label": {
                          "type": "string"
                        },
                        "eventTriggers": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "folderAction": {
                          "type": "object",
                          "properties": {
                            "description": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "description"
                          ]
                        },
                        "objectAction": {
                          "type": "object",
                          "properties": {
                            "description": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "description"
                          ]
                        },
                        "description": {
                          "type": "string"
                        },
                        "inputParams": {
                          "type": "object",
                          "additionalProperties": {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string",
                                "enum": [
                                  "boolean",
                                  "string",
                                  "number"
                                ]
                              },
                              "default": {
                                "oneOf": [
                                  {
                                    "type": "string"
                                  },
                                  {
                                    "type": "number"
                                  },
                                  {
                                    "type": "boolean"
                                  }
                                ],
                                "nullable": true
                              }
                            },
                            "required": [
                              "type"
                            ]
                          }
                        }
                      },
                      "required": [
                        "key",
                        "label",
                        "eventTriggers",
                        "description"
                      ]
                    }
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
                  "description",
                  "requiresStorage",
                  "emittableEvents",
                  "tasks",
                  "menuItems"
                ]
              },
              "manifest": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "path": {
                      "type": "string"
                    },
                    "hash": {
                      "type": "string"
                    },
                    "size": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "path",
                    "hash",
                    "size"
                  ]
                }
              },
              "connectedWorkers": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "appIdentifier": {
                      "type": "string"
                    },
                    "workerId": {
                      "type": "string"
                    },
                    "handledTaskKeys": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "socketClientId": {
                      "type": "string"
                    },
                    "ip": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "appIdentifier",
                    "workerId",
                    "handledTaskKeys",
                    "socketClientId",
                    "ip"
                  ]
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
              "identifier",
              "publicKey",
              "config",
              "manifest",
              "connectedWorkers",
              "createdAt",
              "updatedAt"
            ]
          }
        },
        "required": [
          "app"
        ]
      }
    }
  }
} as const;
