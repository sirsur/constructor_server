import {
    Length
} from 'class-validator';
import { InputType, Field } from 'type-graphql';

@InputType()
export class changeUsername {
    @Field()
    @Length(3, 100)
    newName: string;

    @Field()
    @Length(3, 100)
    oldName: string;
};
