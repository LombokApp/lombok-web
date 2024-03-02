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
        },
        "/{folderId}": {
            "get": {
                "operationId": "getAppInfo",
                "parameters": [],
                "responses": {
                    "200": {
                        "description": "Get a folder by id."
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
                                    "type": "object"
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
                "parameters": [],
                "responses": {
                    "200": {
                        "description": "Set a setting in the server settings objects.",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object"
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
        "/{eventId}": {
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
        },
        "/viewer": {
            "get": {
                "operationId": "getViewer",
                "parameters": [],
                "responses": {
                    "200": {
                        "description": ""
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
                        "description": ""
                    }
                },
                "tags": [
                    "Viewer"
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
            }
        }
    }
};
