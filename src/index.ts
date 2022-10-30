import express from 'express';
const mongoose = require('mongoose');
import { ApolloServer } from 'apollo-server-express';
const typeDefs = require('./entities/user');
const resolvers = require('./resolvers/user');

require('dotenv').config(); 

const PORT = process.env.PORT || 4000;

const uri = process.env.ATLAS_URI;

const main = async () => {
    const app = express();

    const server = new ApolloServer({
        typeDefs,
        resolvers
    });

    server.applyMiddleware({
        app
    });

    app.get("/", (_, res) => {
        res.send("Hi");
    });

    mongoose.connect(uri, {
        connectTimeoutMS: 5000
    }).catch((err: any) => console.log(err));

    app.listen(PORT, () => {
        console.log("Server listen to port " + PORT);
    });
};

main().catch((err) => {
    console.error(err);
});
