import os
import logging
import tempfile
from typing import Optional, Dict, Any, Tuple
import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment
from pydub.effects import normalize, compress_dynamic_range, low_pass_filter, high_pass_filter
import io

logger = logging.getLogger(__name__)

class AudioService:
    """Audio processing and enhancement service"""
    
    def __init__(self):
        self.sample_rate = int(os.environ.get('AUDIO_SAMPLE_RATE', 44100))
        self.bitrate = os.environ.get('AUDIO_BITRATE', '128k')
        
        # Audio processing presets
        self.presets = {
            'voice_enhance': {
                'high_pass_freq': 80,
                'low_pass_freq': 8000,
                'normalize': True,
                'compress': True,
                'noise_reduction': True
            },
            'music': {
                'high_pass_freq': 20,
                'low_pass_freq': 20000,
                'normalize': True,
                'compress': False,
                'noise_reduction': False
            },
            'podcast': {
                'high_pass_freq': 100,
                'low_pass_freq': 7000,
                'normalize': True,
                'compress': True,
                'noise_reduction': True
            },
            'lecture': {
                'high_pass_freq': 85,
                'low_pass_freq': 6500,
                'normalize': True,
                'compress': True,
                'noise_reduction': True
            }
        }
    
    def process_audio(self, audio_data: bytes, preset: str = 'lecture', 
                     format: str = 'mp3') -> Optional[bytes]:
        """
        Process and enhance audio using specified preset
        
        Args:
            audio_data: Input audio data as bytes
            preset: Processing preset ('voice_enhance', 'music', 'podcast', 'lecture')
            format: Output format ('mp3', 'wav', 'ogg')
            
        Returns:
            Processed audio data as bytes or None if failed
        """
        try:
            if preset not in self.presets:
                preset = 'lecture'
            
            config = self.presets[preset]
            
            # Load audio data
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Apply processing steps
            processed_audio = self._apply_processing(audio_segment, config)
            
            # Export processed audio
            output_buffer = io.BytesIO()
            processed_audio.export(
                output_buffer, 
                format=format, 
                bitrate=self.bitrate,
                parameters=["-ar", str(self.sample_rate)]
            )
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Audio processing failed: {str(e)}")
            return None
    
    def _apply_processing(self, audio: AudioSegment, config: Dict) -> AudioSegment:
        """Apply audio processing based on configuration"""
        try:
            processed = audio
            
            # High-pass filter (remove low frequency noise)
            if config.get('high_pass_freq'):
                processed = high_pass_filter(processed, config['high_pass_freq'])
            
            # Low-pass filter (remove high frequency noise)
            if config.get('low_pass_freq') and config['low_pass_freq'] < 20000:
                processed = low_pass_filter(processed, config['low_pass_freq'])
            
            # Noise reduction (basic)
            if config.get('noise_reduction'):
                processed = self._reduce_noise(processed)
            
            # Normalize audio levels
            if config.get('normalize'):
                processed = normalize(processed, headroom=0.1)
            
            # Dynamic range compression
            if config.get('compress'):
                processed = compress_dynamic_range(processed, threshold=-20.0, ratio=4.0)
            
            return processed
            
        except Exception as e:
            logger.error(f"Audio processing step failed: {str(e)}")
            return audio
    
    def _reduce_noise(self, audio: AudioSegment) -> AudioSegment:
        """Basic noise reduction using spectral gating"""
        try:
            # Convert to numpy array
            samples = np.array(audio.get_array_of_samples())
            
            if audio.channels == 2:
                samples = samples.reshape((-1, 2))
            
            # Simple noise gate - reduce quiet parts
            threshold = np.max(np.abs(samples)) * 0.02  # 2% of max amplitude
            samples = np.where(np.abs(samples) < threshold, samples * 0.1, samples)
            
            # Convert back to AudioSegment
            if audio.channels == 2:
                samples = samples.flatten()
            
            return audio._spawn(
                samples.astype(np.int16).tobytes(),
                overrides={"array_type": audio.array_type}
            )
            
        except Exception as e:
            logger.error(f"Noise reduction failed: {str(e)}")
            return audio
    
    def convert_format(self, audio_data: bytes, input_format: str, 
                      output_format: str) -> Optional[bytes]:
        """Convert audio between different formats"""
        try:
            audio = AudioSegment.from_file(
                io.BytesIO(audio_data), 
                format=input_format
            )
            
            output_buffer = io.BytesIO()
            audio.export(
                output_buffer, 
                format=output_format,
                bitrate=self.bitrate
            )
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Audio format conversion failed: {str(e)}")
            return None
    
    def adjust_volume(self, audio_data: bytes, volume_change_db: float, 
                     format: str = 'mp3') -> Optional[bytes]:
        """Adjust audio volume by specified decibels"""
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            adjusted_audio = audio + volume_change_db
            
            output_buffer = io.BytesIO()
            adjusted_audio.export(output_buffer, format=format, bitrate=self.bitrate)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Volume adjustment failed: {str(e)}")
            return None
    
    def trim_silence(self, audio_data: bytes, format: str = 'mp3') -> Optional[bytes]:
        """Remove silence from beginning and end of audio"""
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Detect non-silent parts
            non_silent = self._detect_nonsilent(audio)
            
            if non_silent:
                start_trim = non_silent[0][0]
                end_trim = non_silent[-1][1]
                trimmed_audio = audio[start_trim:end_trim]
            else:
                trimmed_audio = audio
            
            output_buffer = io.BytesIO()
            trimmed_audio.export(output_buffer, format=format, bitrate=self.bitrate)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Silence trimming failed: {str(e)}")
            return None
    
    def _detect_nonsilent(self, audio: AudioSegment, min_silence_len: int = 1000, 
                         silence_thresh: int = -40) -> list:
        """Detect non-silent chunks in audio"""
        try:
            from pydub.silence import detect_nonsilent
            return detect_nonsilent(
                audio,
                min_silence_len=min_silence_len,
                silence_thresh=silence_thresh
            )
        except Exception as e:
            logger.error(f"Non-silent detection failed: {str(e)}")
            return []
    
    def get_audio_info(self, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Get information about audio file"""
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            
            return {
                'duration': len(audio) / 1000.0,  # Duration in seconds
                'channels': audio.channels,
                'sample_rate': audio.frame_rate,
                'sample_width': audio.sample_width,
                'frame_count': audio.frame_count(),
                'max_amplitude': audio.max,
                'rms': audio.rms,
                'dBFS': audio.dBFS
            }
            
        except Exception as e:
            logger.error(f"Audio info extraction failed: {str(e)}")
            return None
    
    def merge_audio_files(self, audio_files: list, format: str = 'mp3') -> Optional[bytes]:
        """Merge multiple audio files into one"""
        try:
            if not audio_files:
                return None
            
            merged = AudioSegment.empty()
            
            for audio_data in audio_files:
                audio = AudioSegment.from_file(io.BytesIO(audio_data))
                merged += audio
            
            output_buffer = io.BytesIO()
            merged.export(output_buffer, format=format, bitrate=self.bitrate)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Audio merging failed: {str(e)}")
            return None
    
    def add_fade(self, audio_data: bytes, fade_in_duration: int = 1000, 
                fade_out_duration: int = 1000, format: str = 'mp3') -> Optional[bytes]:
        """Add fade in and fade out effects"""
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Apply fade effects
            if fade_in_duration > 0:
                audio = audio.fade_in(fade_in_duration)
            
            if fade_out_duration > 0:
                audio = audio.fade_out(fade_out_duration)
            
            output_buffer = io.BytesIO()
            audio.export(output_buffer, format=format, bitrate=self.bitrate)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Fade effect failed: {str(e)}")
            return None
    
    def extract_audio_features(self, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Extract audio features using librosa"""
        try:
            # Load audio with librosa
            with tempfile.NamedTemporaryFile(suffix='.wav') as temp_file:
                # Convert to wav for librosa
                audio = AudioSegment.from_file(io.BytesIO(audio_data))
                audio.export(temp_file.name, format='wav')
                
                # Load with librosa
                y, sr = librosa.load(temp_file.name, sr=self.sample_rate)
                
                # Extract features
                features = {
                    'mfcc': librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).mean(axis=1).tolist(),
                    'spectral_centroid': librosa.feature.spectral_centroid(y=y, sr=sr).mean(),
                    'spectral_rolloff': librosa.feature.spectral_rolloff(y=y, sr=sr).mean(),
                    'zero_crossing_rate': librosa.feature.zero_crossing_rate(y).mean(),
                    'chroma': librosa.feature.chroma_stft(y=y, sr=sr).mean(axis=1).tolist(),
                    'tempo': librosa.beat.tempo(y=y, sr=sr)[0],
                    'rms_energy': librosa.feature.rms(y=y).mean()
                }
                
                return features
                
        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            return None
    
    def get_available_presets(self) -> Dict[str, Dict]:
        """Get available audio processing presets"""
        return self.presets
    
    def validate_preset(self, preset: str) -> bool:
        """Validate if preset is available"""
        return preset in self.presets