import { ApolloClient, InMemoryCache, HttpLink } from 'apollo-boost'
import fetch from 'isomorphic-unfetch'



// import * as urljoin from 'url-join'
import { setContext } from 'apollo-link-context'
import { getAccessToken } from '@etidbury/auth0'
//import { WebSocketLink } from 'apollo-link-ws'
//import { SubscriptionClient } from 'subscriptions-transport-ws'
// import { ApolloLink } from 'apollo-link'
//import { split } from 'apollo-link'
//import { getMainDefinition } from 'apollo-utilities'
import { onError } from "apollo-link-error"
import { ApolloLink } from 'apollo-link'
//import { persistCache } from 'apollo-cache-persist'


let apolloClient = null

//var DEBUG=!!process.env.DEBUG
var API_BASE_URL=process.env.API_BASE_URL.replace(/\"/g,'')


function create (initialState) {
  // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
  const isBrowser = typeof window !== 'undefined'



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


  return new ApolloClient({
    connectToDevTools: isBrowser,
    ssrMode: !isBrowser, // Disables forceFetch on the server (so queries are only run once)
    link,
   // cache,
    resolvers: {},
  })
}

export default function initApollo (initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === 'undefined') {
    return create(initialState)
  }

  // Reuse client on the client-side
  if (!apolloClient) {
    apolloClient = create(initialState)
  }

  return apolloClient
}