import { prop, Ref } from "@typegoose/typegoose";
import * as mongoose from 'mongoose';
import { Field, ObjectType } from "type-graphql";

import { Project } from "./project";

@ObjectType()
export class User {
    readonly _id: mongoose.Types.ObjectId;

    @Field()
    @prop({ unique: true, required: true })
    email: string;

    @Field()
    @prop({ required: true })
    password: string;

    @Field()
    @prop({ unique: true, required: true })
    username: string;

    @Field(_ => [Project], { nullable: true })
    @prop({ ref: () => Project, default: [] })
    projects?: Ref<Project>[];

    @Field()
    @prop({ unique: true, required: true })
    accessToken: string;
};
