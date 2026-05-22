import boto3
import os
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

async def upload_image_s3(
    user_id: str,
    path: tuple,
    file: UploadFile
):   
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid image type"
        )

    extension = file.filename.split(".")[-1]

    s3_key = f"{path[0]}/{user_id}/{path[1]}.{extension}"

    s3_client.upload_fileobj(
        file.file,
        AWS_BUCKET_NAME,
        s3_key,
        ExtraArgs={
            "ContentType": file.content_type
        }
    )

    image_url = (
        f"https://{AWS_BUCKET_NAME}.s3."
        f"{AWS_REGION}.amazonaws.com/{s3_key}"
    )

    print(image_url)
    return image_url