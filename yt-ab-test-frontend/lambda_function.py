import json
import boto3
import requests
import os
from datetime import datetime, timedelta
import uuid
import urllib.parse

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
users_table = dynamodb.Table('youtube-users')
tests_table = dynamodb.Table('youtube-ab-tests')
results_table = dynamodb.Table('youtube-test-results')

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '675041722756-the41dabp1cv757ip1t5uem9fmqe9jk9.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', 'GOCSPX-ySMCGL0LoeD4ixzE-30jGJr4-eG')
REDIRECT_URI = 'https://main.dsdpk99revgwl.amplifyapp.com'

def lambda_handler(event, context ):
    headers = {
        'Access-Control-Allow-Origin': 'https://main.dsdpk99revgwl.amplifyapp.com',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-YouTube-Channel-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    path = event.get('path', '/' )
    method = event['httpMethod']
    
    try:
        if path == '/auth' and method == 'GET':
            return handle_auth_redirect(headers )
        elif path == '/auth/callback' and method == 'GET':
            return handle_auth_callback(event, headers)
        
        # For all other endpoints, require authentication
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'No valid token'})}
        
        access_token = auth_header.replace('Bearer ', '')
        
        # Get user info from Google
        user_response = requests.get(f'https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}' )
        if user_response.status_code != 200:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Invalid token'})}
        
        user_info = user_response.json()
        user_id = user_info['id']
        
        # Get selected channel ID from header
        selected_channel_id = event.get('headers', {}).get('X-YouTube-Channel-Id')
        
        if path == '/channels' and method == 'GET':
            return handle_get_channels(access_token, user_id, headers)
        elif path == '/channels/select' and method == 'POST':
            return handle_select_channel(json.loads(event['body']), user_id, headers)
        elif path == '/videos' and method == 'GET':
            if not selected_channel_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No channel selected'})}
            return handle_get_videos(access_token, selected_channel_id, headers)
        elif path == '/tests' and method == 'GET':
            if not selected_channel_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No channel selected'})}
            return handle_get_tests(user_id, selected_channel_id, headers)
        elif path == '/tests' and method == 'POST':
            if not selected_channel_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No channel selected'})}
            return handle_create_test(json.loads(event['body']), user_id, selected_channel_id, headers)
        else:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'message': 'API is running', 'needsChannel': not selected_channel_id})}
            
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Server error: {str(e)}'})}

def handle_auth_redirect(headers):
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"scope=openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl&"
        f"response_type=code&"
        f"access_type=offline"
     )
    
    return {
        'statusCode': 302,
        'headers': {**headers, 'Location': auth_url},
        'body': ''
    }

def handle_auth_callback(event, headers):
    try:
        query_params = event.get('queryStringParameters', {}) or {}
        code = query_params.get('code')
        error = query_params.get('error')
        
        if error:
            return {
                'statusCode': 302,
                'headers': {**headers, 'Location': f'{REDIRECT_URI}?error={error}'},
                'body': ''
            }
        
        if not code:
            return {
                'statusCode': 302,
                'headers': {**headers, 'Location': f'{REDIRECT_URI}?error=no_code'},
                'body': ''
            }
        
        # Exchange code for tokens
        token_response = requests.post('https://oauth2.googleapis.com/token', data={
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI
        } )
        
        if token_response.status_code != 200:
            return {
                'statusCode': 302,
                'headers': {**headers, 'Location': f'{REDIRECT_URI}?error=token_exchange_failed'},
                'body': ''
            }
        
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        if not access_token:
            return {
                'statusCode': 302,
                'headers': {**headers, 'Location': f'{REDIRECT_URI}?error=no_access_token'},
                'body': ''
            }
        
        # Encode token for URL safety
        encoded_token = urllib.parse.quote(access_token.encode('utf-8').hex())
        
        return {
            'statusCode': 302,
            'headers': {**headers, 'Location': f'{REDIRECT_URI}?success=true&token={encoded_token}'},
            'body': ''
        }
        
    except Exception as e:
        return {
            'statusCode': 302,
            'headers': {**headers, 'Location': f'{REDIRECT_URI}?error=callback_error'},
            'body': ''
        }

def handle_get_channels(access_token, user_id, headers):
    try:
        # Get user's YouTube channels
        channels_response = requests.get(
            'https://www.googleapis.com/youtube/v3/channels',
            params={
                'part': 'snippet,statistics',
                'mine': 'true',
                'access_token': access_token
            }
         )
        
        if channels_response.status_code != 200:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Failed to fetch channels'})}
        
        channels_data = channels_response.json()
        channels = []
        
        for channel in channels_data.get('items', []):
            channels.append({
                'id': channel['id'],
                'title': channel['snippet']['title'],
                'thumbnail': channel['snippet']['thumbnails']['default']['url'],
                'subscriberCount': channel['statistics'].get('subscriberCount', '0'),
                'videoCount': channel['statistics'].get('videoCount', '0')
            })
        
        # Get user's selected channel preference
        try:
            user_data = users_table.get_item(Key={'userId': user_id})
            selected_channel_id = user_data.get('Item', {}).get('selectedChannelId')
        except:
            selected_channel_id = None
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'channels': channels,
                'selectedChannelId': selected_channel_id
            })
        }
        
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to fetch channels: {str(e)}'})}

def handle_select_channel(body, user_id, headers):
    try:
        channel_id = body.get('channelId')
        if not channel_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Channel ID required'})}
        
        # Save user's channel selection
        users_table.put_item(
            Item={
                'userId': user_id,
                'selectedChannelId': channel_id,
                'updatedAt': datetime.utcnow().isoformat()
            }
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Channel selected successfully'})
        }
        
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to select channel: {str(e)}'})}

def handle_get_videos(access_token, channel_id, headers):
    try:
        videos_response = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'part': 'snippet',
                'channelId': channel_id,
                'type': 'video',
                'order': 'date',
                'maxResults': 20,
                'access_token': access_token
            }
         )
        
        if videos_response.status_code != 200:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Failed to fetch videos'})}
        
        videos_data = videos_response.json()
        videos = []
        
        for video in videos_data.get('items', []):
            videos.append({
                'id': video['id']['videoId'],
                'title': video['snippet']['title'],
                'thumbnail': video['snippet']['thumbnails']['medium']['url'],
                'publishedAt': video['snippet']['publishedAt']
            })
        
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'videos': videos})}
        
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to fetch videos: {str(e)}'})}

def handle_get_tests(user_id, channel_id, headers):
    try:
        response = tests_table.query(
            IndexName='UserChannelIndex',
            KeyConditionExpression='userId = :uid AND channelId = :cid',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':cid': channel_id
            }
        )
        
        tests = response.get('Items', [])
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'tests': tests})}
        
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to fetch tests: {str(e)}'})}

def handle_create_test(body, user_id, channel_id, headers):
    try:
        test_id = str(uuid.uuid4())
        
        test_item = {
            'testId': test_id,
            'userId': user_id,
            'channelId': channel_id,
            'videoId': body['videoId'],
            'originalTitle': body['originalTitle'],
            'newTitle': body['newTitle'],
            'status': 'active',
            'createdAt': datetime.utcnow().isoformat()
        }
        
        tests_table.put_item(Item=test_item)
        
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'message': 'Test created successfully', 'testId': test_id})}
        
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f'Failed to create test: {str(e)}'})}
