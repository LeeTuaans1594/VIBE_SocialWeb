import { useState, useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue } from "recoil";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../../context/SocketContext";
import {
  Avatar,
  AvatarBadge,
  Box,
  Flex,
  Input,
  Text,
  Image,
  InputGroup,
  InputLeftElement,
  Collapse,
  SlideFade,
  useColorModeValue,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";

const SearchUsers = ({ showToast }) => {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const currentUser = useRecoilValue(userAtom);
  const searchContainerRef = useRef(null);
  const { onlineUsers } = useSocket();

  // Theme colors
  const searchBg = useColorModeValue('rgba(255, 255, 255, 0.1)', 'rgba(0, 0, 0, 0.3)');
  const searchResultsBg = useColorModeValue('rgba(255, 255, 255, 0.1)', 'rgba(0, 0, 0, 0.3)');
  const hoverBg = useColorModeValue('rgba(255, 255, 255, 0.2)', 'rgba(0, 0, 0, 0.4)');
  const inputColor = useColorModeValue('gray.800', 'gray.100');
  const inputPlaceholderColor = useColorModeValue('gray.500', 'gray.500');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const scrollbarThumbColor = useColorModeValue('rgba(0, 0, 0, 0.2)', 'rgba(255, 255, 255, 0.2)');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchResults.length > 0 && onlineUsers) {
      setSearchResults(prevResults => 
        prevResults.map(user => ({
          ...user,
          isOnline: onlineUsers.includes(user._id)
        }))
      );
    }
  }, [onlineUsers, searchResults]);

  const handleSearch = async (searchTerm) => {
    setSearchText(searchTerm);
    
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?query=${searchTerm}`);
      const data = await res.json();
      
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      
      const filteredResults = data
        .filter(user => user._id !== currentUser._id)
        .map(user => ({
          ...user,
          isOnline: onlineUsers?.includes(user._id) || false
        }));
      
      setSearchResults(filteredResults);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (selectedUser) => {
    const existingConversation = conversations.find(
      conv => conv.participants[0]?._id === selectedUser._id
    );

    if (existingConversation) {
      setSelectedConversation({
        _id: existingConversation._id,
        userId: selectedUser._id,
        username: selectedUser.username,
        userProfilePic: selectedUser.profilePic,
      });
    } else {
      const mockConversation = {
        mock: true,
        lastMessage: {
          text: "",
          sender: "",
        },
        _id: Date.now(),
        participants: [
          {
            _id: selectedUser._id,
            username: selectedUser.username,
            profilePic: selectedUser.profilePic,
          },
        ],
      };
      setConversations(prev => [...prev, mockConversation]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: selectedUser._id,
        username: selectedUser.username,
        userProfilePic: selectedUser.profilePic,
      });
    }

    setSearchResults([]);
    setSearchText("");
  };

  return (
    <Box position="relative" ref={searchContainerRef} mb={4}>
      <Box 
        bg={searchBg}
        borderRadius="full"
        overflow="hidden"
        backdropFilter="blur(8px)"
      >
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color={secondaryTextColor} />
          </InputLeftElement>
          <Input
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            variant="unstyled"
            px={10}
            py={2}
            color={inputColor}
            _placeholder={{ color: inputPlaceholderColor }}
            _focus={{
              outline: "none",
            }}
          />
        </InputGroup>
      </Box>

      <SlideFade in={searchResults.length > 0} offsetY="20px">
        <Box
          position="absolute"
          width="100%"
          top="calc(100% + 8px)"
          bg={searchResultsBg}
          rounded="2xl"
          zIndex={50}
          maxH="400px"
          overflowY="auto"
          backdropFilter="blur(8px)"
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollbarThumbColor,
              borderRadius: '24px',
            },
          }}
        >
          <Collapse in={searchResults.length > 0}>
            {searchResults.map((user) => (
              <Flex
                key={user._id}
                alignItems="center"
                p={3}
                mx={2}
                my={1}
                _hover={{
                  bg: hoverBg,
                  cursor: "pointer",
                  borderRadius: "xl",
                }}
                transition="all 0.2s"
                onClick={() => handleSelectUser(user)}
              >
                <Avatar
                  size="md"
                  src={user.profilePic}
                  name={user.username}
                >
                  {user.isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
                </Avatar>
                <Box ml={3} flex="1">
                  <Flex align="center" gap={2}>
                    <Text color={textColor} fontWeight="600">
                      {user.username}
                    </Text>
                    {user.verified && (
                      <Image src="/verified.png" w={4} h={4} alt="verified" />
                    )}
                  </Flex>
                  <Text fontSize="sm" color={user.isOnline ? "green.400" : secondaryTextColor}>
                    {user.isOnline ? "Online" : "Offline"}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Collapse>
        </Box>
      </SlideFade>

      {loading && (
        <Flex 
          position="absolute" 
          right={4} 
          top="50%" 
          transform="translateY(-50%)" 
          align="center"
          gap={2}
        >
          <Box
            animation="spin 1s linear infinite"
            rounded="full"
            h={3}
            w={3}
            borderWidth={2}
            borderBottomColor="blue.400"
            borderColor="transparent"
          />
        </Flex>
      )}
    </Box>
  );
};

export default SearchUsers;