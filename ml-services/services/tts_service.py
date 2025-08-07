import os
import logging
import tempfile
from typing import Optional, Dict, Any
import requests
from gtts import gTTS
import soundfile as sf
import numpy as np
from pydub import AudioSegment
from pydub.effects import normalize, compress_dynamic_range
import io

logger = logging.getLogger(__name__)

class TTSService:
    """Text-to-Speech service with multiple providers"""
    
    def __init__(self):
        self.elevenlabs_api_key = os.environ.get('TTS_API_KEY')
        self.elevenlabs_url = os.environ.get('TTS_API_URL', 'https://api.elevenlabs.io/v1')
        self.azure_speech_key = os.environ.get('AZURE_SPEECH_KEY')
        self.azure_region = os.environ.get('AZURE_SPEECH_REGION')
        
        # Available voices for different providers
        self.voices = {
            'elevenlabs': {
                'rachel': 'EXAVITQu4vr4xnSDxMaL',
                'drew': '29vD33N1CtxCmqQRPOHJ',
                'clyde': '2EiwWnXFnvU5JabPnv8n',
                'dave': 'CYw3kZ02Hs0563khs1Fj',
                'fin': 'D38z5RcWu1voky8WS1ja',
                'sarah': 'EriHKr64gZ1BNTcVS5aA',
                'antoni': 'ErXwobaYiN019PkySvjV',
                'thomas': 'GBv7mTt0atIp3Br8iCZE',
                'charlie': 'IKne3meq5aSn9XLyUdCD',
                'george': 'JBFqnCBsd6RMkjVDRZzb',
                'emily': 'LcfcDJNUP1GQjkzn1xUU',
                'elli': 'MF3mGyEYCl7XYWbV9V6O',
                'callum': 'N2lVS1w4EtoT3dr4eOWO',
                'patrick': 'ODq5zmih8GrVes37Dizd',
                'harry': 'SOYHLrjzK2X1ezoPC6cr',
                'liam': 'TX3LPaxmHKxFdv7VOQHJ',
                'dorothy': 'ThT5KcBeYPX3keUQqHPh',
                'josh': 'TxGEqnHWrfWFTfGW9XjX',
                'arnold': 'VR6AewLTigWG4xSOukaG',
                'adam': 'pNInz6obpgDQGcFmaJgB',
                'sam': 'yoZ06aMxZJJ28mfd3POQ'
            },
            'gtts': {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'italian': 'it',
                'portuguese': 'pt',
                'russian': 'ru',
                'japanese': 'ja',
                'korean': 'ko',
                'chinese': 'zh',
                'hindi': 'hi',
                'arabic': 'ar'
            }
        }
    
    def text_to_speech(self, text: str, voice: str = 'rachel', provider: str = 'auto', 
                      speed: float = 1.0, language: str = 'en') -> Optional[bytes]:
        """
        Convert text to speech using the specified provider and voice
        
        Args:
            text: Text to convert
            voice: Voice name or ID
            provider: TTS provider ('elevenlabs', 'gtts', 'auto')
            speed: Speech speed (0.25 to 2.0)
            language: Language code for TTS
            
        Returns:
            Audio data as bytes or None if failed
        """
        try:
            if provider == 'auto':
                # Auto-select provider based on availability
                if self.elevenlabs_api_key and voice in self.voices['elevenlabs']:
                    provider = 'elevenlabs'
                else:
                    provider = 'gtts'
            
            if provider == 'elevenlabs':
                return self._elevenlabs_tts(text, voice, speed)
            elif provider == 'gtts':
                return self._gtts_tts(text, voice, language, speed)
            else:
                raise ValueError(f"Unsupported TTS provider: {provider}")
                
        except Exception as e:
            logger.error(f"TTS conversion failed: {str(e)}")
            return None
    
    def _elevenlabs_tts(self, text: str, voice: str, speed: float) -> Optional[bytes]:
        """Convert text to speech using ElevenLabs API"""
        try:
            if not self.elevenlabs_api_key:
                raise ValueError("ElevenLabs API key not configured")
            
            voice_id = self.voices['elevenlabs'].get(voice, voice)
            
            url = f"{self.elevenlabs_url}/text-to-speech/{voice_id}/stream"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_api_key
            }
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.75,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=60)
            response.raise_for_status()
            
            audio_data = response.content
            
            # Apply speed adjustment if needed
            if speed != 1.0:
                audio_data = self._adjust_audio_speed(audio_data, speed)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {str(e)}")
            return None
    
    def _gtts_tts(self, text: str, voice: str, language: str, speed: float) -> Optional[bytes]:
        """Convert text to speech using Google TTS"""
        try:
            # Map voice to language if needed
            if voice in self.voices['gtts']:
                language = self.voices['gtts'][voice]
            
            # Create gTTS object
            tts = gTTS(text=text, lang=language, slow=False)
            
            # Save to temporary buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            audio_data = audio_buffer.getvalue()
            
            # Apply speed adjustment if needed
            if speed != 1.0:
                audio_data = self._adjust_audio_speed(audio_data, speed)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"Google TTS failed: {str(e)}")
            return None
    
    def _adjust_audio_speed(self, audio_data: bytes, speed: float) -> bytes:
        """Adjust audio playback speed"""
        try:
            # Load audio data
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Adjust speed
            if speed > 1.0:
                # Speed up
                audio_segment = audio_segment.speedup(playback_speed=speed)
            elif speed < 1.0:
                # Slow down
                audio_segment = audio_segment._spawn(
                    audio_segment.raw_data,
                    overrides={
                        "frame_rate": int(audio_segment.frame_rate * speed)
                    }
                ).set_frame_rate(audio_segment.frame_rate)
            
            # Export back to bytes
            output_buffer = io.BytesIO()
            audio_segment.export(output_buffer, format="mp3")
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Audio speed adjustment failed: {str(e)}")
            return audio_data
    
    def enhance_audio(self, audio_data: bytes, format: str = "mp3") -> bytes:
        """Enhance audio quality with normalization and compression"""
        try:
            # Load audio
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_data), format=format)
            
            # Apply audio enhancements
            enhanced_audio = normalize(audio_segment)
            enhanced_audio = compress_dynamic_range(enhanced_audio)
            
            # Export enhanced audio
            output_buffer = io.BytesIO()
            enhanced_audio.export(output_buffer, format=format, bitrate="128k")
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Audio enhancement failed: {str(e)}")
            return audio_data
    
    def get_available_voices(self, provider: str = 'all') -> Dict[str, Any]:
        """Get list of available voices for specified provider"""
        if provider == 'all':
            return self.voices
        elif provider in self.voices:
            return {provider: self.voices[provider]}
        else:
            return {}
    
    def validate_voice(self, voice: str, provider: str = 'auto') -> bool:
        """Validate if voice is available for the provider"""
        if provider == 'auto':
            return any(voice in voices for voices in self.voices.values())
        elif provider in self.voices:
            return voice in self.voices[provider]
        return False
    
    def estimate_duration(self, text: str, words_per_minute: int = 150) -> float:
        """Estimate audio duration based on text length"""
        words = len(text.split())
        duration_minutes = words / words_per_minute
        return duration_minutes * 60  # Return seconds