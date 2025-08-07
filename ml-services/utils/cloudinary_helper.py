import os
import logging
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class CloudinaryHelper:
    def __init__(self):
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'demo'),
            api_key=os.getenv('CLOUDINARY_API_KEY', ''),
            api_secret=os.getenv('CLOUDINARY_API_SECRET', ''),
            secure=True
        )
        
        # Check if Cloudinary is properly configured
        self.is_configured = all([
            os.getenv('CLOUDINARY_CLOUD_NAME'),
            os.getenv('CLOUDINARY_API_KEY'),
            os.getenv('CLOUDINARY_API_SECRET')
        ])
        
        if not self.is_configured:
            logger.warning("Cloudinary not fully configured. Using mock responses.")

    def upload_audio(self, audio_file_path, folder="ai-elearning/audio"):
        """Upload audio file to Cloudinary"""
        try:
            if not self.is_configured:
                return self._mock_upload_response('audio')
            
            if not os.path.exists(audio_file_path):
                logger.error(f"Audio file not found: {audio_file_path}")
                return None
            
            # Upload audio
            result = cloudinary.uploader.upload(
                audio_file_path,
                folder=folder,
                resource_type="auto",
                format="mp3",
                quality="auto:good"
            )
            
            return result.get('secure_url')
            
        except Exception as e:
            logger.error(f"Audio upload error: {str(e)}")
            return None

    def upload_video(self, video_file_path, folder="ai-elearning/videos"):
        """Upload video file to Cloudinary"""
        try:
            if not self.is_configured:
                return self._mock_upload_response('video')
            
            if not os.path.exists(video_file_path):
                logger.error(f"Video file not found: {video_file_path}")
                return None
            
            # Upload video with optimization
            result = cloudinary.uploader.upload(
                video_file_path,
                folder=folder,
                resource_type="video",
                format="mp4",
                quality="auto:good",
                fetch_format="auto",
                flags="streaming_attachment"
            )
            
            return result.get('secure_url')
            
        except Exception as e:
            logger.error(f"Video upload error: {str(e)}")
            return None

    def upload_image(self, image_file_path, folder="ai-elearning/images"):
        """Upload image file to Cloudinary"""
        try:
            if not self.is_configured:
                return self._mock_upload_response('image')
            
            if not os.path.exists(image_file_path):
                logger.error(f"Image file not found: {image_file_path}")
                return None
            
            # Upload image with optimization
            result = cloudinary.uploader.upload(
                image_file_path,
                folder=folder,
                format="jpg",
                quality="auto:good",
                fetch_format="auto"
            )
            
            return result.get('secure_url')
            
        except Exception as e:
            logger.error(f"Image upload error: {str(e)}")
            return None

    def delete_file(self, public_id, resource_type="image"):
        """Delete file from Cloudinary"""
        try:
            if not self.is_configured:
                return True
            
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get('result') == 'ok'
            
        except Exception as e:
            logger.error(f"File deletion error: {str(e)}")
            return False

    def get_file_info(self, public_id, resource_type="image"):
        """Get file information from Cloudinary"""
        try:
            if not self.is_configured:
                return None
            
            result = cloudinary.api.resource(public_id, resource_type=resource_type)
            return result
            
        except Exception as e:
            logger.error(f"Get file info error: {str(e)}")
            return None

    def generate_transformed_url(self, public_id, transformations, resource_type="image"):
        """Generate transformed URL for file"""
        try:
            if not self.is_configured:
                return self._mock_upload_response('transformed')
            
            url = cloudinary.CloudinaryImage(public_id).build_url(**transformations)
            return url
            
        except Exception as e:
            logger.error(f"URL transformation error: {str(e)}")
            return None

    def upload_base64(self, base64_data, folder, filename=None):
        """Upload base64 encoded data to Cloudinary"""
        try:
            if not self.is_configured:
                return self._mock_upload_response('base64')
            
            upload_options = {
                'folder': folder,
                'resource_type': 'auto'
            }
            
            if filename:
                upload_options['public_id'] = filename
            
            result = cloudinary.uploader.upload(base64_data, **upload_options)
            return result.get('secure_url')
            
        except Exception as e:
            logger.error(f"Base64 upload error: {str(e)}")
            return None

    def get_upload_signature(self, params_to_sign):
        """Generate upload signature for direct uploads"""
        try:
            if not self.is_configured:
                return {
                    'signature': 'mock_signature',
                    'timestamp': '1234567890'
                }
            
            timestamp = cloudinary.utils.now()
            params_to_sign['timestamp'] = timestamp
            
            signature = cloudinary.utils.api_sign_request(
                params_to_sign, 
                os.getenv('CLOUDINARY_API_SECRET')
            )
            
            return {
                'signature': signature,
                'timestamp': timestamp,
                'api_key': os.getenv('CLOUDINARY_API_KEY'),
                'cloud_name': os.getenv('CLOUDINARY_CLOUD_NAME')
            }
            
        except Exception as e:
            logger.error(f"Signature generation error: {str(e)}")
            return None

    def list_files(self, folder, resource_type="image", max_results=100):
        """List files in a folder"""
        try:
            if not self.is_configured:
                return []
            
            result = cloudinary.api.resources(
                type="upload",
                prefix=folder,
                resource_type=resource_type,
                max_results=max_results
            )
            
            return result.get('resources', [])
            
        except Exception as e:
            logger.error(f"List files error: {str(e)}")
            return []

    def create_archive(self, public_ids, resource_type="image", format="zip"):
        """Create archive of multiple files"""
        try:
            if not self.is_configured:
                return None
            
            result = cloudinary.utils.archive_params(
                public_ids=public_ids,
                resource_type=resource_type,
                format=format
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Archive creation error: {str(e)}")
            return None

    def get_usage(self):
        """Get Cloudinary usage statistics"""
        try:
            if not self.is_configured:
                return {
                    'bandwidth': {'usage': 0, 'limit': 1000000},
                    'storage': {'usage': 0, 'limit': 1000000},
                    'requests': {'usage': 0, 'limit': 10000}
                }
            
            result = cloudinary.api.usage()
            return result
            
        except Exception as e:
            logger.error(f"Usage stats error: {str(e)}")
            return None

    def _mock_upload_response(self, file_type):
        """Generate mock response when Cloudinary is not configured"""
        mock_urls = {
            'audio': f'https://res.cloudinary.com/demo/video/upload/sample_audio.mp3',
            'video': f'https://res.cloudinary.com/demo/video/upload/sample_video.mp4',
            'image': f'https://res.cloudinary.com/demo/image/upload/sample_image.jpg',
            'base64': f'https://res.cloudinary.com/demo/image/upload/sample_base64.jpg',
            'transformed': f'https://res.cloudinary.com/demo/image/upload/t_media_lib_thumb/sample.jpg'
        }
        
        return mock_urls.get(file_type, 'https://res.cloudinary.com/demo/image/upload/sample.jpg')

    def health_check(self):
        """Check Cloudinary service health"""
        try:
            if not self.is_configured:
                return {
                    'status': 'warning',
                    'message': 'Cloudinary not configured'
                }
            
            # Try to get usage (simple API call)
            cloudinary.api.usage()
            
            return {
                'status': 'ok',
                'message': 'Cloudinary service is healthy'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Cloudinary service error: {str(e)}'
            }