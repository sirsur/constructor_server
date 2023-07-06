import express from 'express';
import mongoose from 'mongoose';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { userResolvers } from './resolvers/userResolver';
import { projectResolver } from './resolvers/projectResolver';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { getModelForClass } from "@typegoose/typegoose";
import bodyParser from 'body-parser';

import { User } from "./entities/user";
import { Project } from "./entities/project";

export const ProjectModel = getModelForClass(Project);
export const UserModel = getModelForClass(User);

require('dotenv').config(); 

const PORT = process.env.PORT || 4000;

const uri = process.env.ATLAS_URI!;

const startServer = async () => {
    const app = express();

    const server = new ApolloServer({
        schema: await buildSchema({
            resolvers: [userResolvers, projectResolver]
        }),
        context: ({ req, res }) => ({
            req, res
        }),
    });     

    app.use(cors({ 
        credentials: true, 
        origin: 'http://localhost:3000' 
    }));

    app.use(cookieParser());
    app.use(bodyParser.json({ limit: '100mb' }));

    mongoose.connect(uri, {
        connectTimeoutMS: 5000
    }).catch((err: any) => console.log(err));

    await server.start();

    server.applyMiddleware({
        app,
        path: '/graphql',
        cors: false
    });

    app.listen(PORT, () => {
        console.log("Server listen to port " + PORT);
    });
};

startServer().catch((err) => {
    console.error(err);
});
