from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime

# Import services and routes
from routes.process import process_bp
from services.tts_service import TTSService
from services.video_service import VideoService
from services.audio_service import AudioService
from services.storage_service import StorageService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['DEBUG'] = os.environ.get('FLASK_ENV') == 'development'
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
    
    # CORS configuration
    CORS(app, origins=[
        'http://localhost:3000',
        'http://localhost:5000',
        'https://your-domain.com'
    ])
    
    # Initialize services
    try:
        app.tts_service = TTSService()
        app.video_service = VideoService()
        app.audio_service = AudioService()
        app.storage_service = StorageService()
        logger.info("AI services initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing services: {str(e)}")
        # Continue without services for development
        app.tts_service = None
        app.video_service = None
        app.audio_service = None
        app.storage_service = None
    
    # Register blueprints
    app.register_blueprint(process_bp, url_prefix='/api')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'OK',
            'timestamp': datetime.utcnow().isoformat(),
            'services': {
                'tts': app.tts_service is not None,
                'video': app.video_service is not None,
                'audio': app.audio_service is not None,
                'storage': app.storage_service is not None
            }
        })
    
    @app.route('/api/status', methods=['GET'])
    def api_status():
        """API status endpoint"""
        return jsonify({
            'success': True,
            'message': 'AI E-Learning ML Services API is running',
            'version': '1.0.0',
            'services_available': [
                'text-to-speech',
                'video-generation',
                'audio-processing',
                'cloud-storage'
            ]
        })
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'message': 'Bad request',
            'error': str(error.description)
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'API endpoint not found'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'message': 'Method not allowed'
        }), 405
    
    @app.errorhandler(413)
    def payload_too_large(error):
        return jsonify({
            'success': False,
            'message': 'File too large. Maximum size is 500MB.'
        }), 413
    
    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500
    
    return app

# Create Flask app
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting AI E-Learning ML Services on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )