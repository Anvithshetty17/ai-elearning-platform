import cv2
import numpy as np
from typing import Tuple, Optional, List
import tempfile
import os

def get_video_info(video_path: str) -> Optional[dict]:
    """
    Get video information using OpenCV
    
    Args:
        video_path: Path to video file
        
    Returns:
        Dictionary with video info or None if failed
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return None
        
        info = {
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'duration': 0,
            'codec': int(cap.get(cv2.CAP_PROP_FOURCC))
        }
        
        # Calculate duration
        if info['fps'] > 0:
            info['duration'] = info['frame_count'] / info['fps']
        
        cap.release()
        return info
        
    except Exception as e:
        print(f"Error getting video info: {str(e)}")
        return None

def resize_video_frame(frame: np.ndarray, width: int, height: int, 
                      maintain_aspect: bool = True) -> np.ndarray:
    """
    Resize video frame
    
    Args:
        frame: Input frame
        width: Target width
        height: Target height
        maintain_aspect: Whether to maintain aspect ratio
        
    Returns:
        Resized frame
    """
    try:
        if maintain_aspect:
            # Calculate aspect ratio preserving dimensions
            h, w = frame.shape[:2]
            aspect_ratio = w / h
            
            if aspect_ratio > width / height:
                # Width is the limiting factor
                new_width = width
                new_height = int(width / aspect_ratio)
            else:
                # Height is the limiting factor
                new_height = height
                new_width = int(height * aspect_ratio)
            
            # Resize frame
            resized = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
            
            # Create canvas and center the resized frame
            canvas = np.zeros((height, width, 3), dtype=np.uint8)
            y_offset = (height - new_height) // 2
            x_offset = (width - new_width) // 2
            canvas[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
            
            return canvas
        else:
            return cv2.resize(frame, (width, height), interpolation=cv2.INTER_LANCZOS4)
            
    except Exception as e:
        print(f"Error resizing frame: {str(e)}")
        return frame

def extract_video_frames(video_path: str, max_frames: int = 100) -> List[np.ndarray]:
    """
    Extract frames from video
    
    Args:
        video_path: Path to video file
        max_frames: Maximum number of frames to extract
        
    Returns:
        List of frames as numpy arrays
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return []
        
        frames = []
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Calculate frame skip to get evenly distributed frames
        skip = max(1, frame_count // max_frames) if frame_count > max_frames else 1
        
        frame_idx = 0
        while len(frames) < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                break
                
            frames.append(frame.copy())
            frame_idx += skip
        
        cap.release()
        return frames
        
    except Exception as e:
        print(f"Error extracting frames: {str(e)}")
        return []

def create_video_thumbnail(video_path: str, timestamp: float = 0.0, 
                         size: Tuple[int, int] = (320, 180)) -> Optional[np.ndarray]:
    """
    Create thumbnail from video at specific timestamp
    
    Args:
        video_path: Path to video file
        timestamp: Timestamp in seconds
        size: Thumbnail size (width, height)
        
    Returns:
        Thumbnail as numpy array or None if failed
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return None
        
        # Set position to timestamp
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_number = int(timestamp * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return None
        
        # Resize to thumbnail size
        thumbnail = resize_video_frame(frame, size[0], size[1], maintain_aspect=True)
        
        return thumbnail
        
    except Exception as e:
        print(f"Error creating thumbnail: {str(e)}")
        return None

def apply_video_filters(frame: np.ndarray, filters: dict) -> np.ndarray:
    """
    Apply filters to video frame
    
    Args:
        frame: Input frame
        filters: Dictionary of filters and their parameters
        
    Returns:
        Filtered frame
    """
    try:
        result = frame.copy()
        
        # Brightness adjustment
        if 'brightness' in filters:
            brightness = filters['brightness']  # -100 to 100
            if brightness != 0:
                if brightness > 0:
                    result = cv2.add(result, np.ones_like(result) * brightness)
                else:
                    result = cv2.subtract(result, np.ones_like(result) * abs(brightness))
        
        # Contrast adjustment
        if 'contrast' in filters:
            contrast = filters['contrast']  # 0.0 to 3.0, 1.0 is no change
            if contrast != 1.0:
                result = cv2.convertScaleAbs(result, alpha=contrast, beta=0)
        
        # Saturation adjustment
        if 'saturation' in filters:
            saturation = filters['saturation']  # 0.0 to 2.0, 1.0 is no change
            if saturation != 1.0:
                hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
                hsv[:, :, 1] = cv2.multiply(hsv[:, :, 1], saturation)
                result = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
        # Blur effect
        if 'blur' in filters:
            blur_amount = filters['blur']  # 0 to 50
            if blur_amount > 0:
                kernel_size = blur_amount * 2 + 1
                result = cv2.GaussianBlur(result, (kernel_size, kernel_size), 0)
        
        # Sharpen effect
        if 'sharpen' in filters:
            sharpen_amount = filters['sharpen']  # 0.0 to 2.0
            if sharpen_amount > 0:
                kernel = np.array([[-1, -1, -1],
                                 [-1, 9, -1],
                                 [-1, -1, -1]]) * sharpen_amount
                result = cv2.filter2D(result, -1, kernel)
        
        return np.clip(result, 0, 255).astype(np.uint8)
        
    except Exception as e:
        print(f"Error applying filters: {str(e)}")
        return frame

def add_text_overlay(frame: np.ndarray, text: str, position: Tuple[int, int], 
                    font_scale: float = 1.0, color: Tuple[int, int, int] = (255, 255, 255),
                    thickness: int = 2, background: bool = True) -> np.ndarray:
    """
    Add text overlay to video frame
    
    Args:
        frame: Input frame
        text: Text to overlay
        position: Text position (x, y)
        font_scale: Font scale
        color: Text color (B, G, R)
        thickness: Text thickness
        background: Whether to add background rectangle
        
    Returns:
        Frame with text overlay
    """
    try:
        result = frame.copy()
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Get text size
        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        
        # Add background rectangle
        if background:
            padding = 10
            rect_start = (position[0] - padding, position[1] - text_size[1] - padding)
            rect_end = (position[0] + text_size[0] + padding, position[1] + padding)
            cv2.rectangle(result, rect_start, rect_end, (0, 0, 0), -1)
        
        # Add text
        cv2.putText(result, text, position, font, font_scale, color, thickness, cv2.LINE_AA)
        
        return result
        
    except Exception as e:
        print(f"Error adding text overlay: {str(e)}")
        return frame

def create_fade_transition(frame1: np.ndarray, frame2: np.ndarray, 
                         alpha: float) -> np.ndarray:
    """
    Create fade transition between two frames
    
    Args:
        frame1: First frame
        frame2: Second frame
        alpha: Blend factor (0.0 to 1.0)
        
    Returns:
        Blended frame
    """
    try:
        # Ensure frames have same dimensions
        if frame1.shape != frame2.shape:
            frame2 = cv2.resize(frame2, (frame1.shape[1], frame1.shape[0]))
        
        # Blend frames
        result = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
        
        return result
        
    except Exception as e:
        print(f"Error creating fade transition: {str(e)}")
        return frame1

def detect_scene_changes(video_path: str, threshold: float = 0.3) -> List[float]:
    """
    Detect scene changes in video
    
    Args:
        video_path: Path to video file
        threshold: Scene change threshold (0.0 to 1.0)
        
    Returns:
        List of timestamps where scene changes occur
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return []
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        scene_changes = []
        
        ret, prev_frame = cap.read()
        if not ret:
            cap.release()
            return []
        
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        frame_number = 1
        
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
            
            # Calculate histogram difference
            prev_hist = cv2.calcHist([prev_gray], [0], None, [256], [0, 256])
            curr_hist = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])
            
            # Compare histograms
            correlation = cv2.compareHist(prev_hist, curr_hist, cv2.HISTCMP_CORREL)
            
            # If correlation is below threshold, it's a scene change
            if correlation < (1 - threshold):
                timestamp = frame_number / fps
                scene_changes.append(timestamp)
            
            prev_gray = curr_gray
            frame_number += 1
        
        cap.release()
        return scene_changes
        
    except Exception as e:
        print(f"Error detecting scene changes: {str(e)}")
        return []

def optimize_video_quality(input_path: str, output_path: str, 
                         quality: str = 'medium') -> bool:
    """
    Optimize video quality and size
    
    Args:
        input_path: Input video path
        output_path: Output video path
        quality: Quality preset ('low', 'medium', 'high')
        
    Returns:
        True if successful, False otherwise
    """
    try:
        import subprocess
        
        quality_settings = {
            'low': {'crf': '28', 'preset': 'ultrafast'},
            'medium': {'crf': '23', 'preset': 'medium'},
            'high': {'crf': '18', 'preset': 'slow'}
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        # Use ffmpeg to optimize video
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-crf', settings['crf'],
            '-preset', settings['preset'],
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',  # Overwrite output file
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        return True
        
    except Exception as e:
        print(f"Error optimizing video: {str(e)}")
        return False

def get_video_codec_info(video_path: str) -> Optional[dict]:
    """
    Get video codec information
    
    Args:
        video_path: Path to video file
        
    Returns:
        Dictionary with codec info or None if failed
    """
    try:
        import subprocess
        
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        import json
        data = json.loads(result.stdout)
        
        video_stream = None
        audio_stream = None
        
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
            elif stream.get('codec_type') == 'audio':
                audio_stream = stream
        
        return {
            'video': video_stream,
            'audio': audio_stream
        }
        
    except Exception as e:
        print(f"Error getting codec info: {str(e)}")
        return None