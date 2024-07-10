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
        ]
      }
    },
    "/auth/refresh-token": {
      "post": {
        "operationId": "refreshToken",
        "parameters": [],
        "responses": {
          "201": {
            "description": "Logout. Kill the current session.",
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
        ]
      }
    },
    "/events/{eventId}": {
      "get": {
        "operationId": "getAppInfo",
        "parameters": [],
        "responses": {
          "200": {
            "description": "Get an event by id.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EventDTO"
                }
              }
            }
          }
        },
        "tags": [
          "Event"
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
          "isAdmin",
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
                  "id",
                  "name",
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
                  "id",
                  "name",
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
              "type": "string"
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
                    "type": "string"
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
                        "id",
                        "name",
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
                        "id",
                        "name",
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
                  "id",
                  "name",
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
                  "id",
                  "name",
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
                "mediaType"
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
              "mediaType"
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
          "key": {
            "type": "string"
          },
          "value": {}
        },
        "required": [
          "key"
        ]
      },
      "EventDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "eventKey": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "eventKey"
        ]
      }
    }
  }
} as const;
