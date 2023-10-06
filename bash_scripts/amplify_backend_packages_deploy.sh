#!/bin/bash
set -e -o pipefail #terminate on first failure

# Constants
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# $1 = The message: "SAM deploy <service>: BEGIN"
# $2 = Workspace name:
# $3 = Package name:
function deploy_local_package() {

    echo -e "${GREEN}SAM deploy $3: BEGIN${NC}"
    while true; do
    read -p "Do you wish to deploy this package? (y/n): " yn
    case $yn in
        [Yy] ) break;;
        [Nn] ) return;;
        * ) echo "Please answer y/n.";;
    esac
    done

    # Navigate into the directory to build
    cd "$2/src/$3"

    brazil-build-tool-exec sam package
    if [[ "$3" == "AemiliaContainer" ]]; then
        echo -e "${GREEN}Deleting aemilia-build-image repository images from ECR...${NC}"
        aws ecr list-images --repository-name aemilia-build-image --query "imageIds[].imageDigest" --output text | xargs -I{} aws ecr batch-delete-image --repository-name aemilia-build-image --image-ids imageDigest={}
        echo -e "${GREEN}Deleting aemilia-build-image repository from ECR${NC}"
        aws ecr delete-repository --repository-name aemilia-build-image
        brazil-build-tool-exec sam deploy
        brazil-build-tool-exec sam package
    else
        brazil-build-tool-exec sam deploy
    fi
    echo -e "${GREEN}Deploy SUCCESS${NC}"
    cd ../../..
}

# from https://code.amazon.com/packages/AmplifyHostingKinesisConsumerCDK/trees/mainline
function deploy_kinesis_consumer() {
  echo -e "${GREEN}CDK deploy AmplifyHostingKinesisConsumer: BEGIN${NC}"
  while true; do
  read -p "Do you wish to deploy this package? (y/n): " yn
  case $yn in
      [Yy] ) break;;
      [Nn] ) return;;
      * ) echo "Please answer y/n.";;
  esac
  done

  cd AmplifyHostingKinesisConsumer/src/AmplifyHostingKinesisConsumer
  export AMPLIFY_DEV_ENABLED=true
  export AMPLIFY_DEV_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
  export AMPLIFY_DEV_REGION=${AWS_DEFAULT_REGION:-us-west-2}
  export AMPLIFY_DEV_USER=$(whoami)
  export CONTROL_PLANE_ENDPOINT=https://$(aws apigateway get-rest-apis --query "items[?name=='Amplify'].id" --output text).execute-api.${AMPLIFY_DEV_REGION}.amazonaws.com/test
  aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin "${AMPLIFY_DEV_ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com"
  brazil-build
  brazil-build deploy:assets AmplifyHostingKinesisConsumer-${AMPLIFY_DEV_ACCOUNT_ID}-${AMPLIFY_DEV_REGION}-EcsService
  brazil-build cdk deploy AmplifyHostingKinesisConsumer-${AMPLIFY_DEV_ACCOUNT_ID}-${AMPLIFY_DEV_REGION}-EcsService
}


# Setup
if [[ `pwd` != */AMPLIFY ]]; then
 echo -e "${GREEN}Ref: https://w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/DevelopmentRunbook/#HUsingdeployscript${NC}"
 echo -e "${YELLOW}This tool assumes you are in the root 'AMPLIFY' directory created by 'amplify_backend_packages_setup.sh'.${NC}"
 echo -e "${YELLOW}If you haven't run that tool - run it first and cd into the 'AMPLIFY' directory.${NC}"
 exit;
fi

#set -x #echo commands

##### Deployment order matters ##### -->  do the SAM (local) deployment

# Step 1: Semi-Automated Deploy this first
deploy_local_package "Deploy webhook processor: BEGIN" "AemiliaWebhookProcessorLambda" "AemiliaWebhookProcessorLambda"
deploy_local_package "Deploy dynamodb stream: BEGIN" "AemiliaDynamoDBStreamLambda" "AemiliaDynamoDBStreamLambda"
deploy_local_package "Deploy workers lambda: BEGIN" "AemiliaWorkersLambda" "AemiliaWorkersLambda"
deploy_local_package "Deploy warming pool: BEGIN" "AemiliaWarmingPoolInfrastructure" "AemiliaWarmingPool"
deploy_local_package "Deploy control plane: BEGIN" "AemiliaControlPlaneLambda" "AemiliaControlPlaneLambda"

deploy_local_package "Deploy edge lambda: BEGIN" "AemiliaEdgeLambda" "AemiliaEdgeLambda"
deploy_local_package "Deploy edge lambda association: BEGIN" "AemiliaEdgeLambdaAssociationDeployerLambda" "AemiliaEdgeLambdaAssociationDeployerLambda"

# Step 3: Semi-Automated Deploy this last
deploy_local_package "Deploy pioneer execute: BEGIN" "AWSMobilePioneerExecute" "AWSMobilePioneerExecute"
deploy_local_package "Deploy container lambda: BEGIN" "AemiliaContainerLambda" "AemiliaContainerLambda"
deploy_local_package "Deploy containers: BEGIN" "AemiliaContainers" "AemiliaContainer"
deploy_kinesis_consumer

echo -e "${GREEN}ALL ITEMS COMPLETE. SCRIPT END.${NC}"
