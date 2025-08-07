import os
import uuid
import logging
import requests
import tempfile
from moviepy.editor import *
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2

logger = logging.getLogger(__name__)

class VideoService:
    def __init__(self):
        self.default_video_settings = {
            'resolution': '1280x720',
            'fps': 24,
            'background_color': '#1a1a2e',
            'text_color': '#ffffff',
            'font_size': 48,
            'animation_style': 'fade',
            'show_waveform': True,
            'background_image': None
        }

    def generate_video(self, text, audio_url, video_settings=None):
        """Generate video from text and audio"""
        try:
            # Merge settings
            settings = self.default_video_settings.copy()
            if video_settings:
                settings.update(video_settings)
            
            # Download audio
            audio_path = self._download_audio(audio_url)
            if not audio_path:
                logger.error("Failed to download audio")
                return None, None
            
            # Create video
            video_path, thumbnail_path = self._create_video_with_text(text, audio_path, settings)
            
            # Clean up audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return video_path, thumbnail_path
            
        except Exception as e:
            logger.error(f"Video generation error: {str(e)}")
            return None, None

    def _download_audio(self, audio_url):
        """Download audio file from URL"""
        try:
            response = requests.get(audio_url, stream=True)
            response.raise_for_status()
            
            # Save to temp file
            temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            
            for chunk in response.iter_content(chunk_size=8192):
                temp_audio.write(chunk)
            
            temp_audio.close()
            return temp_audio.name
            
        except Exception as e:
            logger.error(f"Audio download error: {str(e)}")
            return None

    def _create_video_with_text(self, text, audio_path, settings):
        """Create video with animated text over background"""
        try:
            # Parse resolution
            width, height = map(int, settings['resolution'].split('x'))
            
            # Load audio
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            
            # Create background
            if settings.get('background_image'):
                # Use custom background image
                bg_clip = self._create_image_background(settings['background_image'], width, height, duration)
            else:
                # Use solid color background
                bg_clip = self._create_solid_background(settings['background_color'], width, height, duration)
            
            # Create text clips
            text_clips = self._create_text_clips(text, width, height, duration, settings)
            
            # Create waveform visualization if enabled
            waveform_clips = []
            if settings['show_waveform']:
                waveform_clip = self._create_waveform_visualization(audio_path, width, height, duration)
                if waveform_clip:
                    waveform_clips.append(waveform_clip)
            
            # Composite all elements
            final_clips = [bg_clip] + text_clips + waveform_clips
            video_clip = CompositeVideoClip(final_clips, size=(width, height))
            video_clip = video_clip.set_audio(audio_clip)
            video_clip = video_clip.set_duration(duration)
            
            # Generate output filename
            video_filename = f"lecture_{uuid.uuid4().hex}.mp4"
            video_path = os.path.join('uploads/video', video_filename)
            
            # Render video
            video_clip.write_videofile(
                video_path,
                fps=settings['fps'],
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                logger=None  # Disable moviepy logging
            )
            
            # Generate thumbnail
            thumbnail_path = self._generate_thumbnail(video_clip, video_path)
            
            # Clean up
            video_clip.close()
            audio_clip.close()
            
            return video_path, thumbnail_path
            
        except Exception as e:
            logger.error(f"Video creation error: {str(e)}")
            return None, None

    def _create_solid_background(self, color, width, height, duration):
        """Create solid color background clip"""
        try:
            # Convert hex color to RGB
            if color.startswith('#'):
                color = color[1:]
            rgb = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
            
            # Create color clip
            bg_clip = ColorClip(size=(width, height), color=rgb, duration=duration)
            return bg_clip
            
        except Exception as e:
            logger.error(f"Background creation error: {str(e)}")
            # Return default background
            return ColorClip(size=(width, height), color=(26, 26, 46), duration=duration)

    def _create_image_background(self, bg_image_url, width, height, duration):
        """Create background from image URL"""
        try:
            # Download background image
            response = requests.get(bg_image_url)
            response.raise_for_status()
            
            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_img:
                temp_img.write(response.content)
                temp_img_path = temp_img.name
            
            # Create image clip
            img_clip = ImageClip(temp_img_path, duration=duration)
            img_clip = img_clip.resize((width, height))
            
            # Clean up temp file
            os.unlink(temp_img_path)
            
            return img_clip
            
        except Exception as e:
            logger.error(f"Image background error: {str(e)}")
            # Fallback to solid background
            return self._create_solid_background('#1a1a2e', width, height, duration)

    def _create_text_clips(self, text, width, height, duration, settings):
        """Create animated text clips"""
        try:
            # Split text into manageable chunks
            words_per_chunk = 20  # Adjust based on screen size
            words = text.split()
            text_chunks = []
            
            for i in range(0, len(words), words_per_chunk):
                chunk = ' '.join(words[i:i + words_per_chunk])
                text_chunks.append(chunk)
            
            if not text_chunks:
                return []
            
            # Create text clips for each chunk
            text_clips = []
            chunk_duration = duration / len(text_chunks) if len(text_chunks) > 1 else duration
            
            for i, chunk in enumerate(text_chunks):
                start_time = i * chunk_duration
                
                # Create text clip
                txt_clip = TextClip(
                    chunk,
                    fontsize=settings['font_size'],
                    color=settings['text_color'],
                    font='Arial-Bold',
                    method='caption',
                    size=(width - 100, None),  # Leave margin
                    align='center'
                ).set_duration(chunk_duration).set_start(start_time)
                
                # Position text
                txt_clip = txt_clip.set_position(('center', 'center'))
                
                # Apply animation
                if settings['animation_style'] == 'fade':
                    txt_clip = txt_clip.crossfadein(0.5).crossfadeout(0.5)
                elif settings['animation_style'] == 'slide':
                    txt_clip = txt_clip.set_position(lambda t: ('center', height + 100 - (height + 200) * t / chunk_duration))
                
                text_clips.append(txt_clip)
            
            return text_clips
            
        except Exception as e:
            logger.error(f"Text clips creation error: {str(e)}")
            # Create simple text clip as fallback
            try:
                fallback_clip = TextClip(
                    text[:200] + "..." if len(text) > 200 else text,
                    fontsize=36,
                    color='white',
                    font='Arial'
                ).set_duration(duration).set_position('center')
                return [fallback_clip]
            except:
                return []

    def _create_waveform_visualization(self, audio_path, width, height, duration):
        """Create waveform visualization"""
        try:
            # This is a simplified waveform - for production, consider using librosa
            # Create a simple animated bar visualization
            
            def make_frame(t):
                # Create frame with animated bars
                frame = np.zeros((height, width, 3), dtype=np.uint8)
                
                # Simple animation - create bars that move with time
                bar_count = 50
                bar_width = width // bar_count
                
                for i in range(bar_count):
                    # Simulate audio amplitude with sine waves
                    amplitude = abs(np.sin(t * 2 + i * 0.5)) * 100 + 20
                    bar_height = int(amplitude)
                    
                    x1 = i * bar_width
                    x2 = x1 + bar_width - 2
                    y1 = height - bar_height
                    y2 = height
                    
                    # Draw bar (simple colored rectangle)
                    frame[y1:y2, x1:x2] = [0, 150, 255]  # Blue bars
                
                return frame
            
            waveform_clip = VideoClip(make_frame, duration=duration)
            waveform_clip = waveform_clip.set_position(('center', height - 120))
            waveform_clip = waveform_clip.resize(width=width-200, height=80)
            waveform_clip = waveform_clip.set_opacity(0.7)
            
            return waveform_clip
            
        except Exception as e:
            logger.error(f"Waveform visualization error: {str(e)}")
            return None

    def _generate_thumbnail(self, video_clip, video_path):
        """Generate thumbnail from video"""
        try:
            thumbnail_filename = f"thumb_{uuid.uuid4().hex}.jpg"
            thumbnail_path = os.path.join('uploads/images', thumbnail_filename)
            
            # Extract frame at 10% of video duration
            frame_time = video_clip.duration * 0.1
            frame = video_clip.get_frame(frame_time)
            
            # Save as image
            from PIL import Image
            img = Image.fromarray(frame)
            img.thumbnail((320, 240), Image.Resampling.LANCZOS)
            img.save(thumbnail_path, 'JPEG', quality=85)
            
            return thumbnail_path
            
        except Exception as e:
            logger.error(f"Thumbnail generation error: {str(e)}")
            return None

    def get_video_duration(self, video_path):
        """Get duration of video file in seconds"""
        try:
            if not os.path.exists(video_path):
                return 0
            
            video_clip = VideoFileClip(video_path)
            duration = video_clip.duration
            video_clip.close()
            
            return duration
            
        except Exception as e:
            logger.error(f"Video duration error: {str(e)}")
            return 0

    def optimize_video(self, video_path, optimization_settings=None):
        """Optimize video file for web delivery"""
        try:
            settings = {
                'target_size_mb': 50,
                'max_bitrate': '2000k',
                'audio_bitrate': '128k',
                'crf': 23  # Constant Rate Factor for quality
            }
            
            if optimization_settings:
                settings.update(optimization_settings)
            
            # Load video
            video_clip = VideoFileClip(video_path)
            
            # Generate optimized filename
            optimized_filename = f"optimized_{uuid.uuid4().hex}.mp4"
            optimized_path = os.path.join('uploads/video', optimized_filename)
            
            # Write optimized video
            video_clip.write_videofile(
                optimized_path,
                bitrate=settings['max_bitrate'],
                audio_bitrate=settings['audio_bitrate'],
                codec='libx264',
                audio_codec='aac',
                logger=None
            )
            
            video_clip.close()
            
            return optimized_path if os.path.exists(optimized_path) else None
            
        except Exception as e:
            logger.error(f"Video optimization error: {str(e)}")
            return None