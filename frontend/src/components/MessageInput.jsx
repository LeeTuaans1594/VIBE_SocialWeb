import { Flex, Image, Input, InputGroup, InputRightElement, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, useColorModeValue, useDisclosure } from "@chakra-ui/react"
import { useRef, useState } from "react";
import { IoSendSharp } from "react-icons/io5";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { BsFillImageFill } from "react-icons/bs";
import usePreviewImg from "../hooks/usePreviewImg"; 

const MessageInput = ({setMessages}) => {
  const [messageText, setMessageText] = useState("");
  const showToast = useShowToast();
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom)
  const imageRef = useRef(null);
  const {onClose} = useDisclosure();
  const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg()
  const [isSending, setIsSending ] = useState(false);

  // Sử dụng useColorModeValue để set màu theo mode
  const textColor = useColorModeValue("gray.800", "white");
  const placeholderColor = useColorModeValue("gray.500", "whiteAlpha.600");
  const borderColor = useColorModeValue("#6b63c4", "#9a92f0");
  const iconColor = useColorModeValue("gray.600", "white");

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if(!messageText && !imgUrl) return;
    if(isSending) return;

    setIsSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          recipientId: selectedConversation.userId,
          img: imgUrl,
        }),
      })
      const data = await res.json();
      if(data.error){
        showToast("Error", data.error, "error");
        return;
      }
      console.log(data);
      setMessages((messages) => [...messages, data]); 
      
      setConversations(prevConvs => {
        const updatedConversations = prevConvs.map(conversation => {
          if(conversation._id === selectedConversation._id){
            return {
              ...conversation,
              lastMessage:{
                text:messageText,
                sender:data.sender
              }
            }
          }
          return conversation;
        })
        return updatedConversations;
      })
      setMessageText("");
      setImgUrl("");
    } catch (error) {
      showToast("Error", error.message, "error")
    }finally {
      setIsSending(false);
    }
  }

  return (
    <Flex gap={2} alignItems={"center"}>
      <form onSubmit={handleSendMessage} style={{ flex : 95 }}>
        <InputGroup>
          <Input 
            w={"full"} 
            placeholder="Type a message" 
            onChange={(e) => setMessageText(e.target.value)} 
            value={messageText}
            sx={{
              color: textColor,
              background: "transparent",
              border: "2px solid",
              borderColor: borderColor,
              borderRadius: "25px",
              _focus: {
                borderColor: borderColor,
                boxShadow: "none"
              },
              _placeholder: {
                color: placeholderColor
              }
            }}
          />
          <InputRightElement onClick={handleSendMessage} cursor={"pointer"} pr={4}>
            <IoSendSharp color={iconColor}/>
          </InputRightElement>
        </InputGroup>
      </form>
      <Flex flex={5} cursor={"pointer"} color={iconColor}>
        <BsFillImageFill size={20} onClick={() => imageRef.current.click()} />
        <Input type={"file"} hidden ref={imageRef} onChange={handleImageChange}/>
      </Flex>
      <Modal
        isOpen={imgUrl}
        onClose={() => {
          onClose();
          setImgUrl("");
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader></ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex mt={5} w={"full"}>
              <Image src={imgUrl} />
            </Flex>
            <Flex justifyContent={"flex-end"} my={2}>
              {!isSending ? (
                <IoSendSharp size={24} cursor={"pointer"} onClick={handleSendMessage} color={iconColor} />
              ) : (
                <Spinner size={"md"} />
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  )
}

export default MessageInput;