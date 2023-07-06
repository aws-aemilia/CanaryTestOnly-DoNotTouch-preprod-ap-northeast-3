export interface LambdaEdgeConfig {
  appId: string;
  customDomainIds: Set<string>;
  customRuleConfigs?: CustomRuleConfig[];
  updateTime: string;
  createTime: string;
  branchConfig?: {
    [branchName: string]: BranchConfig;
  };
  config: {
    customHeaders: string;
  };
}

export interface BranchConfig {
  activeJobId: string;
  branchName: string;
  customHeaders: string;
  enableBasicAuth: string;
  performanceMode: string;
}

export interface CustomRuleConfig {
  target: string;
  source: string;
  status: string;
  condition?: string;
}

export interface DynamoDBAttributeName {
  attributeName: string;
  ExpressionAttributeNames: {
    [key: string]: string;
  };
}

export interface AppDO extends AppDOBase {
  enableAutoBranchDeletion: number;
  enableCustomHeadersV2: number;
  enableBranchAutoBuild: number;
  autoBranchCreationConfig?: {
    stage?: string;
    branchConfig: {
      enableAutoBuild: number;
      enableBasicAuth: number;
      enablePullRequestPreview: number;
    };
  };
  enableRewriteAndRedirect: number;
  enableAutoBranchCreation: number;
  enableBasicAuth: number;
}

export interface AppDOJava extends AppDOBase {
  enableBranchAutoBuild: boolean;
  enableAutoBranchDeletion: boolean;
  autoBranchCreationConfig?: {
    stage?: string;
    branchConfig: {
      enableAutoBuild: boolean;
      enableBasicAuth: boolean;
      enablePullRequestPreview: boolean;
    };
  };
  enableBasicAuth: boolean;
  enableRewriteAndRedirect: boolean;
  enableCustomHeadersV2: boolean;
  enableAutoBranchCreation: boolean;
}

interface AppDOBase {
  defaultDomain: string;
  cloudFrontDistributionId: string;
  autoBranchCreationPatterns: string[];
  name: string;
  repository: string;
  version: number;
  iamServiceRoleArn: string;
  accountId: string;
  accountClosureStatus?: string;
  certificateArn: string;
  createTime: string;
  hostingBucketName: string;
  buildSpec: string;
  cloneUrl: string;
  platform: "WEB" | "WEB_DYNAMIC" | "WEB_COMPUTE";
  updateTime: string;
  appId: string;
  environmentVariables: {
    [key: string]: string;
  };
}

export interface DomainDO {
  appId: string;
  domainName: string;
  enableAutoSubDomain: number;
  certificateVerificationRecord: string;
  status: string;
  distributionId: string;
  createTime: string;
  subDomainDOs: SubdomainDO[];
  updateTime: string;
  domainId: string;
  domainType: string;
  version: number;
}

export interface SubdomainDO {
  domainRecord: string;
  verified: number;
  branch: string;
}

export interface BranchDO extends BranchDOBase {
  deleting: number;
  pullRequest: number;
  config: BranchDOBranchConfig;
}

export interface BranchDOJava extends BranchDOBase {
  deleting: boolean;
  pullRequest: boolean;
  config: BranchDOBranchConfigJava;
}

interface BranchDOBase {
  appId: string;
  branchName: string;
  activeJobId: string;
  branchArn: string;
  createTime: string;
  description: string;
  displayName: string;
  stage: string;
  totalNumberOfJobs: string;
  ttl: string;
  updateTime: string;
  version: number;
}

export interface BranchDOBranchConfig {
  hostBucket: string;
  ejected: number;
  enableNotification: number;
  snsTopicArn: string;
  environmentVariables: Map<string, string>;
  enableAutoBuild: number;
  enableBasicAuth: number;
  basicAuthCredsV2: string;
  enablePullRequestPreview: number;
  pullRequestEnvironmentName: string;
  enablePerformanceMode: number;
  version: number;
}

export interface BranchDOBranchConfigJava {
  hostBucket: string;
  ejected: boolean;
  enableNotification: boolean;
  snsTopicArn: string;
  environmentVariables: Map<string, string>;
  enableAutoBuild: boolean;
  enableBasicAuth: boolean;
  basicAuthCredsV2: string;
  enablePullRequestPreview: boolean;
  pullRequestEnvironmentName: string;
  enablePerformanceMode: boolean;
  version: number;
}
