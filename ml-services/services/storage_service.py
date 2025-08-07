import os
import logging
from typing import Optional, Dict, Any
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import Error as CloudinaryError

logger = logging.getLogger(__name__)

class StorageService:
    """Cloud storage service for handling media files"""
    
    def __init__(self):
        # Configure cloudinary
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        self.folders = {
            'lectures': 'ai-elearning/lectures',
            'audio': 'ai-elearning/audio',
            'thumbnails': 'ai-elearning/thumbnails',
            'temp': 'ai-elearning/temp'
        }
    
    def upload_file(self, file_data: bytes, filename: str, folder: str = 'temp',
                   resource_type: str = 'auto', **kwargs) -> Optional[Dict[str, Any]]:
        """
        Upload file to cloud storage
        
        Args:
            file_data: File data as bytes
            filename: Original filename
            folder: Storage folder ('lectures', 'audio', 'thumbnails', 'temp')
            resource_type: Cloudinary resource type ('auto', 'image', 'video', 'raw')
            **kwargs: Additional cloudinary upload parameters
            
        Returns:
            Upload result dictionary or None if failed
        """
        try:
            # Get folder path
            folder_path = self.folders.get(folder, self.folders['temp'])
            
            # Set default upload parameters
            upload_params = {
                'folder': folder_path,
                'resource_type': resource_type,
                'use_filename': True,
                'unique_filename': True,
                'overwrite': False,
                **kwargs
            }
            
            # Special handling for different file types
            if resource_type == 'video' or filename.lower().endswith(('.mp4', '.avi', '.mov', '.wmv')):
                upload_params.update({
                    'resource_type': 'video',
                    'quality': 'auto',
                    'format': 'mp4'
                })
            elif filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
                upload_params.update({
                    'resource_type': 'video',  # Cloudinary uses 'video' for audio
                    'quality': 'auto'
                })
            elif filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                upload_params.update({
                    'resource_type': 'image',
                    'quality': 'auto',
                    'fetch_format': 'auto'
                })
            
            # Upload file
            result = cloudinary.uploader.upload_large(
                file_data,
                **upload_params
            )
            
            # Return relevant information
            return {
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'original_filename': filename,
                'size': result.get('bytes', 0),
                'format': result.get('format', ''),
                'resource_type': result.get('resource_type', ''),
                'width': result.get('width'),
                'height': result.get('height'),
                'duration': result.get('duration'),
                'created_at': result.get('created_at'),
                'version': result.get('version')
            }
            
        except CloudinaryError as e:
            logger.error(f"Cloudinary upload failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            return None
    
    def delete_file(self, public_id: str, resource_type: str = 'auto') -> bool:
        """
        Delete file from cloud storage
        
        Args:
            public_id: Cloudinary public ID
            resource_type: Resource type ('auto', 'image', 'video', 'raw')
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get('result') == 'ok'
            
        except CloudinaryError as e:
            logger.error(f"Cloudinary delete failed: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"File delete failed: {str(e)}")
            return False
    
    def get_file_info(self, public_id: str, resource_type: str = 'auto') -> Optional[Dict[str, Any]]:
        """
        Get file information from cloud storage
        
        Args:
            public_id: Cloudinary public ID
            resource_type: Resource type
            
        Returns:
            File information dictionary or None if failed
        """
        try:
            result = cloudinary.api.resource(public_id, resource_type=resource_type)
            
            return {
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'size': result.get('bytes', 0),
                'format': result.get('format', ''),
                'resource_type': result.get('resource_type', ''),
                'width': result.get('width'),
                'height': result.get('height'),
                'duration': result.get('duration'),
                'created_at': result.get('created_at'),
                'version': result.get('version')
            }
            
        except CloudinaryError as e:
            logger.error(f"Get file info failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Get file info failed: {str(e)}")
            return None
    
    def generate_upload_signature(self, folder: str = 'temp', 
                                 resource_type: str = 'auto') -> Optional[Dict[str, Any]]:
        """
        Generate upload signature for client-side uploads
        
        Args:
            folder: Upload folder
            resource_type: Resource type
            
        Returns:
            Signature information or None if failed
        """
        try:
            import time
            
            timestamp = int(time.time())
            folder_path = self.folders.get(folder, self.folders['temp'])
            
            params = {
                'timestamp': timestamp,
                'folder': folder_path,
                'resource_type': resource_type
            }
            
            signature = cloudinary.utils.api_sign_request(
                params, 
                os.environ.get('CLOUDINARY_API_SECRET')
            )
            
            return {
                'signature': signature,
                'timestamp': timestamp,
                'api_key': os.environ.get('CLOUDINARY_API_KEY'),
                'folder': folder_path,
                'resource_type': resource_type
            }
            
        except Exception as e:
            logger.error(f"Signature generation failed: {str(e)}")
            return None
    
    def list_files(self, folder: str = 'temp', resource_type: str = 'auto', 
                  max_results: int = 50) -> Optional[list]:
        """
        List files in a folder
        
        Args:
            folder: Folder to list
            resource_type: Resource type filter
            max_results: Maximum number of results
            
        Returns:
            List of files or None if failed
        """
        try:
            folder_path = self.folders.get(folder, self.folders['temp'])
            
            result = cloudinary.api.resources(
                type='upload',
                resource_type=resource_type,
                prefix=folder_path,
                max_results=max_results
            )
            
            files = []
            for resource in result.get('resources', []):
                files.append({
                    'public_id': resource['public_id'],
                    'url': resource['secure_url'],
                    'size': resource.get('bytes', 0),
                    'format': resource.get('format', ''),
                    'created_at': resource.get('created_at'),
                    'width': resource.get('width'),
                    'height': resource.get('height'),
                    'duration': resource.get('duration')
                })
            
            return files
            
        except CloudinaryError as e:
            logger.error(f"List files failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"List files failed: {str(e)}")
            return None
    
    def cleanup_temp_files(self, older_than_hours: int = 24) -> int:
        """
        Clean up temporary files older than specified hours
        
        Args:
            older_than_hours: Delete files older than this many hours
            
        Returns:
            Number of files deleted
        """
        try:
            import datetime
            
            cutoff_date = datetime.datetime.now() - datetime.timedelta(hours=older_than_hours)
            cutoff_timestamp = cutoff_date.strftime('%Y-%m-%dT%H:%M:%S')
            
            # List temp files
            temp_files = cloudinary.api.resources(
                type='upload',
                prefix=self.folders['temp'],
                created_at={'to': cutoff_timestamp},
                max_results=500
            )
            
            deleted_count = 0
            for resource in temp_files.get('resources', []):
                try:
                    if self.delete_file(resource['public_id'], resource.get('resource_type', 'auto')):
                        deleted_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete temp file {resource['public_id']}: {str(e)}")
                    continue
            
            logger.info(f"Cleaned up {deleted_count} temporary files")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Temp file cleanup failed: {str(e)}")
            return 0
    
    def get_storage_usage(self) -> Optional[Dict[str, Any]]:
        """Get storage usage information"""
        try:
            usage = cloudinary.api.usage()
            
            return {
                'credits_used': usage.get('credits', 0),
                'bandwidth_used': usage.get('bandwidth', 0),
                'storage_used': usage.get('storage', 0),
                'requests': usage.get('requests', 0),
                'resources': usage.get('resources', 0),
                'derived_resources': usage.get('derived_resources', 0)
            }
            
        except CloudinaryError as e:
            logger.error(f"Get storage usage failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Get storage usage failed: {str(e)}")
            return None
    
    def optimize_image(self, public_id: str, width: int = None, height: int = None, 
                      quality: str = 'auto') -> Optional[str]:
        """
        Generate optimized image URL
        
        Args:
            public_id: Image public ID
            width: Target width
            height: Target height
            quality: Quality setting ('auto', '80', etc.)
            
        Returns:
            Optimized image URL or None if failed
        """
        try:
            transformation = {
                'fetch_format': 'auto',
                'quality': quality
            }
            
            if width:
                transformation['width'] = width
            if height:
                transformation['height'] = height
            if width and height:
                transformation['crop'] = 'fill'
            
            url = cloudinary.utils.cloudinary_url(
                public_id,
                transformation=transformation
            )[0]
            
            return url
            
        except Exception as e:
            logger.error(f"Image optimization failed: {str(e)}")
            return None
    
    def is_configured(self) -> bool:
        """Check if storage service is properly configured"""
        config = cloudinary.config()
        return all([
            config.cloud_name,
            config.api_key,
            config.api_secret
        ])
    
    def get_available_folders(self) -> Dict[str, str]:
        """Get available storage folders"""
        return self.folders.copy()