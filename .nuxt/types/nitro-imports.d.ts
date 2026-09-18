declare global {
  const H3Error: typeof import('../../node_modules/h3/dist/index').H3Error
  const H3Event: typeof import('../../node_modules/h3/dist/index').H3Event
  const __buildAssetsURL: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').buildAssetsURL
  const __publicAssetsURL: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').publicAssetsURL
  const appendCorsHeaders: typeof import('../../node_modules/h3/dist/index').appendCorsHeaders
  const appendCorsPreflightHeaders: typeof import('../../node_modules/h3/dist/index').appendCorsPreflightHeaders
  const appendHeader: typeof import('../../node_modules/h3/dist/index').appendHeader
  const appendHeaders: typeof import('../../node_modules/h3/dist/index').appendHeaders
  const appendResponseHeader: typeof import('../../node_modules/h3/dist/index').appendResponseHeader
  const appendResponseHeaders: typeof import('../../node_modules/h3/dist/index').appendResponseHeaders
  const assertMethod: typeof import('../../node_modules/h3/dist/index').assertMethod
  const cachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').cachedEventHandler
  const cachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').cachedFunction
  const callNodeListener: typeof import('../../node_modules/h3/dist/index').callNodeListener
  const clearResponseHeaders: typeof import('../../node_modules/h3/dist/index').clearResponseHeaders
  const clearSession: typeof import('../../node_modules/h3/dist/index').clearSession
  const clearUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').clearUserSession
  const createApp: typeof import('../../node_modules/h3/dist/index').createApp
  const createAppEventHandler: typeof import('../../node_modules/h3/dist/index').createAppEventHandler
  const createError: typeof import('../../node_modules/h3/dist/index').createError
  const createEvent: typeof import('../../node_modules/h3/dist/index').createEvent
  const createEventStream: typeof import('../../node_modules/h3/dist/index').createEventStream
  const createRouter: typeof import('../../node_modules/h3/dist/index').createRouter
  const defaultContentType: typeof import('../../node_modules/h3/dist/index').defaultContentType
  const defineAppConfig: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/config').defineAppConfig
  const defineCachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').defineCachedEventHandler
  const defineCachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').defineCachedFunction
  const defineEventHandler: typeof import('../../node_modules/h3/dist/index').defineEventHandler
  const defineLazyEventHandler: typeof import('../../node_modules/h3/dist/index').defineLazyEventHandler
  const defineNitroErrorHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/error/utils').defineNitroErrorHandler
  const defineNitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin').defineNitroPlugin
  const defineNodeListener: typeof import('../../node_modules/h3/dist/index').defineNodeListener
  const defineNodeMiddleware: typeof import('../../node_modules/h3/dist/index').defineNodeMiddleware
  const defineOAuthAppleEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple').defineOAuthAppleEventHandler
  const defineOAuthAtlassianEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian').defineOAuthAtlassianEventHandler
  const defineOAuthAuth0EventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0').defineOAuthAuth0EventHandler
  const defineOAuthAuthentikEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik').defineOAuthAuthentikEventHandler
  const defineOAuthAzureB2CEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c').defineOAuthAzureB2CEventHandler
  const defineOAuthBattledotnetEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet').defineOAuthBattledotnetEventHandler
  const defineOAuthBoxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box').defineOAuthBoxEventHandler
  const defineOAuthCognitoEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito').defineOAuthCognitoEventHandler
  const defineOAuthDiscordEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord').defineOAuthDiscordEventHandler
  const defineOAuthDropboxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox').defineOAuthDropboxEventHandler
  const defineOAuthFacebookEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook').defineOAuthFacebookEventHandler
  const defineOAuthGitHubEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github').defineOAuthGitHubEventHandler
  const defineOAuthGitLabEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab').defineOAuthGitLabEventHandler
  const defineOAuthGiteaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea').defineOAuthGiteaEventHandler
  const defineOAuthGoogleEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google').defineOAuthGoogleEventHandler
  const defineOAuthHerokuEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku').defineOAuthHerokuEventHandler
  const defineOAuthHubspotEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot').defineOAuthHubspotEventHandler
  const defineOAuthInstagramEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram').defineOAuthInstagramEventHandler
  const defineOAuthKeycloakEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak').defineOAuthKeycloakEventHandler
  const defineOAuthKickEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick').defineOAuthKickEventHandler
  const defineOAuthLineEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line').defineOAuthLineEventHandler
  const defineOAuthLinearEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear').defineOAuthLinearEventHandler
  const defineOAuthLinkedInEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin').defineOAuthLinkedInEventHandler
  const defineOAuthLiveChatEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat').defineOAuthLiveChatEventHandler
  const defineOAuthMicrosoftEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft').defineOAuthMicrosoftEventHandler
  const defineOAuthOidcEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc').defineOAuthOidcEventHandler
  const defineOAuthOktaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta').defineOAuthOktaEventHandler
  const defineOAuthOryEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory').defineOAuthOryEventHandler
  const defineOAuthOsuEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu').defineOAuthOsuEventHandler
  const defineOAuthPaypalEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal').defineOAuthPaypalEventHandler
  const defineOAuthPolarEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar').defineOAuthPolarEventHandler
  const defineOAuthRiotGamesEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames').defineOAuthRiotGamesEventHandler
  const defineOAuthRobloxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox').defineOAuthRobloxEventHandler
  const defineOAuthSalesforceEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce').defineOAuthSalesforceEventHandler
  const defineOAuthSeznamEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam').defineOAuthSeznamEventHandler
  const defineOAuthShopifyCustomerEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer').defineOAuthShopifyCustomerEventHandler
  const defineOAuthSlackEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack').defineOAuthSlackEventHandler
  const defineOAuthSpotifyEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify').defineOAuthSpotifyEventHandler
  const defineOAuthSteamEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam').defineOAuthSteamEventHandler
  const defineOAuthStravaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava').defineOAuthStravaEventHandler
  const defineOAuthTikTokEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok').defineOAuthTikTokEventHandler
  const defineOAuthTwitchEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch').defineOAuthTwitchEventHandler
  const defineOAuthVKEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk').defineOAuthVKEventHandler
  const defineOAuthWorkOSEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos').defineOAuthWorkOSEventHandler
  const defineOAuthXEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x').defineOAuthXEventHandler
  const defineOAuthXSUAAEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa').defineOAuthXSUAAEventHandler
  const defineOAuthYandexEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex').defineOAuthYandexEventHandler
  const defineOAuthZitadelEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel').defineOAuthZitadelEventHandler
  const defineRenderHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/renderer').defineRenderHandler
  const defineRequestMiddleware: typeof import('../../node_modules/h3/dist/index').defineRequestMiddleware
  const defineResponseMiddleware: typeof import('../../node_modules/h3/dist/index').defineResponseMiddleware
  const defineRouteMeta: typeof import('../../node_modules/nitropack/dist/runtime/internal/meta').defineRouteMeta
  const defineTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task').defineTask
  const defineWebSocket: typeof import('../../node_modules/h3/dist/index').defineWebSocket
  const defineWebSocketHandler: typeof import('../../node_modules/h3/dist/index').defineWebSocketHandler
  const deleteCookie: typeof import('../../node_modules/h3/dist/index').deleteCookie
  const dynamicEventHandler: typeof import('../../node_modules/h3/dist/index').dynamicEventHandler
  const eventHandler: typeof import('../../node_modules/h3/dist/index').eventHandler
  const fetchWithEvent: typeof import('../../node_modules/h3/dist/index').fetchWithEvent
  const firstOfThisMonth: typeof import('../../server/utils/karachiDate').firstOfThisMonth
  const fromNodeMiddleware: typeof import('../../node_modules/h3/dist/index').fromNodeMiddleware
  const fromPlainHandler: typeof import('../../node_modules/h3/dist/index').fromPlainHandler
  const fromWebHandler: typeof import('../../node_modules/h3/dist/index').fromWebHandler
  const getAtprotoClientMetadata: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/atproto').getAtprotoClientMetadata
  const getCookie: typeof import('../../node_modules/h3/dist/index').getCookie
  const getHeader: typeof import('../../node_modules/h3/dist/index').getHeader
  const getHeaders: typeof import('../../node_modules/h3/dist/index').getHeaders
  const getMethod: typeof import('../../node_modules/h3/dist/index').getMethod
  const getProxyRequestHeaders: typeof import('../../node_modules/h3/dist/index').getProxyRequestHeaders
  const getQuery: typeof import('../../node_modules/h3/dist/index').getQuery
  const getRequestFingerprint: typeof import('../../node_modules/h3/dist/index').getRequestFingerprint
  const getRequestHeader: typeof import('../../node_modules/h3/dist/index').getRequestHeader
  const getRequestHeaders: typeof import('../../node_modules/h3/dist/index').getRequestHeaders
  const getRequestHost: typeof import('../../node_modules/h3/dist/index').getRequestHost
  const getRequestIP: typeof import('../../node_modules/h3/dist/index').getRequestIP
  const getRequestPath: typeof import('../../node_modules/h3/dist/index').getRequestPath
  const getRequestProtocol: typeof import('../../node_modules/h3/dist/index').getRequestProtocol
  const getRequestURL: typeof import('../../node_modules/h3/dist/index').getRequestURL
  const getRequestWebStream: typeof import('../../node_modules/h3/dist/index').getRequestWebStream
  const getResponseHeader: typeof import('../../node_modules/h3/dist/index').getResponseHeader
  const getResponseHeaders: typeof import('../../node_modules/h3/dist/index').getResponseHeaders
  const getResponseStatus: typeof import('../../node_modules/h3/dist/index').getResponseStatus
  const getResponseStatusText: typeof import('../../node_modules/h3/dist/index').getResponseStatusText
  const getRouteRules: typeof import('../../node_modules/nitropack/dist/runtime/internal/route-rules').getRouteRules
  const getRouterParam: typeof import('../../node_modules/h3/dist/index').getRouterParam
  const getRouterParams: typeof import('../../node_modules/h3/dist/index').getRouterParams
  const getSession: typeof import('../../node_modules/h3/dist/index').getSession
  const getUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').getUserSession
  const getValidatedQuery: typeof import('../../node_modules/h3/dist/index').getValidatedQuery
  const getValidatedRouterParams: typeof import('../../node_modules/h3/dist/index').getValidatedRouterParams
  const handleCacheHeaders: typeof import('../../node_modules/h3/dist/index').handleCacheHeaders
  const handleCors: typeof import('../../node_modules/h3/dist/index').handleCors
  const hashPassword: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').hashPassword
  const isCorsOriginAllowed: typeof import('../../node_modules/h3/dist/index').isCorsOriginAllowed
  const isError: typeof import('../../node_modules/h3/dist/index').isError
  const isEvent: typeof import('../../node_modules/h3/dist/index').isEvent
  const isEventHandler: typeof import('../../node_modules/h3/dist/index').isEventHandler
  const isMethod: typeof import('../../node_modules/h3/dist/index').isMethod
  const isPreflightRequest: typeof import('../../node_modules/h3/dist/index').isPreflightRequest
  const isStream: typeof import('../../node_modules/h3/dist/index').isStream
  const isWebResponse: typeof import('../../node_modules/h3/dist/index').isWebResponse
  const karachiNow: typeof import('../../server/utils/karachiDate').karachiNow
  const karachiToday: typeof import('../../server/utils/karachiDate').karachiToday
  const lazyEventHandler: typeof import('../../node_modules/h3/dist/index').lazyEventHandler
  const mondayOfThisWeek: typeof import('../../server/utils/karachiDate').mondayOfThisWeek
  const nitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin').nitroPlugin
  const parseCookies: typeof import('../../node_modules/h3/dist/index').parseCookies
  const passwordNeedsReHash: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').passwordNeedsReHash
  const promisifyNodeListener: typeof import('../../node_modules/h3/dist/index').promisifyNodeListener
  const proxyRequest: typeof import('../../node_modules/h3/dist/index').proxyRequest
  const readBody: typeof import('../../node_modules/h3/dist/index').readBody
  const readFormData: typeof import('../../node_modules/h3/dist/index').readFormData
  const readMultipartFormData: typeof import('../../node_modules/h3/dist/index').readMultipartFormData
  const readRawBody: typeof import('../../node_modules/h3/dist/index').readRawBody
  const readValidatedBody: typeof import('../../node_modules/h3/dist/index').readValidatedBody
  const removeResponseHeader: typeof import('../../node_modules/h3/dist/index').removeResponseHeader
  const replaceUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').replaceUserSession
  const requireCronSecret: typeof import('../../server/utils/cronAuth').requireCronSecret
  const requireRole: typeof import('../../server/utils/authorize').requireRole
  const requireUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').requireUserSession
  const runTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task').runTask
  const sanitizeStatusCode: typeof import('../../node_modules/h3/dist/index').sanitizeStatusCode
  const sanitizeStatusMessage: typeof import('../../node_modules/h3/dist/index').sanitizeStatusMessage
  const sealSession: typeof import('../../node_modules/h3/dist/index').sealSession
  const send: typeof import('../../node_modules/h3/dist/index').send
  const sendEmail: typeof import('../../server/utils/email').sendEmail
  const sendError: typeof import('../../node_modules/h3/dist/index').sendError
  const sendIterable: typeof import('../../node_modules/h3/dist/index').sendIterable
  const sendNoContent: typeof import('../../node_modules/h3/dist/index').sendNoContent
  const sendProxy: typeof import('../../node_modules/h3/dist/index').sendProxy
  const sendRedirect: typeof import('../../node_modules/h3/dist/index').sendRedirect
  const sendStream: typeof import('../../node_modules/h3/dist/index').sendStream
  const sendWebResponse: typeof import('../../node_modules/h3/dist/index').sendWebResponse
  const serveStatic: typeof import('../../node_modules/h3/dist/index').serveStatic
  const sessionHooks: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').sessionHooks
  const setCookie: typeof import('../../node_modules/h3/dist/index').setCookie
  const setHeader: typeof import('../../node_modules/h3/dist/index').setHeader
  const setHeaders: typeof import('../../node_modules/h3/dist/index').setHeaders
  const setResponseHeader: typeof import('../../node_modules/h3/dist/index').setResponseHeader
  const setResponseHeaders: typeof import('../../node_modules/h3/dist/index').setResponseHeaders
  const setResponseStatus: typeof import('../../node_modules/h3/dist/index').setResponseStatus
  const setUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').setUserSession
  const splitCookiesString: typeof import('../../node_modules/h3/dist/index').splitCookiesString
  const toEventHandler: typeof import('../../node_modules/h3/dist/index').toEventHandler
  const toNodeListener: typeof import('../../node_modules/h3/dist/index').toNodeListener
  const toPlainHandler: typeof import('../../node_modules/h3/dist/index').toPlainHandler
  const toWebHandler: typeof import('../../node_modules/h3/dist/index').toWebHandler
  const toWebRequest: typeof import('../../node_modules/h3/dist/index').toWebRequest
  const unsealSession: typeof import('../../node_modules/h3/dist/index').unsealSession
  const updateSession: typeof import('../../node_modules/h3/dist/index').updateSession
  const useAppConfig: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/app-config').useAppConfig
  const useBase: typeof import('../../node_modules/h3/dist/index').useBase
  const useCloudinary: typeof import('../../server/utils/cloudinary').useCloudinary
  const useEvent: typeof import('../../node_modules/nitropack/dist/runtime/internal/context').useEvent
  const useFirebaseAuth: typeof import('../../server/utils/firebaseAdmin').useFirebaseAuth
  const useNitroApp: typeof import('../../node_modules/nitropack/dist/runtime/internal/app').useNitroApp
  const useRuntimeConfig: typeof import('../../node_modules/nitropack/dist/runtime/internal/config').useRuntimeConfig
  const useSession: typeof import('../../node_modules/h3/dist/index').useSession
  const useStorage: typeof import('../../node_modules/nitropack/dist/runtime/internal/storage').useStorage
  const verifyPassword: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').verifyPassword
  const writeEarlyHints: typeof import('../../node_modules/h3/dist/index').writeEarlyHints
}
// for type re-export
declare global {
  // @ts-ignore
  export type { EventHandler, EventHandlerRequest, EventHandlerResponse, EventHandlerObject, H3EventContext } from '../../node_modules/h3/dist/index'
  import('../../node_modules/h3/dist/index')
  // @ts-ignore
  export type { OAuthAppleConfig, OAuthAppleTokens, OAuthAppleUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple.d')
  // @ts-ignore
  export type { OAuthAtlassianConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian.d')
  // @ts-ignore
  export type { OAuthAuth0Config } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0.d')
  // @ts-ignore
  export type { OAuthAuthentikConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik.d')
  // @ts-ignore
  export type { OAuthAzureB2CConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c.d')
  // @ts-ignore
  export type { OAuthBattledotnetConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet.d')
  // @ts-ignore
  export type { OAuthBoxConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box.d')
  // @ts-ignore
  export type { OAuthCognitoConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito.d')
  // @ts-ignore
  export type { OAuthDiscordConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord.d')
  // @ts-ignore
  export type { OAuthDropboxConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox.d')
  // @ts-ignore
  export type { OAuthFacebookConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook.d')
  // @ts-ignore
  export type { OAuthGiteaConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea.d')
  // @ts-ignore
  export type { OAuthGitHubConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github.d')
  // @ts-ignore
  export type { OAuthGitLabConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab.d')
  // @ts-ignore
  export type { OAuthGoogleConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google.d')
  // @ts-ignore
  export type { OAuthHerokuConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku.d')
  // @ts-ignore
  export type { OAuthHubspotConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot.d')
  // @ts-ignore
  export type { OAuthInstagramConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram.d')
  // @ts-ignore
  export type { OAuthKeycloakConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak.d')
  // @ts-ignore
  export type { OAuthKickConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick.d')
  // @ts-ignore
  export type { OAuthLineConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line.d')
  // @ts-ignore
  export type { OAuthLinearConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear.d')
  // @ts-ignore
  export type { OAuthLinkedInConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin.d')
  // @ts-ignore
  export type { LiveChatTokens, LiveChatUser, LiveChatConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat.d')
  // @ts-ignore
  export type { OAuthMicrosoftConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft.d')
  // @ts-ignore
  export type { OAuthOidcConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc.d')
  // @ts-ignore
  export type { OpenIdConfig, OAuthConfigExt, OAuthOktaConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta.d')
  // @ts-ignore
  export type { OAuthOryConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory.d')
  // @ts-ignore
  export type { OAuthOsuConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu.d')
  // @ts-ignore
  export type { OAuthPaypalConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal.d')
  // @ts-ignore
  export type { OAuthPolarConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar.d')
  // @ts-ignore
  export type { OAuthRiotGamesConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames.d')
  // @ts-ignore
  export type { OAuthRobloxConfig, OAuthRobloxUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox.d')
  // @ts-ignore
  export type { OAuthSalesforceConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce.d')
  // @ts-ignore
  export type { OAuthSeznamConfig, OAuthSeznamUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam.d')
  // @ts-ignore
  export type { OAuthShopifyCustomerConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer.d')
  // @ts-ignore
  export type { OAuthSlackConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack.d')
  // @ts-ignore
  export type { OAuthSpotifyConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify.d')
  // @ts-ignore
  export type { OAuthSteamConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam.d')
  // @ts-ignore
  export type { OAuthStravaConfig, OAuthStravaUser, OAuthStravaTokens } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava.d')
  // @ts-ignore
  export type { OAuthTikTokConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok.d')
  // @ts-ignore
  export type { OAuthTwitchConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch.d')
  // @ts-ignore
  export type { OAuthVKConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk.d')
  // @ts-ignore
  export type { OAuthWorkOSConfig, OAuthWorkOSUser, OAuthWorkOSAuthenticationMethod, OAuthWorkOSAuthenticateResponse, OAuthWorkOSTokens } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos.d')
  // @ts-ignore
  export type { OAuthXConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x.d')
  // @ts-ignore
  export type { OAuthXSUAAConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa.d')
  // @ts-ignore
  export type { OAuthYandexConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex.d')
  // @ts-ignore
  export type { OAuthZitadelConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel.d')
  // @ts-ignore
  export type { SessionHooks } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.d')
}
export { H3Event, H3Error, appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { buildAssetsURL as __buildAssetsURL, publicAssetsURL as __publicAssetsURL } from 'C:/dev/bookmeqa/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths';
export { defineAppConfig } from 'C:/dev/bookmeqa/node_modules/@nuxt/nitro-server/dist/runtime/utils/config';
export { useAppConfig } from 'C:/dev/bookmeqa/node_modules/@nuxt/nitro-server/dist/runtime/utils/app-config';
export { defineOAuthAppleEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple';
export { defineOAuthAtlassianEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian';
export { defineOAuthAuth0EventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0';
export { defineOAuthAuthentikEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik';
export { defineOAuthAzureB2CEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c';
export { defineOAuthBattledotnetEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet';
export { defineOAuthBoxEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box';
export { defineOAuthCognitoEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito';
export { defineOAuthDiscordEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord';
export { defineOAuthDropboxEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox';
export { defineOAuthFacebookEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook';
export { defineOAuthGiteaEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea';
export { defineOAuthGitHubEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github';
export { defineOAuthGitLabEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab';
export { defineOAuthGoogleEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google';
export { defineOAuthHerokuEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku';
export { defineOAuthHubspotEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot';
export { defineOAuthInstagramEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram';
export { defineOAuthKeycloakEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak';
export { defineOAuthKickEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick';
export { defineOAuthLineEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line';
export { defineOAuthLinearEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear';
export { defineOAuthLinkedInEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin';
export { defineOAuthLiveChatEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat';
export { defineOAuthMicrosoftEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft';
export { defineOAuthOidcEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc';
export { defineOAuthOktaEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta';
export { defineOAuthOryEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory';
export { defineOAuthOsuEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu';
export { defineOAuthPaypalEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal';
export { defineOAuthPolarEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar';
export { defineOAuthRiotGamesEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames';
export { defineOAuthRobloxEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox';
export { defineOAuthSalesforceEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce';
export { defineOAuthSeznamEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam';
export { defineOAuthShopifyCustomerEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer';
export { defineOAuthSlackEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack';
export { defineOAuthSpotifyEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify';
export { defineOAuthSteamEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam';
export { defineOAuthStravaEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava';
export { defineOAuthTikTokEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok';
export { defineOAuthTwitchEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch';
export { defineOAuthVKEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk';
export { defineOAuthWorkOSEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos';
export { defineOAuthXEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x';
export { defineOAuthXSUAAEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa';
export { defineOAuthYandexEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex';
export { defineOAuthZitadelEventHandler } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel';
export { getAtprotoClientMetadata } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/utils/atproto';
export { hashPassword, verifyPassword, passwordNeedsReHash } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/utils/password';
export { sessionHooks, getUserSession, setUserSession, replaceUserSession, clearUserSession, requireUserSession } from 'C:/dev/bookmeqa/node_modules/nuxt-auth-utils/dist/runtime/server/utils/session';
export { requireRole } from 'C:/dev/bookmeqa/server/utils/authorize';
export { useCloudinary } from 'C:/dev/bookmeqa/server/utils/cloudinary';
export { requireCronSecret } from 'C:/dev/bookmeqa/server/utils/cronAuth';
export { sendEmail } from 'C:/dev/bookmeqa/server/utils/email';
export { useFirebaseAuth } from 'C:/dev/bookmeqa/server/utils/firebaseAdmin';
export { karachiNow, karachiToday, mondayOfThisWeek, firstOfThisMonth } from 'C:/dev/bookmeqa/server/utils/karachiDate';