import {
    Length
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class changePassword {
    @Field()
    token: string;
    
    @Field()
    @Length(3, 50)
    newPassword: string;
};
