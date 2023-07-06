import { prop, Ref, getModelForClass } from "@typegoose/typegoose";
import * as mongoose from 'mongoose';

import { User } from "./user";

export class Token {
    readonly _id: mongoose.Types.ObjectId;

    @prop({ ref: () => User, unique: true, required: true })
    user: Ref<User>;

    @prop({ required: true })
    refreshToken: string;
};

export const TokenModel = getModelForClass(Token);
