import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    TESTING = False
    
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
    
    # TTS Service Configuration
    TTS_API_KEY = os.environ.get('TTS_API_KEY')
    TTS_API_URL = os.environ.get('TTS_API_URL', 'https://api.elevenlabs.io/v1')
    
    # File Configuration
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    
    # Video Generation Configuration
    VIDEO_WIDTH = int(os.environ.get('VIDEO_WIDTH', 1280))
    VIDEO_HEIGHT = int(os.environ.get('VIDEO_HEIGHT', 720))
    VIDEO_FPS = int(os.environ.get('VIDEO_FPS', 30))
    VIDEO_BITRATE = os.environ.get('VIDEO_BITRATE', '2M')
    
    # Audio Configuration
    AUDIO_SAMPLE_RATE = int(os.environ.get('AUDIO_SAMPLE_RATE', 44100))
    AUDIO_BITRATE = os.environ.get('AUDIO_BITRATE', '128k')
    
    # Processing Configuration
    PROCESSING_TIMEOUT = int(os.environ.get('PROCESSING_TIMEOUT', 600))  # 10 minutes
    CLEANUP_INTERVAL = int(os.environ.get('CLEANUP_INTERVAL', 3600))  # 1 hour
    
    # Redis Configuration (for job queue if needed)
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    @staticmethod
    def init_app(app):
        """Initialize app with configuration"""
        # Ensure upload directory exists
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        
        # Create temp subdirectories
        temp_dirs = ['audio', 'video', 'images', 'output']
        for temp_dir in temp_dirs:
            os.makedirs(os.path.join(Config.UPLOAD_FOLDER, temp_dir), exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Enhanced security for production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    WTF_CSRF_ENABLED = False

# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'development')
    return config_map.get(env, config_map['default'])