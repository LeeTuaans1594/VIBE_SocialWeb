import { Box, Flex, Text, useColorModeValue } from "@chakra-ui/react";
import { GiConversation } from "react-icons/gi";
import Conversation from "../components/Conversation";
import MessageContainer from "../components/MessageContainer";
import useShowToast from "../hooks/useShowToast";
import { useCallback, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../../context/SocketContext";
import SearchUsers from "../components/SearchUsers";

const ChatPage = () => {
    const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
    const [conversations, setConversations] = useRecoilState(conversationsAtom);
    const currentUser = useRecoilValue(userAtom);
    const showToast = useShowToast();
    const { socket, onlineUsers } = useSocket();

    const updateConversation = useCallback((message) => {
        setConversations(prev => {
            const updatedConversations = prev.map(conv => {
                if (conv._id === message.conversationId) {
                    return {
                        ...conv,
                        lastMessage: {
                            text: message.text,
                            sender: message.sender,
                            seen: message.seen
                        }
                    };
                }
                return conv;
            });
            return updatedConversations;
        });
    }, [setConversations]);

    useEffect(() => {
        socket?.on("messagesSeen", ({ conversationId }) => {
            setConversations((prev) => {
                const updatedConversations = prev.map((conversation) => {
                    if (conversation._id === conversationId) {
                        return {
                            ...conversation,
                            lastMessage: {
                                ...conversation.lastMessage,
                                seen: true,
                            },
                        };
                    }
                    return conversation;
                });
                return updatedConversations;
            });
        });

        socket?.on("newMessage", (message) => {
            updateConversation(message);
        });

        return () => {
            socket?.off("messagesSeen");
            socket?.off("newMessage");
        };
    }, [socket, setConversations, updateConversation]);

    useEffect(() => {
        const getConversations = async () => {
            try {
                const res = await fetch("/api/messages/conversations");
                const data = await res.json();
                if (data.error) {
                    showToast("Error", data.error, "error");
                    return;
                }
                setConversations(data);
            } catch (error) {
                showToast("Error", error.message, "error");
            }
        };

        getConversations();
    }, [showToast, setConversations]);

    useEffect(() => {
        if (selectedConversation._id) {
            socket?.emit("markMessagesAsSeen", {
                conversationId: selectedConversation._id,
                userId: currentUser._id
            });
        }
    }, [selectedConversation, currentUser._id, socket]);

    return (
        <Box position={"absolute"} left={"50%"} top={"20px"} w={{ base: "100%", md: "80%", lg: "750px" }} p={4} transform={"translateX(-50%)"}>
            <Flex gap={4} flexDirection={{ base: "column", md: "row" }} maxW={{ sm: "400px", md: "full" }} mx={"auto"}>
                <Flex flex={30} gap={2} flexDirection={"column"} maxW={{ sm: "250px", md: "full" }} mx={"auto"}>
                    <Text fontWeight={700} color={useColorModeValue("gray.600", "gray.400")}>Conversations</Text>
                    
                    <SearchUsers showToast={showToast} />

                    {conversations.map((conversation) => (
                        <Conversation 
                            key={conversation._id}
                            conversation={conversation}
                            isOnline={onlineUsers?.includes(conversation.participants[0]?._id)}
                            selectedConversation={selectedConversation}
                            setSelectedConversation={setSelectedConversation}
                        />
                    ))}
                </Flex>

                {!selectedConversation._id && (
                    <Flex
                        flex={70}
                        borderRadius={"md"}
                        p={2}
                        flexDir={"column"}
                        alignItems={"center"}
                        justifyContent={"center"}
                        height={"400px"}
                    >
                        <GiConversation size={100} />
                        <Text fontSize={20}>Select a conversation to start messaging</Text>
                    </Flex>
                )}

                {selectedConversation?._id && 
                    <MessageContainer 
                        updateConversation={updateConversation}
                        selectedConversation={selectedConversation}
                        setSelectedConversation={setSelectedConversation}
                    />
                }
            </Flex>
        </Box>
    );
};

export default ChatPage;