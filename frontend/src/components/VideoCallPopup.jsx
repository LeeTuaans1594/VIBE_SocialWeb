import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Button, Flex, Heading, Text, IconButton, useToast, VStack } from '@chakra-ui/react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';

const VideoCallPopup = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  isVideoCall: initialIsVideoCall,
  currentConversationId,
  isIncoming = false
}) => {
  const { socket } = useSocket();
  const toast = useToast();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isVideoCall, setIsVideoCall] = useState(initialIsVideoCall);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(isIncoming);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callerInfo, setCallerInfo] = useState({ id: '', name: '' });
  const [callRole, setCallRole] = useState(() => {
    if (isIncoming) return 'receiver';
    return null;
  });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const iceCandidatesQueue = useRef([]);

  useEffect(() => {
    const startLocalStreamOnMount = async () => {
      if (isOpen) {
        const stream = await startLocalStream();
        if (stream) {
          setLocalStream(stream);
        }
      }
    };

    startLocalStreamOnMount();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  const startLocalStream = async () => {
    try {
      const constraints = {
        video: isVideoCall,
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Lỗi",
        description: "Không thể truy cập camera/microphone. Vui lòng kiểm tra quyền truy cập thiết bị.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  };

  const createPeerConnection = useCallback(() => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { 
            to: recipientId, 
            candidate: event.candidate 
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          handleEndCall();
        }
      };

      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      return null;
    }
  }, [recipientId, socket]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    if (callRole === 'receiver') return;
    
    setCallRole('caller');
    setIsCalling(true);
    
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      const pc = createPeerConnection();
      if (!pc) {
        throw new Error("Failed to create peer connection");
      }
      peerConnectionRef.current = pc;
      
      const stream = await startLocalStream();
      if (stream) {
        setLocalStream(stream);
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }
  
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall
      });
      
      await peerConnectionRef.current.setLocalDescription(offer);
  
      socket.emit("callUser", {
        userToCall: recipientId,
        signalData: offer,
        from: socket.id,
        name: "Current User",
        isVideoCall,
        conversationId: currentConversationId
      });
      
    } catch (error) {
      console.error("Error in handleStartCall:", error);
      setIsCalling(false);
      setCallRole(null);
    }
  };

  const handleAcceptCall = async () => {
    setCallAccepted(true);
    setIsIncomingCall(false);
    
    try {
      const stream = await startLocalStream();
      if (!stream) return;

      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      socket.emit('answerCall', { 
        signal: answer, 
        to: recipientId,
        conversationId: currentConversationId
      });
      
      startTimer();
    } catch (error) {
      console.error("Error in handleAcceptCall:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận cuộc gọi. Vui lòng thử lại.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRejectCall = () => {
    socket.emit('rejectCall', { 
      to: recipientId,
      conversationId: currentConversationId 
    });
    handleEndCall();
  };

  const handleEndCall = async () => {
    try {
      if (localStream) {
        const localTracks = localStream.getTracks();
        await Promise.all(
          localTracks.map(async (track) => {
            track.stop();
            await new Promise(resolve => setTimeout(resolve, 0));
            track.enabled = false;
          })
        );
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        setLocalStream(null);
      }
  
      if (remoteStream) {
        const remoteTracks = remoteStream.getTracks();
        await Promise.all(
          remoteTracks.map(async (track) => {
            track.stop();
            await new Promise(resolve => setTimeout(resolve, 0));
            track.enabled = false;
          })
        );
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        setRemoteStream(null);
      }
  
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (err) {
          console.error('Error closing peer connection:', err);
        }
        peerConnectionRef.current = null;
      }
      setCallRole(null);
      setCallAccepted(false);
      setIsCalling(false);
      setIsIncomingCall(false);
      setIsVideoOff(false);
      setIsMuted(false);
      setRemoteVideoOff(false);
      setRemoteMuted(false);
  
      stopTimer();
      
      socket.emit("endCall", { 
        to: recipientId, 
        duration: callDuration,
        conversationId: currentConversationId,
        isVideoCall: isVideoCall
      });
  
      onClose();
    } catch (error) {
      console.error('Error in handleEndCall:', error);
      setLocalStream(null);
      setRemoteStream(null);
      setCallRole(null);

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      onClose();
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        // Directly set enabled property on the track
        track.enabled = isMuted;
        // Save track state to verify it was set
        console.log(`Audio track ${track.id} enabled: ${track.enabled}`);
      });
      setIsMuted(!isMuted);
      
      // Notify peer about audio state change
      if (socket && recipientId) {
        socket.emit('audioStateChanged', {
          to: recipientId,
          isMuted: !isMuted
        });
      }
    }
  };
  useEffect(() => {
    const handleRemoteAudioState = ({ isMuted }) => {
      if (remoteStream) {
        const audioTracks = remoteStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !isMuted;
        });
        setRemoteMuted(isMuted);
      }
    };
  
    if (socket) {
      socket.on('audioStateChanged', handleRemoteAudioState);
      return () => socket.off('audioStateChanged', handleRemoteAudioState);
    }
  }, [socket, remoteStream]);
  const toggleVideo = () => {
    if (localStream && isVideoCall) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socket.emit('videoStateChanged', { 
          to: recipientId, 
          isVideoOff: !videoTrack.enabled 
        });
      }
    }
  };

  useEffect(() => {
    const handleCallUser = async ({ signal, from, name, isVideoCall: incomingVideoCall }) => {
      if (from !== socket.id) {
        setCallRole('receiver');
        setIsIncomingCall(true);
        setIsVideoCall(incomingVideoCall);
        setCallerInfo({ id: from, name });
        
        const pc = createPeerConnection();
        if (!pc) return;
        
        peerConnectionRef.current = pc;
    
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (error) {
          console.error("Error handling incoming call:", error);
        }
      }
    };

    const handleCallAccepted = async (signal) => {
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        setCallAccepted(true);
        setIsCalling(false);
        startTimer();
      } catch (error) {
        console.error("Error handling call accepted:", error);
      }
    };

    const handleCallRejected = () => {
      toast({
        title: "Cuộc gọi bị từ chối",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      handleEndCall();
    };

    const handleCallEnded = ({ duration }) => {
      toast({
        title: "Cuộc gọi đã kết thúc",
        description: `Thời gian gọi: ${formatDuration(duration)}`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      handleEndCall();
    };

    const handlePartnerEndedCall = ({ duration }) => {
      handleEndCall(duration);
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    };

    const handleVideoStateChanged = ({ isVideoOff }) => {
      setRemoteVideoOff(isVideoOff);
    };

    const handleAudioStateChanged = ({ isMuted }) => {
      setRemoteMuted(isMuted);
    };

    socket.on('callUser', handleCallUser);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('callRejected', handleCallRejected);
    socket.on('callEnded', handleCallEnded);
    socket.on('partnerEndedCall', handlePartnerEndedCall);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('videoStateChanged', handleVideoStateChanged);
    socket.on('audioStateChanged', handleAudioStateChanged);

    return () => {
      socket.off('callUser', handleCallUser);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('callRejected', handleCallRejected);
      socket.off('callEnded', handleCallEnded);
      socket.off('partnerEndedCall', handlePartnerEndedCall);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('videoStateChanged', handleVideoStateChanged);
      socket.off('audioStateChanged', handleAudioStateChanged);
    };
  }, [socket, createPeerConnection, startTimer, handleEndCall]);
  
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (isOpen && !isIncoming) {
      handleStartCall();
    }
  }, [isOpen]);


  if (!isOpen) return null;
  return (
    <Box position="fixed" top="0" left="0" w="100%" h="100%" bg="rgba(0,0,0,0.8)" zIndex="9999">
    <Flex direction="column" align="center" justify="center" h="100%">
    <Heading color="white" mb={4}>
      {isIncomingCall ? 
        `Cuộc gọi đến từ ${callerInfo.name || recipientName}` : 
        `${isVideoCall ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} với ${recipientName}`}
    </Heading>
    
      <Flex position="relative" w="100%" h="80%" justifyContent="center" alignItems="center">
        {remoteStream && (
          <Box w="100%" h="100%" position="relative">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {remoteVideoOff && (
              <Box position="absolute" top="0" left="0" w="100%" h="100%" bg="gray.800" display="flex" alignItems="center" justifyContent="center">
                <Text color="white" fontSize="2xl">Camera đã tắt</Text>
              </Box>
            )}
            {remoteMuted && (
              <Box position="absolute" top="10px" right="10px" bg="red.500" color="white" p={2} borderRadius="md">
                <FaMicrophoneSlash />
              </Box>
            )}
          </Box>
        )}
        {localStream && (
          <Box position="absolute" right="20px" bottom="20px" width="200px" height="150px">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {isVideoOff && (
              <Box position="absolute" top="0" left="0" w="100%" h="100%" bg="gray.800" display="flex" alignItems="center" justifyContent="center">
                <Text color="white" fontSize="md">Camera đã tắt</Text>
              </Box>
            )}
          </Box>
        )}
      </Flex>
      <Text color="white" fontSize="xl" mb={4}>
        {isIncomingCall && !callAccepted ? 'Cuộc gọi đến...' :
        !isIncomingCall && !callAccepted ? 'Đang chờ trả lời...' :
        callAccepted ? `Thời gian gọi: ${formatDuration(callDuration)}` : ''}
      </Text>

      <Flex mt={4}>
      {isIncomingCall && !callAccepted ? (
        <>
          <Button colorScheme="green" onClick={handleAcceptCall} mr={4}>
            Chấp nhận
          </Button>
          <Button colorScheme="red" onClick={handleRejectCall}>
            Từ chối
          </Button>
        </>
      ) : !isIncomingCall && !callAccepted ? (
        <Button colorScheme="red" onClick={handleEndCall}>
          Hủy cuộc gọi
        </Button>
      ) : callAccepted ? (
        <>
          <IconButton
            icon={isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
            onClick={toggleMute}
            mr={2}
            colorScheme={isMuted ? "red" : "green"}
            aria-label={isMuted ? "Unmute" : "Mute"}
          />
          {isVideoCall && (
            <IconButton
              icon={isVideoOff ? <FaVideoSlash /> : <FaVideo />}
              onClick={toggleVideo}
              mr={2}
              colorScheme={isVideoOff ? "red" : "green"}
              aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
            />
          )}
          <IconButton
            icon={<FaPhoneSlash />}
            onClick={handleEndCall}
            colorScheme="red"
            aria-label="End call"
          />
        </>
      ) : null}
    </Flex>
  </Flex>
  </Box>
);
};

export default VideoCallPopup;