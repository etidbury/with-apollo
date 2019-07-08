// Extracted from @link: https://github.com/zeit/next.js/tree/canary/examples/with-apollo-and-redux
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'isomorphic-unfetch'


// import * as urljoin from 'url-join'
import { setContext } from 'apollo-link-context'
import { getAccessToken } from '@etidbury/auth0'
import { WebSocketLink } from 'apollo-link-ws'
import { SubscriptionClient } from 'subscriptions-transport-ws'
// import { ApolloLink } from 'apollo-link'
import { split } from 'apollo-link'
import { getMainDefinition } from 'apollo-utilities'
import { onError } from "apollo-link-error"
import { ApolloLink } from 'apollo-link'
import { persistCache } from 'apollo-cache-persist'

// import { API_BASE_URL,DEBUG } from './options'
let apolloClient = null


var DEBUG=!!process.env.DEBUG
var USE_SUBSCRIPTIONS=process.env.USE_SUBSCRIPTIONS
//remove quotation marks added by zeit build
var API_BASE_URL=process.env.API_BASE_URL.replace(/\"/g,'')


const extractHostname=(url)=> {
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
}

const create = (initialState) =>{
    
    const isBrowser = typeof window !== 'undefined'

    // console.log('env',process.env)
    
    // const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';

    let wsLink

    if (!API_BASE_URL||!API_BASE_URL.length){
        throw new TypeError('Environment variable API_BASE_URL not set')
    }
    
    //@ts-ignore
    if (isBrowser&&!!USE_SUBSCRIPTIONS) {
        
       
        // todo: set logic to replace http with ws and https with wss. Currently replaces either with wss
        let wsLinkURI

        const apiHostname = extractHostname(API_BASE_URL)

        if (API_BASE_URL.indexOf('https://')>-1){
            wsLinkURI = 'wss://'+apiHostname
        }else{
            wsLinkURI = 'ws://'+apiHostname
        }

        if (DEBUG) {
            console.debug('> Using websocket URI: ',wsLinkURI)
        }
        
        // const token = getAccessToken()

        const client = new SubscriptionClient(wsLinkURI, {
            reconnect: true,
            // connectionParams: {
            //    accessToken: token
            // }
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
        uri: API_BASE_URL // Server URL (must be absolute)
        , credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
        ,  fetch: !isBrowser && fetch
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

    const errorLink = onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
            graphQLErrors.map(({ message, locations, path,extensions }) =>
                console.error(
                    `[GraphQL error]: Message: ${message}, Path: ${path} Stack trace:`
                        , extensions && extensions.exception && extensions.exception.stacktrace || '[N/A]'
                )
            )

        if (networkError) console.error(`[Network error]:`,networkError)
    })


    const httpLinkWithAuth = ApolloLink.from([
        errorLink,
        authLink,
        httpLink
    ])
    

    let link = httpLinkWithAuth



    // const links = [authLink.concat(httpLink)]

    if (wsLink){
        link = split(
            ({ query }) => {
                const { kind, operation } = getMainDefinition(query)
                return kind === 'OperationDefinition' && operation === 'subscription'
            },
            wsLink,
            httpLinkWithAuth
        )
    }



    const restoreState= initialState || {}

    const cache=new InMemoryCache({
        //@ts-ignore
        dataIdFromObject: o => {o.id ? `${o.__typename}-${o.id}`: `${o.__typename}-${o.cursor}`},
    }).restore(restoreState)



    try {
        //@ts-ignore
        if (isBrowser){


            // See above for additional options, including other storage providers.
            persistCache({
                cache,
                //@ts-ignore
                storage: window.localStorage,
            })
        }
    } catch (error) {
        console.error('Error restoring Apollo cache', error);
    }

    

    // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
    return new ApolloClient({
        //@ts-ignore
        storage: isBrowser&& window.localStorage,
        //@ts-ignore
        connectToDevTools: isBrowser,
        //@ts-ignore
        ssrMode: !isBrowser, // Disables forceFetch on the server (so queries are only run once)
        link,
        cache
    })
}


export const initApollo:any= (initialState?):any => {
    // Make sure to create a new client for every server-side request so that data
    // isn't shared between connections (which would be bad)
    //@ts-ignore
    if (typeof window === 'undefined') {
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