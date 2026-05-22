from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.s3 import upload_image_s3

router = APIRouter()


@router.post("/upload-profile-image")
async def upload_image_s3(
    user_id: str,
    file: UploadFile = File(...)
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

    image_url = await upload_image_s3(
        user_id=user_id,
        file=file
    )

    return {
        "message": "Upload successful",
        "image_url": image_url
    }