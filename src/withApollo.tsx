
import * as React from 'react'
import * as PropTypes from 'prop-types'
import { ApolloProvider, getDataFromTree } from 'react-apollo'
import Head from 'next/head'
import {initApollo} from './initApollo'
import { checkIsAuthenticated } from '@etidbury/auth0'

// Gets the display name of a JSX component for dev tools
function getComponentDisplayName (Component) {
    return Component.displayName || Component.name || 'Unknown'
}

export const withApollo:any = (ComposedComponent:any):any => {
    return class WithData extends React.Component<any> {

        static displayName = `WithData(${getComponentDisplayName(
            ComposedComponent
        )})`

        static propTypes = {
            serverState: PropTypes.object.isRequired,
            isAuthenticated: PropTypes.bool
        }
        
        static async getInitialProps (ctx) {
            // Initial serverState with apollo (empty)
            let serverState = {
                apollo: {
                    data: {}
                }
            }

            // Evaluate the composed component's getInitialProps()
            let composedInitialProps = {}
            if (ComposedComponent.getInitialProps) {
                composedInitialProps = await ComposedComponent.getInitialProps(ctx)
            }

            // Run all GraphQL queries in the component tree
            // and extract the resulting data
            //@ts-ignore
            if (!process.browser) {
                //@ts-ignore
                const apollo = initApollo()

                if (!apollo) {
                    throw new Error('Failed to instantiate Apollo (initApollo)')
                }

                try {
                    // Run all GraphQL queries
                    await getDataFromTree(
                        //@ts-ignore
                        <ApolloProvider client={apollo}>
                            <ComposedComponent {...composedInitialProps} />
                        </ApolloProvider>,
                        {
                            router: {
                                asPath: ctx.asPath,
                                pathname: ctx.pathname,
                                query: ctx.query
                            }
                        }
                    )
                } catch (error) {
                    // Prevent Apollo Client GraphQL errors from crashing SSR.
                    // Handle them in components via the data.error prop:
                    // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
                }
                // getDataFromTree does not call componentWillUnmount
                // head side effect therefore need to be cleared manually
                Head.rewind()

                // Extract query data from the Apollo store
                serverState = {
                    apollo: {
                        // @ts-ignore
                        data: apollo.cache.extract()
                    }
                }
            }
            
            return {
                isAuthenticated: checkIsAuthenticated(ctx),
                serverState,
                ...composedInitialProps
            }
        }

        constructor (props) {
            super(props)
            //@ts-ignore
            this.apollo = initApollo(this.props.serverState.apollo.data)
        }

        render () {
            return (
                //@ts-ignore
                <ApolloProvider client={this.apollo}>
                    <ComposedComponent {...this.props} />
                </ApolloProvider>
            )
        }
    }
}