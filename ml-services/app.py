from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import service modules
from services.tts_service import TTSService
from services.video_service import VideoService
from services.processing_service import ProcessingService
from utils.cloudinary_helper import CloudinaryHelper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(','))

# Initialize services
tts_service = TTSService()
video_service = VideoService()
processing_service = ProcessingService()
cloudinary_helper = CloudinaryHelper()

# Health check endpoint
@app.route('/api/ml/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'AI E-Learning ML Service is running',
        'version': '1.0.0'
    })

# Text-to-Speech endpoint
@app.route('/api/ml/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'message': 'Text content is required'
            }), 400
        
        text = data['text']
        voice_settings = data.get('voiceSettings', {})
        
        # Validate text length
        if len(text.strip()) == 0:
            return jsonify({
                'success': False,
                'message': 'Text content cannot be empty'
            }), 400
            
        if len(text) > 10000:
            return jsonify({
                'success': False,
                'message': 'Text content too long (max 10000 characters)'
            }), 400
        
        # Generate audio
        audio_file_path = tts_service.generate_speech(text, voice_settings)
        
        if not audio_file_path:
            return jsonify({
                'success': False,
                'message': 'Failed to generate speech'
            }), 500
        
        # Upload to Cloudinary
        audio_url = cloudinary_helper.upload_audio(audio_file_path)
        
        # Clean up local file
        if os.path.exists(audio_file_path):
            os.remove(audio_file_path)
        
        return jsonify({
            'success': True,
            'message': 'Speech generated successfully',
            'data': {
                'audioUrl': audio_url,
                'duration': tts_service.get_audio_duration(audio_file_path) if audio_url else 0
            }
        })
    
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error during speech generation'
        }), 500

# Video generation endpoint
@app.route('/api/ml/generate-video', methods=['POST'])
def generate_video():
    try:
        data = request.get_json()
        
        required_fields = ['text', 'audioUrl']
        for field in required_fields:
            if not data or field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        text = data['text']
        audio_url = data['audioUrl']
        video_settings = data.get('videoSettings', {})
        
        # Generate video
        video_file_path, thumbnail_path = video_service.generate_video(
            text, audio_url, video_settings
        )
        
        if not video_file_path:
            return jsonify({
                'success': False,
                'message': 'Failed to generate video'
            }), 500
        
        # Upload to Cloudinary
        video_url = cloudinary_helper.upload_video(video_file_path)
        thumbnail_url = cloudinary_helper.upload_image(thumbnail_path) if thumbnail_path else None
        
        # Clean up local files
        for file_path in [video_file_path, thumbnail_path]:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        
        return jsonify({
            'success': True,
            'message': 'Video generated successfully',
            'data': {
                'videoUrl': video_url,
                'thumbnailUrl': thumbnail_url,
                'duration': video_service.get_video_duration(video_file_path) if video_url else 0
            }
        })
    
    except Exception as e:
        logger.error(f"Video generation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error during video generation'
        }), 500

# Complete lecture processing endpoint
@app.route('/api/ml/process-lecture', methods=['POST'])
def process_lecture():
    try:
        data = request.get_json()
        
        required_fields = ['lectureId', 'textContent']
        for field in required_fields:
            if not data or field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        lecture_id = data['lectureId']
        text_content = data['textContent']
        voice_settings = data.get('voiceSettings', {})
        
        # Start async processing
        task_id = processing_service.start_lecture_processing(
            lecture_id, text_content, voice_settings
        )
        
        return jsonify({
            'success': True,
            'message': 'Lecture processing started',
            'data': {
                'taskId': task_id,
                'lectureId': lecture_id,
                'status': 'processing'
            }
        })
    
    except Exception as e:
        logger.error(f"Lecture processing error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error starting lecture processing'
        }), 500

# Get processing status endpoint
@app.route('/api/ml/processing-status/<task_id>', methods=['GET'])
def get_processing_status(task_id):
    try:
        status = processing_service.get_processing_status(task_id)
        
        if not status:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': status
        })
    
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error checking status'
        }), 500

# Audio processing utilities
@app.route('/api/ml/audio/optimize', methods=['POST'])
def optimize_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Audio file is required'
            }), 400
        
        audio_file = request.files['audio']
        settings = request.form.get('settings', '{}')
        
        try:
            import json
            audio_settings = json.loads(settings)
        except:
            audio_settings = {}
        
        # Process audio
        optimized_path = tts_service.optimize_audio(audio_file, audio_settings)
        
        if not optimized_path:
            return jsonify({
                'success': False,
                'message': 'Failed to optimize audio'
            }), 500
        
        # Upload optimized audio
        optimized_url = cloudinary_helper.upload_audio(optimized_path)
        
        # Clean up
        if os.path.exists(optimized_path):
            os.remove(optimized_path)
        
        return jsonify({
            'success': True,
            'message': 'Audio optimized successfully',
            'data': {
                'audioUrl': optimized_url
            }
        })
    
    except Exception as e:
        logger.error(f"Audio optimization error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error optimizing audio'
        }), 500

# Get supported languages and voices
@app.route('/api/ml/voices', methods=['GET'])
def get_supported_voices():
    try:
        voices = tts_service.get_supported_voices()
        return jsonify({
            'success': True,
            'data': voices
        })
    except Exception as e:
        logger.error(f"Get voices error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error fetching voices'
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Ensure upload directories exist
    os.makedirs('uploads/audio', exist_ok=True)
    os.makedirs('uploads/video', exist_ok=True)
    os.makedirs('uploads/images', exist_ok=True)
    
    # Run the application
    port = int(os.getenv('ML_SERVICE_PORT', 5001))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    logger.info(f"Starting AI E-Learning ML Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)