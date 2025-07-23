#!/bin/bash

# YouTube A/B Testing Tool - Backend Deployment Script
# This script automates the deployment of the FastAPI backend to AWS Lambda

set -e  # Exit on any error

# Configuration
REGION="us-east-1"
FUNCTION_NAME="youtube-ab-test"
REPOSITORY_NAME="youtube-ab-test"
ROLE_NAME="youtube-ab-test-lambda-role"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting YouTube A/B Testing Tool Backend Deployment${NC}"

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are installed${NC}"
}

# Get AWS account ID
get_account_id() {
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}📋 AWS Account ID: $ACCOUNT_ID${NC}"
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    echo -e "${YELLOW}🏗️  Creating ECR repository...${NC}"
    
    if aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION &> /dev/null; then
        echo -e "${GREEN}✅ ECR repository already exists${NC}"
    else
        aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION
        echo -e "${GREEN}✅ ECR repository created${NC}"
    fi
    
    REPOSITORY_URI=$(aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
    echo -e "${GREEN}📋 Repository URI: $REPOSITORY_URI${NC}"
}

# Build and push Docker image
build_and_push_image() {
    echo -e "${YELLOW}🐳 Building and pushing Docker image...${NC}"
    
    # Get login token for ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPOSITORY_URI
    
    # Build the Docker image
    cd backend
    docker build -t $REPOSITORY_NAME .
    
    # Tag the image for ECR
    docker tag $REPOSITORY_NAME:latest $REPOSITORY_URI:latest
    
    # Push the image to ECR
    docker push $REPOSITORY_URI:latest
    
    echo -e "${GREEN}✅ Docker image built and pushed${NC}"
    cd ..
}

# Create IAM role if it doesn't exist
create_iam_role() {
    echo -e "${YELLOW}🔐 Creating IAM role...${NC}"
    
    if aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
        echo -e "${GREEN}✅ IAM role already exists${NC}"
    else
        # Create trust policy
        cat > lambda-trust-policy.json << EOFPOLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOFPOLICY

        # Create the IAM role
        aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://lambda-trust-policy.json
        
        # Attach basic Lambda execution policy
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Create and attach DynamoDB policy
        cat > dynamodb-policy.json << EOFPOLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:$REGION:*:table/youtube_ab_*"
    }
  ]
}
EOFPOLICY

        aws iam create-policy --policy-name youtube-ab-test-dynamodb-policy --policy-document file://dynamodb-policy.json
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/youtube-ab-test-dynamodb-policy
        
        echo -e "${GREEN}✅ IAM role created${NC}"
        
        # Clean up temporary files
        rm lambda-trust-policy.json dynamodb-policy.json
    fi
}

# Create or update Lambda function
create_lambda_function() {
    echo -e "${YELLOW}⚡ Creating/updating Lambda function...${NC}"
    
    # Check if environment variables are set
    if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        echo -e "${RED}❌ Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables${NC}"
        exit 1
    fi
    
    if aws lambda get-function --function-name $FUNCTION_NAME &> /dev/null; then
        # Update existing function
        aws lambda update-function-code --function-name $FUNCTION_NAME --image-uri $REPOSITORY_URI:latest
        
        # Update environment variables
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment Variables="{
                \"GOOGLE_CLIENT_ID\":\"$GOOGLE_CLIENT_ID\",
                \"GOOGLE_CLIENT_SECRET\":\"$GOOGLE_CLIENT_SECRET\",
                \"AWS_REGION\":\"$REGION\"
            }"
        
        echo -e "${GREEN}✅ Lambda function updated${NC}"
    else
        # Create new function
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --package-type Image \
            --code ImageUri=$REPOSITORY_URI:latest \
            --role arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \
            --timeout 30 \
            --memory-size 512 \
            --environment Variables="{
                \"GOOGLE_CLIENT_ID\":\"$GOOGLE_CLIENT_ID\",
                \"GOOGLE_CLIENT_SECRET\":\"$GOOGLE_CLIENT_SECRET\",
                \"AWS_REGION\":\"$REGION\"
            }"
        
        echo -e "${GREEN}✅ Lambda function created${NC}"
    fi
}

# Create API Gateway
create_api_gateway() {
    echo -e "${YELLOW}🌐 Setting up API Gateway...${NC}"
    
    # Check if API already exists
    API_ID=$(aws apigateway get-rest-apis --query "items[?name=='youtube-ab-test-api'].id" --output text)
    
    if [ "$API_ID" != "" ] && [ "$API_ID" != "None" ]; then
        echo -e "${GREEN}✅ API Gateway already exists with ID: $API_ID${NC}"
    else
        # Create REST API
        API_ID=$(aws apigateway create-rest-api --name youtube-ab-test-api --description "YouTube A/B Testing Tool API" --query 'id' --output text)
        
        # Get the root resource ID
        ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)
        
        # Create a proxy resource
        PROXY_RESOURCE_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_RESOURCE_ID --path-part '{proxy+}' --query 'id' --output text)
        
        # Create ANY method for the proxy resource
        aws apigateway put-method --rest-api-id $API_ID --resource-id $PROXY_RESOURCE_ID --http-method ANY --authorization-type NONE
        
        # Set up Lambda integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $PROXY_RESOURCE_ID \
            --http-method ANY \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME/invocations
        
        # Add permission for API Gateway to invoke Lambda
        aws lambda add-permission \
            --function-name $FUNCTION_NAME \
            --statement-id apigateway-invoke \
            --action lambda:InvokeFunction \
            --principal apigateway.amazonaws.com \
            --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" || true
        
        echo -e "${GREEN}✅ API Gateway created with ID: $API_ID${NC}"
    fi
    
    # Deploy the API
    aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod
    
    API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
    echo -e "${GREEN}🌐 API Gateway URL: $API_URL${NC}"
}

# Main deployment function
main( ) {
    echo -e "${GREEN}Starting deployment process...${NC}"
    
    check_dependencies
    get_account_id
    create_ecr_repository
    build_and_push_image
    create_iam_role
    create_lambda_function
    create_api_gateway
    
    echo -e "${GREEN}🎉 Backend deployment completed successfully!${NC}"
    echo -e "${GREEN}📋 API Gateway URL: https://$API_ID.execute-api.$REGION.amazonaws.com/prod${NC}"
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo -e "   1. Update your Google OAuth redirect URI to include: https://$API_ID.execute-api.$REGION.amazonaws.com/prod/callback"
    echo -e "   2. Update the frontend configuration with the API Gateway URL"
    echo -e "   3. Deploy the frontend using the deploy-frontend.sh script"
}

# Run main function
main
