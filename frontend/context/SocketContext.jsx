import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../src/atoms/userAtom";
import { messagesAtom } from "../src/atoms/messagesAtom";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callRole, setCallRole] = useState(null); // Thêm trạng thái vai trò cuộc gọi
  const user = useRecoilValue(userAtom);
  const setMessages = useSetRecoilState(messagesAtom);

  const initializeSocket = useCallback(() => {
    if (!user?._id) return null;

    const newSocket = io("http://localhost:5000", {
      query: { userId: user._id },
      transports: ["websocket"],
      upgrade: false,
    });

    return newSocket;
  }, [user?._id]);

  useEffect(() => {
    const newSocket = initializeSocket();
    if (!newSocket) return;

    setSocket(newSocket);

    // Basic Socket Events
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setCallRole(null); // Reset call role on disconnect
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Online Users
    newSocket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // Message Handling
    newSocket.on("newMessage", (message) => {
      setMessages((prevMessages) => {
        const messageExists = prevMessages.some((msg) => msg._id === message._id);
        if (messageExists) return prevMessages;

        if (message.messageType === "call" && message.callStatus === "ended") {
          return prevMessages.map((msg) =>
            msg._id === message.relatedCallMessageId
              ? { ...msg, callStatus: "ended", callDuration: message.callDuration }
              : msg
          );
        }

        return [...prevMessages, message];
      });
    });

    // Call Events
    newSocket.on("callUser", ({ signal, from, name, isVideoCall }) => {
      if (isCallInProgress) {
        newSocket.emit("callBusy", { to: from });
        return;
      }

      setCallRole('receiver'); // Set as receiver when receiving call

      // Trigger UI to show incoming call on recipient side (B)
      window.dispatchEvent(
        new CustomEvent("incomingCall", {
          detail: { signal, from, name, isVideoCall },
        })
      );

      const acceptCallListener = (event) => {
        newSocket.emit("acceptCall", { to: from, signal: event.detail.signal });
        setIsCallInProgress(true);
        cleanupListeners();
      };

      const rejectCallListener = () => {
        newSocket.emit("rejectCall", { to: from });
        setCallRole(null); // Reset call role on reject
        cleanupListeners();
      };

      const cleanupListeners = () => {
        window.removeEventListener("acceptCall", acceptCallListener);
        window.removeEventListener("rejectCall", rejectCallListener);
      };

      window.addEventListener("acceptCall", acceptCallListener);
      window.addEventListener("rejectCall", rejectCallListener);
    });

    newSocket.on("callAccepted", (data) => {
      window.dispatchEvent(
        new CustomEvent("callAccepted", {
          detail: data,
        })
      );
    });

    newSocket.on("callRejected", (data) => {
      window.dispatchEvent(
        new CustomEvent("callRejected", {
          detail: data,
        })
      );
      setIsCallInProgress(false);
      setCallRole(null); // Reset call role on rejection
    });

    newSocket.on("callEnded", (data) => {
      window.dispatchEvent(
        new CustomEvent("callEnded", {
          detail: data,
        })
      );
      setIsCallInProgress(false);
      setCallRole(null); // Reset call role when call ends
    });

    newSocket.on("callBusy", () => {
      window.dispatchEvent(new CustomEvent("callBusy"));
      setIsCallInProgress(false);
      setCallRole(null); // Reset call role when busy
    });

    newSocket.on("userBusy", () => {
      window.dispatchEvent(new CustomEvent("userBusy"));
      setIsCallInProgress(false);
      setCallRole(null); // Reset call role when user busy
    });

    return () => {
      if (newSocket) {
        newSocket.off("connect");
        newSocket.off("disconnect");
        newSocket.off("connect_error");
        newSocket.off("getOnlineUsers");
        newSocket.off("newMessage");
        newSocket.off("callUser");
        newSocket.off("callAccepted");
        newSocket.off("callRejected");
        newSocket.off("callEnded");
        newSocket.off("callBusy");
        newSocket.off("userBusy");
        newSocket.close();
      }
      setCallRole(null); // Reset call role on cleanup
    };
  }, [initializeSocket, setMessages, isCallInProgress]);

  // Message Methods
  const sendMessage = useCallback(
    (messageData) => {
      if (socket) {
        socket.emit("sendMessage", messageData);
      }
    },
    [socket]
  );

  // Call Methods
  const initiateCall = useCallback(
    (data) => {
      if (socket && !isCallInProgress) {
        setIsCallInProgress(true);
        setCallRole('caller'); // Set as caller when initiating call
        socket.emit("callUser", data);
      }
    },
    [socket, isCallInProgress]
  );

  const acceptCall = useCallback(
    (data) => {
      if (socket) {
        setIsCallInProgress(true);
        socket.emit("acceptCall", data);
      }
    },
    [socket]
  );

  const rejectCall = useCallback(
    (data) => {
      if (socket) {
        socket.emit("rejectCall", data);
        setIsCallInProgress(false);
        setCallRole(null); // Reset call role on reject
      }
    },
    [socket]
  );

  const endCall = useCallback(
    (data) => {
      if (socket) {
        socket.emit("endCall", data);
        setIsCallInProgress(false);
        setCallRole(null); // Reset call role on end
      }
    },
    [socket]
  );

  const sendIceCandidate = useCallback(
    (data) => {
      if (socket) {
        socket.emit("ice-candidate", data);
      }
    },
    [socket]
  );

  const value = {
    socket,
    onlineUsers,
    isCallInProgress,
    callRole, // Thêm callRole vào context
    sendMessage,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    sendIceCandidate,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContextProvider;