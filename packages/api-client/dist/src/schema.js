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
        "/folders/{folderId}": {
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
            "UserDTO": {
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
                    "emailVerified",
                    "isAdmin",
                    "username",
                    "permissions",
                    "createdAt",
                    "updatedAt"
                ]
            },
            "SignupResponse": {
                "type": "object",
                "properties": {
                    "user": {
                        "$ref": "#/components/schemas/UserDTO"
                    }
                },
                "required": [
                    "user"
                ]
            },
            "ViewerGetResponse": {
                "type": "object",
                "properties": {
                    "user": {
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
};
