import { Avatar, Box, Flex, Image, Skeleton, Text } from "@chakra-ui/react";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { useState } from "react";
import { BsCheck2All } from "react-icons/bs";
import { FaPhone, FaVideo } from "react-icons/fa";

const Message = ({ ownMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [imgLoaded, setImgLoaded] = useState(false);

  const renderCallMessage = () => {
    const isVideoCall = message.text.includes('video');
    const icon = isVideoCall ? <FaVideo /> : <FaPhone />;
    const callStatus = message.callStatus === 'started' ? 'Started' : 'Ended';
    const callDuration = message.callDuration
      ? ` (${Math.floor(message.callDuration / 60)}:${(message.callDuration % 60).toString().padStart(2, '0')})`
      : '';

    return (
      <Flex 
        alignItems="center" 
        p={3} 
        borderRadius="xl"
        boxShadow="sm"
        backdropFilter="blur(10px)"
      >
        <Box color={ownMessage ? "blue.400" : "gray.500"}>
          {icon}
        </Box>
        <Text ml={2} color={ownMessage ? "blue.500" : "gray.600"} fontSize="sm" fontWeight="medium">
          {isVideoCall ? 'Video call' : 'Audio call'} {callStatus}{callDuration}
        </Text>
      </Flex>
    );
  };

  return (
    <>
      {ownMessage ? (
        <Flex gap={2} alignSelf="flex-end" flexDirection="column">
          <Flex gap={2} alignItems="flex-end">
            {message.messageType === 'call' ? (
              renderCallMessage()
            ) : (
              <>
                {message.text && (
                  <Flex 
                    bg="linear-gradient(135deg, #0b0c21 0%, #1e295b 25%, #4a47a3 50%, #6f7db5 75%, #9a92f0 100%)" 
                    maxW="300px" 
                    p={3} 
                    borderRadius="2xl" 
                    borderBottomRightRadius="xs"
                    boxShadow="lg"
                    position="relative"
                    _hover={{ transform: "scale(1.02)" }}
                    transition="all 0.2s"
                >
                    <Text color="white" fontSize="sm">{message.text}</Text>
                    <Box 
                        alignSelf="flex-end" 
                        ml={2} 
                        color={message.seen ? "white" : "blue.200"} 
                        opacity={0.9}
                    >
                        <BsCheck2All size={16} />
                    </Box>
                </Flex>

                )}
                {message.img && !imgLoaded && (
                  <Flex mt={2} maxW="300px">
                    <Image
                      src={message.img}
                      hidden
                      onLoad={() => setImgLoaded(true)}
                      alt='Message image'
                      borderRadius="xl"
                    />
                    <Skeleton w="300px" h="200px" borderRadius="xl"/>
                  </Flex>
                )}
                {message.img && imgLoaded && (
                  <Flex mt={2} maxW="300px" position="relative">
                    <Box 
                      borderRadius="xl" 
                      overflow="hidden"
                      boxShadow="md"
                      transition="all 0.2s"
                      _hover={{ transform: "scale(1.02)" }}
                    >
                      <Image src={message.img} alt='Message image'/>
                    </Box>
                    <Box 
                      position="absolute" 
                      bottom={2} 
                      right={2} 
                      color={message.seen ? "white" : "blue.200"}
                      opacity={0.9}
                    >
                      <BsCheck2All size={16} />
                    </Box>
                  </Flex>
                )}
              </>
            )}
            <Avatar src={user.profilePic} w={8} h={8} ml={2} boxShadow="md"/>
          </Flex>
        </Flex>
      ) : (
        <Flex gap={2} flexDirection="column">
          <Flex gap={2}>
            <Avatar src={selectedConversation.userProfilePic} w={8} h={8} mr={2} boxShadow="md"/>
            {message.messageType === 'call' ? (
              renderCallMessage()
            ) : (
              <>
                {message.text && (
                  <Flex 
                      maxW="350px" 
                      bg="linear-gradient(135deg, #f0f5ff 0%, #dfe7fb 40%, #c1c7f6 70%, #e0e5fc 100%)" 
                      p={3} 
                      borderRadius="2xl" 
                      borderBottomLeftRadius="xs"
                      boxShadow="md"
                      _hover={{ bg: "linear-gradient(135deg, #e8f0ff 0%, #cfd7f8 40%, #b5bef1 70%, #d8dcf7 100%)" }}
                      transition="all 0.2s"
                  >
                      <Text color="gray.800" fontSize="sm">{message.text}</Text>
                  </Flex>

                )}
                {message.img && !imgLoaded && (
                  <Flex mt={2} maxW="300px">
                    <Image
                      src={message.img}
                      hidden
                      onLoad={() => setImgLoaded(true)}
                      alt='Message image'
                      borderRadius="xl"
                    />
                    <Skeleton w="300px" h="200px" borderRadius="xl"/>
                  </Flex>
                )}
                {message.img && imgLoaded && (
                  <Box 
                    mt={2} 
                    maxW="300px"
                    borderRadius="xl"
                    overflow="hidden"
                    boxShadow="md"
                    transition="all 0.2s"
                    _hover={{ transform: "scale(1.02)" }}
                  >
                    <Image src={message.img} alt='Message image'/>
                  </Box>
                )}
              </>
            )}
          </Flex>
        </Flex>
      )}
    </>
  );
};

export default Message;
