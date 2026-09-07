import { Avatar, Divider, Flex, Image, Skeleton, SkeletonCircle, Text, useColorModeValue, IconButton, Modal, ModalOverlay, ModalContent, Box, useMediaQuery } from "@chakra-ui/react";
import { FaPhone, FaVideo } from "react-icons/fa";
import Message from "./Message";
import MessageInput from "./MessageInput";
import { useEffect, useRef, useState } from "react";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../../context/SocketContext";
import messageSound from "../assets/sounds/message.mp3";
import VideoCallPopup from "./VideoCallPopup.jsx";

const MessageContainer = () => {
    const [isSmallScreen] = useMediaQuery("(max-width: 768px)");
    const showToast = useShowToast();
    const selectedConversation = useRecoilValue(selectedConversationAtom);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [messages, setMessages] = useState([]);
    const currentUser = useRecoilValue(userAtom);
    const { socket } = useSocket();
    const setConversations = useSetRecoilState(conversationsAtom);
    const messageEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
    const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            if (chatContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
            }
        };

        chatContainerRef.current?.addEventListener('scroll', handleScroll);
        return () => chatContainerRef.current?.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        socket.on("newMessage", (message) => {
            if (selectedConversation._id === message.conversationId) {
                setMessages((prev) => [...prev, message]);
                if (isAtBottom || message.sender === currentUser._id) {
                    setTimeout(() => messageEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }
            }

            if (!document.hasFocus()) {
                const sound = new Audio(messageSound);
                sound.play();
            }

            setConversations((prev) => {
                const updatedConversations = prev.map((conversation) => {
                    if (conversation._id === message.conversationId) {
                        return {
                            ...conversation,
                            lastMessage: {
                                text: message.text,
                                sender: message.sender,
                                type: message.type, // Thêm trường type
                            },
                        };
                    }
                    return conversation;
                });
                return updatedConversations;
            });
        });
        socket.on("callEnded", (data) => {
            console.log("Call ended with:", data.with);
            const callEndedMessage = {
                _id: Date.now().toString(),
                conversationId: selectedConversation._id,
                sender: currentUser._id,
                text: `Cuộc gọi ${data.isVideoCall ? 'video' : 'thoại'} đã kết thúc. Thời gian: ${data.duration}`,
                type: 'call_ended',
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, callEndedMessage]);
            setIsCallModalOpen(false);
            setIncomingCall(null);
            setCallType(null);
        });

        return () => {
            socket.off("newMessage");
            socket.off("callEnded");
        };
    }, [socket, selectedConversation, setConversations, currentUser._id, isAtBottom]);

    useEffect(() => {
        const lastMessageIsFromOtherUser = messages.length && messages[messages.length - 1].sender !== currentUser._id;
        if (lastMessageIsFromOtherUser) {
            socket.emit("markMessagesAsSeen", {
                conversationId: selectedConversation._id,
                userId: selectedConversation.userId,
            });
        }

        socket.on("messagesSeen", ({ conversationId }) => {
            if (selectedConversation._id === conversationId) {
                setMessages((prev) => {
                    const updatedMessages = prev.map((message) => {
                        if (!message.seen) {
                            return {
                                ...message,
                                seen: true,
                            };
                        }
                        return message;
                    });
                    return updatedMessages;
                });
            }
        });
    }, [socket, currentUser._id, messages, selectedConversation]);

    useEffect(() => {
        const getMessages = async () => {
            setLoadingMessages(true);
            setMessages([]);
            try {
                if (selectedConversation.mock) return;
                const res = await fetch(`/api/messages/${selectedConversation.userId}`);
                const data = await res.json();
                if (data.error) {
                    showToast("Error", data.error, "error");
                    return;
                }
                setMessages(data);
            } catch (error) {
                showToast("Error", error.message, "error");
            } finally {
                setLoadingMessages(false);
                setTimeout(() => messageEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        };

        getMessages();
    }, [showToast, selectedConversation.userId, selectedConversation.mock]);

    useEffect(() => {
        if (socket) {
            socket.on("callUser", (data) => {
                console.log("Received callUser event in MessageContainer:", data);
                setIncomingCall(data);
                setCallType(data.isVideoCall ? "video" : "audio");
                setIsCallModalOpen(true);
            });
        
            socket.on("callEnded", (data) => {
                console.log("Call ended with:", data.with);
                setIsCallModalOpen(false);
                setIncomingCall(null);
                setCallType(null);
            });

            socket.on("missedCall", (data) => {
                console.log("Missed call from:", data.name);
                // Display missed call notification
            });
        }

        return () => {
            if (socket) {
                socket.off("callUser");
                socket.off("callEnded");
                socket.off("missedCall");
            }
        };
    }, [socket]);

    const handleVideoCallClick = () => {
        setCallType("video");
        setIsCallModalOpen(true);
      };

    const handleAudioCallClick = () => {
        setCallType("audio");
        setIsCallModalOpen(true);
      };

      const handleCloseCall = () => {
        setIsCallModalOpen(false);
        setIncomingCall(null);
        setCallType(null);
      };
      const renderMessage = (message) => {
        if (message.type === 'call_ended') {
            return (
                <Box textAlign="center" my={2}>
                    <Text fontSize="sm" color="gray.500">
                        {message.text}
                    </Text>
                </Box>
            );
        }
        return (
            <Message message={message} ownMessage={currentUser._id === message.sender} />
        );
    };

    return (
        <Flex
            flex='70'
            bg={useColorModeValue("gray.200", "gray.dark")}
            borderRadius={"md"}
            p={2}
            pb={isSmallScreen ? "70px" : "2"}
            flexDirection={"column"}
            position="relative"
        >
            {/* Message header */}
            <Flex w={"full"} h={12} alignItems={"center"} gap={2} justifyContent="space-between">
                <Flex alignItems={"center"} gap={2}>
                    <Avatar src={selectedConversation.userProfilePic} size={"sm"} />
                    <Text display={"flex"} alignItems={"center"}>
                        {selectedConversation.username} <Image src='/verified.png' w={4} h={4} ml={1} />
                    </Text>
                </Flex>
                <Flex>
                    <IconButton
                        icon={<FaPhone />}
                        aria-label="Start audio call"
                        onClick={handleAudioCallClick}
                        backgroundColor="transparent"
                        color="green.500"
                        _hover={{ backgroundColor: "rgba(0, 128, 0, 0.1)" }}
                        mr={2}
                    />
                    <IconButton
                        icon={<FaVideo />}
                        aria-label="Start video call"
                        onClick={handleVideoCallClick}
                        backgroundColor="transparent"
                        color="blue.500"
                        _hover={{ backgroundColor: "rgba(0, 0, 255, 0.1)" }}
                    />
                </Flex>
            </Flex>
            <Divider />
    
            <Flex
                flexDir={"column"}
                gap={4}
                my={4}
                p={2}
                height={"400px"}
                overflowY={"auto"}
                ref={chatContainerRef}
            >
                {loadingMessages &&
                    [...Array(5)].map((_, i) => (
                        <Flex
                            key={i}
                            gap={2}
                            alignItems={"center"}
                            p={1}
                            borderRadius={"md"}
                            alignSelf={i % 2 === 0 ? "flex-start" : "flex-end"}
                        >
                            {i % 2 === 0 && <SkeletonCircle size={7} />}
                            <Flex flexDir={"column"} gap={2}>
                                <Skeleton h='8px' w='250px' />
                                <Skeleton h='8px' w='250px' />
                                <Skeleton h='8px' w='250px' />
                            </Flex>
                            {i % 2 !== 0 && <SkeletonCircle size={7} />}
                        </Flex>
                    ))}
    
                {!loadingMessages &&
                    messages.map((message) => (
                        <Flex
                            key={message._id}
                            direction={"column"}
                            ref={messages.length - 1 === messages.indexOf(message) ? messageEndRef : null}
                        >
                            {renderMessage(message)}
                        </Flex>
                    ))}
            </Flex>
    
            <MessageInput setMessages={setMessages} />
    
            <Modal isOpen={isCallModalOpen} onClose={handleCloseCall} size="full">
                <ModalOverlay />
                <ModalContent bg="transparent" boxShadow="none">
                    <VideoCallPopup
                        isOpen={isCallModalOpen}
                        onClose={handleCloseCall}
                        recipientId={selectedConversation.userId}
                        recipientName={selectedConversation.username}
                        isVideoCall={callType === "video"}
                        isIncomingCall={!!incomingCall}
                        incomingCallData={incomingCall}
                    />
                </ModalContent>
            </Modal>
        </Flex>
    );
};

export default MessageContainer;