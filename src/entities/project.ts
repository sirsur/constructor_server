import { prop, Ref } from "@typegoose/typegoose";
import * as mongoose from 'mongoose';
import { Field, ObjectType } from "type-graphql";
import { GraphQLByte } from 'graphql-scalars';

import { User } from "./user";

@ObjectType()
export class Project {
    readonly _id: mongoose.Types.ObjectId;

    @Field()
    @prop({ unique: false })
    name!: string;

    @Field()
    @prop({ default: new Date() })
    dateCreate!: string;

    @Field()
    @prop({ default: new Date() })
    dateUpdate!: string;

    @Field()
    @prop()
    code?: string;

    @Field(_ => User)
    @prop({ ref: () => User })
    userId!: Ref<User>;

    @Field()
    @prop({ unique: true })
    uuid!: string;

    @Field(() => [GraphQLByte], { nullable: true })
    @prop({ unique: false, default: [] })
    images?: typeof GraphQLByte[];

    @Field(() => [String], { nullable: true })
    @prop({ unique: false, default: [] })
    imagesComponents?: string[];
};
