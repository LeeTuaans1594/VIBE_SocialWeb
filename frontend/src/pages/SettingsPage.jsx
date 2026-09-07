import { 
	Box, 
	Button, 
	Text, 
	Flex, 
	Icon, 
	useColorMode, 
	useColorModeValue 
  } from "@chakra-ui/react";
  import { WarningIcon, SunIcon, MoonIcon } from "@chakra-ui/icons";
  import useShowToast from "../hooks/useShowToast";
  import useLogout from "../hooks/useLogout";
  
  export const SettingsPage = () => {
	const showToast = useShowToast();
	const logout = useLogout();
	const { colorMode, toggleColorMode } = useColorMode();
  
	const bgColor = useColorModeValue("white", "gray.800");
	const textColor = useColorModeValue("gray.700", "gray.200");
	const warningColor = useColorModeValue("red.600", "red.300");
	const buttonBgColor = useColorModeValue("red.500", "red.400");
  
	const freezeAccount = async () => {
	  if (!window.confirm("Are you sure you want to freeze your account?")) return;
  
	  try {
		const res = await fetch("/api/users/freeze", {
		  method: "PUT",
		  headers: { "Content-Type": "application/json" },
		});
		const data = await res.json();
  
		if (data.error) {
		  return showToast("Error", data.error, "error");
		}
		if (data.success) {
		  await logout();
		  showToast("Success", "Your account has been frozen", "success");
		}
	  } catch (error) {
		showToast("Error", error.message, "error");
	  }
	};
  
	return (
	  <Box
		maxW="400px"
		mx="auto"
		mt={8}
		p={6}
		borderRadius="md"
		boxShadow="md"
		bg={bgColor}
	  >
		<Flex justifyContent="space-between" alignItems="center" mb={4}>
		  <Text fontSize="xl" fontWeight="bold" color={warningColor}>
			Freeze Your Account
		  </Text>
		</Flex>
		<Text fontSize="sm" color={textColor} mb={6}>
		  Freezing your account will log you out. You can unfreeze your account
		  anytime by logging back in.
		</Text>
		<Flex alignItems="center" gap={2} mb={4}>
		  <Icon as={WarningIcon} color={warningColor} />
		  <Text fontSize="sm" color={textColor}>
			This action cannot be undone.
		  </Text>
		</Flex>
		<Button
		  size="md"
		  bg={buttonBgColor}
		  color="white"
		  _hover={{ bg: "red.600" }}
		  onClick={freezeAccount}
		  width="full"
		  borderRadius="md"
		>
		  Freeze Account
		</Button>
	  </Box>
	);
  };
  
  export default SettingsPage;
  