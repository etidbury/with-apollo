"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Extracted from @link: https://github.com/zeit/next.js/tree/canary/examples/with-apollo-and-redux
var apollo_client_1 = require("apollo-client");
var apollo_link_http_1 = require("apollo-link-http");
var apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
var fetch = require("isomorphic-unfetch");
// import * as urljoin from 'url-join'
var apollo_link_context_1 = require("apollo-link-context");
var auth0_1 = require("@etidbury/auth0");
var apollo_link_ws_1 = require("apollo-link-ws");
var subscriptions_transport_ws_1 = require("subscriptions-transport-ws");
// import { ApolloLink } from 'apollo-link'
var apollo_link_1 = require("apollo-link");
var apollo_utilities_1 = require("apollo-utilities");
var apollo_link_error_1 = require("apollo-link-error");
var apollo_link_2 = require("apollo-link");
// import { API_BASE_URL,DEBUG } from './options'
var apolloClient = null;
// Polyfill fetch() on the server (used by apollo-client)
//@ts-ignore
if (!process.browser) {
    //@ts-ignore
    global.fetch = fetch;
}
var _a = process.env, API_BASE_URL = _a.API_BASE_URL, DEBUG = _a.DEBUG, USE_SUBSCRIPTIONS = _a.USE_SUBSCRIPTIONS;
var extractHostname = function (url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }
    //find & remove port number
    //hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
    return hostname;
};
var create = function (initialState) {
    // console.log('env',process.env)
    // const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';
    var wsLink;
    if (!API_BASE_URL || !API_BASE_URL.length) {
        throw new TypeError('Environment variable API_BASE_URL not set');
    }
    //@ts-ignore
    if (process.browser && !!USE_SUBSCRIPTIONS) {
        // todo: set logic to replace http with ws and https with wss. Currently replaces either with wss
        var wsLinkURI = void 0;
        var apiHostname = extractHostname(API_BASE_URL);
        if (API_BASE_URL.indexOf('https://') > -1) {
            wsLinkURI = 'wss://' + apiHostname;
        }
        else {
            wsLinkURI = 'ws://' + apiHostname;
        }
        if (DEBUG) {
            console.debug('> Using websocket URI: ', wsLinkURI);
        }
        // const token = getAccessToken()
        var client = new subscriptions_transport_ws_1.SubscriptionClient(wsLinkURI, {
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
    var httpLink = new apollo_link_http_1.HttpLink({
        uri: API_BASE_URL // Server URL (must be absolute)
        ,
        credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
    });
    var authLink = apollo_link_context_1.setContext(function (_, _a) {
        var headers = _a.headers;
        // get the authentication token from local storage if it exists
        var token = auth0_1.getAccessToken();
        // return the headers to the context so httpLink can read them
        return {
            headers: __assign({}, headers, { Authorization: token ? "Bearer " + token : '' })
        };
    });
    var errorLink = apollo_link_error_1.onError(function (_a) {
        var graphQLErrors = _a.graphQLErrors, networkError = _a.networkError;
        if (graphQLErrors)
            graphQLErrors.map(function (_a) {
                var message = _a.message, locations = _a.locations, path = _a.path, extensions = _a.extensions;
                return console.error("[GraphQL error]: Message: " + message + ", Path: " + path + " Stack trace:", extensions && extensions.exception && extensions.exception.stacktrace || '[N/A]');
            });
        if (networkError)
            console.error("[Network error]:", networkError);
    });
    var httpLinkWithAuth = apollo_link_2.ApolloLink.from([
        errorLink,
        authLink,
        httpLink
    ]);
    var link = httpLinkWithAuth;
    // const links = [authLink.concat(httpLink)]
    if (wsLink)
        link = apollo_link_1.split(function (_a) {
            var query = _a.query;
            var _b = apollo_utilities_1.getMainDefinition(query), kind = _b.kind, operation = _b.operation;
            return kind === 'OperationDefinition' && operation === 'subscription';
        }, wsLink, httpLinkWithAuth);
    // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
    return new apollo_client_1.ApolloClient({
        //@ts-ignore
        storage: process.browser && window.localStorage,
        //@ts-ignore
        connectToDevTools: process.browser,
        //@ts-ignore
        ssrMode: !process.browser,
        link: link,
        cache: new apollo_cache_inmemory_1.InMemoryCache({
            //@ts-ignore
            dataIdFromObject: function (o) { o.id ? o.__typename + "-" + o.id : o.__typename + "-" + o.cursor; },
        }).restore(initialState || {})
    });
};
exports.initApollo = function (initialState) {
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