import {
    Length,
    IsEmail
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class registration {
    @Field()
    @Length(3, 50)
    username: string;

    @Field()
    @IsEmail()
    email: string;

    @Field()
    @Length(3, 50)
    password: string;
};
