import { CrtSignerV4 } from "@aws-sdk/signature-v4-crt";
import { Sha256 } from "@aws-crypto/sha256-js";
import { AwsCredentialIdentity, Provider } from "@aws-sdk/types";
import { getIsengardCredentialsProvider } from "../Isengard";
import logger from "../utils/logger";
import {
  CommentReference,
  TicketReference,
  Tickety,
  AccessDeniedException,
} from "@amzn/tickety-typescript-sdk";

// Full Tickety documentation can be found in:
// https://w.amazon.com/bin/view/IssueManagement/SIMTicketing/TicketyAPI/GettingStarted

export class TicketyService {
  private readonly tickety: Tickety;
  private readonly accountId: string = "Default";
  private readonly systemName: string = "Default";
  private readonly iamRole: string = "TicketyFullAccess";
  private readonly onboardedAccountId: string = "033345365959"; // aws-mobile-aemilia-beta@amazon.com

  constructor() {
    this.tickety = this.createTickety(
      getIsengardCredentialsProvider(this.onboardedAccountId, this.iamRole)
    );
  }

  async getTicket(ticketId: string): Promise<TicketReference | null> {
    try {
      const tt = await this.tickety.getTicket({
        ticketId: ticketId,
        awsAccountId: this.accountId,
        ticketingSystemName: this.systemName,
      });

      if (!tt.ticket) {
        return null;
      }

      return tt.ticket;
    } catch (e) {
      if (e instanceof AccessDeniedException) {
        logger.warn(e.message);
        return null;
      } else {
        throw e;
      }
    }
  }

  async getTicketComments(
    ticketId: string,
    commentType:
      | "ANNOUNCEMENTS"
      | "CORRESPONDENCE"
      | "WORKLOG" = "CORRESPONDENCE"
  ): Promise<CommentReference[]> {
    const comments = await this.tickety.getTicketComments({
      ticketId: ticketId,
      awsAccountId: this.accountId,
      ticketingSystemName: this.systemName,
      threadNames: [commentType],
      sortOrder: "desc",
      sortKey: "CREATE_DATE",
    });

    if (!comments.comments) {
      return [];
    }

    return comments.comments;
  }

  private createTickety(
    credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>
  ) {
    const signer = new CrtSignerV4({
      credentials,
      region: "*",
      service: "tickety",
      sha256: Sha256,
      applyChecksum: true,
      signingAlgorithm: 1,
      // There were issues with importing AwsSigningAlgorithm from @aws-sdk/signature-v4-crt, so we simply use the
      // enum index of 1. https://amzn-aws.slack.com/archives/C03RW574YQZ/p1688739515862139
    });

    return new Tickety({
      credentials: credentials,
      endpoint: "https://global.api.tickety.amazon.dev/",
      retryMode: "adaptive",
      signer,
    });
  }
}
