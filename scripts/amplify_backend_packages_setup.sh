#!/bin/bash
set -e -o pipefail #terminate on first failure

# Constants
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Deploy a local version of the AWS Amplify Console service
# See https://w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/DevelopmentRunbook/#HUsingdeployscript
# TODO update the following values
ACCOUNT_ID="YOUR_ACCOUNT_ID_HERE" # e.g. 123456789123
USER_ALIAS="YOUR_ALIAS_HERE" # e.g. bradruof - not sure what is your alias?  Check https://phonetool.amazon.com/ --- (redirects to) ---> https://phonetool.amazon.com/users/<YOUR_ALIAS_HERE>
RAINBOW_MODE="no" # Wonder what happens if you change this to 'yes'... 🌈.

# $1 = The message: "Deploy <service>: BEGIN"
# $2 = Workspace name:
# $3 = Package name: 
# $4 = Versionset name:
function download_and_build_package() {
    echo -e echo -e "${GREEN}Setup $3: BEGIN${NC}"
        if [[ ! -d "$2/src/$3" ]]; then
            echo -e "${YELLOW}Creating workspace and adding required packages${NC}"
            brazil ws --create -n $2 -vs $4
            cd $2
            brazil ws --use -p $3

        # Update the model package for Control Plane
        if [ "$2/src/$3" = "AemiliaControlPlaneLambda/src/AemiliaControlPlaneLambda" ]; then
            brazil ws --use -p "AemiliaControlPlaneLambdaModel"
            cd "src/AemiliaControlPlaneLambdaModel"

            # 💥Need to set this to false in order to deploy locally - NEVER CHECK IN THIS CHANGE! 💥 #
            sed -i 's/"enableCloudTrail": "true"/"enableCloudTrail": "false"/g' build.json
            sed -i 's/"enableTagging": true/"enableTagging": false/g' build.json
            cd ../../
        fi

        cd "src/$3"
    else
        cd "$2/src/$3"
    fi

    brazil ws clean
    brazil ws --sync --md
    if [[ $RAINBOW_MODE = "yes" ]]
    then
        brazil-recursive-cmd "brazil-build-rainbow"
    else
        brazil-recursive-cmd "brazil-build"
    fi

    sed -i "s/YOUR_ACCOUNT_ID_HERE/$(echo ${ACCOUNT_ID})/g" SAMToolkit.devenv
    sed -i "s/YOUR_ALIAS_HERE/$(echo ${USER_ALIAS})/g" SAMToolkit.devenv

    echo -e "${GREEN}Deploy $3: SUCCESS${NC}"l
    cd ../../..
}


# Setup
echo -e "${GREEN}Ref: https://w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/DevelopmentRunbook/#HUsingdeployscript${NC}"
echo -e "${YELLOW}This tool will setup your workspace, download all the necessary packages, and update the your SAM files${NC}"
echo -e "${YELLOW}This tool will not do the deployment!  In order to deploy use the deployment script 'amplify_backend_packages_deploy.sh'${NC}"
set -x #echo commands

# Making common directory and navigating inside
if [[ ! -d "AMPLIFY" ]]; then
    mkdir AMPLIFY
fi
cd AMPLIFY

##### Deployment order matters ##### --> # download packages and update SAM files
download_and_build_package "Setup webhook processor: BEGIN" "AemiliaWebhookProcessorLambda" "AemiliaWebhookProcessorLambda" "AemiliaWebhookProcessorLambda/development"
download_and_build_package "Deploy dynamodb stream: BEGIN" "AemiliaDynamoDBStreamLambda" "AemiliaDynamoDBStreamLambda" "AemiliaDynamoDBStreamLambda/development"
download_and_build_package "Deploy control plane: BEGIN" "AemiliaControlPlaneLambda" "AemiliaControlPlaneLambda" "AemiliaControlPlaneLambda/development"
download_and_build_package "Deploy workers lambda: BEGIN" "AemiliaWorkersLambda" "AemiliaWorkersLambda" "AemiliaWorkersLambda/development"
download_and_build_package "Deploy warming pool: BEGIN" "AemiliaWarmingPoolInfrastructure" "AemiliaWarmingPool" "AemiliaWarmingPoolInfrastructure/development"
#download_and_build_package "Deploy edge lambda: BEGIN" "AemiliaEdgeLambda" "AemiliaEdgeLambda" # Maybe one day 🙄 - Amazon Linux 2 x86_64

echo -e "${GREEN}ALL ITEMS COMPLETE. SCRIPT END.${NC}"