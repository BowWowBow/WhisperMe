package com.example.whisperme.service;

import com.example.whisperme.domain.ChatHistory;
import com.example.whisperme.mapper.ChatMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatService {

    private final ChatMapper chatMapper;

    public ChatService(ChatMapper chatMapper) {
        this.chatMapper = chatMapper;
    }

    public void save(ChatHistory chatHistory) {
        chatMapper.insertChat(chatHistory);
    }

    public List<ChatHistory> findByMemberId(Long memberId) {
        return chatMapper.findByMemberId(memberId);
    }

    public void deleteChat(Long id) {
        chatMapper.deleteChat(id);
    }

    public void updateChat(ChatHistory chatHistory) {
        chatMapper.updateChat(chatHistory);
    }
}