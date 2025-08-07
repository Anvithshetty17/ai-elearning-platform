import os
import magic
import mimetypes
from typing import Optional, Tuple

def get_file_type(file_data: bytes, filename: str = '') -> Tuple[str, str]:
    """
    Determine file type from file data and filename
    
    Args:
        file_data: File data as bytes
        filename: Original filename (optional)
        
    Returns:
        Tuple of (file_type, mime_type)
    """
    try:
        # Use python-magic to detect file type
        mime_type = magic.from_buffer(file_data, mime=True)
        
        # Fallback to filename extension
        if not mime_type or mime_type == 'application/octet-stream':
            if filename:
                mime_type, _ = mimetypes.guess_type(filename)
                mime_type = mime_type or 'application/octet-stream'
        
        # Determine general file type
        if mime_type.startswith('image/'):
            file_type = 'image'
        elif mime_type.startswith('video/'):
            file_type = 'video'
        elif mime_type.startswith('audio/'):
            file_type = 'audio'
        elif mime_type in ['application/pdf']:
            file_type = 'document'
        elif mime_type in ['text/plain', 'text/html', 'text/css', 'text/javascript']:
            file_type = 'text'
        else:
            file_type = 'other'
        
        return file_type, mime_type
        
    except Exception:
        # Fallback method using filename extension
        if filename:
            ext = os.path.splitext(filename)[1].lower()
            
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
                return 'image', f'image/{ext[1:]}'
            elif ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']:
                return 'video', f'video/{ext[1:]}'
            elif ext in ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']:
                return 'audio', f'audio/{ext[1:]}'
            elif ext == '.pdf':
                return 'document', 'application/pdf'
            elif ext in ['.txt', '.md']:
                return 'text', 'text/plain'
        
        return 'other', 'application/octet-stream'

def validate_file_size(file_size: int, max_size_mb: int = 500) -> bool:
    """
    Validate file size
    
    Args:
        file_size: File size in bytes
        max_size_mb: Maximum size in MB
        
    Returns:
        True if valid, False otherwise
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes

def generate_safe_filename(filename: str) -> str:
    """
    Generate safe filename by removing/replacing unsafe characters
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    import re
    import uuid
    
    if not filename:
        return f"file_{uuid.uuid4().hex[:8]}"
    
    # Get name and extension
    name, ext = os.path.splitext(filename)
    
    # Remove or replace unsafe characters
    safe_name = re.sub(r'[<>:"/\\|?*]', '', name)
    safe_name = re.sub(r'\s+', '_', safe_name)
    safe_name = safe_name.strip('.')
    
    # Ensure name is not empty
    if not safe_name:
        safe_name = f"file_{uuid.uuid4().hex[:8]}"
    
    # Limit length
    if len(safe_name) > 100:
        safe_name = safe_name[:100]
    
    return safe_name + ext.lower()

def create_temp_directory() -> str:
    """
    Create temporary directory for processing
    
    Returns:
        Path to temporary directory
    """
    import tempfile
    import uuid
    
    temp_dir = os.path.join(
        tempfile.gettempdir(), 
        f"ai_elearning_{uuid.uuid4().hex[:8]}"
    )
    os.makedirs(temp_dir, exist_ok=True)
    
    return temp_dir

def cleanup_temp_directory(temp_dir: str):
    """
    Clean up temporary directory and all its contents
    
    Args:
        temp_dir: Path to temporary directory
    """
    import shutil
    
    try:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
    except Exception as e:
        print(f"Warning: Could not cleanup temp directory {temp_dir}: {str(e)}")

def get_file_extension_from_mime(mime_type: str) -> str:
    """
    Get file extension from MIME type
    
    Args:
        mime_type: MIME type
        
    Returns:
        File extension with dot (e.g., '.jpg')
    """
    extensions = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/bmp': '.bmp',
        'video/mp4': '.mp4',
        'video/avi': '.avi',
        'video/mov': '.mov',
        'video/wmv': '.wmv',
        'video/webm': '.webm',
        'video/mkv': '.mkv',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/ogg': '.ogg',
        'audio/mp4': '.m4a',
        'audio/aac': '.aac',
        'audio/flac': '.flac',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'text/html': '.html',
        'text/css': '.css',
        'text/javascript': '.js',
        'application/json': '.json'
    }
    
    return extensions.get(mime_type, '.bin')

def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

def is_valid_media_file(filename: str) -> bool:
    """
    Check if file is a valid media file
    
    Args:
        filename: Filename to check
        
    Returns:
        True if valid media file, False otherwise
    """
    if not filename:
        return False
    
    ext = os.path.splitext(filename)[1].lower()
    
    valid_extensions = {
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        # Videos
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v',
        # Audio
        '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'
    }
    
    return ext in valid_extensions

def extract_text_from_filename(filename: str) -> str:
    """
    Extract readable text from filename
    
    Args:
        filename: Original filename
        
    Returns:
        Cleaned text
    """
    if not filename:
        return ''
    
    # Remove extension
    name = os.path.splitext(filename)[0]
    
    # Replace underscores and hyphens with spaces
    name = name.replace('_', ' ').replace('-', ' ')
    
    # Remove extra spaces
    name = ' '.join(name.split())
    
    # Capitalize first letter of each word
    return name.title()

def validate_audio_file(file_data: bytes, filename: str = '') -> bool:
    """
    Validate if file is a valid audio file
    
    Args:
        file_data: File data as bytes
        filename: Original filename
        
    Returns:
        True if valid audio file, False otherwise
    """
    try:
        file_type, mime_type = get_file_type(file_data, filename)
        return file_type == 'audio'
    except Exception:
        return False

def validate_video_file(file_data: bytes, filename: str = '') -> bool:
    """
    Validate if file is a valid video file
    
    Args:
        file_data: File data as bytes
        filename: Original filename
        
    Returns:
        True if valid video file, False otherwise
    """
    try:
        file_type, mime_type = get_file_type(file_data, filename)
        return file_type == 'video'
    except Exception:
        return False

def validate_image_file(file_data: bytes, filename: str = '') -> bool:
    """
    Validate if file is a valid image file
    
    Args:
        file_data: File data as bytes
        filename: Original filename
        
    Returns:
        True if valid image file, False otherwise
    """
    try:
        file_type, mime_type = get_file_type(file_data, filename)
        return file_type == 'image'
    except Exception:
        return False