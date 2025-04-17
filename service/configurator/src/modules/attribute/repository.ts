import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createAttributeMutation = graphql(`
  mutation CreateAttribute($input: AttributeCreateInput!) {
    attributeCreate(input: $input) {
      attribute {
        id
        name
        type
        inputType
        entityType
        choices(first: 100) {
          edges {
            node {
              name
            }
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type AttributeCreateInput = VariablesOf<
  typeof createAttributeMutation
>["input"];

type AttributeFragment = NonNullable<
  NonNullable<
    NonNullable<ResultOf<typeof createAttributeMutation>>["attributeCreate"]
  >["attribute"]
>;

export type Attribute = AttributeFragment;

const getAttributesByNamesQuery = graphql(`
  query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum) {
    attributes(
      first: 100
      where: { name: { oneOf: $names }, type: { eq: $type } }
    ) {
      edges {
        node {
          id
          name
          type
          inputType
          entityType
          choices(first: 100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`);

export type GetAttributesByNamesInput = VariablesOf<
  typeof getAttributesByNamesQuery
>;

export interface AttributeOperations {
  createAttribute(attributeInput: AttributeCreateInput): Promise<Attribute>;
  getAttributesByNames(
    input: GetAttributesByNamesInput
  ): Promise<Attribute[] | null | undefined>;
}

export class AttributeRepository implements AttributeOperations {
  constructor(private client: Client) {}

  async createAttribute(
    attributeInput: AttributeCreateInput
  ): Promise<Attribute> {
    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    if (!result.data?.attributeCreate?.attribute) {
      throw new Error("Failed to create attribute");
    }

    logger.info("Attribute created", {
      name: result.data.attributeCreate.attribute.name,
    });

    return result.data.attributeCreate.attribute as Attribute;
  }

  async getAttributesByNames(input: GetAttributesByNamesInput) {
    const result = await this.client.query(getAttributesByNamesQuery, {
      names: input.names,
      type: input.type,
    });

    return result.data?.attributes?.edges?.map(
      (edge) => edge.node as Attribute
    );
  }
}
