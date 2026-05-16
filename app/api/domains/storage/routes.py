# Example of a s3 file uploading API
"""
import boto3
from fastapi import APIRouter, Depends
from botocore.config import Config

router = APIRouter(prefix="/storage", tags=["Storage"])

s3_client = boto3.client(
    's3',
    aws_access_key_id="YOUR_KEY",
    aws_secret_access_key="YOUR_SECRET",
    region_name="your-region",
    config=Config(signature_version='s3v4')
)

@router.post("/presigned-url")
def generate_presigned_url(file_name: str, current_user: User = Depends(get_current_user)):
    # Generate a unique path in your bucket
    object_name = f"users/{current_user.id}/{file_name}"
    
    # Ask S3 for a temporary upload ticket
    presigned_post = s3_client.generate_presigned_url(
        'put_object',
        Params={'Bucket': 'your-comic-bucket', 'Key': object_name},
        ExpiresIn=300 # Link expires in 5 minutes
    )
    
    return {
        "upload_url": presigned_post,
        "public_url": f"https://your-comic-bucket.s3.amazonaws.com/{object_name}"
    }
    """