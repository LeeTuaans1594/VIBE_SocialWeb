import { useState, useRef, useEffect } from 'react';
import { Box, Button, Flex, IconButton, Progress, Text, useColorModeValue } from "@chakra-ui/react";
import { MdMicNone, MdPlayArrow, MdDelete, MdPause } from "react-icons/md";

const MAX_RECORDING_TIME = 300; // 5 minutes in seconds

const AudioRecorder = ({ onAudioChange, isUploading, isOpen, onClose }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioElementRef = useRef(null);
    const playbackTimerRef = useRef(null);

    // Theme colors
    const bgColor = useColorModeValue("gray.50", "gray.700");
    const textColor = useColorModeValue("gray.800", "gray.200");
    const progressTrackColor = useColorModeValue("gray.100", "gray.600");
    const buttonBgColor = useColorModeValue("gray.100", "gray.600");
    const buttonHoverColor = useColorModeValue("gray.200", "gray.500");
    

    useEffect(() => {
        // Cleanup function
        return () => {
            stopRecording();
            clearPlaybackTimer();
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current = null;
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, []);

    const clearPlaybackTimer = () => {
        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }
    };

    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
            setHasPermission(true);
            return true;
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setHasPermission(false);
            return false;
        }
    };

    const startRecording = async () => {
        if (!hasPermission) {
            const permission = await requestMicrophonePermission();
            if (!permission) return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(audioBlob);
                
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
                const newAudioUrl = URL.createObjectURL(audioBlob);
                setAudioUrl(newAudioUrl);
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    onAudioChange({ audio: base64Audio, duration });
                };
            };

            mediaRecorderRef.current.start(200);
            setIsRecording(true);
            setDuration(0);

            // Reset and start timer
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 1;
                    if (newDuration >= MAX_RECORDING_TIME) {
                        stopRecording();
                        return prev;
                    }
                    return newDuration;
                });
            }, 1000);

        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            clearInterval(timerRef.current);
            setIsRecording(false);
            
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const togglePlayback = () => {
        if (!audioElementRef.current) {
            audioElementRef.current = new Audio(audioUrl);
            audioElementRef.current.onended = () => {
                setIsPlaying(false);
                setCurrentTime(0);
                clearPlaybackTimer();
            };
        }

        if (isPlaying) {
            audioElementRef.current.pause();
            setIsPlaying(false);
            clearPlaybackTimer();
        } else {
            audioElementRef.current.play();
            setIsPlaying(true);
            
            // Update current time during playback
            clearPlaybackTimer();
            playbackTimerRef.current = setInterval(() => {
                setCurrentTime(audioElementRef.current.currentTime);
            }, 100);
        }
    };

    const deleteAudio = () => {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }
        clearPlaybackTimer();
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        setCurrentTime(0);
        setIsPlaying(false);
        onAudioChange({ audio: null, duration: 0 });
        onClose();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    

    if (!isOpen) return null;

    return (
        <Box 
            p={4} 
            borderWidth="1px" 
            borderRadius="lg" 
            bg={bgColor}
            position="absolute"
            top="100%"
            left="0"
            right="0"
            zIndex="10"
            mt={2}
            boxShadow="lg"
        >
            <Flex direction="column" gap={4}>
                {!audioBlob ? (
                    <>
                    <Button
                        leftIcon={<MdMicNone />}
                        colorScheme={isRecording ? "red" : "blue"}
                        onClick={isRecording ? stopRecording : startRecording}
                        isDisabled={isUploading}
                        width="full"
                        bg={buttonBgColor}
                        color={isRecording ? "white" : "black"}
                        _hover={{ bg: buttonHoverColor }}
                        _dark={{ color: isRecording ? "white" : "gray.200" }} // Màu chữ trong chế độ tối
                        _light={{ color: isRecording ? "white" : "black" }} // Màu chữ trong chế độ sáng
                    >
                        {isRecording ? `Stop Recording ${formatTime(duration)}` : "Start Recording"}
                    </Button>
                

                    </>
                ) : (
                    <Flex gap={2} align="center" justify="space-between">
                        <IconButton
                            icon={isPlaying ? <MdPause /> : <MdPlayArrow />}
                            onClick={togglePlayback}
                            isDisabled={isUploading}
                            colorScheme="blue"
                            variant="outline"
                            bg={buttonBgColor}
                            _hover={{ bg: buttonHoverColor }}
                        />
                        <Progress 
                            flex="1" 
                            size="sm" 
                            value={(currentTime / duration) * 100}
                            colorScheme="blue"
                            borderRadius="full"
                            bg={progressTrackColor}
                        />
                        <Text fontSize="sm" color={textColor} mx={2}>
                            {formatTime(currentTime)}/{formatTime(duration)}
                        </Text>
                        <IconButton
                            icon={<MdDelete />}
                            onClick={deleteAudio}
                            isDisabled={isUploading}
                            colorScheme="red"
                            variant="ghost"
                            _hover={{ bg: buttonHoverColor }}
                        />
                    </Flex>
                )}
            </Flex>
        </Box>
    );
};

export default AudioRecorder;





     