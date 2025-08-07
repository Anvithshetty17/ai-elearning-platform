import os
import uuid
import logging
from gtts import gTTS
import pyttsx3
from pydub import AudioSegment
import tempfile

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.supported_languages = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese'
        }
        
        self.voice_types = ['male', 'female', 'child']
        
        # Initialize pyttsx3 engine for offline TTS
        try:
            self.offline_engine = pyttsx3.init()
            self.offline_available = True
        except:
            self.offline_available = False
            logger.warning("Offline TTS engine not available")

    def generate_speech(self, text, voice_settings=None):
        """Generate speech from text using either online or offline TTS"""
        try:
            if not text or len(text.strip()) == 0:
                raise ValueError("Text content cannot be empty")
            
            # Default settings
            settings = {
                'voice': 'female',
                'language': 'en',
                'speed': 1.0,
                'use_offline': False
            }
            
            if voice_settings:
                settings.update(voice_settings)
            
            # Generate unique filename
            filename = f"tts_{uuid.uuid4().hex}.mp3"
            output_path = os.path.join('uploads/audio', filename)
            
            # Choose TTS method
            if settings.get('use_offline') and self.offline_available:
                return self._generate_offline_speech(text, settings, output_path)
            else:
                return self._generate_online_speech(text, settings, output_path)
                
        except Exception as e:
            logger.error(f"Speech generation error: {str(e)}")
            return None

    def _generate_online_speech(self, text, settings, output_path):
        """Generate speech using Google TTS (gTTS)"""
        try:
            language = settings['language']
            
            # Create gTTS object
            tts = gTTS(
                text=text,
                lang=language,
                slow=settings['speed'] < 0.8
            )
            
            # Save to temporary file first
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                tts.save(temp_file.name)
                
                # Process audio to adjust speed if needed
                if settings['speed'] != 1.0:
                    audio = AudioSegment.from_mp3(temp_file.name)
                    
                    # Adjust speed
                    if settings['speed'] > 1.0:
                        audio = audio.speedup(playback_speed=settings['speed'])
                    elif settings['speed'] < 1.0:
                        new_sample_rate = int(audio.frame_rate * settings['speed'])
                        audio = audio._spawn(audio.raw_data, overrides={"frame_rate": new_sample_rate})
                        audio = audio.set_frame_rate(audio.frame_rate)
                    
                    # Export processed audio
                    audio.export(output_path, format="mp3")
                else:
                    # Copy temp file to output path
                    import shutil
                    shutil.copy2(temp_file.name, output_path)
                
                # Clean up temp file
                os.unlink(temp_file.name)
            
            return output_path if os.path.exists(output_path) else None
            
        except Exception as e:
            logger.error(f"Online TTS error: {str(e)}")
            return None

    def _generate_offline_speech(self, text, settings, output_path):
        """Generate speech using offline pyttsx3 engine"""
        try:
            if not self.offline_available:
                return None
                
            engine = self.offline_engine
            
            # Configure voice settings
            voices = engine.getProperty('voices')
            
            # Select voice based on gender preference
            selected_voice = None
            voice_preference = settings['voice'].lower()
            
            for voice in voices:
                voice_name = voice.name.lower()
                if voice_preference == 'female' and ('female' in voice_name or 'zira' in voice_name):
                    selected_voice = voice.id
                    break
                elif voice_preference == 'male' and ('male' in voice_name or 'david' in voice_name):
                    selected_voice = voice.id
                    break
            
            if selected_voice:
                engine.setProperty('voice', selected_voice)
            
            # Set speaking rate
            rate = engine.getProperty('rate')
            new_rate = int(rate * settings['speed'])
            engine.setProperty('rate', new_rate)
            
            # Save to file
            temp_wav = output_path.replace('.mp3', '.wav')
            engine.save_to_file(text, temp_wav)
            engine.runAndWait()
            
            # Convert WAV to MP3
            if os.path.exists(temp_wav):
                audio = AudioSegment.from_wav(temp_wav)
                audio.export(output_path, format="mp3")
                os.remove(temp_wav)
            
            return output_path if os.path.exists(output_path) else None
            
        except Exception as e:
            logger.error(f"Offline TTS error: {str(e)}")
            return None

    def optimize_audio(self, audio_file, settings=None):
        """Optimize audio file quality and format"""
        try:
            # Default optimization settings
            opt_settings = {
                'format': 'mp3',
                'bitrate': '128k',
                'normalize': True,
                'remove_silence': True,
                'fade_in': 0.1,
                'fade_out': 0.1
            }
            
            if settings:
                opt_settings.update(settings)
            
            # Save uploaded file temporarily
            temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            audio_file.save(temp_input.name)
            
            # Load audio
            audio = AudioSegment.from_file(temp_input.name)
            
            # Apply optimizations
            if opt_settings['normalize']:
                audio = audio.normalize()
            
            if opt_settings['remove_silence']:
                audio = audio.strip_silence(silence_len=1000, silence_thresh=-40)
            
            if opt_settings['fade_in'] > 0:
                fade_in_ms = int(opt_settings['fade_in'] * 1000)
                audio = audio.fade_in(fade_in_ms)
            
            if opt_settings['fade_out'] > 0:
                fade_out_ms = int(opt_settings['fade_out'] * 1000)
                audio = audio.fade_out(fade_out_ms)
            
            # Generate output filename
            output_filename = f"optimized_{uuid.uuid4().hex}.mp3"
            output_path = os.path.join('uploads/audio', output_filename)
            
            # Export optimized audio
            audio.export(
                output_path, 
                format=opt_settings['format'],
                bitrate=opt_settings['bitrate']
            )
            
            # Clean up temp file
            os.unlink(temp_input.name)
            
            return output_path if os.path.exists(output_path) else None
            
        except Exception as e:
            logger.error(f"Audio optimization error: {str(e)}")
            return None

    def get_audio_duration(self, audio_path):
        """Get duration of audio file in seconds"""
        try:
            if not os.path.exists(audio_path):
                return 0
            
            audio = AudioSegment.from_file(audio_path)
            return len(audio) / 1000.0  # Convert to seconds
            
        except Exception as e:
            logger.error(f"Audio duration error: {str(e)}")
            return 0

    def get_supported_voices(self):
        """Get list of supported voices and languages"""
        voices_data = {
            'languages': self.supported_languages,
            'voiceTypes': self.voice_types,
            'features': {
                'online_tts': True,
                'offline_tts': self.offline_available,
                'speed_control': True,
                'audio_optimization': True
            }
        }
        
        # Add available offline voices if engine is available
        if self.offline_available:
            try:
                offline_voices = []
                voices = self.offline_engine.getProperty('voices')
                for voice in voices:
                    offline_voices.append({
                        'id': voice.id,
                        'name': voice.name,
                        'language': getattr(voice, 'languages', ['en'])[0] if hasattr(voice, 'languages') else 'en'
                    })
                voices_data['offline_voices'] = offline_voices
            except:
                pass
        
        return voices_data