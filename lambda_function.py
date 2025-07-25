import json
import os
import urllib.parse
import urllib.request
import base64
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='os.environ.get("AWS_REGION", "us-east-1")')
tests_table = dynamodb.Table('youtube-ab-tests')

# Helper class to convert DynamoDB's Decimal types to JSON-serializable floats/ints
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    http_method = event.get('httpMethod', 'GET' )
    path = event.get('path', '/')
    query_params = event.get('queryStringParameters') or {}
    
    # --- Your actual Amplify Frontend URL ---
    # This is the URL the user is sent back to after logging in with Google.
    frontend_url = 'https://main.dsdpk99revgwl.amplifyapp.com'

    # --- API Gateway URL ---
    # This is the URL of the API itself, used for the OAuth callback.
    # It's constructed dynamically from the event for robustness.
    try:
        api_gateway_url = f"https://{event['requestContext']['domainName']}{event['requestContext']['path']}"
        # For a deployed stage, the stage name needs to be included.
        stage = event['requestContext'].get('stage' )
        if stage:
            api_gateway_url = f"https://{event['requestContext']['domainName']}/{stage}"
    except KeyError:
        # Fallback for local testing or if headers are not present
        api_gateway_url = 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod'

    # Standard headers for CORS and JSON content type
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle CORS preflight requests
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    def get_user_id_from_token(access_token ):
        try:
            user_info_url = f'https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}'
            req = urllib.request.Request(user_info_url )
            with urllib.request.urlopen(req) as response:
                user_data = json.loads(response.read().decode('utf-8'))
                return user_data.get('id')
        except Exception:
            return None
    
    def get_access_token(event):
        auth_header = event.get('headers', {}).get('Authorization', '')
        return auth_header[7:] if auth_header.startswith('Bearer ') else None

    # --- AUTHENTICATION ROUTES ---
    if path == '/login':
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        redirect_uri = f'{api_gateway_url}/callback'
        oauth_url = (
            f"https://accounts.google.com/o/oauth2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={urllib.parse.quote(redirect_uri )}&"
            f"scope=https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile&"
            f"response_type=code&"
            f"access_type=offline"
         )
        return {'statusCode': 302, 'headers': {'Location': oauth_url}}

    if path == '/callback':
        auth_code = query_params.get('code')
        if not auth_code:
            return {'statusCode': 302, 'headers': {'Location': f'{frontend_url}?error=no_auth_code'}}
        try:
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
            redirect_uri = f'{api_gateway_url}/callback'
            
            token_data = urllib.parse.urlencode({
                'code': auth_code, 'client_id': client_id, 'client_secret': client_secret,
                'redirect_uri': redirect_uri, 'grant_type': 'authorization_code'
            }).encode('utf-8')
            
            req = urllib.request.Request('https://oauth2.googleapis.com/token', data=token_data, method='POST' )
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            
            with urllib.request.urlopen(req) as response:
                token_response = json.loads(response.read().decode('utf-8'))
            
            access_token = token_response.get('access_token')
            if access_token:
                encoded_token = base64.urlsafe_b64encode(access_token.encode()).decode()
                return {'statusCode': 302, 'headers': {'Location': f'{frontend_url}?success=true&token={encoded_token}'}}
            else:
                raise Exception('No access token received from Google')
        except Exception as e:
            error_message = urllib.parse.quote(str(e))
            return {'statusCode': 302, 'headers': {'Location': f'{frontend_url}?error=token_exchange_failed&reason={error_message}'}}

    # --- API ROUTES (REQUIRE AUTH) ---
    access_token = get_access_token(event)
    if not access_token:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Missing or invalid authorization header'})}
    
    user_id = get_user_id_from_token(access_token)
    if not user_id:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Invalid access token'})}

    if path == '/videos' and http_method == 'GET':
        try:
            youtube_api_url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=25'
            req = urllib.request.Request(youtube_api_url )
            req.add_header('Authorization', f'Bearer {access_token}')
            with urllib.request.urlopen(req) as response:
                videos_data = json.loads(response.read().decode('utf-8'))
            videos = [{'id': item['id']['videoId'], 'title': item['snippet']['title'], 'thumbnail': item['snippet']['thumbnails']['medium']['url'], 'publishedAt': item['snippet']['publishedAt']} for item in videos_data.get('items', [])]
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'videos': videos})}
        except Exception as e:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to fetch videos: {str(e)}'})}

    if path == '/tests' and http_method == 'GET':
        try:
            response = tests_table.query(
                IndexName='UserIndex',
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': user_id}
             )
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(response['Items'], cls=DecimalEncoder)}
        except Exception as e:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to fetch tests: {str(e)}'})}

    if path == '/tests' and http_method == 'POST':
        try:
            body = json.loads(event.get('body', '{}' ))
            test_id = str(uuid.uuid4())
            test_item = {
                'testId': test_id, 'userId': user_id, 'videoId': body.get('videoId'),
                'videoTitle': body.get('videoTitle'), 'originalThumbnail': body.get('originalThumbnail'),
                'variantA': body.get('variantA'), 'variantB': body.get('variantB'),
                'status': 'active', 'createdAt': datetime.utcnow().isoformat(),
                'metrics': {'variantA': {'views': 0, 'clicks': 0}, 'variantB': {'views': 0, 'clicks': 0}}
            }
            tests_table.put_item(Item=test_item)
            return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'message': 'Test created', 'test': test_item})}
        except Exception as e:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to create test: {str(e)}'})}

    # Default root response for testing the API endpoint
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'message': 'API is running'})}

