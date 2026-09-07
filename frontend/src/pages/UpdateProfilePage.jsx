import {
	Button,
	Flex,
	FormControl, 
	FormLabel,
	Heading,
	Input,
	Stack,
	Avatar,
	Container,
	Box,
	Divider,
	IconButton,
	Tooltip,
	useDisclosure,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	useColorMode,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import usePreviewImg from "../hooks/usePreviewImg";
import useShowToast from "../hooks/useShowToast";
import { FaCamera } from "react-icons/fa";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionButton = motion(Button);

export default function UpdateProfilePage() {
	const { colorMode } = useColorMode();
	const [user, setUser] = useRecoilState(userAtom);
	const [inputs, setInputs] = useState({
		name: user.name,
		username: user.username,
		email: user.email,
		bio: user.bio,
		password: "",
	});
	const fileRef = useRef(null);
	const [updating, setUpdating] = useState(false);
	const showToast = useShowToast();
	const { handleImageChange, imgUrl } = usePreviewImg();
	const { isOpen, onOpen, onClose } = useDisclosure();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (updating) return;
		setUpdating(true);
		try {
			const res = await fetch(`/api/users/update/${user._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...inputs, profilePic: imgUrl }),
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "Profile updated successfully", "success");
			setUser(data);
			localStorage.setItem("user-threads", JSON.stringify(data));
		} catch (error) {
			showToast("Error", error, "error");
		} finally {
			setUpdating(false);
		}
	};

	return (
		<Container maxW="7xl" py={10}>
			<form onSubmit={handleSubmit}>
				<MotionBox
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<Stack spacing={8} width="100%">
						<Box>
							<Heading 
								fontSize="3xl" 
								fontWeight="bold" 
								mb={2}
								color={colorMode === 'dark' ? 'white' : 'black'}
							>
								Profile Settings
							</Heading>
							<Divider />
						</Box>

						<MotionFlex
							gap={10}
							direction={{ base: "column", lg: "row" }}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.2, duration: 0.5 }}
						>
							{/* Left Section - Avatar */}
							<Box flex="1" maxW={{ base: "100%", lg: "300px" }}>
								<FormControl id="userName">
									<Stack spacing={6} align="center">
										<Box position="relative">
											<Avatar
												size="2xl"
												src={imgUrl || user.profilePic}
												boxShadow="xl"
												border="4px solid"
												borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
												transition="all 0.3s"
												_hover={{ transform: "scale(1.05)" }}
											/>
											<Tooltip label="Change Avatar" placement="top">
												<IconButton
													aria-label="Change Avatar"
													icon={<FaCamera />}
													isRound
													size="sm"
													position="absolute"
													bottom={0}
													right={0}
													onClick={() => fileRef.current.click()}
													bg={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
													color={colorMode === 'dark' ? 'white' : 'black'}
													_hover={{ 
														bg: colorMode === 'dark' ? 'gray.600' : 'gray.300',
														transform: "scale(1.1)" 
													}}
													transition="all 0.3s"
												/>
											</Tooltip>
										</Box>
										<Input type="file" hidden ref={fileRef} onChange={handleImageChange} />
									</Stack>
								</FormControl>
							</Box>

							{/* Right Section - Form Fields */}
							<Stack flex="2" spacing={6}>
								{['name', 'username', 'email', 'bio', 'password'].map((field) => (
									<MotionBox
										key={field}
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.3 + (0.1 * ['name', 'username', 'email', 'bio', 'password'].indexOf(field)), duration: 0.5 }}
									>
										<FormControl>
											<FormLabel 
												fontSize="sm" 
												textTransform="capitalize"
												color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}
											>
												{field === 'email' ? 'Email Address' : field}
											</FormLabel>
											<Input
												size="lg"
												value={inputs[field]}
												onChange={(e) => setInputs({ ...inputs, [field]: e.target.value })}
												placeholder={field === 'email' ? 'your-email@example.com' : `Enter your ${field}`}
												type={field === 'password' ? 'password' : 'text'}
												_placeholder={{ color: colorMode === 'dark' ? 'gray.500' : 'gray.400' }}
												borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
												_hover={{ borderColor: colorMode === 'dark' ? 'gray.500' : 'gray.400' }}
												_focus={{ 
													borderColor: colorMode === 'dark' ? 'gray.400' : 'gray.500',
													boxShadow: `0 0 0 1px ${colorMode === 'dark' ? 'gray.400' : 'gray.500'}`
												}}
												color={colorMode === 'dark' ? 'white' : 'black'}
												bg={colorMode === 'dark' ? 'gray.800' : 'white'}
												transition="all 0.3s"
											/>
										</FormControl>
									</MotionBox>
								))}

								<MotionFlex
									direction="row"
									spacing={4}
									pt={4}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.8, duration: 0.5 }}
									gap={4}
								>
									<MotionButton
										size="lg"
										flex="1"
										variant="outline"
										borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
										color={colorMode === 'dark' ? 'white' : 'black'}
										_hover={{
											transform: "translateY(-2px)",
											shadow: "lg",
											borderColor: colorMode === 'dark' ? 'gray.500' : 'gray.400'
										}}
										transition="all 0.3s"
										whileTap={{ scale: 0.95 }}
									>
										Cancel
									</MotionButton>
									<MotionButton
										size="lg"
										flex="1"
										type="submit"
										isLoading={updating}
										bg={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
										color={colorMode === 'dark' ? 'white' : 'black'}
										_hover={{
											transform: "translateY(-2px)",
											shadow: "lg",
											bg: colorMode === 'dark' ? 'gray.600' : 'gray.300'
										}}
										transition="all 0.3s"
										whileTap={{ scale: 0.95 }}
									>
										Save Changes
									</MotionButton>
								</MotionFlex>
							</Stack>
						</MotionFlex>
					</Stack>
				</MotionBox>
			</form>

			<Modal isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent bg={colorMode === 'dark' ? 'gray.800' : 'white'}>
					<ModalHeader color={colorMode === 'dark' ? 'white' : 'black'}>
						Change Profile Picture
					</ModalHeader>
					<ModalCloseButton color={colorMode === 'dark' ? 'white' : 'black'} />
					<ModalBody pb={6}>
						{/* Add image cropper or preview here if needed */}
					</ModalBody>
				</ModalContent>
			</Modal>
		</Container>
	);
}