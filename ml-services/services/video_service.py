import os
import logging
import tempfile
import uuid
from typing import Optional, Dict, Any, List, Tuple
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import moviepy.editor as mp
from moviepy.video.fx import resize
import textwrap
import io

logger = logging.getLogger(__name__)

class VideoService:
    """AI Video generation service for creating lectures from text and audio"""
    
    def __init__(self):
        self.video_width = int(os.environ.get('VIDEO_WIDTH', 1280))
        self.video_height = int(os.environ.get('VIDEO_HEIGHT', 720))
        self.video_fps = int(os.environ.get('VIDEO_FPS', 30))
        self.video_bitrate = os.environ.get('VIDEO_BITRATE', '2M')
        
        # Video styles configuration
        self.styles = {
            'presentation': {
                'background_color': (45, 55, 72),  # Dark blue-gray
                'text_color': (255, 255, 255),     # White
                'accent_color': (66, 153, 225),    # Light blue
                'font_size_title': 72,
                'font_size_body': 48,
                'padding': 80
            },
            'modern': {
                'background_color': (26, 32, 44),  # Dark gray
                'text_color': (247, 250, 252),     # Off-white
                'accent_color': (129, 230, 217),   # Teal
                'font_size_title': 68,
                'font_size_body': 44,
                'padding': 100
            },
            'classic': {
                'background_color': (255, 255, 255), # White
                'text_color': (45, 55, 72),          # Dark gray
                'accent_color': (68, 90, 120),       # Navy blue
                'font_size_title': 64,
                'font_size_body': 42,
                'padding': 90
            },
            'minimal': {
                'background_color': (248, 250, 252), # Light gray
                'text_color': (45, 55, 72),          # Dark gray
                'accent_color': (159, 122, 234),     # Purple
                'font_size_title': 60,
                'font_size_body': 40,
                'padding': 120
            }
        }
    
    def generate_lecture_video(self, text: str, audio_data: bytes, 
                             style: str = 'presentation', 
                             title: str = '', 
                             subtitle: str = '') -> Optional[bytes]:
        """
        Generate a lecture video from text and audio
        
        Args:
            text: Main lecture content text
            audio_data: Audio data as bytes
            style: Video style ('presentation', 'modern', 'classic', 'minimal')
            title: Lecture title
            subtitle: Lecture subtitle
            
        Returns:
            Video data as bytes or None if failed
        """
        try:
            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as audio_file:
                audio_file.write(audio_data)
                audio_file_path = audio_file.name
            
            # Load audio to get duration
            audio_clip = mp.AudioFileClip(audio_file_path)
            duration = audio_clip.duration
            
            # Generate video frames
            video_frames = self._generate_video_frames(text, duration, style, title, subtitle)
            
            if not video_frames:
                raise ValueError("Failed to generate video frames")
            
            # Create video clip from frames
            video_clip = self._create_video_from_frames(video_frames, duration)
            
            # Add audio to video
            final_video = video_clip.set_audio(audio_clip)
            
            # Export video
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_file:
                video_file_path = video_file.name
            
            final_video.write_videofile(
                video_file_path,
                fps=self.video_fps,
                bitrate=self.video_bitrate,
                audio_bitrate='128k',
                codec='libx264',
                audio_codec='aac',
                verbose=False,
                logger=None
            )
            
            # Read video file
            with open(video_file_path, 'rb') as video_file:
                video_data = video_file.read()
            
            # Cleanup
            os.unlink(audio_file_path)
            os.unlink(video_file_path)
            audio_clip.close()
            video_clip.close()
            final_video.close()
            
            return video_data
            
        except Exception as e:
            logger.error(f"Video generation failed: {str(e)}")
            return None
    
    def _generate_video_frames(self, text: str, duration: float, style: str, 
                             title: str, subtitle: str) -> Optional[List[np.ndarray]]:
        """Generate video frames based on text content"""
        try:
            style_config = self.styles.get(style, self.styles['presentation'])
            
            # Split text into sections
            sections = self._split_text_into_sections(text)
            
            frames = []
            frames_per_second = self.video_fps
            total_frames = int(duration * frames_per_second)
            
            # Generate title frame (first 3 seconds)
            title_frames = int(3 * frames_per_second) if title else 0
            if title_frames > 0:
                title_frame = self._create_title_frame(title, subtitle, style_config)
                frames.extend([title_frame] * title_frames)
            
            # Generate content frames
            remaining_frames = total_frames - title_frames
            frames_per_section = max(1, remaining_frames // len(sections)) if sections else remaining_frames
            
            for i, section in enumerate(sections):
                section_frames = frames_per_section
                
                # Adjust for last section to use all remaining frames
                if i == len(sections) - 1:
                    section_frames = remaining_frames - (i * frames_per_section)
                
                section_frame = self._create_content_frame(section, style_config, i + 1)
                frames.extend([section_frame] * section_frames)
            
            return frames
            
        except Exception as e:
            logger.error(f"Frame generation failed: {str(e)}")
            return None
    
    def _split_text_into_sections(self, text: str, max_chars_per_section: int = 300) -> List[str]:
        """Split text into manageable sections for video frames"""
        sentences = text.split('. ')
        sections = []
        current_section = ""
        
        for sentence in sentences:
            if len(current_section + sentence) <= max_chars_per_section:
                current_section += sentence + ". "
            else:
                if current_section:
                    sections.append(current_section.strip())
                current_section = sentence + ". "
        
        if current_section:
            sections.append(current_section.strip())
        
        # If no sections created, split by character limit
        if not sections:
            sections = [text[i:i+max_chars_per_section] 
                       for i in range(0, len(text), max_chars_per_section)]
        
        return sections
    
    def _create_title_frame(self, title: str, subtitle: str, style_config: Dict) -> np.ndarray:
        """Create a title frame"""
        try:
            # Create image
            img = Image.new('RGB', (self.video_width, self.video_height), 
                          style_config['background_color'])
            draw = ImageDraw.Draw(img)
            
            # Try to load custom font, fallback to default
            try:
                title_font = ImageFont.truetype("arial.ttf", style_config['font_size_title'])
                subtitle_font = ImageFont.truetype("arial.ttf", style_config['font_size_body'])
            except (IOError, OSError):
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
            
            # Calculate text positions
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_height = title_bbox[3] - title_bbox[1]
            
            title_x = (self.video_width - title_width) // 2
            title_y = (self.video_height // 2) - (title_height // 2) - 50
            
            # Draw title
            draw.text((title_x, title_y), title, 
                     fill=style_config['text_color'], font=title_font)
            
            # Draw subtitle if provided
            if subtitle:
                subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
                subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
                subtitle_x = (self.video_width - subtitle_width) // 2
                subtitle_y = title_y + title_height + 40
                
                draw.text((subtitle_x, subtitle_y), subtitle, 
                         fill=style_config['accent_color'], font=subtitle_font)
            
            # Add decorative elements
            self._add_decorative_elements(draw, style_config)
            
            # Convert to numpy array
            frame = np.array(img)
            return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            logger.error(f"Title frame creation failed: {str(e)}")
            # Return solid color frame as fallback
            return np.full((self.video_height, self.video_width, 3), 
                          style_config['background_color'][::-1], dtype=np.uint8)
    
    def _create_content_frame(self, text: str, style_config: Dict, section_number: int) -> np.ndarray:
        """Create a content frame with text"""
        try:
            # Create image
            img = Image.new('RGB', (self.video_width, self.video_height), 
                          style_config['background_color'])
            draw = ImageDraw.Draw(img)
            
            # Try to load font
            try:
                font = ImageFont.truetype("arial.ttf", style_config['font_size_body'])
            except (IOError, OSError):
                font = ImageFont.load_default()
            
            # Wrap text to fit frame
            max_width = self.video_width - (2 * style_config['padding'])
            wrapped_text = self._wrap_text(text, font, max_width, draw)
            
            # Calculate text position
            text_bbox = draw.textbbox((0, 0), wrapped_text, font=font)
            text_height = text_bbox[3] - text_bbox[1]
            
            text_x = style_config['padding']
            text_y = (self.video_height - text_height) // 2
            
            # Draw text
            draw.text((text_x, text_y), wrapped_text, 
                     fill=style_config['text_color'], font=font)
            
            # Add section indicator
            self._add_section_indicator(draw, style_config, section_number)
            
            # Add decorative elements
            self._add_decorative_elements(draw, style_config)
            
            # Convert to numpy array
            frame = np.array(img)
            return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            logger.error(f"Content frame creation failed: {str(e)}")
            # Return solid color frame as fallback
            return np.full((self.video_height, self.video_width, 3), 
                          style_config['background_color'][::-1], dtype=np.uint8)
    
    def _wrap_text(self, text: str, font, max_width: int, draw) -> str:
        """Wrap text to fit within specified width"""
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            text_bbox = draw.textbbox((0, 0), test_line, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            
            if text_width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    # Word is too long, break it
                    lines.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return '\n'.join(lines)
    
    def _add_section_indicator(self, draw, style_config: Dict, section_number: int):
        """Add section number indicator"""
        try:
            # Draw section number in top-right corner
            section_text = f"Section {section_number}"
            try:
                small_font = ImageFont.truetype("arial.ttf", 24)
            except (IOError, OSError):
                small_font = ImageFont.load_default()
            
            text_bbox = draw.textbbox((0, 0), section_text, font=small_font)
            text_width = text_bbox[2] - text_bbox[0]
            
            x = self.video_width - text_width - 40
            y = 40
            
            draw.text((x, y), section_text, 
                     fill=style_config['accent_color'], font=small_font)
            
        except Exception as e:
            logger.error(f"Section indicator creation failed: {str(e)}")
    
    def _add_decorative_elements(self, draw, style_config: Dict):
        """Add decorative elements to frame"""
        try:
            # Add accent line at bottom
            line_y = self.video_height - 20
            draw.line([(40, line_y), (self.video_width - 40, line_y)], 
                     fill=style_config['accent_color'], width=4)
            
            # Add corner accents
            corner_size = 30
            # Top-left
            draw.line([(20, 20), (20 + corner_size, 20)], 
                     fill=style_config['accent_color'], width=3)
            draw.line([(20, 20), (20, 20 + corner_size)], 
                     fill=style_config['accent_color'], width=3)
            
            # Top-right
            draw.line([(self.video_width - 20 - corner_size, 20), (self.video_width - 20, 20)], 
                     fill=style_config['accent_color'], width=3)
            draw.line([(self.video_width - 20, 20), (self.video_width - 20, 20 + corner_size)], 
                     fill=style_config['accent_color'], width=3)
            
        except Exception as e:
            logger.error(f"Decorative elements creation failed: {str(e)}")
    
    def _create_video_from_frames(self, frames: List[np.ndarray], duration: float) -> mp.VideoClip:
        """Create video clip from list of frames"""
        try:
            def make_frame(t):
                frame_index = min(int(t * self.video_fps), len(frames) - 1)
                return frames[frame_index]
            
            return mp.VideoClip(make_frame, duration=duration)
            
        except Exception as e:
            logger.error(f"Video clip creation failed: {str(e)}")
            raise
    
    def get_available_styles(self) -> Dict[str, Dict]:
        """Get available video styles"""
        return self.styles
    
    def validate_style(self, style: str) -> bool:
        """Validate if style is available"""
        return style in self.styles
    
    def estimate_processing_time(self, duration: float) -> float:
        """Estimate video processing time based on duration"""
        # Rough estimate: 2-3x the video duration for processing
        return duration * 2.5