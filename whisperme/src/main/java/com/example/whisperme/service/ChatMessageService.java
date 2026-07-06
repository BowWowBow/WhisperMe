package com.example.whisperme.service;

import com.example.whisperme.domain.ChatMessage;
import com.example.whisperme.mapper.ChatMessageMapper;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class ChatMessageService {

    private final ChatMessageMapper chatMessageMapper;

    public ChatMessageService(ChatMessageMapper chatMessageMapper) {
        this.chatMessageMapper = chatMessageMapper;
    }

    public void saveUserMessage(Long roomId, String content) {
        ChatMessage message = new ChatMessage();
        message.setRoomId(roomId);
        message.setRole("USER");
        message.setContent(content);
        message.setMessageType("TEXT");

        chatMessageMapper.insert(message);
    }

    public void saveAssistantMessage(Long roomId, String content) {
        ChatMessage message = new ChatMessage();
        message.setRoomId(roomId);
        message.setRole("ASSISTANT");
        message.setContent(content);
        message.setMessageType("TEXT");

        chatMessageMapper.insert(message);
    }

    public void saveFileMessage(ChatMessage message) {
        message.setRole("USER");

        if (message.getMessageType() == null) {
            message.setMessageType("FILE");
        }

        if (message.getContent() == null) {
            message.setContent(message.getFileName());
        }

        chatMessageMapper.insert(message);
    }

    public List<ChatMessage> findByRoomId(Long roomId) {
        return chatMessageMapper.findByRoomId(roomId);
    }

    public List<ChatMessage> findRecentTextHistory(Long roomId, int limit) {

        List<ChatMessage> messages = chatMessageMapper.findRecentTextByRoomId(roomId, limit);

        Collections.reverse(messages);

        return messages;
    }

    public List<ChatMessage> search(Long roomId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return chatMessageMapper.findByRoomId(roomId);
        }

        return chatMessageMapper.search(roomId, keyword.trim());
    }

    public void deleteByRoomId(Long roomId) {
        chatMessageMapper.deleteByRoomId(roomId);
    }
}