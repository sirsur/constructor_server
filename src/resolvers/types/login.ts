import {
    Length
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class login {
    @Field()
    @Length(3, 50)
    username: string;

    @Field()
    @Length(3, 50)
    password: string;
};
