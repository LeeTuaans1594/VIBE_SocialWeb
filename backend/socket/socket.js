import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

export const getRecipientSocketId = (recipientId) => {
    return userSocketMap[recipientId];
};

const userSocketMap = {}; // userId: socketId
const activeCallsMap = {}; // { conversationId: callerId }
const callStatusMap = {}; // { conversationId: 'ringing' | 'ongoing' | 'ended' }

io.on("connection", (socket) => {
    console.log("User connected", socket.id);
    const userId = socket.handshake.query.userId;

    if (userId != "undefined") userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
        try {
            await Message.updateMany({ conversationId: conversationId, seen: false }, { $set: { seen: true } });
            await Conversation.updateOne({ _id: conversationId }, { $set: { "lastMessage.seen": true } });
            io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("callUser", async ({ userToCall, signalData, from, name, isVideoCall }) => {
        console.log("Received call request from", from, "to", userToCall);
        const callerId = from;
        const callerSocketId = userSocketMap[callerId];
        const receiverSocketId = userSocketMap[userToCall];
        io.to(receiverSocketId).emit("incomingCall", { from, name, isVideoCall });
        
        try {
            const conversation = await Conversation.findOne({
                participants: { $all: [callerId, userToCall] },
            });

            if (conversation) {
                const conversationId = conversation._id.toString();
                activeCallsMap[conversationId] = callerId;
                callStatusMap[conversationId] = 'ringing';

                const newMessage = new Message({
                    conversationId: conversation._id,
                    sender: callerId,
                    text: `Started a ${isVideoCall ? 'video' : 'audio'} call`,
                    messageType: 'call',
                    callStatus: 'started',
                });

                await newMessage.save();

                await conversation.updateOne({
                    lastMessage: {
                        text: `Started a ${isVideoCall ? 'video' : 'audio'} call`,
                        sender: callerId,
                    },
                });

                io.to(callerSocketId).emit("newMessage", newMessage);
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
        } catch (error) {
            console.error("Error creating call message:", error);
        }
        
        io.to(receiverSocketId).emit("callUser", { signal: signalData, from: callerSocketId, name, isVideoCall });
        io.to(receiverSocketId).emit("incomingCall", { from: callerId, name, isVideoCall });
    });

    socket.on("answerCall", (data) => {
        console.log("Received answer call from:", socket.id, "to:", data.to);
        const callerId = data.to;
        const callerSocketId = userSocketMap[callerId];
        io.to(callerSocketId).emit("callAccepted", data.signal);
        io.to(socket.id).emit("callConnected");

        const conversationId = Object.keys(activeCallsMap).find(key => activeCallsMap[key] === callerId);
        if (conversationId) {
            callStatusMap[conversationId] = 'ongoing';
        }
    });

    socket.on("callAcceptedByRecipient", ({ to }) => {
        const callerSocketId = userSocketMap[to];
        io.to(callerSocketId).emit("callAcceptedConfirmation");
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
        const receiverSocketId = userSocketMap[to];
        io.to(receiverSocketId).emit("ice-candidate", { candidate });
    });

    socket.on("endCall", async ({ to, duration, conversationId }) => {
        console.log("Call ended by", socket.id, "to", to, "duration:", duration);
    
        const receiverSocketId = userSocketMap[to];
        const senderId = Object.keys(userSocketMap).find(key => userSocketMap[key] === socket.id);
        const originalCaller = activeCallsMap[conversationId];
    
        try {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                const callType = isVideoCall ? 'Video call' : 'Audio call';
                const newMessage = new Message({
                    conversationId: conversation._id,
                    sender: originalCaller,
                    text: `${callType} · ${formatDuration(duration)}`,
                    messageType: 'call',
                    callStatus: 'ended',
                    callDuration: duration,
                });
                await newMessage.save();
    
                await conversation.updateOne({
                    lastMessage: {
                        text: `${callType} · ${formatDuration(duration)}`,
                        sender: originalCaller,
                        seen: false
                    },
                });
                
                // Emit new message
                io.to(socket.id).emit("newMessage", newMessage);
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
        } catch (error) {
            console.error("Error creating end call message:", error);
        }
    
        // Notify the other user to end the call
        io.to(receiverSocketId).emit("partnerEndedCall", { duration });
    
        // Emit call ended notification
        io.to(socket.id).emit("callEndedNotification", { duration });
        io.to(receiverSocketId).emit("callEndedNotification", { duration });
    
        // Clean up
        delete activeCallsMap[conversationId];
        delete callStatusMap[conversationId];
    });

    socket.on("rejectCall", ({ to, conversationId }) => {
        const callerSocketId = userSocketMap[to];
        io.to(callerSocketId).emit("callRejected", { conversationId });
        
        if (conversationId) {
            delete activeCallsMap[conversationId];
            delete callStatusMap[conversationId];
        }
    });

    socket.on("videoStateChanged", ({ to, isVideoOff }) => {
        const receiverSocketId = userSocketMap[to];
        io.to(receiverSocketId).emit("videoStateChanged", { isVideoOff });
    });

    socket.on("audioStateChanged", ({ to, isMuted }) => {
        const receiverSocketId = userSocketMap[to];
        io.to(receiverSocketId).emit("audioStateChanged", { isMuted });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
        const disconnectedUserId = Object.keys(userSocketMap).find(key => userSocketMap[key] === socket.id);
        if (disconnectedUserId) {
            delete userSocketMap[disconnectedUserId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));

            // Check and end the call if the user was in a call
            const activeCall = Object.entries(activeCallsMap).find(([conversationId, callerId]) => callerId === disconnectedUserId);
            if (activeCall) {
                const [conversationId, callerId] = activeCall;
                const otherParticipant = Object.keys(userSocketMap).find(userId => 
                    userId !== disconnectedUserId && userSocketMap[userId] === getRecipientSocketId(userId)
                );
                if (otherParticipant) {
                    io.to(userSocketMap[otherParticipant]).emit("callEnded", { reason: "User disconnected" });
                }
                delete activeCallsMap[conversationId];
                delete callStatusMap[conversationId];
            }
        }
    });
});

const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export { io, server, app };