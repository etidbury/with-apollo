// Extracted from @link: https://github.com/zeit/next.js/tree/canary/examples/with-apollo-and-redux
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import * as fetch from 'isomorphic-unfetch'
import * as urljoin from 'url-join'
import { setContext } from 'apollo-link-context'
import { getAccessToken } from '@etidbury/auth0'
import { WebSocketLink } from 'apollo-link-ws'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { ApolloLink } from 'apollo-link'
// import { API_BASE_URL,DEBUG } from './options'
let apolloClient = null

// Polyfill fetch() on the server (used by apollo-client)
//@ts-ignore
if (!process.browser) {
    //@ts-ignore
    global.fetch = fetch
}


const { API_BASE_URL,DEBUG } = process.env

const create = (initialState) =>{
    
    // console.log('env',process.env)
    
    // const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';

    let wsLink
    
    //@ts-ignore
    if (process.browser) {

        if (!API_BASE_URL||!API_BASE_URL.length){
            throw new TypeError('Environment variable API_BASE_URL not set')
        }

        const wsLinkURI = API_BASE_URL.replace(/https?/g, 'ws')

        if (DEBUG) {
            console.debug('> Using websocket URI: ',wsLinkURI)
        }

        const client = new SubscriptionClient(wsLinkURI, {
            reconnect: true,
            connectionParams: {
            // accessToken: 'jkasdhkjashd jkashdjk ashdas'
            }
        })

        wsLink = new WebSocketLink(client)
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
    
    const httpLink = new HttpLink({
        uri: urljoin(API_BASE_URL,'graphql') // Server URL (must be absolute)
        , credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
    })

    const authLink = setContext((_, { headers }) => {
        // get the authentication token from local storage if it exists
        const token = getAccessToken()
        // return the headers to the context so httpLink can read them
        return {
            headers: {
                ...headers,
                Authorization: token ? `Bearer ${token}` : ''
            }
        }
    })

    // const link = split(
    //     ({ query }) => {
    //         const { kind, operation } = getMainDefinition(query)
    //         return kind === 'OperationDefinition' && operation === 'subscription'
    //     },
    //     process.browser ? wsLink : false,
    //     httpLinkWithAuth,
    // )

    const links = [authLink, httpLink]

    if (wsLink)
        links.push(wsLink)

    // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
    return new ApolloClient({
        //@ts-ignore
        connectToDevTools: process.browser,
        //@ts-ignore
        ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
        link: ApolloLink.from(links),
        cache: new InMemoryCache().restore(initialState || {})
    })
}


export const initApollo:any= (initialState?):any => {
    // Make sure to create a new client for every server-side request so that data
    // isn't shared between connections (which would be bad)
    //@ts-ignore
    if (!process.browser) {
        return create(initialState)
    }

    // Reuse client on the client-side
    if (!apolloClient) {
        //@ts-ignore
        apolloClient = create(initialState)
    }

    return apolloClient
}
export default initApollo