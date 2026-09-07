import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        seen: {
            type: Boolean,
            default: false,
        },
        img: {
            type: String,
            default: "",
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'call'],
            default: 'text'
        },
        callStatus: {
            type: String,
            enum: ['started', 'ended', 'missed'],
            default: null
        },
        callDuration: {
            type: Number,
            default: 0
        },
        isVideoCall: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;