import { Stage } from "../types";
import { AmplifyRole } from "./upsertRole";

const POSIX_GROUP = "aws-mobile-amplify-oncall";

const oncallOperatorRole: AmplifyRole = {
  IAMRoleName: "OncallOperator",
  Description:
    "The OncallOperator role has limited write permissions that cover the usual oncall operations. Do not use this role if you need read-only access",
  ContingentAuth: 1,
  PolicyARNs: [
    "arn:aws:iam::aws:policy/ReadOnlyAccess",
    (accountId: string) =>
      `arn:aws:iam::${accountId}:policy/AmplifyIsengard-OncallOperator`,
  ],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 15,
};

export const adminRoleFn = (stage: Stage): AmplifyRole => ({
  IAMRoleName: "Admin",
  Description:
    "The Admin role is a highly permissive role that has *.* policy. Use with extreme caution and only for emergencies",
  ContingentAuth: 2,
  PolicyARNs: ["arn:aws:iam::aws:policy/AdministratorAccess"],
  PosixGroups: stage === "prod" ? [] : [POSIX_GROUP],
  FederationTimeOutMin: 15,
});

export const releaseDomainRole: AmplifyRole = {
  IAMRoleName: "ReleaseCustomDomain",
  Description:
    "To run ops tool to release a custom domain from a suspended AWS account",
  ContingentAuth: 1,
  PolicyTemplateReference: [
    {
      OwnerID: "aws-mobile-amplify-oncall",
      PolicyTemplateName: "ReleaseCustomDomain",
    },
  ],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 15,
};

const readOnlyRole: AmplifyRole = {
  IAMRoleName: "ReadOnly",
  Description:
    "The ReadOnly role does not allow mutations and does not have access to customer data. Use this role if you want to be safe.",
  ContingentAuth: 0,
  PolicyTemplateReference: [
    {
      OwnerID: "harp-sec",
      PolicyTemplateName: "StandardAuthorizationRolePolicy",
    },
  ],
  PolicyARNs: [
    (accountId: string) =>
      `arn:aws:iam::${accountId}:policy/AmplifyIsengard-ReadOnlyExtra`,
  ],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 90,
};

const fullReadOnlyRole: AmplifyRole = {
  IAMRoleName: "FullReadOnly",
  Description:
    "The FullReadOnly role does not allow mutations. Use this role for read-only operations that need access to customer data",
  ContingentAuth: 1,
  PolicyARNs: ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 60,
};

const lambdaInvokerRole: AmplifyRole = {
  IAMRoleName: "LambdaInvoker",
  Description: "Role to see Hydra test results",
  ContingentAuth: 1,
  PolicyARNs: [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
    "arn:aws:iam::aws:policy/ReadOnlyAccess",
  ],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 60,
};

const mobileCoreSupportRole: AmplifyRole = {
  IAMRoleName: "MobileCoreSupport",
  Description: "For mobile core support team to access build logs",
  ContingentAuth: 1,
  PosixGroups: [
    "support-ops-mobile-core", // https://permissions.amazon.com/group.mhtml?group=support-ops-mobile-core&group_type=posix
    "aws-amplify-hosting-dxe", // https://permissions.amazon.com/group.mhtml?group=aws-amplify-hosting-dxe&group_type=posix
  ],
  FederationTimeOutMin: 60,
  PolicyTemplateReference: [
    {
      OwnerID: "aws-mobile-amplify-oncall",
      PolicyTemplateName: "MobileCoreSupport",
    },
  ],
};

const bonesBootstrapRole: AmplifyRole = {
  IAMRoleName: "BONESBootstrap",
  Description: "",
  ContingentAuth: 1,
  PolicyTemplateReference: [
    {
      OwnerID: "isen",
      PolicyTemplateName: "BONESBootstrapUserPolicy",
    },
  ],
  PolicyARNs: [],
  PosixGroups: [POSIX_GROUP],
  FederationTimeOutMin: 60,
};

export const getRolesForStage = (
  stage: Stage
): {
  ReadOnly: AmplifyRole;
  OncallOperator: AmplifyRole;
  FullReadOnly: AmplifyRole;
  Admin: AmplifyRole;
  LambdaInvoker: AmplifyRole;
  MobileCoreSupport: AmplifyRole;
  ReleaseCustomDomain: AmplifyRole;
  BONESBootstrap: AmplifyRole;
} => {
  return {
    OncallOperator: oncallOperatorRole,
    Admin: adminRoleFn(stage),
    ReadOnly: readOnlyRole,
    FullReadOnly: fullReadOnlyRole,
    LambdaInvoker: lambdaInvokerRole,
    MobileCoreSupport: mobileCoreSupportRole,
    ReleaseCustomDomain: releaseDomainRole,
    BONESBootstrap: bonesBootstrapRole,
  };
};
