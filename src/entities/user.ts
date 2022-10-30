const { gql } = require('apollo-server-express');

const typeDefs = gql`
    type User {
        id: ID!
        email: String!
        login: String!
        password: String!
    },
    type Query {
        login(email: String!, password: String!):  
    },
    type Mutation {
        registration(email: String!, login: String!, password: String!): User
    }
`;

module.exports = typeDefs;