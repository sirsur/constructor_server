import { InputType, Field } from 'type-graphql';
import { GraphQLByte } from 'graphql-scalars';

@InputType()
export class setImage {
    @Field(() => GraphQLByte)
    image: typeof GraphQLByte;

    @Field()
    id: string;

    @Field()
    imageComponent: string;
};
