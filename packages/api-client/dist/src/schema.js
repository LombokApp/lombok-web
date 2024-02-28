export const schema = {
    "openapi": "3.0.0",
    "paths": {
        "/": {
            "get": {
                "operationId": "AppController_getAppInfo",
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
                }
            }
        },
        "/auth/login": {
            "post": {
                "operationId": "AuthController_login",
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
                    "200": {
                        "description": "Authenticate the user and return access and refresh tokens.",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/UserSessionDTO"
                                }
                            }
                        }
                    }
                }
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
                "properties": {}
            },
            "LoginDTO": {
                "type": "object",
                "properties": {}
            },
            "UserSessionDTO": {
                "type": "object",
                "properties": {}
            }
        }
    }
};
