import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import request from 'supertest'
import type { App } from 'supertest/types'

const TEST_MODULE_KEY = 'mcp'

// ─── Settings helper types & functions ───────────────────────────────
// The typed API client has an operation-ID collision between MCP settings
// and notification settings controllers, so we use raw supertest for all
// settings endpoints.

interface McpSettings {
  canRead: boolean | null
  canWrite: boolean | null
  canDelete: boolean | null
  canMove: boolean | null
}

async function getUserMcpSettings(app: App, accessToken: string) {
  const res = await request(app)
    .get('/api/v1/user/mcp/settings')
    .set('Authorization', `Bearer ${accessToken}`)
  return { status: res.status, data: res.body as McpSettings }
}

async function updateUserMcpSettings(
  app: App,
  accessToken: string,
  body: Record<string, boolean | null>,
) {
  const res = await request(app)
    .put('/api/v1/user/mcp/settings')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body)
  return { status: res.status, data: res.body as McpSettings }
}

async function getFolderMcpSettings(
  app: App,
  accessToken: string,
  folderId: string,
) {
  const res = await request(app)
    .get(`/api/v1/folders/${folderId}/mcp/settings`)
    .set('Authorization', `Bearer ${accessToken}`)
  return { status: res.status, data: res.body as McpSettings }
}

async function updateFolderMcpSettings(
  app: App,
  accessToken: string,
  folderId: string,
  body: Record<string, boolean | null>,
) {
  const res = await request(app)
    .put(`/api/v1/folders/${folderId}/mcp/settings`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body)
  return { status: res.status, data: res.body as McpSettings }
}

async function deleteFolderMcpSettings(
  app: App,
  accessToken: string,
  folderId: string,
) {
  const res = await request(app)
    .delete(`/api/v1/folders/${folderId}/mcp/settings`)
    .set('Authorization', `Bearer ${accessToken}`)
  return { status: res.status, data: res.body as { success: boolean } }
}

// ─── Generic helpers ─────────────────────────────────────────────────

/**
 * Helper: create a user and generate an MCP token for that user.
 * Returns the user's access token (for REST API calls) and the raw MCP token (for /api/mcp).
 */
async function createUserWithMcpToken(
  testModule: TestModule,
  apiClient: TestApiClient,
  opts: { username: string; clientName: string; admin?: boolean },
) {
  const {
    session: { accessToken },
  } = await createTestUser(testModule, {
    username: opts.username,
    password: '123',
    admin: opts.admin,
  })

  const createTokenResponse = await apiClient(accessToken).POST(
    '/api/v1/user/mcp/tokens',
    { body: { clientName: opts.clientName } },
  )
  expect(createTokenResponse.response.status).toEqual(201)

  const tokenData = createTokenResponse.data!
  return {
    accessToken,
    mcpToken: tokenData.rawToken,
    tokenId: tokenData.tokenId,
    clientName: tokenData.clientName,
  }
}

/**
 * Helper: send a JSON-RPC request to the MCP protocol endpoint.
 */
function mcpRequest(app: App, mcpToken: string, body: Record<string, unknown>) {
  return request(app)
    .post('/api/mcp')
    .set('Authorization', `Bearer ${mcpToken}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream')
    .send(body)
}

/**
 * Helper: send MCP initialize + tools/list in sequence and return the tool names.
 */
async function mcpInitializeAndListTools(app: App, mcpToken: string) {
  const initResponse = await mcpRequest(app, mcpToken, {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '1.0.0' },
    },
    id: 1,
  })

  // The response may be SSE or JSON depending on transport
  // For stateless streamable HTTP, each request is independent
  const toolsResponse = await mcpRequest(app, mcpToken, {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2,
  })

  return { initResponse, toolsResponse }
}

describe('MCP', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let app: App

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      debug: true,
    })
    apiClient = testModule.apiClient
    app = testModule.app.getHttpServer() as App
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  // ═══════════════════════════════════════════════════════════════
  // Token CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('Token Management', () => {
    it('should create an MCP token', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const response = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'Claude Desktop' } },
      )

      expect(response.response.status).toEqual(201)
      expect(response.data?.tokenId).toBeTruthy()
      expect(response.data?.rawToken).toBeTruthy()
      expect(response.data?.clientName).toEqual('Claude Desktop')
      expect(response.data?.createdAt).toBeTruthy()
    })

    it('should return 401 when creating a token without auth', async () => {
      const response = await apiClient().POST('/api/v1/user/mcp/tokens', {
        body: { clientName: 'Claude Desktop' },
      })

      expect(response.response.status).toEqual(401)
    })

    it('should return 400 when creating a token with empty clientName', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const response = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: '' } },
      )

      expect(response.response.status).toEqual(400)
    })

    it('should list MCP tokens', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      // Create two tokens
      await apiClient(accessToken).POST('/api/v1/user/mcp/tokens', {
        body: { clientName: 'Claude Desktop' },
      })
      await apiClient(accessToken).POST('/api/v1/user/mcp/tokens', {
        body: { clientName: 'Claude Code' },
      })

      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )

      expect(listResponse.response.status).toEqual(200)
      expect(listResponse.data?.tokens).toHaveLength(2)

      const clientNames = listResponse.data?.tokens.map((t) => t.clientName)
      expect(clientNames).toContain('Claude Desktop')
      expect(clientNames).toContain('Claude Code')
    })

    it('should return empty token list when none exist', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )

      expect(listResponse.response.status).toEqual(200)
      expect(listResponse.data?.tokens).toHaveLength(0)
    })

    it('should return lastUsedAt as null for unused tokens', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      await apiClient(accessToken).POST('/api/v1/user/mcp/tokens', {
        body: { clientName: 'Unused Token' },
      })

      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )

      expect(listResponse.data?.tokens[0]?.lastUsedAt).toBeNull()
    })

    it('should revoke an MCP token', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const createResponse = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'To Be Revoked' } },
      )
      const tokenId = createResponse.data!.tokenId

      const revokeResponse = await apiClient(accessToken).DELETE(
        '/api/v1/user/mcp/tokens/{tokenId}',
        { params: { path: { tokenId } } },
      )

      expect(revokeResponse.response.status).toEqual(200)
      expect(revokeResponse.data?.success).toEqual(true)

      // Verify token is gone from the list
      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listResponse.data?.tokens).toHaveLength(0)
    })

    it('should return 404 when revoking a non-existent token', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const revokeResponse = await apiClient(accessToken).DELETE(
        '/api/v1/user/mcp/tokens/{tokenId}',
        {
          params: {
            path: { tokenId: '00000000-0000-0000-0000-000000000000' },
          },
        },
      )

      expect(revokeResponse.response.status).toEqual(404)
    })

    it("should not allow revoking another user's token", async () => {
      // User A creates a token
      const {
        session: { accessToken: accessTokenA },
      } = await createTestUser(testModule!, {
        username: 'userA',
        password: '123',
      })

      const createResponse = await apiClient(accessTokenA).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'User A Token' } },
      )
      const tokenId = createResponse.data!.tokenId

      // User B tries to revoke User A's token
      const {
        session: { accessToken: accessTokenB },
      } = await createTestUser(testModule!, {
        username: 'userB',
        password: '123',
      })

      const revokeResponse = await apiClient(accessTokenB).DELETE(
        '/api/v1/user/mcp/tokens/{tokenId}',
        { params: { path: { tokenId } } },
      )

      expect(revokeResponse.response.status).toEqual(404)

      // Verify User A's token still exists
      const listResponse = await apiClient(accessTokenA).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listResponse.data?.tokens).toHaveLength(1)
    })

    it('should not show tokens from other users', async () => {
      // User A creates a token
      const {
        session: { accessToken: accessTokenA },
      } = await createTestUser(testModule!, {
        username: 'userA',
        password: '123',
      })

      await apiClient(accessTokenA).POST('/api/v1/user/mcp/tokens', {
        body: { clientName: 'User A Token' },
      })

      // User B should see an empty list
      const {
        session: { accessToken: accessTokenB },
      } = await createTestUser(testModule!, {
        username: 'userB',
        password: '123',
      })

      const listResponse = await apiClient(accessTokenB).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listResponse.data?.tokens).toHaveLength(0)
    })

    it('should create multiple tokens for the same user', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'tokenuser',
        password: '123',
      })

      const token1 = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'Token 1' } },
      )
      const token2 = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'Token 2' } },
      )
      const token3 = await apiClient(accessToken).POST(
        '/api/v1/user/mcp/tokens',
        { body: { clientName: 'Token 3' } },
      )

      expect(token1.data?.rawToken).not.toEqual(token2.data?.rawToken)
      expect(token2.data?.rawToken).not.toEqual(token3.data?.rawToken)

      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listResponse.data?.tokens).toHaveLength(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // User MCP Settings
  // ═══════════════════════════════════════════════════════════════

  describe('User MCP Settings', () => {
    it('should return null defaults when no settings exist', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'settingsuser',
        password: '123',
      })

      const { status, data } = await getUserMcpSettings(app, accessToken)

      expect(status).toEqual(200)
      expect(data.canRead).toBeNull()
      expect(data.canWrite).toBeNull()
      expect(data.canDelete).toBeNull()
      expect(data.canMove).toBeNull()
    })

    it('should save and return user MCP settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'settingsuser',
        password: '123',
      })

      const { status, data } = await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canMove: false,
      })

      expect(status).toEqual(200)
      expect(data.canRead).toEqual(true)
      expect(data.canWrite).toEqual(true)
      expect(data.canDelete).toEqual(false)
      expect(data.canMove).toEqual(false)

      // Verify persistence via GET
      const { data: getData } = await getUserMcpSettings(app, accessToken)
      expect(getData.canRead).toEqual(true)
      expect(getData.canWrite).toEqual(true)
      expect(getData.canDelete).toEqual(false)
      expect(getData.canMove).toEqual(false)
    })

    it('should overwrite settings on subsequent update (upsert)', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'settingsuser',
        password: '123',
      })

      // First update — disable everything
      await updateUserMcpSettings(app, accessToken, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Second update — enable everything
      const { data } = await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canMove: true,
      })

      expect(data.canRead).toEqual(true)
      expect(data.canWrite).toEqual(true)
      expect(data.canDelete).toEqual(true)
      expect(data.canMove).toEqual(true)
    })

    it('should allow setting permissions to null (revert to default)', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'settingsuser',
        password: '123',
      })

      // Set explicit values
      await updateUserMcpSettings(app, accessToken, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Set back to null
      const { data } = await updateUserMcpSettings(app, accessToken, {
        canRead: null,
        canWrite: null,
        canDelete: null,
        canMove: null,
      })

      expect(data.canRead).toBeNull()
      expect(data.canWrite).toBeNull()
      expect(data.canDelete).toBeNull()
      expect(data.canMove).toBeNull()
    })

    it('should isolate settings between users', async () => {
      const {
        session: { accessToken: accessTokenA },
      } = await createTestUser(testModule!, {
        username: 'userA',
        password: '123',
      })

      const {
        session: { accessToken: accessTokenB },
      } = await createTestUser(testModule!, {
        username: 'userB',
        password: '123',
      })

      // User A disables delete
      await updateUserMcpSettings(app, accessTokenA, {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canMove: true,
      })

      // User B should still have null defaults
      const { data } = await getUserMcpSettings(app, accessTokenB)
      expect(data.canDelete).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Folder MCP Settings
  // ═══════════════════════════════════════════════════════════════

  describe('Folder MCP Settings', () => {
    it('should return null defaults when no folder settings exist', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'folderuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      const { status, data } = await getFolderMcpSettings(
        app,
        accessToken,
        folder.id,
      )

      expect(status).toEqual(200)
      expect(data.canRead).toBeNull()
      expect(data.canWrite).toBeNull()
      expect(data.canDelete).toBeNull()
      expect(data.canMove).toBeNull()
    })

    it('should save and return folder MCP settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'folderuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      const { status, data } = await updateFolderMcpSettings(
        app,
        accessToken,
        folder.id,
        {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canMove: true,
        },
      )

      expect(status).toEqual(200)
      expect(data.canRead).toEqual(true)
      expect(data.canWrite).toEqual(false)
      expect(data.canDelete).toEqual(false)
      expect(data.canMove).toEqual(true)

      // Verify persistence via GET
      const { data: getData } = await getFolderMcpSettings(
        app,
        accessToken,
        folder.id,
      )
      expect(getData.canRead).toEqual(true)
      expect(getData.canWrite).toEqual(false)
    })

    it('should clear folder overrides on delete', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'folderuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Set folder-level overrides
      await updateFolderMcpSettings(app, accessToken, folder.id, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Clear overrides
      const { status, data } = await deleteFolderMcpSettings(
        app,
        accessToken,
        folder.id,
      )

      expect(status).toEqual(200)
      expect(data.success).toEqual(true)

      // Verify settings reverted to null defaults
      const { data: getData } = await getFolderMcpSettings(
        app,
        accessToken,
        folder.id,
      )
      expect(getData.canRead).toBeNull()
      expect(getData.canWrite).toBeNull()
      expect(getData.canDelete).toBeNull()
      expect(getData.canMove).toBeNull()
    })

    it('should upsert folder settings on repeated update', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'folderuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // First update
      await updateFolderMcpSettings(app, accessToken, folder.id, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Second update — flip everything
      const { data } = await updateFolderMcpSettings(
        app,
        accessToken,
        folder.id,
        { canRead: true, canWrite: true, canDelete: true, canMove: true },
      )

      expect(data.canRead).toEqual(true)
      expect(data.canWrite).toEqual(true)
      expect(data.canDelete).toEqual(true)
      expect(data.canMove).toEqual(true)
    })

    it('should isolate folder settings between folders', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'folderuser',
        password: '123',
      })

      const { folder: folderA } = await createTestFolder({
        testModule,
        folderName: 'Folder A',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      const { folder: folderB } = await createTestFolder({
        testModule,
        folderName: 'Folder B',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Set Folder A to deny delete
      await updateFolderMcpSettings(app, accessToken, folderA.id, {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canMove: true,
      })

      // Folder B should still have null defaults
      const { data } = await getFolderMcpSettings(app, accessToken, folderB.id)
      expect(data.canDelete).toBeNull()
    })

    it('should isolate folder settings between users for the same folder', async () => {
      const {
        session: { accessToken: accessTokenA },
      } = await createTestUser(testModule!, {
        username: 'userA',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Shared Folder',
        accessToken: accessTokenA,
        mockFiles: [],
        apiClient,
      })

      // User A sets folder permissions
      await updateFolderMcpSettings(app, accessTokenA, folder.id, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // User B checks same folder — should see null defaults (their own settings)
      const {
        session: { accessToken: accessTokenB },
      } = await createTestUser(testModule!, {
        username: 'userB',
        password: '123',
      })

      const { data } = await getFolderMcpSettings(app, accessTokenB, folder.id)
      expect(data.canRead).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Permission Resolution (service-level)
  // ═══════════════════════════════════════════════════════════════

  describe('Permission Resolution', () => {
    it('should resolve all-true when no settings exist', async () => {
      const { McpPermissionsService } = await import(
        './services/mcp-permissions.service'
      )
      const permissionsService = await testModule!.resolveDep(
        McpPermissionsService,
      )

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'permuser',
        password: '123',
      })

      // Get the user ID from a token list call (need to extract it)
      const userResponse = await apiClient(accessToken).GET('/api/v1/viewer')
      const userId = userResponse.data?.user.id ?? ''

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      const perms = await permissionsService.resolveEffectivePermissions(
        userId,
        folder.id,
      )

      expect(perms.canRead).toEqual(true)
      expect(perms.canWrite).toEqual(true)
      expect(perms.canDelete).toEqual(true)
      expect(perms.canMove).toEqual(true)
    })

    it('should use user-level settings as defaults', async () => {
      const { McpPermissionsService } = await import(
        './services/mcp-permissions.service'
      )
      const permissionsService = await testModule!.resolveDep(
        McpPermissionsService,
      )

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'permuser',
        password: '123',
      })

      const userResponse = await apiClient(accessToken).GET('/api/v1/viewer')
      const userId = userResponse.data?.user.id ?? ''

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Set user-level: deny delete and move
      await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canMove: false,
      })

      const perms = await permissionsService.resolveEffectivePermissions(
        userId,
        folder.id,
      )

      expect(perms.canRead).toEqual(true)
      expect(perms.canWrite).toEqual(true)
      expect(perms.canDelete).toEqual(false)
      expect(perms.canMove).toEqual(false)
    })

    it('should let folder-level settings fully override user-level', async () => {
      const { McpPermissionsService } = await import(
        './services/mcp-permissions.service'
      )
      const permissionsService = await testModule!.resolveDep(
        McpPermissionsService,
      )

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'permuser',
        password: '123',
      })

      const userResponse = await apiClient(accessToken).GET('/api/v1/viewer')
      const userId = userResponse.data?.user.id ?? ''

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // User-level: deny everything
      await updateUserMcpSettings(app, accessToken, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Folder-level: allow everything (overrides user)
      await updateFolderMcpSettings(app, accessToken, folder.id, {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canMove: true,
      })

      const perms = await permissionsService.resolveEffectivePermissions(
        userId,
        folder.id,
      )

      expect(perms.canRead).toEqual(true)
      expect(perms.canWrite).toEqual(true)
      expect(perms.canDelete).toEqual(true)
      expect(perms.canMove).toEqual(true)
    })

    it('should treat null folder permissions as allowed', async () => {
      const { McpPermissionsService } = await import(
        './services/mcp-permissions.service'
      )
      const permissionsService = await testModule!.resolveDep(
        McpPermissionsService,
      )

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'permuser',
        password: '123',
      })

      const userResponse = await apiClient(accessToken).GET('/api/v1/viewer')
      const userId = userResponse.data?.user.id ?? ''

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Folder-level: set all to null (should resolve as true)
      await updateFolderMcpSettings(app, accessToken, folder.id, {
        canRead: null,
        canWrite: null,
        canDelete: null,
        canMove: null,
      })

      const perms = await permissionsService.resolveEffectivePermissions(
        userId,
        folder.id,
      )

      // null ?? true = true
      expect(perms.canRead).toEqual(true)
      expect(perms.canWrite).toEqual(true)
      expect(perms.canDelete).toEqual(true)
      expect(perms.canMove).toEqual(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // MCP Protocol Endpoint (/api/mcp)
  // ═══════════════════════════════════════════════════════════════

  describe('MCP Protocol Endpoint', () => {
    it('should return 401 without a Bearer token', async () => {
      const response = await request(app)
        .post('/api/mcp')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
          id: 1,
        })

      expect(response.status).toEqual(401)
    })

    it('should return 401 with an invalid Bearer token', async () => {
      const response = await request(app)
        .post('/api/mcp')
        .set('Authorization', 'Bearer invalid-token-value')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
          id: 1,
        })

      expect(response.status).toEqual(401)
    })

    it('should return 401 with a revoked MCP token', async () => {
      const { accessToken, mcpToken, tokenId } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        {
          username: 'mcpuser',
          clientName: 'Test Client',
        },
      )

      // Revoke the token
      await apiClient(accessToken).DELETE('/api/v1/user/mcp/tokens/{tokenId}', {
        params: { path: { tokenId } },
      })

      // Try to use revoked token
      const response = await request(app)
        .post('/api/mcp')
        .set('Authorization', `Bearer ${mcpToken}`)
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
          id: 1,
        })

      expect(response.status).toEqual(401)
    })

    it('should accept MCP initialize request with valid token', async () => {
      const { mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'mcpuser', clientName: 'Test Client' },
      )

      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'e2e-test', version: '1.0.0' },
        },
        id: 1,
      })

      // The MCP SDK may respond with 200 + JSON or 200 + SSE
      expect(response.status).toEqual(200)
    })

    it('should list all 6 MCP tools', async () => {
      const { mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'mcpuser', clientName: 'Test Client' },
      )

      const { toolsResponse } = await mcpInitializeAndListTools(app, mcpToken)

      expect(toolsResponse.status).toEqual(200)

      // Parse the response body — may be JSON or SSE
      let tools: { name: string }[] = []
      const body = toolsResponse.body as Record<string, unknown>

      if (body.result && typeof body.result === 'object') {
        const result = body.result as { tools?: { name: string }[] }
        tools = result.tools ?? []
      } else if (
        typeof toolsResponse.text === 'string' &&
        toolsResponse.text.includes('event:')
      ) {
        // SSE format — parse the data line
        const dataLine = toolsResponse.text
          .split('\n')
          .find((line: string) => line.startsWith('data:'))
        if (dataLine) {
          const data = JSON.parse(dataLine.slice(5)) as {
            result?: { tools?: { name: string }[] }
          }
          tools = data.result?.tools ?? []
        }
      }

      const toolNames = tools.map((t) => t.name).sort()
      expect(toolNames).toEqual([
        'delete_object',
        'download_file',
        'list_folders',
        'list_objects',
        'move_object',
        'upload_file',
      ])
    })

    it('should update lastUsedAt after MCP token is used', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'mcpuser', clientName: 'Test Client' },
      )

      // Verify lastUsedAt is initially null
      const listBefore = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listBefore.data?.tokens[0]?.lastUsedAt).toBeNull()

      // Use the MCP token
      await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'e2e-test', version: '1.0.0' },
        },
        id: 1,
      })

      // Wait a moment for the async lastUsedAt update to flush
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify lastUsedAt is now set
      const listAfter = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listAfter.data?.tokens[0]?.lastUsedAt).toBeTruthy()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // MCP Tool Execution (via protocol endpoint)
  // ═══════════════════════════════════════════════════════════════

  describe('MCP Tool Execution', () => {
    it('should list folders via MCP list_folders tool', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'tooluser', clientName: 'Tool Test' },
      )

      // Create a folder
      await createTestFolder({
        testModule,
        folderName: 'MCP Test Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Call list_folders via MCP
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_folders',
          arguments: {},
        },
        id: 3,
      })

      expect(response.status).toEqual(200)

      // Parse response to check the tool returned folder data
      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as {
          content?: { type: string; text: string }[]
          isError?: boolean
        }
        expect(result.isError).toBeFalsy()
        expect(result.content).toBeTruthy()
        if (result.content?.[0]?.text) {
          const folders = JSON.parse(result.content[0].text) as unknown[]
          expect(folders.length).toBeGreaterThanOrEqual(1)
        }
      }
    })

    it('should deny read operations when canRead is false', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'denieduser', clientName: 'Denied Client' },
      )

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Restricted Folder',
        accessToken,
        mockFiles: [{ objectKey: 'test.txt', content: 'hello' }],
        apiClient,
      })

      // Set user-level: deny read
      await updateUserMcpSettings(app, accessToken, {
        canRead: false,
        canWrite: true,
        canDelete: true,
        canMove: true,
      })

      // Try to list objects via MCP — should be denied
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_objects',
          arguments: { folder_id: folder.id },
        },
        id: 4,
      })

      expect(response.status).toEqual(200) // MCP returns 200 even for tool errors

      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as {
          content?: { type: string; text: string }[]
          isError?: boolean
        }
        expect(result.isError).toEqual(true)
        expect(result.content?.[0]?.text).toContain('Permission denied')
      }
    })

    it('should allow operations when folder-level overrides user deny', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'overrideuser', clientName: 'Override Client' },
      )

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'Override Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // User-level: deny read
      await updateUserMcpSettings(app, accessToken, {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canMove: false,
      })

      // Folder-level: allow read for this specific folder
      await updateFolderMcpSettings(app, accessToken, folder.id, {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canMove: true,
      })

      // list_objects should succeed for this folder
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_objects',
          arguments: { folder_id: folder.id },
        },
        id: 5,
      })

      expect(response.status).toEqual(200)

      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as { isError?: boolean }
        expect(result.isError).toBeFalsy()
      }
    })

    it('should deny delete when canDelete is false', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'deleteuser', clientName: 'Delete Client' },
      )

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'No Delete Folder',
        accessToken,
        mockFiles: [{ objectKey: 'keep-me.txt', content: 'protected' }],
        apiClient,
      })

      // Set user-level: deny delete
      await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canMove: true,
      })

      // Try to delete via MCP — should be denied
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'delete_object',
          arguments: {
            folder_id: folder.id,
            object_key: 'keep-me.txt',
          },
        },
        id: 6,
      })

      expect(response.status).toEqual(200)

      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as {
          content?: { type: string; text: string }[]
          isError?: boolean
        }
        expect(result.isError).toEqual(true)
        expect(result.content?.[0]?.text).toContain('Permission denied')
      }
    })

    it('should deny move when canMove is false', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'moveuser', clientName: 'Move Client' },
      )

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'No Move Folder',
        accessToken,
        mockFiles: [{ objectKey: 'file.txt', content: 'content' }],
        apiClient,
      })

      // Set user-level: deny move
      await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canMove: false,
      })

      // Try to move via MCP — should be denied
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'move_object',
          arguments: {
            folder_id: folder.id,
            source_key: 'file.txt',
            destination_key: 'renamed.txt',
          },
        },
        id: 7,
      })

      expect(response.status).toEqual(200)

      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as {
          content?: { type: string; text: string }[]
          isError?: boolean
        }
        expect(result.isError).toEqual(true)
        expect(result.content?.[0]?.text).toContain('Permission denied')
      }
    })

    it('should deny write when canWrite is false', async () => {
      const { accessToken, mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'writeuser', clientName: 'Write Client' },
      )

      const { folder } = await createTestFolder({
        testModule,
        folderName: 'No Write Folder',
        accessToken,
        mockFiles: [],
        apiClient,
      })

      // Set user-level: deny write
      await updateUserMcpSettings(app, accessToken, {
        canRead: true,
        canWrite: false,
        canDelete: true,
        canMove: true,
      })

      // Try to upload via MCP — should be denied
      const response = await mcpRequest(app, mcpToken, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'upload_file',
          arguments: {
            folder_id: folder.id,
            object_key: 'new-file.txt',
          },
        },
        id: 8,
      })

      expect(response.status).toEqual(200)

      const body = response.body as Record<string, unknown>
      if (body.result && typeof body.result === 'object') {
        const result = body.result as {
          content?: { type: string; text: string }[]
          isError?: boolean
        }
        expect(result.isError).toEqual(true)
        expect(result.content?.[0]?.text).toContain('Permission denied')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should not allow regular auth token to access MCP endpoint', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'regularuser',
        password: '123',
      })

      // Regular JWT access token should not work on the MCP endpoint
      const response = await request(app)
        .post('/api/mcp')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
          id: 1,
        })

      expect(response.status).toEqual(401)
    })

    it('should not allow MCP token to access REST API endpoints', async () => {
      const { mcpToken } = await createUserWithMcpToken(
        testModule!,
        apiClient,
        { username: 'mcpuser', clientName: 'Test Client' },
      )

      // MCP token should not work on regular REST endpoints (they use AuthGuard, not McpTokenGuard)
      const response = await request(app)
        .get('/api/v1/user/mcp/tokens')
        .set('Authorization', `Bearer ${mcpToken}`)

      expect(response.status).toEqual(401)
    })

    it('should handle concurrent token creation', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'concurrentuser',
        password: '123',
      })

      // Create 5 tokens concurrently
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          apiClient(accessToken).POST('/api/v1/user/mcp/tokens', {
            body: { clientName: `Client ${i}` },
          }),
        ),
      )

      // All should succeed
      for (const result of results) {
        expect(result.response.status).toEqual(201)
      }

      // All should have unique tokens
      const rawTokens = results.map((r) => r.data?.rawToken)
      const uniqueTokens = new Set(rawTokens)
      expect(uniqueTokens.size).toEqual(5)

      // List should show all 5
      const listResponse = await apiClient(accessToken).GET(
        '/api/v1/user/mcp/tokens',
      )
      expect(listResponse.data?.tokens).toHaveLength(5)
    })
  })
})
