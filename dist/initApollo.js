"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Extracted from @link: https://github.com/zeit/next.js/tree/canary/examples/with-apollo-and-redux
const apollo_client_1 = require("apollo-client");
const apollo_link_http_1 = require("apollo-link-http");
const apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
const fetch = require("isomorphic-unfetch");
// import * as urljoin from 'url-join'
const apollo_link_context_1 = require("apollo-link-context");
const auth0_1 = require("@etidbury/auth0");
const apollo_link_ws_1 = require("apollo-link-ws");
const subscriptions_transport_ws_1 = require("subscriptions-transport-ws");
// import { ApolloLink } from 'apollo-link'
const apollo_link_1 = require("apollo-link");
const apollo_utilities_1 = require("apollo-utilities");
// import { API_BASE_URL,DEBUG } from './options'
let apolloClient = null;
// Polyfill fetch() on the server (used by apollo-client)
//@ts-ignore
if (!process.browser) {
    //@ts-ignore
    global.fetch = fetch;
}
const { API_BASE_URL, DEBUG } = process.env;
const create = (initialState) => {
    // console.log('env',process.env)
    // const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';
    let wsLink;
    //@ts-ignore
    if (process.browser) {
        if (!API_BASE_URL || !API_BASE_URL.length) {
            throw new TypeError('Environment variable API_BASE_URL not set');
        }
        const wsLinkURI = API_BASE_URL.replace(/https?/g, 'ws');
        if (DEBUG) {
            console.debug('> Using websocket URI: ', wsLinkURI);
        }
        // const token = getAccessToken()
        const client = new subscriptions_transport_ws_1.SubscriptionClient(wsLinkURI, {
            reconnect: true,
        });
        wsLink = new apollo_link_ws_1.WebSocketLink(client);
    }
    // const wsLink = new WebSocketLink({
    //     uri: wsLinkURI,
    //     options: {
    //         reconnect: true,
    //     },
    // })
    // const authMiddleware = setContext(
    //     (_, { headers }) =>
    //         new Promise(async resolve => {
    //             // get the authentication token from local storage if it exists
    //             // const token = await getAuthorizationToken()
    //             const token = localStorage.getItem('access_token')
    //             cachedToken = token
    //             // return the headers to the context so httpLink can read them
    //             resolve({
    //                 headers: {
    //                     ...headers,
    //                     authorization: token ? `Bearer ${token}` : null,
    //                 },
    //             })
    //         }),
    // )
    // console.log('API_BASE_URL',API_BASE_URL)
    // console.log('uri',urljoin(API_BASE_URL,'graphql'))
    const httpLink = new apollo_link_http_1.HttpLink({
        uri: API_BASE_URL // Server URL (must be absolute)
        ,
        credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
    });
    const authLink = apollo_link_context_1.setContext((_, { headers }) => {
        // get the authentication token from local storage if it exists
        const token = auth0_1.getAccessToken();
        // return the headers to the context so httpLink can read them
        return {
            headers: {
                ...headers,
                Authorization: token ? `Bearer ${token}` : ''
            }
        };
    });
    const httpLinkWithAuth = authLink.concat(httpLink);
    let link = httpLinkWithAuth;
    // const links = [authLink.concat(httpLink)]
    if (wsLink)
        link = apollo_link_1.split(({ query }) => {
            const { kind, operation } = apollo_utilities_1.getMainDefinition(query);
            return kind === 'OperationDefinition' && operation === 'subscription';
        }, wsLink, httpLinkWithAuth);
    // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
    return new apollo_client_1.ApolloClient({
        //@ts-ignore
        connectToDevTools: process.browser,
        //@ts-ignore
        ssrMode: !process.browser,
        link,
        cache: new apollo_cache_inmemory_1.InMemoryCache().restore(initialState || {})
    });
};
exports.initApollo = (initialState) => {
    // Make sure to create a new client for every server-side request so that data
    // isn't shared between connections (which would be bad)
    //@ts-ignore
    if (!process.browser) {
        return create(initialState);
    }
    // Reuse client on the client-side
    if (!apolloClient) {
        //@ts-ignore
        apolloClient = create(initialState);
    }
    return apolloClient;
};
exports.default = exports.initApollo;
//# sourceMappingURL=initApollo.js.map