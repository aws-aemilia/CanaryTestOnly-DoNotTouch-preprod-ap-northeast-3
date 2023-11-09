import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  paginateScan,
  paginateQuery,
} from "@aws-sdk/lib-dynamodb";
import { Credentials, Provider } from "@aws-sdk/types";
import { BranchDO, BranchDOJava } from "../types";
import {
  controlPlaneAccount,
  getIsengardCredentialsProvider,
  Region,
  Stage,
} from "Commons/Isengard";

export class BranchDAO {
  private tableName: string;
  private dynamoDBClient: DynamoDBClient;
  private documentClient: DynamoDBDocumentClient;

  constructor(
    private stage: string,
    private region: string,
    credentials?: Provider<Credentials>
  ) {
    this.tableName = `${this.stage}-${this.region}-Branch`;
    this.dynamoDBClient = new DynamoDBClient({
      region: this.region,
      credentials,
    });
    this.documentClient = DynamoDBDocumentClient.from(this.dynamoDBClient);
  }

  static async buildDefault(stage: string, region: string): Promise<BranchDAO> {
    return new BranchDAO(
      stage,
      region,
      getIsengardCredentialsProvider(
        (await controlPlaneAccount(stage as Stage, region as Region)).accountId,
        "FullReadOnly"
      )
    );
  }

  public async getBranch({
    appId,
    branchName,
  }: {
    appId: string;
    branchName: string;
  }): Promise<BranchDO | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          appId,
          branchName,
        },
      })
    );

    if (!result.Item) {
      return undefined;
    }
    return result.Item as BranchDO;
  }

  /**
   * Returns an iterator to paginate the LambdaEdgeConfig table. You can use the iterator
   * with `for await (const batch of paginateLambdaEdgeConfigs())`. Each batch will contain
   * a list of items. It uses lazy loading so it doesn't consume the next page
   * until the iterator reaches the end.
   *
   * @param documentClient DynamoDB document client
   * @param attributesToGet i.e. ["appId", "platform"]
   *
   * @returns Iterator of pages
   */
  public paginate = (attributesToGet?: string[]) => {
    return paginateScan(
      {
        pageSize: 1000,
        client: this.documentClient,
      },
      {
        TableName: this.tableName,
        ProjectionExpression: attributesToGet?.join(","),
      }
    );
  };

  /**
   * Returns all branches for a given appId, it paginates until
   * all branches are fetched.
   *
   * @param appId AppId to fetch branches for
   * @returns List of BranchDOs
   */
  public async listBranchesByAppId(appId: string): Promise<BranchDO[]> {
    const pages = paginateQuery(
      {
        client: this.documentClient,
        pageSize: 1000,
      },
      {
        TableName: this.tableName,
        KeyConditionExpression: "appId = :appId",
        ExpressionAttributeValues: {
          ":appId": appId,
        },
      }
    );

    const branches: BranchDO[] = [];

    for await (const page of pages) {
      for (const item of page.Items ?? []) {
        branches.push(item as BranchDO);
      }
    }

    return branches;
  }

  /**
   * In DynamoDB BranchDO booleans are stored as numbers but BranchDO in Java
   * parses them as booleans.
   * This is useful for creating messages for SQS queues
   */
  public mapToJavaType(branch: BranchDO): BranchDOJava {
    const config = branch.config;
    const branchConfigJava = {
      ...branch.config,
      ...{
        ejected: Boolean(config.ejected),
        enableNotification: Boolean(config.enableNotification),
        enableAutoBuild: Boolean(config.enableAutoBuild),
        enableBasicAuth: Boolean(config.enableBasicAuth),
        enablePullRequestPreview: Boolean(config.enablePullRequestPreview),
        enablePerformanceMode: Boolean(config.enablePerformanceMode),
      },
    };

    return {
      ...branch,
      deleting: Boolean(branch.deleting),
      pullRequest: Boolean(branch.pullRequest),
      config: branchConfigJava,
      associatedResources:
        branch.associatedResources &&
        Array.from<string>(branch.associatedResources),
    };
  }
}
