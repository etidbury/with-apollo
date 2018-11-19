import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ApolloProvider, getDataFromTree } from 'react-apollo';
import Head from 'next/head';
import initApollo from './initApollo';
// Gets the display name of a JSX component for dev tools
function getComponentDisplayName(Component) {
    return Component.displayName || Component.name || 'Unknown';
}
export default ComposedComponent => {
    var _a;
    return _a = class WithData extends Component {
            constructor(props) {
                super(props);
                //@ts-ignore
                this.apollo = initApollo(this.props.serverState.apollo.data);
            }
            static async getInitialProps(ctx) {
                // Initial serverState with apollo (empty)
                let serverState = {
                    apollo: {
                        data: {}
                    }
                };
                // Evaluate the composed component's getInitialProps()
                let composedInitialProps = {};
                if (ComposedComponent.getInitialProps) {
                    composedInitialProps = await ComposedComponent.getInitialProps(ctx);
                }
                // Run all GraphQL queries in the component tree
                // and extract the resulting data
                //@ts-ignore
                if (!process.browser) {
                    const apollo = initApollo();
                    try {
                        // Run all GraphQL queries
                        await getDataFromTree(
                        //@ts-ignore
                        <ApolloProvider client={apollo}>
                        <ComposedComponent {...composedInitialProps}/>
                    </ApolloProvider>, {
                            router: {
                                asPath: ctx.asPath,
                                pathname: ctx.pathname,
                                query: ctx.query
                            }
                        });
                    }
                    catch (error) {
                        // Prevent Apollo Client GraphQL errors from crashing SSR.
                        // Handle them in components via the data.error prop:
                        // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
                    }
                    // getDataFromTree does not call componentWillUnmount
                    // head side effect therefore need to be cleared manually
                    Head.rewind();
                    // Extract query data from the Apollo store
                    serverState = {
                        apollo: {
                            // @ts-ignore
                            data: apollo.cache.extract()
                        }
                    };
                }
                return {
                    serverState,
                    ...composedInitialProps
                };
            }
            render() {
                return (
                //@ts-ignore
                <ApolloProvider client={this.apollo}>
                <ComposedComponent {...this.props}/>
            </ApolloProvider>);
            }
        },
        _a.displayName = `WithData(${getComponentDisplayName(ComposedComponent)})`,
        _a.propTypes = {
            serverState: PropTypes.object.isRequired
        },
        _a;
};
//# sourceMappingURL=withApollo.jsx.map