import {
    IsEmail
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class forgotPassword {
    @Field()
    @IsEmail()
    emailLink: string;
};
