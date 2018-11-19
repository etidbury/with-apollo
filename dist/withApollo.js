"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const PropTypes = require("prop-types");
const react_apollo_1 = require("react-apollo");
const head_1 = require("next/head");
const initApollo = require("./initApollo");
// Gets the display name of a JSX component for dev tools
function getComponentDisplayName(Component) {
    return Component.displayName || Component.name || 'Unknown';
}
exports.default = (ComposedComponent) => {
    var _a;
    return _a = class WithData extends React.Component {
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
                    //@ts-ignore
                    const apollo = initApollo();
                    if (!apollo) {
                        throw new Error('Failed to instantiate Apollo (initApollo)');
                    }
                    try {
                        // Run all GraphQL queries
                        await react_apollo_1.getDataFromTree(
                        //@ts-ignore
                        React.createElement(react_apollo_1.ApolloProvider, { client: apollo },
                            React.createElement(ComposedComponent, Object.assign({}, composedInitialProps))), {
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
                    head_1.default.rewind();
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
                React.createElement(react_apollo_1.ApolloProvider, { client: this.apollo },
                    React.createElement(ComposedComponent, Object.assign({}, this.props))));
            }
        },
        _a.displayName = `WithData(${getComponentDisplayName(ComposedComponent)})`,
        _a.propTypes = {
            serverState: PropTypes.object.isRequired
        },
        _a;
};
//# sourceMappingURL=withApollo.js.map