import {
    Length
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class addProject {
    @Field()
    @Length(3, 100)
    name: String;
};
