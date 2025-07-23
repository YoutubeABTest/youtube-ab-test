import json
import os

def lambda_handler(event, context):
    # Handle different HTTP methods and paths
    http_method = event.get('httpMethod', 'GET' )
    path = event.get('path', '/')
    
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
    
    # Main API response
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
