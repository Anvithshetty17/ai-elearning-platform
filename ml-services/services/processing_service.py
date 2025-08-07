import os
import uuid
import logging
import threading
import time
import requests
from .tts_service import TTSService
from .video_service import VideoService
from utils.cloudinary_helper import CloudinaryHelper

logger = logging.getLogger(__name__)

class ProcessingService:
    def __init__(self):
        self.tts_service = TTSService()
        self.video_service = VideoService()
        self.cloudinary_helper = CloudinaryHelper()
        self.processing_tasks = {}
        
        # Backend API configuration
        self.backend_url = os.getenv('BACKEND_API_URL', 'http://localhost:5000')

    def start_lecture_processing(self, lecture_id, text_content, voice_settings=None):
        """Start async processing of a lecture"""
        try:
            task_id = str(uuid.uuid4())
            
            # Initialize task status
            self.processing_tasks[task_id] = {
                'lecture_id': lecture_id,
                'status': 'processing',
                'progress': 0,
                'error': None,
                'created_at': time.time(),
                'results': {}
            }
            
            # Start processing in background thread
            thread = threading.Thread(
                target=self._process_lecture_async,
                args=(task_id, lecture_id, text_content, voice_settings)
            )
            thread.daemon = True
            thread.start()
            
            return task_id
            
        except Exception as e:
            logger.error(f"Failed to start lecture processing: {str(e)}")
            raise

    def _process_lecture_async(self, task_id, lecture_id, text_content, voice_settings):
        """Process lecture in background"""
        try:
            task = self.processing_tasks[task_id]
            
            # Update backend about processing start
            self._update_backend_status(lecture_id, 'processing', 0)
            
            # Step 1: Generate speech (40% of progress)
            task['progress'] = 10
            task['current_step'] = 'Generating speech audio...'
            
            audio_path = self.tts_service.generate_speech(text_content, voice_settings)
            if not audio_path:
                raise Exception("Failed to generate speech audio")
            
            task['progress'] = 40
            
            # Step 2: Upload audio to cloud (50% of progress)
            task['current_step'] = 'Uploading audio...'
            
            audio_url = self.cloudinary_helper.upload_audio(audio_path)
            if not audio_url:
                raise Exception("Failed to upload audio")
            
            task['progress'] = 50
            task['results']['audio_url'] = audio_url
            task['results']['audio_duration'] = self.tts_service.get_audio_duration(audio_path)
            
            # Step 3: Generate video (80% of progress)
            task['current_step'] = 'Generating video...'
            
            video_path, thumbnail_path = self.video_service.generate_video(
                text_content, audio_url, voice_settings.get('videoSettings') if voice_settings else None
            )
            
            if not video_path:
                raise Exception("Failed to generate video")
            
            task['progress'] = 80
            
            # Step 4: Upload video and thumbnail (95% of progress)
            task['current_step'] = 'Uploading video...'
            
            video_url = self.cloudinary_helper.upload_video(video_path)
            if not video_url:
                raise Exception("Failed to upload video")
            
            thumbnail_url = None
            if thumbnail_path:
                thumbnail_url = self.cloudinary_helper.upload_image(thumbnail_path)
            
            task['progress'] = 95
            task['results'].update({
                'video_url': video_url,
                'thumbnail_url': thumbnail_url,
                'video_duration': self.video_service.get_video_duration(video_path)
            })
            
            # Step 5: Update backend with results (100% progress)
            task['current_step'] = 'Finalizing...'
            
            success = self._update_backend_completion(lecture_id, task['results'])
            if not success:
                logger.warning(f"Failed to update backend for lecture {lecture_id}, but processing completed")
            
            # Clean up local files
            for file_path in [audio_path, video_path, thumbnail_path]:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except:
                        pass
            
            # Mark as completed
            task['status'] = 'completed'
            task['progress'] = 100
            task['current_step'] = 'Processing completed'
            task['completed_at'] = time.time()
            
            logger.info(f"Successfully processed lecture {lecture_id}")
            
        except Exception as e:
            logger.error(f"Lecture processing failed for {lecture_id}: {str(e)}")
            
            # Update task status
            task = self.processing_tasks.get(task_id, {})
            task['status'] = 'failed'
            task['error'] = str(e)
            task['failed_at'] = time.time()
            
            # Update backend about failure
            self._update_backend_status(lecture_id, 'failed', task.get('progress', 0), str(e))

    def get_processing_status(self, task_id):
        """Get current processing status"""
        task = self.processing_tasks.get(task_id)
        if not task:
            return None
        
        return {
            'task_id': task_id,
            'lecture_id': task['lecture_id'],
            'status': task['status'],
            'progress': task['progress'],
            'current_step': task.get('current_step', ''),
            'error': task.get('error'),
            'results': task.get('results', {}),
            'created_at': task.get('created_at'),
            'completed_at': task.get('completed_at'),
            'failed_at': task.get('failed_at')
        }

    def _update_backend_status(self, lecture_id, status, progress, error_message=None):
        """Update lecture processing status in backend"""
        try:
            update_data = {
                'status': status,
                'progress': progress
            }
            
            if error_message:
                update_data['errorMessage'] = error_message
            
            response = requests.put(
                f"{self.backend_url}/api/lectures/{lecture_id}/ai-status",
                json=update_data,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Failed to update backend status: {str(e)}")
            return False

    def _update_backend_completion(self, lecture_id, results):
        """Update backend with processing completion results"""
        try:
            completion_data = {
                'status': 'completed',
                'progress': 100,
                'processedAt': time.time(),
                'cloudinaryUrls': {
                    'audio': results.get('audio_url'),
                    'video': results.get('video_url'),
                    'thumbnail': results.get('thumbnail_url')
                },
                'duration': results.get('video_duration', results.get('audio_duration', 0))
            }
            
            response = requests.put(
                f"{self.backend_url}/api/lectures/{lecture_id}/ai-completion",
                json=completion_data,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Failed to update backend completion: {str(e)}")
            return False

    def cleanup_old_tasks(self, max_age_hours=24):
        """Clean up old processing tasks"""
        try:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            tasks_to_remove = []
            for task_id, task in self.processing_tasks.items():
                task_age = current_time - task.get('created_at', current_time)
                if task_age > max_age_seconds:
                    tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self.processing_tasks[task_id]
            
            if tasks_to_remove:
                logger.info(f"Cleaned up {len(tasks_to_remove)} old processing tasks")
                
        except Exception as e:
            logger.error(f"Task cleanup error: {str(e)}")

    def get_all_tasks(self):
        """Get all processing tasks (for debugging)"""
        return self.processing_tasks.copy()

    def cancel_task(self, task_id):
        """Cancel a processing task"""
        try:
            task = self.processing_tasks.get(task_id)
            if not task:
                return False
            
            if task['status'] == 'processing':
                task['status'] = 'cancelled'
                task['cancelled_at'] = time.time()
                
                # Update backend
                self._update_backend_status(
                    task['lecture_id'], 
                    'failed', 
                    task.get('progress', 0), 
                    'Processing was cancelled'
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Task cancellation error: {str(e)}")
            return False