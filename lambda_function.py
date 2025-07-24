import json
import os
import urllib.parse
import urllib.request
import base64

def lambda_handler(event, context ):
    # Handle different HTTP methods and paths
    http_method = event.get('httpMethod', 'GET' )
    path = event.get('path', '/')
    query_params = event.get('queryStringParameters') or {}
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # Handle OPTIONS requests (CORS preflight)
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # Handle login route
    if path == '/login':
        # Google OAuth URL
        client_id = os.getenv('GOOGLE_CLIENT_ID' )
        redirect_uri = 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod/callback'
        
        oauth_url = (
            f"https://accounts.google.com/o/oauth2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={urllib.parse.quote(redirect_uri )}&"
            f"scope=https://www.googleapis.com/auth/youtube.readonly&"
            f"response_type=code&"
            f"access_type=offline"
         )
        
        # Redirect to Google OAuth
        return {
            'statusCode': 302,
            'headers': {
                'Location': oauth_url,
                'Access-Control-Allow-Origin': '*'
            },
            'body': ''
        }
    
    # Handle callback route
    if path == '/callback':
        auth_code = query_params.get('code')
        error = query_params.get('error')
        
        if error:
            # Redirect back to frontend with error
            frontend_url = 'https://main.d221lm5zo3j68g.amplifyapp.com'
            return {
                'statusCode': 302,
                'headers': {
                    'Location': f'{frontend_url}?error={error}',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': ''
            }
        
        if auth_code:
            try:
                # Exchange authorization code for access token
                client_id = os.getenv('GOOGLE_CLIENT_ID' )
                client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
                redirect_uri = 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod/callback'
                
                # Prepare token exchange request
                token_data = {
                    'code': auth_code,
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'redirect_uri': redirect_uri,
                    'grant_type': 'authorization_code'
                }
                
                # Make request to Google's token endpoint
                token_url = 'https://oauth2.googleapis.com/token'
                data = urllib.parse.urlencode(token_data ).encode('utf-8')
                
                req = urllib.request.Request(token_url, data=data, method='POST')
                req.add_header('Content-Type', 'application/x-www-form-urlencoded')
                
                with urllib.request.urlopen(req) as response:
                    token_response = json.loads(response.read().decode('utf-8'))
                
                # Extract access token
                access_token = token_response.get('access_token')
                
                if access_token:
                    # Redirect back to frontend with success
                    frontend_url = 'https://main.d221lm5zo3j68g.amplifyapp.com'
                    # Encode the access token for URL safety
                    encoded_token = base64.urlsafe_b64encode(access_token.encode( )).decode()
                    return {
                        'statusCode': 302,
                        'headers': {
                            'Location': f'{frontend_url}?success=true&token={encoded_token}',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': ''
                    }
                else:
                    raise Exception('No access token received')
                    
            except Exception as e:
                # Redirect back to frontend with error
                frontend_url = 'https://main.d221lm5zo3j68g.amplifyapp.com'
                return {
                    'statusCode': 302,
                    'headers': {
                        'Location': f'{frontend_url}?error=token_exchange_failed',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': ''
                }
        
        # If no code or error, redirect back to frontend
        frontend_url = 'https://main.d221lm5zo3j68g.amplifyapp.com'
        return {
            'statusCode': 302,
            'headers': {
                'Location': f'{frontend_url}?error=no_auth_code',
                'Access-Control-Allow-Origin': '*'
            },
            'body': ''
        }
    
    # Main API response for root path
    response_body = {
        'message': 'YouTube A/B Testing Tool API',
        'version': '1.0.0',
        'status': 'running',
        'environment': {
            'google_client_id_set': bool(os.getenv('GOOGLE_CLIENT_ID' )),
            'google_client_secret_set': bool(os.getenv('GOOGLE_CLIENT_SECRET'))
        },
        'path': path,
        'method': http_method
    }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(response_body )
    }
