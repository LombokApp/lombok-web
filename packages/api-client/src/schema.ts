export const schema = {
  "openapi": "3.0.0",
  "paths": {
    "/": {
      "get": {
        "operationId": "getAppInfo",
        "parameters": [],
        "responses": {
          "200": {
            "description": "The app info.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AppInfoDTO"
                }
              }
            }
          }
        },
        "tags": [
          "App"
        ]
      }
    },
    "/auth/login": {
      "post": {
        "operationId": "login",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginDTO"
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
                  "$ref": "#/components/schemas/UserSessionDTO"
                }
              }
            }
          }
        },
        "tags": [
          "Auth"
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
      "AppInfoDTO": {
        "type": "object",
        "properties": {
          "version": {
            "type": "string"
          }
        },
        "required": [
          "version"
        ]
      },
      "LoginDTO": {
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
      "UserSessionDTO": {
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
    }
  }
} as const;
