import {
  Field,
  FieldOptions,
  InputType,
  Mutation,
  ObjectType,
  Query,
  ResolveField,
  ReturnTypeFunc,
} from "@nestjs/graphql";
import { IPaginateResult, IPaginateOptions } from "typegoose-cursor-pagination";

@ObjectType()
export class RelayPageInfo {
  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;

  @Field()
  hasPreviousPage: boolean;

  @Field()
  hasNextPage: boolean;

  @Field()
  totalDocs: number;
}

export interface IRelayConnection<NodeValue> {
  pageInfo: RelayPageInfo;
  edges: NodeValue[];
}

@InputType()
export class RelayConnectionArgs {
  @Field({ nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  last?: number;

  @Field({ nullable: true })
  before?: string;
}

export const createConnectionArgs = (
  pagingArgs: RelayConnectionArgs,
  options?: Partial<IPaginateOptions>,
): IPaginateOptions => ({
  limit: pagingArgs.first,
  next: pagingArgs.after,
  previous: pagingArgs.before,
  sortAscending: true,
  sortField: "_id",
  ...options,
});

export const createConnectionResult = <T>(
  values: T[],
  result: IPaginateResult<unknown>,
): IRelayConnection<T> => ({
  pageInfo: {
    endCursor: result.next,
    hasNextPage: result.hasNext ?? false,
    hasPreviousPage: result.hasPrevious ?? false,
    startCursor: result.previous,
    totalDocs: result.totalDocs,
  },
  edges: values,
});

type Constructor = { new (...args: any[]): any };

function createConnectionDecorator(
  FieldDecorator: (
    typeFunc?: ReturnTypeFunc,
    options?: FieldOptions,
  ) => MethodDecorator,
) {
  return function <T extends Constructor>(
    nodeClassRefFunc: ReturnTypeFunc,
    options?: FieldOptions,
  ): MethodDecorator {
    return (
      TargetClass: object,
      key: string | symbol,
      descriptor: PropertyDescriptor,
    ) => {
      const nodeClassRef = nodeClassRefFunc() as symbol;

      // TODO: Change `nodeClassRef.description` to corresponding name. Because it's not always the same as class name. e.g. @ObjectType('ThisName')
      @ObjectType(`${nodeClassRef.description}Connection`)
      class ConnectionObjectType implements IRelayConnection<T> {
        @Field(() => RelayPageInfo)
        pageInfo: RelayPageInfo;

        @Field(() => [nodeClassRef])
        edges: T[];
      }

      FieldDecorator(() => ConnectionObjectType, options)(
        TargetClass,
        key,
        descriptor,
      );
    };
  };
}

export const ResolveConnectionField = createConnectionDecorator(ResolveField);
export const QueryConnectionField = createConnectionDecorator(Query);
export const MutationConnectionField = createConnectionDecorator(Mutation);
