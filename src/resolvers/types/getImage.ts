import { InputType, Field } from 'type-graphql';

@InputType()
export class getImage {
    @Field()
    id: string;

    @Field()
    name: string;
};
