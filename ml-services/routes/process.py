from flask import Blueprint, request, jsonify, current_app
import uuid
import json
import threading
import time
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

process_bp = Blueprint('process', __name__)

# In-memory job storage (in production, use Redis or database)
job_storage = {}
job_lock = threading.Lock()

def store_job(job_id: str, job_data: dict):
    """Store job data thread-safely"""
    with job_lock:
        job_storage[job_id] = job_data

def get_job(job_id: str) -> dict:
    """Get job data thread-safely"""
    with job_lock:
        return job_storage.get(job_id, {})

def update_job(job_id: str, updates: dict):
    """Update job data thread-safely"""
    with job_lock:
        if job_id in job_storage:
            job_storage[job_id].update(updates)

@process_bp.route('/generate-lecture', methods=['POST'])
def generate_lecture():
    """Generate AI lecture from text"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['lectureId', 'sourceText']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        lecture_id = data['lectureId']
        source_text = data['sourceText']
        settings = data.get('settings', {})
        
        # Validate text length
        if len(source_text.strip()) < 10:
            return jsonify({
                'success': False,
                'message': 'Source text must be at least 10 characters long'
            }), 400
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job data
        job_data = {
            'job_id': job_id,
            'lecture_id': lecture_id,
            'status': 'pending',
            'progress': 0,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'source_text': source_text,
            'settings': settings,
            'steps': [
                {'name': 'text_analysis', 'status': 'pending', 'progress': 0},
                {'name': 'audio_generation', 'status': 'pending', 'progress': 0},
                {'name': 'video_generation', 'status': 'pending', 'progress': 0},
                {'name': 'upload_processing', 'status': 'pending', 'progress': 0},
                {'name': 'finalization', 'status': 'pending', 'progress': 0}
            ],
            'result': {},
            'error': None
        }
        
        store_job(job_id, job_data)
        
        # Start background processing
        processing_thread = threading.Thread(
            target=process_lecture_generation,
            args=(job_id, lecture_id, source_text, settings)
        )
        processing_thread.daemon = True
        processing_thread.start()
        
        # Estimate processing time
        estimated_time = estimate_processing_time(source_text, settings)
        
        return jsonify({
            'success': True,
            'message': 'Lecture generation started',
            'jobId': job_id,
            'estimatedTime': f"{estimated_time['minutes']} minutes",
            'estimatedTimeSeconds': estimated_time['seconds']
        }), 202
        
    except Exception as e:
        logger.error(f"Generate lecture request failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to start lecture generation'
        }), 500

@process_bp.route('/processing-status/<job_id>', methods=['GET'])
def get_processing_status(job_id):
    """Get processing status for a job"""
    try:
        job_data = get_job(job_id)
        
        if not job_data:
            return jsonify({
                'success': False,
                'message': 'Job not found'
            }), 404
        
        response_data = {
            'success': True,
            'jobId': job_id,
            'status': job_data.get('status', 'unknown'),
            'progress': job_data.get('progress', 0),
            'createdAt': job_data.get('created_at'),
            'updatedAt': job_data.get('updated_at'),
            'steps': job_data.get('steps', [])
        }
        
        # Add result data if completed
        if job_data.get('status') == 'completed':
            response_data.update(job_data.get('result', {}))
        
        # Add error if failed
        if job_data.get('status') == 'failed':
            response_data['error'] = job_data.get('error', 'Unknown error occurred')
        
        # Add estimated time remaining if processing
        if job_data.get('status') == 'processing':
            remaining_time = estimate_remaining_time(job_data)
            if remaining_time:
                response_data['estimatedTimeRemaining'] = remaining_time
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Get processing status failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get processing status'
        }), 500

@process_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({
                'success': False,
                'message': 'Text is required'
            }), 400
        
        voice = data.get('voice', 'rachel')
        provider = data.get('provider', 'auto')
        speed = data.get('speed', 1.0)
        language = data.get('language', 'en')
        
        # Validate speed
        if not 0.25 <= speed <= 2.0:
            return jsonify({
                'success': False,
                'message': 'Speed must be between 0.25 and 2.0'
            }), 400
        
        if not current_app.tts_service:
            return jsonify({
                'success': False,
                'message': 'TTS service not available'
            }), 503
        
        # Generate audio
        audio_data = current_app.tts_service.text_to_speech(
            text=text,
            voice=voice,
            provider=provider,
            speed=speed,
            language=language
        )
        
        if not audio_data:
            return jsonify({
                'success': False,
                'message': 'Failed to generate audio'
            }), 500
        
        # Upload to storage
        if current_app.storage_service:
            upload_result = current_app.storage_service.upload_file(
                file_data=audio_data,
                filename=f'tts-audio-{uuid.uuid4().hex[:8]}.mp3',
                folder='audio',
                resource_type='video'
            )
            
            if upload_result:
                return jsonify({
                    'success': True,
                    'message': 'Audio generated successfully',
                    'audioUrl': upload_result['url'],
                    'publicId': upload_result['public_id'],
                    'duration': upload_result.get('duration'),
                    'size': upload_result.get('size')
                }), 200
        
        return jsonify({
            'success': False,
            'message': 'Failed to upload generated audio'
        }), 500
        
    except Exception as e:
        logger.error(f"TTS request failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to generate audio'
        }), 500

@process_bp.route('/available-voices', methods=['GET'])
def get_available_voices():
    """Get available TTS voices"""
    try:
        if not current_app.tts_service:
            return jsonify({
                'success': False,
                'message': 'TTS service not available'
            }), 503
        
        provider = request.args.get('provider', 'all')
        voices = current_app.tts_service.get_available_voices(provider)
        
        return jsonify({
            'success': True,
            'voices': voices
        }), 200
        
    except Exception as e:
        logger.error(f"Get available voices failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get available voices'
        }), 500

@process_bp.route('/available-video-styles', methods=['GET'])
def get_available_video_styles():
    """Get available video styles"""
    try:
        if not current_app.video_service:
            return jsonify({
                'success': False,
                'message': 'Video service not available'
            }), 503
        
        styles = current_app.video_service.get_available_styles()
        
        return jsonify({
            'success': True,
            'styles': styles
        }), 200
        
    except Exception as e:
        logger.error(f"Get available video styles failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get available video styles'
        }), 500

@process_bp.route('/cleanup-temp', methods=['POST'])
def cleanup_temp_files():
    """Cleanup temporary files"""
    try:
        data = request.get_json() or {}
        older_than_hours = data.get('olderThanHours', 24)
        
        if not current_app.storage_service:
            return jsonify({
                'success': False,
                'message': 'Storage service not available'
            }), 503
        
        deleted_count = current_app.storage_service.cleanup_temp_files(older_than_hours)
        
        return jsonify({
            'success': True,
            'message': f'Cleaned up {deleted_count} temporary files',
            'deletedCount': deleted_count
        }), 200
        
    except Exception as e:
        logger.error(f"Cleanup temp files failed: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to cleanup temporary files'
        }), 500

def process_lecture_generation(job_id: str, lecture_id: str, source_text: str, settings: dict):
    """Background processing for lecture generation"""
    try:
        logger.info(f"Starting lecture generation for job {job_id}")
        
        # Update job status
        update_job(job_id, {
            'status': 'processing',
            'updated_at': datetime.utcnow().isoformat()
        })
        
        # Step 1: Text analysis
        update_step_status(job_id, 'text_analysis', 'processing', 20)
        time.sleep(1)  # Simulate processing time
        update_step_status(job_id, 'text_analysis', 'completed', 100)
        update_job(job_id, {'progress': 20})
        
        # Step 2: Audio generation
        update_step_status(job_id, 'audio_generation', 'processing', 0)
        
        if not current_app.tts_service:
            raise Exception("TTS service not available")
        
        voice = settings.get('voice', 'rachel')
        speed = settings.get('speed', 1.0)
        language = settings.get('language', 'en')
        
        audio_data = current_app.tts_service.text_to_speech(
            text=source_text,
            voice=voice,
            speed=speed,
            language=language
        )
        
        if not audio_data:
            raise Exception("Failed to generate audio")
        
        update_step_status(job_id, 'audio_generation', 'completed', 100)
        update_job(job_id, {'progress': 40})
        
        # Step 3: Video generation
        update_step_status(job_id, 'video_generation', 'processing', 0)
        
        if not current_app.video_service:
            raise Exception("Video service not available")
        
        video_style = settings.get('videoStyle', 'presentation')
        title = f"Generated Lecture - {lecture_id}"
        
        video_data = current_app.video_service.generate_lecture_video(
            text=source_text,
            audio_data=audio_data,
            style=video_style,
            title=title
        )
        
        if not video_data:
            raise Exception("Failed to generate video")
        
        update_step_status(job_id, 'video_generation', 'completed', 100)
        update_job(job_id, {'progress': 70})
        
        # Step 4: Upload processing
        update_step_status(job_id, 'upload_processing', 'processing', 0)
        
        if not current_app.storage_service:
            raise Exception("Storage service not available")
        
        # Upload audio
        audio_upload = current_app.storage_service.upload_file(
            file_data=audio_data,
            filename=f'lecture-audio-{lecture_id}-{uuid.uuid4().hex[:8]}.mp3',
            folder='audio',
            resource_type='video'
        )
        
        if not audio_upload:
            raise Exception("Failed to upload audio")
        
        update_step_status(job_id, 'upload_processing', 'processing', 50)
        
        # Upload video
        video_upload = current_app.storage_service.upload_file(
            file_data=video_data,
            filename=f'lecture-video-{lecture_id}-{uuid.uuid4().hex[:8]}.mp4',
            folder='lectures',
            resource_type='video'
        )
        
        if not video_upload:
            raise Exception("Failed to upload video")
        
        update_step_status(job_id, 'upload_processing', 'completed', 100)
        update_job(job_id, {'progress': 90})
        
        # Step 5: Finalization
        update_step_status(job_id, 'finalization', 'processing', 50)
        
        # Prepare result
        result = {
            'videoUrl': video_upload['url'],
            'audioUrl': audio_upload['url'],
            'publicId': video_upload['public_id'],
            'audioPublicId': audio_upload['public_id'],
            'duration': video_upload.get('duration', 0),
            'fileSize': video_upload.get('size', 0),
            'audioSize': audio_upload.get('size', 0),
            'transcript': source_text,  # In a real implementation, this might be cleaned up
            'generatedAt': datetime.utcnow().isoformat()
        }
        
        update_step_status(job_id, 'finalization', 'completed', 100)
        
        # Complete job
        update_job(job_id, {
            'status': 'completed',
            'progress': 100,
            'updated_at': datetime.utcnow().isoformat(),
            'result': result
        })
        
        logger.info(f"Lecture generation completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Lecture generation failed for job {job_id}: {str(e)}")
        
        # Mark job as failed
        update_job(job_id, {
            'status': 'failed',
            'updated_at': datetime.utcnow().isoformat(),
            'error': str(e)
        })
        
        # Mark current step as failed
        job_data = get_job(job_id)
        for step in job_data.get('steps', []):
            if step['status'] == 'processing':
                step['status'] = 'failed'
                break

def update_step_status(job_id: str, step_name: str, status: str, progress: int):
    """Update status of a specific processing step"""
    job_data = get_job(job_id)
    if not job_data:
        return
    
    steps = job_data.get('steps', [])
    for step in steps:
        if step['name'] == step_name:
            step['status'] = status
            step['progress'] = progress
            break
    
    update_job(job_id, {
        'steps': steps,
        'updated_at': datetime.utcnow().isoformat()
    })

def estimate_processing_time(text: str, settings: dict) -> dict:
    """Estimate processing time based on text length and settings"""
    base_time = 60  # Base time in seconds
    
    # Time based on text length (approximately 1 second per 10 words)
    word_count = len(text.split())
    text_time = word_count * 0.1
    
    # Additional time for video generation
    video_time = word_count * 0.2
    
    # Additional time for high-quality settings
    if settings.get('videoStyle') in ['modern', 'classic']:
        video_time *= 1.2
    
    total_seconds = int(base_time + text_time + video_time)
    total_minutes = max(1, total_seconds // 60)
    
    return {
        'seconds': total_seconds,
        'minutes': total_minutes
    }

def estimate_remaining_time(job_data: dict) -> str:
    """Estimate remaining processing time"""
    try:
        progress = job_data.get('progress', 0)
        if progress <= 0:
            return "5-10 minutes"
        
        created_at = datetime.fromisoformat(job_data.get('created_at', ''))
        elapsed = (datetime.utcnow() - created_at).total_seconds()
        
        if progress >= 90:
            return "Less than 1 minute"
        elif progress >= 70:
            return "1-2 minutes"
        elif progress >= 40:
            return "2-4 minutes"
        else:
            estimated_total = elapsed / (progress / 100) if progress > 0 else 300
            remaining = max(0, estimated_total - elapsed)
            
            if remaining < 60:
                return "Less than 1 minute"
            elif remaining < 180:
                return f"{int(remaining // 60)} minutes"
            else:
                return "3-5 minutes"
                
    except Exception as e:
        logger.error(f"Time estimation failed: {str(e)}")
        return "Unknown"