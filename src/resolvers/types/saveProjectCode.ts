import { InputType, Field } from 'type-graphql';

@InputType()
export class saveProjectCode {
    @Field()
    code: string;

    @Field()
    id: string;
};
