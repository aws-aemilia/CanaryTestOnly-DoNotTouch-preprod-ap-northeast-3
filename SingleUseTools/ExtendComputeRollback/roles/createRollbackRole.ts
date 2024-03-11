import {
  dataPlaneAccounts,
  preflightCAZForAdministrativeIsengardCalls,
} from "Commons/Isengard";
import { upsertRole } from "Commons/Isengard/roles/upsertRole";
import logger from "Commons/utils/logger";

/**
 * One time use script to create the ExtendComputeRollback role
 */
async function main() {
  const accounts = await dataPlaneAccounts();
  await preflightCAZForAdministrativeIsengardCalls(accounts);

  for (const account of accounts) {
    logger.info(account, "Upserting role");
    await upsertRole(account.accountId, {
      IAMRoleName: "ExtendComputeRollback",
      Description: "Role used to rollback ExtendCompute release",
      ContingentAuth: 1,
      PolicyTemplateReference: [
        {
          OwnerID: "aws-mobile-amplify-oncall",
          PolicyTemplateName: "ExtendComputeRollback",
        },
      ],
      PosixGroups: ["aws-mobile-amplify-oncall"],
      FederationTimeOutMin: 60,
    });
  }
}

main()
  .then(() => logger.info("Done"))
  .catch((err) => logger.error(err));