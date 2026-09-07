import { Avatar, Box, Flex, Image, Text, IconButton, useColorModeValue } from "@chakra-ui/react"
import { useEffect, useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DeleteIcon } from "@chakra-ui/icons"
import { MdPlayArrow, MdPause } from "react-icons/md"
import Actions from "./Actions"
import useShowToast from "../hooks/useShowToast"
import { formatDistanceToNow } from "date-fns"
import { useRecoilState, useRecoilValue } from "recoil"
import userAtom from "../atoms/userAtom"
import postsAtom from "../atoms/postsAtom"

const Post = ({ post, postedBy }) => {
    const [user, setUser] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveformData, setWaveformData] = useState([]);
    const audioElementRef = useRef(null);
    const playbackTimerRef = useRef(null);
    const showToast = useShowToast();
    const currentUser = useRecoilValue(userAtom);
    const [posts, setPosts] = useRecoilState(postsAtom);
    const navigate = useNavigate();

    useEffect(() => {
        const getUser = async () => {
            try {
                const res = await fetch("/api/users/profile/" + postedBy);
                const data = await res.json();
                if (data.error) {
                    showToast("Error", data.error, "error");
                    return;
                }
                setUser(data);
            } catch (error) {
                showToast("Error", error.message, "error");
                setUser(null);
            }
        };

        getUser();
    }, [postedBy, showToast]);

    const analyzeAudio = async (audioUrl) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const rawData = audioBuffer.getChannelData(0);
            const samples = 40;
            const blockSize = Math.floor(rawData.length / samples);
            const filteredData = [];
            
            for (let i = 0; i < samples; i++) {
                const blockStart = blockSize * i;
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[blockStart + j]);
                }
                filteredData.push(sum / blockSize);
            }

            const multiplier = 1 / Math.max(...filteredData);
            setWaveformData(filteredData.map(n => 0.1 + n * multiplier * 0.9));
        } catch (error) {
            console.error("Error analyzing audio:", error);
        }
    };

    useEffect(() => {
        if (post.audio) {
            analyzeAudio(post.audio);
        }
    }, [post.audio]);

    const clearPlaybackTimer = () => {
        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }
    };

    const togglePlayback = (e) => {
        e.preventDefault();

        if (!audioElementRef.current) {
            audioElementRef.current = new Audio(post.audio);
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
            
            clearPlaybackTimer();
            playbackTimerRef.current = setInterval(() => {
                setCurrentTime(audioElementRef.current.currentTime);
            }, 100);
        }
    };

    useEffect(() => {
        return () => {
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current = null;
            }
            clearPlaybackTimer();
        };
    }, []);

    const handleDeletePost = async (e) => {
        try {
            e.preventDefault();
            if (!window.confirm("Are you sure to delete this post?")) return;

            const res = await fetch(`/api/posts/${post._id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
                showToast("Error", data.error, "error");
                return;
            }
            showToast("Success", "Post deleted", "success");
            setPosts(posts.filter((p) => p._id !== post._id));
        } catch (error) {
            showToast("Error", error.message, "error");
        }
    };

    if (!user) return null;

    return (
        <Link to={`/${user.username}/post/${post._id}`}>
            <Flex gap={3} mb={4} py={5}>
                <Flex flexDirection={"column"} alignItems={"center"}>
                    <Avatar
                        size="md"
                        name={user.name}
                        src={user?.profilePic}
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/${user.username}`);
                        }}
                    />
                    <Box w="1px" h={"full"} bg="gray.light" my={2}></Box>
                    <Box position={"relative"} w={"full"}>
                        {post.replies.length === 0 && <Text textAlign={"center"}>😮</Text>}
                        {post.replies[0] && (
                            <Avatar
                                size="xs"
                                name="Reply"
                                src={post.replies[0].userProfilePic}
                                position={"absolute"}
                                top={"0px"}
                                left="15px"
                                padding={"2px"}
                            />
                        )}

                        {post.replies[1] && (
                            <Avatar
                                size="xs"
                                name="Reply"
                                src={post.replies[1].userProfilePic}
                                position={"absolute"}
                                bottom={"0px"}
                                right="-5px"
                                padding={"2px"}
                            />
                        )}

                        {post.replies[2] && (
                            <Avatar
                                size="xs"
                                name="Reply"
                                src={post.replies[2].userProfilePic}
                                position={"absolute"}
                                bottom={"0px"}
                                left="4px"
                                padding={"2px"}
                            />
                        )}
                    </Box>
                </Flex>
                <Flex flex={1} flexDirection={"column"} gap={2}>
                    <Flex justifyContent={"space-between"} w={"full"}>
                        <Flex w={"full"} alignItems={"center"}>
                            <Text
                                fontSize={"sm"}
                                fontWeight={"bold"}
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/${user.username}`);
                                }}
                            >
                                {user?.username}
                            </Text>
                            <Image src="/verified.png" w={4} h={4} ml={1} />
                        </Flex>
                        <Flex gap={4} alignItems={"center"}>
                            <Text fontSize={"xs"} width={36} textAlign={"right"} color={"gray.light"}>
                                {formatDistanceToNow(new Date(post.createdAt))} ago
                            </Text>

                            {currentUser?._id === user._id && (
                                <DeleteIcon size={20} onClick={handleDeletePost} />
                            )}
                        </Flex>
                    </Flex>

                    <Text fontSize={"sm"}>{post?.text}</Text>
                    
                    {post.img && (
                        <Box borderRadius={6} overflow={"hidden"} border={"1px solid"} borderColor={"gray.light"}>
                            <Image src={post.img} w={"full"} />
                        </Box>
                    )}

                    {post.audio && (
                        <Box 
                            p={3} 
                            borderRadius="full" 
                            bg="blackAlpha.100" 
                            _dark={{ bg: "whiteAlpha.200" }}
                            onClick={(e) => e.preventDefault()}
                            maxW="400px"
                        >
                            <Flex gap={2} align="center">
                                <IconButton
                                    icon={isPlaying ? <MdPause /> : <MdPlayArrow />}
                                    onClick={togglePlayback}
                                    isRound
                                    size="sm"
                                    variant="ghost"
                                    color="gray.600"
                                    _dark={{ color: "gray.300" }}
                                    _hover={{ bg: "transparent" }}
                                />
                                <Box flex="1" position="relative" height="40px">
                                    <Flex 
                                        align="center" 
                                        height="100%" 
                                        justify="space-between"
                                        px={1}
                                    >
                                        {waveformData.map((height, index) => {
                                            const progress = currentTime / post.audioDuration;
                                            const position = index / waveformData.length;
                                            const isPlayed = position <= progress;
                                            
                                            return (
                                                <Box
                                                    key={index}
                                                    width="2px"
                                                    height={`${height * 100}%`}
                                                    bg={isPlayed ? 
                                                        `linear-gradient(180deg, 
                                                            ${useColorModeValue('#0EA5E9', '#60A5FA')} 0%, 
                                                            ${useColorModeValue('#6366F1', '#818CF8')} 100%)`
                                                        : useColorModeValue('gray.300', 'gray.600')}
                                                    transition="height 0.2s ease, background-color 0.2s ease"
                                                    opacity={isPlaying ? "1" : "0.7"}
                                                />
                                            );
                                        })}
                                    </Flex>
                                </Box>
                            </Flex>
                        </Box>
                    )}

                    <Flex gap={3} my={1}>
                        <Actions post={post} />
                    </Flex>
                </Flex>
            </Flex>
        </Link>
    );
};

export default Post;