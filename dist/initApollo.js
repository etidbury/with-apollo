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
var apollo_boost_1 = require("apollo-boost");
var isomorphic_unfetch_1 = require("isomorphic-unfetch");
// import * as urljoin from 'url-join'
var apollo_link_context_1 = require("apollo-link-context");
var auth0_1 = require("@etidbury/auth0");
//import { WebSocketLink } from 'apollo-link-ws'
//import { SubscriptionClient } from 'subscriptions-transport-ws'
// import { ApolloLink } from 'apollo-link'
//import { split } from 'apollo-link'
//import { getMainDefinition } from 'apollo-utilities'
var apollo_link_error_1 = require("apollo-link-error");
var apollo_link_1 = require("apollo-link");
//import { persistCache } from 'apollo-cache-persist'
var apolloClient = null;
//var DEBUG=!!process.env.DEBUG
var API_BASE_URL = process.env.API_BASE_URL.replace(/\"/g, '');
function create(initialState) {
    // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
    var isBrowser = typeof window !== 'undefined';
    var httpLink = new apollo_boost_1.HttpLink({
        uri: API_BASE_URL // Server URL (must be absolute)
        ,
        credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
        ,
        fetch: !isBrowser && isomorphic_unfetch_1.default
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
    var httpLinkWithAuth = apollo_link_1.ApolloLink.from([
        errorLink,
        authLink,
        httpLink
    ]);
    var link = httpLinkWithAuth;
    // const links = [authLink.concat(httpLink)]
    // if (wsLink){
    //     link = split(
    //         ({ query }) => {
    //             const { kind, operation } = getMainDefinition(query)
    //             return kind === 'OperationDefinition' && operation === 'subscription'
    //         },
    //         wsLink,
    //         httpLinkWithAuth
    //     )
    // }
    //const restoreState= initialState || {}
    // const cache=new InMemoryCache({
    //     dataIdFromObject: o => {
    //       if (!o){
    //         console.debug('dataIdFromObject(): no object found',o)
    //         return undefined
    //       }
    //       //@ts-ignore 
    //       return o.id ? `${o.__typename}-${o.id}`: `${o.__typename}-${o.cursor}`
    //     },
    // }).restore(restoreState)
    return new apollo_boost_1.ApolloClient({
        connectToDevTools: isBrowser,
        ssrMode: !isBrowser,
        link: link,
        cache: null,
        resolvers: {},
    });
}
function initApollo(initialState) {
    // Make sure to create a new client for every server-side request so that data
    // isn't shared between connections (which would be bad)
    if (typeof window === 'undefined') {
        return create(initialState);
    }
    // Reuse client on the client-side
    if (!apolloClient) {
        apolloClient = create(initialState);
    }
    return apolloClient;
}
exports.default = initApollo;
//# sourceMappingURL=initApollo.js.map