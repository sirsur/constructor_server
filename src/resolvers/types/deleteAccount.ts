import {
    IsEmail
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class deleteAccount {
    @Field()
    @IsEmail()
    toEmail: string;
};
