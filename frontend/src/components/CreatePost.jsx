import { AddIcon } from "@chakra-ui/icons"
import { 
    Button, 
    CloseButton, 
    Flex, 
    FormControl, 
    Image, 
    Input, 
    Modal, 
    ModalBody, 
    ModalContent, 
    ModalFooter, 
    Text, 
    Textarea, 
    Box,
    useDisclosure,
    IconButton,
    useColorMode,
    useColorModeValue,
    useToast
} from "@chakra-ui/react"
import { useState, useRef } from "react";
import usePreviewImg from "../hooks/usePreviewImg";
import { BsFillImageFill, BsMicFill } from "react-icons/bs"; 
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import { useParams } from "react-router-dom";
import AudioRecorder from "./AudioRecorder";

const MAX_CHAR = 500;

const CreatePost = () => {
    const { colorMode } = useColorMode();
    const {isOpen, onOpen, onClose } = useDisclosure();
    const [postText, setPostText] = useState('');
    const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg();
    const imageRef = useRef(null);
    const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
    const user = useRecoilValue(userAtom);
    const showToast = useShowToast();
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useRecoilState(postsAtom);
    const {username} = useParams();
    const [audioData, setAudioData] = useState({ audio: null, duration: 0 });
    const [showRecorder, setShowRecorder] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const toast = useToast();

    // Color mode values
    const bgColor = useColorModeValue("white", "gray.900");
    const textColor = useColorModeValue("gray.900", "white");
    const inputBgColor = useColorModeValue("gray.100", "gray.800");
    const buttonHoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const recordingButtonBg = useColorModeValue("blue.500", "blue.400");
    const recordingButtonHoverBg = useColorModeValue("blue.600", "blue.500");
    const recordingButtonActiveBg = useColorModeValue("blue.700", "blue.600");

    const handleTextChange = (e) => {
        const inputText = e.target.value;

        if(inputText.length > MAX_CHAR){
            const truncatedText = inputText.slice(0, MAX_CHAR);
            setPostText(truncatedText);
            setRemainingChar(0);
        } else {
            setPostText(inputText);
            setRemainingChar(MAX_CHAR - inputText.length);
        }
    };

    const handleCreatePost = async () => {
        if (!postText && !imgUrl && !audioData.audio) {
            showToast("Error", "Post must contain either text, image, or audio", "error");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/posts/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    postedBy: user._id, 
                    text: postText, 
                    img: imgUrl,
                    audio: audioData.audio,
                    audioDuration: audioData.duration
                }),
            });
    
            const data = await res.json();
    
            if(data.error){
                showToast("Error", data.error, "error");
                return;
            }
            showToast("Success", "Post created successfully", "success");
            if(username === user.username){
                setPosts([data, ...posts]);
            }
            
            handleClose();

        } catch (error) {
            showToast("Error", error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setPostText("");
        setImgUrl("");
        setAudioData({ audio: null, duration: 0 });
        setShowRecorder(false);
    };

    const handleAudioChange = (audioInfo) => {
        setAudioData(audioInfo);
    };

    const handleRecorderClick = () => {
        if (imgUrl) {
            toast({
                title: "Cannot add both image and audio",
                status: "warning",
                duration: 3000,
                isClosable: true
            });
            return;
        }
        setShowRecorder(true);
    };

    const handleImageClick = () => {
        if (audioData.audio) {
            toast({
                title: "Cannot add both image and audio", 
                status: "warning",
                duration: 3000,
                isClosable: true
            });
            return;
        }
        imageRef.current.click();
    };

    return(
        <>
            <IconButton
                position={"fixed"} 
                bottom={10} 
                right={5}
                icon={<AddIcon />}
                onClick={onOpen}
                size="lg"
                isRound
                bg={useColorModeValue("blue.500", "blue.400")}
                _hover={{ 
                    bg: useColorModeValue("blue.600", "blue.500"),
                    transform: "scale(1.05)"
                }}
                _active={{ 
                    bg: useColorModeValue("blue.700", "blue.600"),
                    transform: "scale(0.95)"
                }}
                shadow="lg"
                color="white"
                aria-label="Create post"
                transition="all 0.2s"
            />

            <Modal 
                isOpen={isOpen} 
                onClose={handleClose} 
                size="xl"
                motionPreset="slideInBottom"
            >
                <ModalContent 
                    bg={bgColor} 
                    color={textColor}
                    borderRadius="xl"
                    borderColor={borderColor}
                    borderWidth="1px"
                >
                    <Box p={6}>
                        <Flex justify="space-between" align="center" mb={6}>
                            <Text 
                                fontSize="3xl" 
                                fontWeight="bold"
                                bgGradient={useColorModeValue(
                                    "linear(to-r, blue.400, purple.500)", 
                                    "linear(to-r, blue.200, purple.300)"
                                )}
                                bgClip="text"
                            >
                                Create Post
                            </Text>
                            <IconButton
                                icon={<CloseButton />}
                                onClick={handleClose}
                                variant="ghost"
                                _hover={{ bg: buttonHoverBg }}
                                aria-label="Close"
                                size="sm"
                            />
                        </Flex>

                        <ModalBody px={0}>
                            <FormControl>
                                <Textarea 
                                    placeholder="What's on your mind?" 
                                    onChange={handleTextChange} 
                                    value={postText}
                                    minH="150px"
                                    bg={inputBgColor}
                                    border="none"
                                    _focus={{
                                        border: "1px solid",
                                        borderColor: useColorModeValue("blue.500", "blue.300"),
                                        boxShadow: "none"
                                    }}
                                    mb={2}
                                    resize="none"
                                    fontSize="md"
                                    borderRadius="lg"
                                />
                                <Flex justify="space-between" align="center" mb={4}>
                                    <Flex gap={4}>
                                        <IconButton
                                            icon={<BsFillImageFill />}
                                            onClick={handleImageClick}
                                            variant="ghost"
                                            colorScheme="blue"
                                            aria-label="Add image"
                                            _hover={{ bg: buttonHoverBg }}
                                            isDisabled={audioData.audio !== null}
                                        />
                                        <IconButton
                                            icon={<BsMicFill />}
                                            onClick={handleRecorderClick}
                                            variant="ghost"
                                            colorScheme="blue"
                                            aria-label="Record audio"
                                            _hover={{ bg: buttonHoverBg }}
                                            isDisabled={imgUrl !== ""}
                                        />
                                    </Flex>
                                    <Text 
                                        fontSize="sm" 
                                        color={remainingChar < 100 
                                            ? useColorModeValue("red.500", "red.300")
                                            : useColorModeValue("gray.500", "gray.400")
                                        }
                                        fontWeight="medium"
                                    >
                                        {remainingChar}/{MAX_CHAR}
                                    </Text>
                                </Flex>
                                
                                <Input 
                                    type="file" 
                                    hidden 
                                    ref={imageRef} 
                                    onChange={handleImageChange}
                                    accept="image/*"
                                />
                            </FormControl>

                            {imgUrl && (
                                <Box 
                                    position="relative" 
                                    mt={4} 
                                    borderRadius="lg" 
                                    overflow="hidden"
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                >
                                    <Image 
                                        src={imgUrl} 
                                        alt='Selected img'
                                        w="full"
                                        h="auto"
                                        maxH="300px"
                                        objectFit="cover"
                                    />
                                    <IconButton
                                        icon={<CloseButton />}
                                        onClick={() => setImgUrl("")}
                                        position="absolute"
                                        top={2}
                                        right={2}
                                        bg="blackAlpha.700"
                                        _hover={{ bg: "blackAlpha.800" }}
                                        size="sm"
                                        aria-label="Remove image"
                                        color="white"
                                    />
                                </Box>
                            )}

                            {showRecorder && (
                                <Box mt={4}>
                                    <AudioRecorder
                                        isOpen={showRecorder}
                                        onClose={() => setShowRecorder(false)}
                                        onAudioChange={handleAudioChange}
                                        isUploading={isUploading}
                                        buttonStyle={{
                                            bg: recordingButtonBg,
                                            color: "white",
                                            _hover: { bg: recordingButtonHoverBg },
                                            _active: { bg: recordingButtonActiveBg },
                                            fontSize: "lg",
                                            fontWeight: "bold",
                                            px: 6,
                                            py: 3,
                                            borderRadius: "lg",
                                            width: "100%",
                                            mb: 4
                                        }}
                                    />
                                </Box>
                            )}
                        </ModalBody>

                        <ModalFooter px={0} mt={6}>
                            <Button
                                w="full"
                                bg={useColorModeValue("blue.500", "blue.400")}
                                color="white"
                                _hover={{
                                    bg: useColorModeValue("blue.600", "blue.500"),
                                    transform: "translateY(-2px)",
                                    shadow: "lg"
                                }}
                                _active={{
                                    bg: useColorModeValue("blue.700", "blue.600"),
                                    transform: "translateY(0)"
                                }}
                                onClick={handleCreatePost}
                                isLoading={loading}
                                isDisabled={!postText && !imgUrl && !audioData.audio}
                                h="48px"
                                fontSize="md"
                                borderRadius="lg"
                                transition="all 0.2s"
                                shadow="md"
                            >
                                {loading ? "Posting..." : "Post"}
                            </Button>
                        </ModalFooter>
                    </Box>
                </ModalContent>
            </Modal>
        </>
    );
};

export default CreatePost;