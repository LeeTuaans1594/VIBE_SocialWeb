import { VStack, HStack, Image, useColorMode, Link, Box, Flex, Button, useMediaQuery, keyframes, Text } from "@chakra-ui/react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { Link as RouterLink } from "react-router-dom";
import { AiFillHome } from "react-icons/ai";
import { RxAvatar } from "react-icons/rx";
import { FiLogOut, FiLogIn} from "react-icons/fi";
import { FaRegistered } from "react-icons/fa";
import useLogout from "../hooks/useLogout";
import authScreenAtom from "../atoms/authAtom";
import { BsFillChatQuoteFill } from "react-icons/bs";
import { MdOutlineSettings } from "react-icons/md";

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px #4FD1C5; }
  50% { box-shadow: 0 0 20px #4FD1C5, 0 0 30px #4FD1C5; }
  100% { box-shadow: 0 0 5px #4FD1C5; }
`;

const Header = () => {
    const { colorMode, toggleColorMode } = useColorMode();
    const user = useRecoilValue(userAtom);
    const logout = useLogout();
    const setAuthScreen = useSetRecoilState(authScreenAtom);
    const [isSmallScreen] = useMediaQuery("(max-width: 768px)");

    const AuthButton = ({ label, onClick, isPrimary = false, icon }) => (
        <Button
            position="relative"
            onClick={onClick}
            width="full"
            height="45px"
            fontSize="16px"
            fontWeight="600"
            borderRadius="12px"
            transition="all 0.3s ease"
            bg={isPrimary ? "cyan.400" : "transparent"}
            color={isPrimary ? "white" : colorMode === "dark" ? "white" : "gray.800"}
            border={!isPrimary ? "2px solid" : "none"}
            borderColor={!isPrimary ? "cyan.400" : "none"}
            sx={{
                ".icon-content": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                },
                ".text-content": {
                    display: "none",
                    whiteSpace: "nowrap",
                },
                "@media (min-width: 769px)": {
                    "&:hover .icon-content": {
                        display: "none",
                    },
                    "&:hover .text-content": {
                        display: "block",
                    },
                }
            }}
            _hover={{
                transform: "translateY(-2px)",
                bg: isPrimary ? "cyan.500" : "cyan.50",
                color: isPrimary ? "white" : "cyan.500",
                animation: `${glowAnimation} 1.5s infinite`,
                width: "200px",
            }}
            _active={{
                transform: "scale(0.98)"
            }}
        >
            <Box className="icon-content">
                {icon}
            </Box>
            <Text className="text-content">
                {label}
            </Text>
        </Button>
    );

    const NavContent = () => (
        <>
            <Image
                cursor={"pointer"}
                alt='logo'
                w={8}
                src={colorMode === "dark" ? "/light-logo.svg" : "/dark-logo.svg"}
                onClick={toggleColorMode}
                transition="transform 0.3s ease"
                _hover={{ transform: "rotate(180deg)" }}
            />
            
            {user && (
                <>
                    <Link as={RouterLink} to="/">
                        <AiFillHome size={24}/>
                    </Link>
                    <Link as={RouterLink} to={`/${user.username}`}>
                        <RxAvatar size={24} />
                    </Link>
                    <Link as={RouterLink} to={`/chat`}>
                        <BsFillChatQuoteFill size={20} />
                    </Link>
                    <Link as={RouterLink} to={`/settings`}>
                        <MdOutlineSettings size={20} />
                    </Link>
                </>
            )}
            
            {!user && (
                <VStack spacing={4} width="full" px={4}>
                    <AuthButton 
                        label="Login"
                        onClick={() => setAuthScreen('login')}
                        icon={<FiLogIn size={20} />}
                    />
                    <AuthButton 
                        label="Sign up"
                        onClick={() => setAuthScreen('signup')}
                        icon={<FaRegistered size={20} />}
                        isPrimary
                    />
                </VStack>
            )}
            
            {user && (
                <Button size={"sm"} onClick={logout} variant="ghost">
                    <FiLogOut size={20} />
                </Button>
            )}
        </>
    );

    const glassmorphismStyle = {
        backdropFilter: "blur(16px)",
        backgroundColor: colorMode === "dark" 
            ? "rgba(26, 32, 44, 0.75)"
            : "rgba(255, 255, 255, 0.75)",
        borderRight: "1px solid",
        borderColor: colorMode === "dark" 
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        boxShadow: colorMode === "dark"
            ? "0 8px 32px rgba(0, 0, 0, 0.37)"
            : "0 8px 32px rgba(31, 38, 135, 0.15)"
    };

    return (
        <>
            {isSmallScreen ? (
                <Box
                    position="fixed"
                    bottom={0}
                    left={0}
                    right={0}
                    py={4}
                    zIndex={1000}
                    {...glassmorphismStyle}
                >
                    <HStack justify="space-around" align="center">
                        <NavContent />
                    </HStack>
                </Box>
            ) : (
                <Box
                    position="fixed"
                    left={0}
                    top={0}
                    h="100vh"
                    w={user ? "80px" : "200px"}
                >
                    <Flex
                        flexDirection="column"
                        h="100%"
                        justifyContent="space-between"
                        alignItems="center"
                        py={8}
                        {...glassmorphismStyle}
                    >
                        <VStack spacing={8} width="full">
                            <NavContent />
                        </VStack>
                    </Flex>
                </Box>
            )}
        </>
    );
};

export default Header;